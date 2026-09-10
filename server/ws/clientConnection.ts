import type { WebSocket } from 'ws'
import type { IncomingMessage } from 'http'
import jwt from 'jsonwebtoken'
import cookie from 'cookie'
import { env } from '../env.js'
import { logger } from '../utils/logger.js'
import { listMemberships } from '../repositories/membershipRepository.js'
import { agentSockets, clientSockets } from './state.js'
import type { AgentUser } from './state.js'
import { handleClientCommand, sendError } from './commandHandler.js'

async function sendCurrentAgentStatuses(userId: string, ws: WebSocket) {
  // Every server this user is a member of (owned or shared)
  const { data: memberships } = await listMemberships(userId)

  if (!memberships) return

  for (const membership of memberships) {
    const agentWs = agentSockets.get(membership.server_id)
    const isOnline = agentWs && agentWs.readyState === 1

    // Send current real status — not what DB says, but what's actually connected
    ws.send(JSON.stringify({
      type:     isOnline ? 'agent:online' : 'agent:offline',
      serverId: membership.server_id
    }))
  }
}

// ══════════════════════════════════════════════════════════════
// CLIENT (FRONTEND) CONNECTION
// ══════════════════════════════════════════════════════════════
export function handleClientConnection(ws: WebSocket, url: URL, req: IncomingMessage) {
  // Read JWT from cookie header (ws doesn't auto-send cookies in all clients)
  // Frontend should pass token as query param for WS handshake only
  const cookies = cookie.parse(req.headers.cookie || '')
  const token = cookies.token

  if (!token) return ws.close(4001, 'Missing token')

  let user: AgentUser
  try {
    user = jwt.verify(token, env.JWT_SECRET) as AgentUser
  } catch {
    return ws.close(4001, 'Invalid or expired token')
  }

  // Register client socket
  if (!clientSockets.has(user.id)) clientSockets.set(user.id, new Set())
  clientSockets.get(user.id)!.add(ws)

  // Confirm connection to frontend
  ws.send(JSON.stringify({ type: 'connected', userId: user.id }))

  sendCurrentAgentStatuses(user.id, ws)
  logger.info(`Client connected — userId: ${user.id}`)

  // ── Receive commands from frontend ───────────────────────
  ws.on('message', async (raw: Buffer) => {
    let msg: any
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      return sendError(ws, 'Invalid JSON')
    }

    try {
      await handleClientCommand(user, msg, ws)
    } catch (err) {
      sendError(ws, (err as Error).message)
    }
  })

  ws.on('close', () => {
    clientSockets.get(user.id)?.delete(ws)
    if (clientSockets.get(user.id)?.size === 0) {
      clientSockets.delete(user.id)
    }
    logger.info(`Client disconnected — userId: ${user.id}`)
  })

  ws.on('error', (err: Error) => {
    logger.error({ err }, `Client WS error (userId: ${user.id})`)
  })
}
