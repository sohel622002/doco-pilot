import type { WebSocket } from 'ws'
import type { IncomingMessage } from 'http'
import bcrypt from 'bcrypt'
import { verifyAgentHandshake } from '../utils/sign.js'
import { logger } from '../utils/logger.js'
import * as serverRepo from '../repositories/serverRepository.js'
import * as metricsRepo from '../repositories/metricsRepository.js'
import { agentSockets } from './state.js'
import { broadcastToServerMembers } from './broadcast.js'
import { checkForAlert } from './alerts.js'
import { persistMetricsAndEvents } from './metricsPersist.js'

// Verify HMAC signature on agent handshake
// Uses agentKey itself as the HMAC secret (both agent and backend know it)
function verifyHandshakeSig(agentKey: string, ts: string, sig: string) {
  verifyAgentHandshake(agentKey, ts, sig, agentKey)
}

// ══════════════════════════════════════════════════════════════
// AGENT CONNECTION
// ══════════════════════════════════════════════════════════════
export async function handleAgentConnection(ws: WebSocket, url: URL, req: IncomingMessage) {
  const agentKey = url.searchParams.get('agentKey')
  const ts = url.searchParams.get('ts')
  const sig = url.searchParams.get('sig')

  if (!agentKey || !ts || !sig) {
    return ws.close(4001, 'Missing agentKey, ts, or sig')
  }

  // agentKey format: {serverId}.{secret}
  const dotIndex = agentKey.indexOf('.')
  if (dotIndex === -1) return ws.close(4001, 'Malformed agentKey')

  const serverId = agentKey.substring(0, dotIndex)
  const plainSecret = agentKey.substring(dotIndex + 1)

  // Fetch server — one DB lookup using serverId prefix
  const { data: server, error } = await serverRepo.findForHandshake(serverId)

  if (error || !server || !server.agent_key_hash) {
    return ws.close(4003, 'Invalid agentKey')
  }

  // Verify the secret part of agentKey
  const keyValid = await bcrypt.compare(plainSecret, server.agent_key_hash)
  if (!keyValid) return ws.close(4003, 'Invalid agentKey')

  // Verify HMAC handshake timestamp + signature
  // agentSecret is fetched from DB (we store hash, agent has plain)
  // For HMAC we use the plain agentKey itself as the signing secret
  // (agent knows it, backend can verify using stored hash — we re-derive here)
  try {
    // Use agentKey as HMAC secret (both sides know it)
    verifyHandshakeSig(agentKey, ts, sig)
  } catch (err) {
    return ws.close(4008, (err as Error).message)
  }

  // Register agent socket
  agentSockets.set(server.id, ws)

  // Mark as connected in DB
  await serverRepo.markAgentConnected(server.id)
  await metricsRepo.insertAgentStatusEvent(server.id, true)

  // Notify every member's frontend that their agent is online
  broadcastToServerMembers(server.id, {
    type: 'agent:online',
    serverId: server.id,
  })

  logger.info(`Agent connected — serverId: ${server.id}`)

  // ── Receive messages from agent ──────────────────────────
  ws.on('message', (raw: Buffer) => {
    let msg: any
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      return // ignore malformed JSON
    }

    // Validate message has a type
    if (!msg.type) return

    checkForAlert(server.id, msg)
    persistMetricsAndEvents(server.id, msg)

    // Forward docker event to every member's frontend
    broadcastToServerMembers(server.id, {
      ...msg,
      serverId: server.id,
    })
  })

  ws.on('close', async () => {
    agentSockets.delete(server.id)
    await serverRepo.markAgentDisconnected(server.id)
    await metricsRepo.insertAgentStatusEvent(server.id, false)

    broadcastToServerMembers(server.id, {
      type: 'agent:offline',
      serverId: server.id,
    })
    logger.info(`Agent disconnected — serverId: ${server.id}`)
  })

  ws.on('error', (err: Error) => {
    logger.error({ err }, `Agent WS error (serverId: ${server.id})`)
  })
}
