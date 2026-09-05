import { Router } from 'express'
import bcrypt from 'bcrypt'
import { randomBytes } from 'crypto'
import { generateAgentCredentials } from '../../utils/auth.js'
import { encrypt, decrypt } from '../../utils/encryption.js'
import { auditLog } from '../../services/auditService.js'
import { validateBody } from '../../middleware/validate.js'
import { createServerSchema, updateServerSchema } from '../../schemas/index.js'
import { logger } from '../../utils/logger.js'
import { requireRole } from '../../services/membershipService.js'
import { listMemberships, insertOwnerMember } from '../../repositories/membershipRepository.js'
import * as serverRepo from '../../repositories/serverRepository.js'
import { env } from '../../env.js'

const router = Router()

// Helper — builds the docker run command string (no placeholder fallbacks)
export function buildDockerCommand(agentKey: string, agentSecret: string) {
  const backendUrl = env.BACKEND_WS_URL
  if (!backendUrl) {
    throw new Error('BACKEND_WS_URL is not configured')
  }
  return (
    `docker run -d --restart unless-stopped \\\n` +
    `  --name docker-manager-agent \\\n` +
    `  -v /var/run/docker.sock:/var/run/docker.sock \\\n` +
    `  -e AGENT_KEY="${agentKey}" \\\n` +
    `  -e AGENT_SECRET="${agentSecret}" \\\n` +
    `  -e BACKEND_WS_URL="${backendUrl}" \\\n` +
    `  ${env.AGENT_IMAGE}`
  )
}

// ── GET /api/servers ─────────────────────────────────────────
// List every server the logged-in user is a member of (owned or shared)
router.get('/', async (req, res) => {
  const { data: memberships, error: memError } = await listMemberships(req.user!.id)

  if (memError) {
    logger.error({ err: memError }, 'Fetch memberships error')
    return res.status(500).json({ error: 'Failed to fetch servers' })
  }

  if (!memberships || memberships.length === 0) return res.json({ servers: [] })

  const roleByServerId = new Map(memberships.map((m: any) => [m.server_id, m.role]))

  const { data, error } = await serverRepo.listByIds([...roleByServerId.keys()])

  if (error) {
    logger.error({ err: error }, 'Fetch servers error')
    return res.status(500).json({ error: 'Failed to fetch servers' })
  }

  res.json({ servers: data.map((s: any) => ({ ...s, role: roleByServerId.get(s.id) })) })
})

// ── POST /api/servers ────────────────────────────────────────
// Create a new server — stores hashes (for verify) + encrypted (for retrieve)
router.post('/', validateBody(createServerSchema), async (req, res) => {
  const { name, ip } = req.body

  const { data: server, error: insertError } = await serverRepo.insertServer(req.user!.id, name, ip)

  if (insertError) {
    logger.error({ err: insertError }, 'Insert server error')
    return res.status(500).json({ error: 'Failed to create server' })
  }

  const { agentKey, secret } = generateAgentCredentials(server.id)
  const agentSecret = randomBytes(32).toString('hex')

  // bcrypt hashes → for WS handshake verification (one-way, fast compare)
  // AES-256-GCM ciphertext → for showing credentials to owner later (reversible)
  const [agentKeyHash, agentSecretHash] = await Promise.all([
    bcrypt.hash(secret, 12),
    bcrypt.hash(agentSecret, 12)
  ])

  const agentKeyEncrypted    = encrypt(agentKey)
  const agentSecretEncrypted = encrypt(agentSecret)

  const { error: updateError } = await serverRepo.updateCredentials(server.id, {
    agent_key_hash:         agentKeyHash,
    agent_secret_hash:      agentSecretHash,
    agent_key_encrypted:    agentKeyEncrypted,
    agent_secret_encrypted: agentSecretEncrypted
  })

  if (updateError) {
    await serverRepo.deleteServer(server.id)
    return res.status(500).json({ error: 'Failed to generate agent credentials' })
  }

  const { error: memberError } = await insertOwnerMember(server.id, req.user!.id)

  if (memberError) {
    logger.error({ err: memberError, serverId: server.id }, 'Failed to create owner membership')
    await serverRepo.deleteServer(server.id)
    return res.status(500).json({ error: 'Failed to create server' })
  }

  auditLog({ req, action: 'server:create', target: server.id })

  let dockerCommand
  try {
    dockerCommand = buildDockerCommand(agentKey, agentSecret)
  } catch (err) {
    logger.error({ err }, 'Failed to build docker command')
    return res.status(500).json({ error: 'Server misconfigured: BACKEND_WS_URL is required' })
  }

  res.status(201).json({
    server: {
      id:         server.id,
      name:       server.name,
      ip:         server.ip,
      created_at: server.created_at
    },
    agentKey,
    agentSecret,
    dockerCommand
  })
})

