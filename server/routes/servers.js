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

const DEFAULT_AGENT_IMAGE = 'ghcr.io/sohel622002/doco-pilot-agent:latest'

// Helper — builds the docker run command string (no placeholder fallbacks)
function buildDockerCommand(agentKey, agentSecret) {
  const backendUrl = process.env.BACKEND_WS_URL
  if (!backendUrl) {
    throw new Error('BACKEND_WS_URL is not configured')
  }
  const agentImage = process.env.AGENT_IMAGE || DEFAULT_AGENT_IMAGE
  return (
    `docker run -d --restart unless-stopped \\\n` +
    `  --name docker-manager-agent \\\n` +
    `  -v /var/run/docker.sock:/var/run/docker.sock \\\n` +
    `  -e AGENT_KEY="${agentKey}" \\\n` +
    `  -e AGENT_SECRET="${agentSecret}" \\\n` +
    `  -e BACKEND_WS_URL="${backendUrl}" \\\n` +
    `  ${agentImage}`
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

// ── GET /api/servers/:id/metrics ─────────────────────────────
// Historical CPU/mem/disk/network samples for trend charts
const METRICS_RANGE_MS = {
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
}

router.get('/:id/metrics', async (req, res) => {
  const range = METRICS_RANGE_MS[req.query.range] ? req.query.range : '1h'

  const { data: existing } = await supabase
    .from('servers')
    .select('id')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single()

  if (!existing) return res.status(404).json({ error: 'Server not found' })

  const since = new Date(Date.now() - METRICS_RANGE_MS[range]).toISOString()

  const { data, error } = await supabase
    .from('server_metrics')
    .select('ts, cpu_pct, mem_pct, disk_pct, disk_io, net_rx, net_tx')
    .eq('server_id', req.params.id)
    .gte('ts', since)
    .order('ts', { ascending: true })

  if (error) {
    logger.error({ err: error }, 'Fetch server metrics error')
    return res.status(500).json({ error: 'Failed to fetch metrics' })
  }

  res.json({ range, metrics: data })
})

// ── GET /api/servers/:id/events ──────────────────────────────
// Recent docker events for the activity feed
router.get('/:id/events', async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200)

  const { data: existing } = await supabase
    .from('servers')
    .select('id')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single()

  if (!existing) return res.status(404).json({ error: 'Server not found' })

  const { data, error } = await supabase
    .from('docker_events')
    .select('id, ts, type, action, actor_name, details')
    .eq('server_id', req.params.id)
    .order('ts', { ascending: false })
    .limit(limit)

  if (error) {
    logger.error({ err: error }, 'Fetch docker events error')
    return res.status(500).json({ error: 'Failed to fetch events' })
  }

  res.json({ events: data })
})

// ── GET /api/servers/:id/alerts ──────────────────────────────
// Alert fire/resolve history
router.get('/:id/alerts', async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200)

  const { data: existing } = await supabase
    .from('servers')
    .select('id')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single()

  if (!existing) return res.status(404).json({ error: 'Server not found' })

  const { data, error } = await supabase
    .from('alert_events')
    .select('id, ts, rule_type, value, threshold, status')
    .eq('server_id', req.params.id)
    .order('ts', { ascending: false })
    .limit(limit)

  if (error) {
    logger.error({ err: error }, 'Fetch alert events error')
    return res.status(500).json({ error: 'Failed to fetch alerts' })
  }

  res.json({ alerts: data })
})

// ── GET /api/servers/:id/uptime ──────────────────────────────
// 30-day agent uptime %, derived from agent_connected state changes
const UPTIME_WINDOW_DAYS = 30

router.get('/:id/uptime', async (req, res) => {
  const { data: server } = await supabase
    .from('servers')
    .select('id, agent_connected, created_at')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single()

  if (!server) return res.status(404).json({ error: 'Server not found' })

  const now = Date.now()
  const windowStart = now - UPTIME_WINDOW_DAYS * 24 * 60 * 60 * 1000
  const effectiveStart = Math.max(windowStart, new Date(server.created_at).getTime())

  // Seed state: the last known connection state before the window,
  // so a status change just outside the window is still accounted for.
  const { data: seedEvent } = await supabase
    .from('agent_status_events')
    .select('connected')
    .eq('server_id', server.id)
    .lt('ts', new Date(effectiveStart).toISOString())
    .order('ts', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: events, error } = await supabase
    .from('agent_status_events')
    .select('ts, connected')
    .eq('server_id', server.id)
    .gte('ts', new Date(effectiveStart).toISOString())
    .order('ts', { ascending: true })

  if (error) {
    logger.error({ err: error }, 'Fetch agent status events error')
    return res.status(500).json({ error: 'Failed to compute uptime' })
  }

  // Assume online if there's no earlier signal to go on — avoids skewing a
  // brand-new server's uptime down before it has any recorded history.
  let currentState = seedEvent ? seedEvent.connected : true
  let cursor = effectiveStart
  let connectedMs = 0

  for (const event of events ?? []) {
    const eventTs = new Date(event.ts).getTime()
    if (currentState) connectedMs += eventTs - cursor
    cursor = eventTs
    currentState = event.connected
  }
  if (currentState) connectedMs += now - cursor

  const totalMs = now - effectiveStart
  const uptimePercent = totalMs > 0 ? Math.min(100, (connectedMs / totalMs) * 100) : 100

  res.json({
    windowDays: UPTIME_WINDOW_DAYS,
    uptimePercent: Number(uptimePercent.toFixed(2)),
    currentlyConnected: server.agent_connected,
  })
})

export default router