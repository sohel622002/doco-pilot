import { Router } from 'express'
import bcrypt from 'bcrypt'
import { randomBytes } from 'crypto'
import supabase from '../config/supabase.js'
import { requireAuth } from '../middleware/auth.js'
import { generateAgentCredentials } from '../utils/auth.js'
import { auditLog } from '../utils/audit.js'
import { encrypt, decrypt } from '../utils/encryption.js'
import { validateBody } from '../middleware/validate.js'
import { createServerSchema, updateServerSchema } from '../schemas/index.js'
import { logger } from '../utils/logger.js'

const router = Router()

// All server routes require auth
router.use(requireAuth)

// Helper — builds the docker run command string
function buildDockerCommand(agentKey, agentSecret) {
  const backendUrl = process.env.BACKEND_WS_URL ?? 'wss://yourbackend.com'
  return (
    `docker run -d --restart unless-stopped \\\n` +
    `  --name docker-manager-agent \\\n` +
    `  -v /var/run/docker.sock:/var/run/docker.sock \\\n` +
    `  -e AGENT_KEY="${agentKey}" \\\n` +
    `  -e AGENT_SECRET="${agentSecret}" \\\n` +
    `  -e BACKEND_WS_URL="${backendUrl}" \\\n` +
    `  your-dockerhub/docker-manager-agent:latest`
  )
}

// ── GET /api/servers ─────────────────────────────────────────
// List all servers for the logged-in user
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('servers')
    .select('id, name, ip, agent_connected, last_seen_at, alert_webhook_url, alert_cpu_threshold, created_at')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    logger.error({ err: error }, 'Fetch servers error')
    return res.status(500).json({ error: 'Failed to fetch servers' })
  }

  res.json({ servers: data })
})

// ── POST /api/servers ────────────────────────────────────────
// Create a new server — stores hashes (for verify) + encrypted (for retrieve)
router.post('/', validateBody(createServerSchema), async (req, res) => {
  const { name, ip } = req.body

  // Insert server first to get the ID
  const { data: server, error: insertError } = await supabase
    .from('servers')
    .insert({ user_id: req.user.id, name, ip })
    .select('id, name, ip, created_at')
    .single()

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

  const { error: updateError } = await supabase
    .from('servers')
    .update({
      agent_key_hash:         agentKeyHash,
      agent_secret_hash:      agentSecretHash,
      agent_key_encrypted:    agentKeyEncrypted,
      agent_secret_encrypted: agentSecretEncrypted
    })
    .eq('id', server.id)

  if (updateError) {
    await supabase.from('servers').delete().eq('id', server.id)
    return res.status(500).json({ error: 'Failed to generate agent credentials' })
  }

  auditLog({ req, action: 'server:create', target: server.id })

  res.status(201).json({
    server: {
      id:         server.id,
      name:       server.name,
      ip:         server.ip,
      created_at: server.created_at
    },
    agentKey,
    agentSecret,
    dockerCommand: buildDockerCommand(agentKey, agentSecret)
  })
})

// ── GET /api/servers/:id ─────────────────────────────────────
// Basic server info — no credentials
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('servers')
    .select('id, name, ip, agent_connected, last_seen_at, alert_webhook_url, alert_cpu_threshold, created_at')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id) // ownership check
    .single()

  if (error || !data) {
    return res.status(404).json({ error: 'Server not found' })
  }

  res.json({ server: data })
})

// ── GET /api/servers/:id/credentials ─────────────────────────
// Decrypt and return agentKey + docker command — owner only
router.get('/:id/credentials', async (req, res) => {
  const { data, error } = await supabase
    .from('servers')
    .select('id, name, ip, agent_key_encrypted, agent_secret_encrypted')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)   // ownership enforced here
    .single()

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

  res.json({
    server:        { id: data.id, name: data.name, ip: data.ip },
    agentKey,
    agentSecret,
    dockerCommand: buildDockerCommand(agentKey, agentSecret)
  })
})

// ── PATCH /api/servers/:id ───────────────────────────────────
router.patch('/:id', validateBody(updateServerSchema), async (req, res) => {
  const { name, ip, alertWebhookUrl, alertCpuThreshold } = req.body
  const updates = {}

  if (name !== undefined) updates.name = name
  if (ip !== undefined) updates.ip = ip
  if (alertWebhookUrl !== undefined) updates.alert_webhook_url = alertWebhookUrl || null
  if (alertCpuThreshold !== undefined) updates.alert_cpu_threshold = alertCpuThreshold

  const { data: existing } = await supabase
    .from('servers')
    .select('id')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single()

  if (!existing) return res.status(404).json({ error: 'Server not found' })

  const { data, error } = await supabase
    .from('servers')
    .update(updates)
    .eq('id', req.params.id)
    .select('id, name, ip, agent_connected, last_seen_at, alert_webhook_url, alert_cpu_threshold')
    .single()

  if (error) return res.status(500).json({ error: 'Failed to update server' })

  auditLog({ req, action: 'server:update', target: req.params.id })
  res.json({ server: data })
})

// ── DELETE /api/servers/:id ──────────────────────────────────
router.delete('/:id', async (req, res) => {
  const { data: existing } = await supabase
    .from('servers')
    .select('id')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single()

  if (!existing) return res.status(404).json({ error: 'Server not found' })

  const { error } = await supabase
    .from('servers')
    .delete()
    .eq('id', req.params.id)

  if (error) return res.status(500).json({ error: 'Failed to delete server' })

  auditLog({ req, action: 'server:delete', target: req.params.id })
  res.json({ message: 'Server deleted' })
})

// ── POST /api/servers/:id/regenerate-key ─────────────────────
// Issues new agentKey + agentSecret, replaces all stored values
router.post('/:id/regenerate-key', async (req, res) => {
  const { data: existing } = await supabase
    .from('servers')
    .select('id')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single()

  if (!existing) return res.status(404).json({ error: 'Server not found' })

  const { agentKey, secret } = generateAgentCredentials(req.params.id)
  const agentSecret = randomBytes(32).toString('hex')

  const [agentKeyHash, agentSecretHash] = await Promise.all([
    bcrypt.hash(secret, 12),
    bcrypt.hash(agentSecret, 12)
  ])

  const agentKeyEncrypted    = encrypt(agentKey)
  const agentSecretEncrypted = encrypt(agentSecret)

  const { error } = await supabase
    .from('servers')
    .update({
      agent_key_hash:         agentKeyHash,
      agent_secret_hash:      agentSecretHash,
      agent_key_encrypted:    agentKeyEncrypted,
      agent_secret_encrypted: agentSecretEncrypted,
      agent_connected:        false
    })
    .eq('id', req.params.id)

  if (error) return res.status(500).json({ error: 'Failed to regenerate credentials' })

  auditLog({ req, action: 'server:regenerate-key', target: req.params.id })

  res.json({
    agentKey,
    agentSecret,
    dockerCommand: buildDockerCommand(agentKey, agentSecret)
  })
})

export default router