// ── GET /api/servers/:id ─────────────────────────────────────
// Basic server info — no credentials
router.get('/:id', async (req, res) => {
  const membership = await requireRole(req, res, req.params.id, 'viewer')
  if (!membership) return

  const { data, error } = await serverRepo.findById(req.params.id)

  if (error || !data) {
    return res.status(404).json({ error: 'Server not found' })
  }

  res.json({ server: { ...data, role: membership.role } })
})

// ── GET /api/servers/:id/credentials ─────────────────────────
// Decrypt and return agentKey + docker command — owner only
router.get('/:id/credentials', async (req, res) => {
  if (!(await requireRole(req, res, req.params.id, 'owner'))) return

  const { data, error } = await serverRepo.findCredentials(req.params.id)

  if (error || !data) {
    return res.status(404).json({ error: 'Server not found' })
  }

  if (!data.agent_key_encrypted || !data.agent_secret_encrypted) {
    return res.status(404).json({ error: 'Credentials not found — try regenerating' })
  }

  let agentKey, agentSecret
  try {
    agentKey    = decrypt(data.agent_key_encrypted)
    agentSecret = decrypt(data.agent_secret_encrypted)
  } catch (err) {
    // GCM auth tag mismatch = ciphertext was tampered with in the DB
    logger.error({ err, serverId: data.id }, 'Decryption failed for server')
    return res.status(500).json({ error: 'Failed to decrypt credentials' })
  }

  auditLog({ req, action: 'server:credentials:view', target: req.params.id })

  let dockerCommand
  try {
    dockerCommand = buildDockerCommand(agentKey, agentSecret)
  } catch (err) {
    logger.error({ err }, 'Failed to build docker command')
    return res.status(500).json({ error: 'Server misconfigured: BACKEND_WS_URL is required' })
  }

  res.json({
    server:        { id: data.id, name: data.name, ip: data.ip },
    agentKey,
    agentSecret,
    dockerCommand
  })
})

// ── PATCH /api/servers/:id ───────────────────────────────────
router.patch('/:id', validateBody(updateServerSchema), async (req, res) => {
  const { name, ip, alertWebhookUrl, alertCpuThreshold } = req.body
  const updates: Record<string, unknown> = {}

  if (name !== undefined) updates.name = name
  if (ip !== undefined) updates.ip = ip
  if (alertWebhookUrl !== undefined) updates.alert_webhook_url = alertWebhookUrl || null
  if (alertCpuThreshold !== undefined) updates.alert_cpu_threshold = alertCpuThreshold

  if (!(await requireRole(req, res, req.params.id, 'operator'))) return

  const { data, error } = await serverRepo.updateServer(req.params.id, updates)

  if (error) return res.status(500).json({ error: 'Failed to update server' })

  auditLog({ req, action: 'server:update', target: req.params.id })
  res.json({ server: data })
})

// ── DELETE /api/servers/:id ──────────────────────────────────
router.delete('/:id', async (req, res) => {
  if (!(await requireRole(req, res, req.params.id, 'owner'))) return

  const { error } = await serverRepo.deleteServer(req.params.id)

  if (error) return res.status(500).json({ error: 'Failed to delete server' })

  auditLog({ req, action: 'server:delete', target: req.params.id })
  res.json({ message: 'Server deleted' })
})

// ── POST /api/servers/:id/regenerate-key ─────────────────────
// Issues new agentKey + agentSecret, replaces all stored values
router.post('/:id/regenerate-key', async (req, res) => {
  if (!(await requireRole(req, res, req.params.id, 'owner'))) return

  const { agentKey, secret } = generateAgentCredentials(req.params.id)
  const agentSecret = randomBytes(32).toString('hex')

  const [agentKeyHash, agentSecretHash] = await Promise.all([
    bcrypt.hash(secret, 12),
    bcrypt.hash(agentSecret, 12)
  ])

  const agentKeyEncrypted    = encrypt(agentKey)
  const agentSecretEncrypted = encrypt(agentSecret)

  const { error } = await serverRepo.updateCredentials(req.params.id, {
    agent_key_hash:         agentKeyHash,
    agent_secret_hash:      agentSecretHash,
    agent_key_encrypted:    agentKeyEncrypted,
    agent_secret_encrypted: agentSecretEncrypted,
  }, true)

  if (error) return res.status(500).json({ error: 'Failed to regenerate credentials' })

  auditLog({ req, action: 'server:regenerate-key', target: req.params.id })

  let dockerCommand
  try {
    dockerCommand = buildDockerCommand(agentKey, agentSecret)
  } catch (err) {
    logger.error({ err }, 'Failed to build docker command')
    return res.status(500).json({ error: 'Server misconfigured: BACKEND_WS_URL is required' })
  }

  res.json({
    agentKey,
    agentSecret,
    dockerCommand
  })
})

export default router
