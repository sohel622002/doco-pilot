import { Router } from 'express'
import bcrypt from 'bcrypt'
import { randomBytes } from 'crypto'
import supabase from '../config/supabase.js'
import { requireAuth } from '../middleware/auth.js'
import { generateAgentCredentials } from '../utils/auth.js'
import { auditLog } from '../utils/audit.js'
import { encrypt, decrypt } from '../utils/encryption.js'
import { validateBody } from '../middleware/validate.js'
import { createServerSchema, updateServerSchema, createStackSchema, updateStackSchema, inviteMemberSchema, updateMemberSchema } from '../schemas/index.js'
import { logger } from '../utils/logger.js'
import { requireRole, getMembership } from '../utils/membership.js'
import { sendMail, memberInvitedEmail } from '../utils/mail.js'
import { invalidateServerMemberCache } from '../ws/index.js'

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
// List every server the logged-in user is a member of (owned or shared)
router.get('/', async (req, res) => {
  const { data: memberships, error: memError } = await supabase
    .from('server_members')
    .select('server_id, role')
    .eq('user_id', req.user.id)

  if (memError) {
    logger.error({ err: memError }, 'Fetch memberships error')
    return res.status(500).json({ error: 'Failed to fetch servers' })
  }

  if (!memberships || memberships.length === 0) return res.json({ servers: [] })

  const roleByServerId = new Map(memberships.map((m) => [m.server_id, m.role]))

  const { data, error } = await supabase
    .from('servers')
    .select('id, name, ip, agent_connected, last_seen_at, alert_webhook_url, alert_cpu_threshold, created_at')
    .in('id', [...roleByServerId.keys()])
    .order('created_at', { ascending: false })

  if (error) {
    logger.error({ err: error }, 'Fetch servers error')
    return res.status(500).json({ error: 'Failed to fetch servers' })
  }

  res.json({ servers: data.map((s) => ({ ...s, role: roleByServerId.get(s.id) })) })
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

  const { error: memberError } = await supabase
    .from('server_members')
    .insert({ server_id: server.id, user_id: req.user.id, role: 'owner' })

  if (memberError) {
    logger.error({ err: memberError, serverId: server.id }, 'Failed to create owner membership')
    await supabase.from('servers').delete().eq('id', server.id)
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

  const { data, error } = await supabase
    .from('servers')
    .select('id, name, ip, agent_connected, last_seen_at, alert_webhook_url, alert_cpu_threshold, created_at')
    .eq('id', req.params.id)
    .single()

  if (error || !data) {
    return res.status(404).json({ error: 'Server not found' })
  }

  res.json({ server: { ...data, role: membership.role } })
})

// ── GET /api/servers/:id/credentials ─────────────────────────
// Decrypt and return agentKey + docker command — owner only
router.get('/:id/credentials', async (req, res) => {
  if (!(await requireRole(req, res, req.params.id, 'owner'))) return

  const { data, error } = await supabase
    .from('servers')
    .select('id, name, ip, agent_key_encrypted, agent_secret_encrypted')
    .eq('id', req.params.id)
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

  if (!(await requireRole(req, res, req.params.id, 'operator'))) return

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
  if (!(await requireRole(req, res, req.params.id, 'owner'))) return

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
  if (!(await requireRole(req, res, req.params.id, 'owner'))) return

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

  if (!(await requireRole(req, res, req.params.id, 'viewer'))) return

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

  if (!(await requireRole(req, res, req.params.id, 'viewer'))) return

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

  if (!(await requireRole(req, res, req.params.id, 'viewer'))) return

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
  if (!(await requireRole(req, res, req.params.id, 'viewer'))) return

  const { data: server } = await supabase
    .from('servers')
    .select('id, agent_connected, created_at')
    .eq('id', req.params.id)
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

// ── Saved Compose stacks (metadata store — deploy/down/list happens ─
// live through the agent; this is just so redeploys don't require
// re-pasting the YAML) ────────────────────────────────────────────

// ── GET /api/servers/:id/stacks ──────────────────────────────
router.get('/:id/stacks', async (req, res) => {
  if (!(await requireRole(req, res, req.params.id, 'viewer'))) return

  const { data, error } = await supabase
    .from('stacks')
    .select('id, name, compose_yaml, created_at, updated_at')
    .eq('server_id', req.params.id)
    .order('name', { ascending: true })

  if (error) {
    logger.error({ err: error }, 'Fetch stacks error')
    return res.status(500).json({ error: 'Failed to fetch stacks' })
  }

  res.json({ stacks: data })
})

// ── POST /api/servers/:id/stacks ─────────────────────────────
// Upsert by (server_id, name) — saving a stack with an existing name
// just updates its stored compose file.
router.post('/:id/stacks', validateBody(createStackSchema), async (req, res) => {
  if (!(await requireRole(req, res, req.params.id, 'operator'))) return

  const { name, composeYaml } = req.body
  const { data, error } = await supabase
    .from('stacks')
    .upsert(
      { server_id: req.params.id, name, compose_yaml: composeYaml, updated_at: new Date().toISOString() },
      { onConflict: 'server_id,name' },
    )
    .select('id, name, compose_yaml, created_at, updated_at')
    .single()

  if (error) {
    logger.error({ err: error }, 'Save stack error')
    return res.status(500).json({ error: 'Failed to save stack' })
  }

  auditLog({ req, action: 'stacks:save', target: name, serverId: req.params.id })
  res.status(201).json({ stack: data })
})

// ── PATCH /api/servers/:id/stacks/:stackId ───────────────────
router.patch('/:id/stacks/:stackId', validateBody(updateStackSchema), async (req, res) => {
  if (!(await requireRole(req, res, req.params.id, 'operator'))) return

  const { data, error } = await supabase
    .from('stacks')
    .update({ compose_yaml: req.body.composeYaml, updated_at: new Date().toISOString() })
    .eq('id', req.params.stackId)
    .eq('server_id', req.params.id)
    .select('id, name, compose_yaml, created_at, updated_at')
    .single()

  if (error || !data) return res.status(404).json({ error: 'Stack not found' })

  auditLog({ req, action: 'stacks:update', target: data.name, serverId: req.params.id })
  res.json({ stack: data })
})

// ── DELETE /api/servers/:id/stacks/:stackId ───────────────────
// Only removes the saved YAML — does not stop/remove a running stack.
router.delete('/:id/stacks/:stackId', async (req, res) => {
  if (!(await requireRole(req, res, req.params.id, 'owner'))) return

  const { data, error } = await supabase
    .from('stacks')
    .delete()
    .eq('id', req.params.stackId)
    .eq('server_id', req.params.id)
    .select('name')
    .single()

  if (error || !data) return res.status(404).json({ error: 'Stack not found' })

  auditLog({ req, action: 'stacks:delete', target: data.name, serverId: req.params.id })
  res.status(204).end()
})

// ── Team members (RBAC) ────────────────────────────────────────

// ── GET /api/servers/:id/members ─────────────────────────────
router.get('/:id/members', async (req, res) => {
  if (!(await requireRole(req, res, req.params.id, 'viewer'))) return

  const { data: members, error } = await supabase
    .from('server_members')
    .select('user_id, role, created_at')
    .eq('server_id', req.params.id)
    .order('created_at', { ascending: true })

  if (error) {
    logger.error({ err: error }, 'Fetch members error')
    return res.status(500).json({ error: 'Failed to fetch members' })
  }

  // Two queries instead of a PostgREST embed — server_members has two FKs
  // into profiles (user_id, invited_by), which makes embedding ambiguous.
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, email')
    .in('id', members.map((m) => m.user_id))

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]))

  res.json({
    members: members.map((m) => ({
      userId: m.user_id,
      role: m.role,
      name: profileById.get(m.user_id)?.name ?? null,
      email: profileById.get(m.user_id)?.email ?? null,
      addedAt: m.created_at,
    })),
  })
})

// ── POST /api/servers/:id/members ────────────────────────────
// Invite an existing registered user by email. Owner-only.
router.post('/:id/members', validateBody(inviteMemberSchema), async (req, res) => {
  if (!(await requireRole(req, res, req.params.id, 'owner'))) return

  const { email, role } = req.body

  const { data: invitedUser } = await supabase
    .from('profiles')
    .select('id, name, email')
    .ilike('email', email)
    .maybeSingle()

  if (!invitedUser) {
    return res.status(404).json({ error: 'No doco-pilot account found for that email — ask them to sign up first' })
  }

  const existingMembership = await getMembership(req.params.id, invitedUser.id)
  if (existingMembership) {
    return res.status(409).json({ error: 'That user already has access to this server' })
  }

  const { error: insertError } = await supabase
    .from('server_members')
    .insert({ server_id: req.params.id, user_id: invitedUser.id, role, invited_by: req.user.id })

  if (insertError) {
    logger.error({ err: insertError }, 'Invite member error')
    return res.status(500).json({ error: 'Failed to add member' })
  }

  invalidateServerMemberCache(req.params.id)

  const { data: server } = await supabase.from('servers').select('name').eq('id', req.params.id).single()

  sendMail({
    to: invitedUser.email,
    subject: `You've been added to "${server?.name ?? 'a server'}" on doco-pilot`,
    html: memberInvitedEmail({ serverName: server?.name ?? 'a server', role, inviterName: req.user.name ?? req.user.email }),
  }).catch((err) => logger.error({ err }, 'Failed to send member-invited email'))

  auditLog({ req, action: 'members:invite', target: invitedUser.email, serverId: req.params.id })
  res.status(201).json({ member: { userId: invitedUser.id, role, name: invitedUser.name, email: invitedUser.email } })
})

// ── PATCH /api/servers/:id/members/:userId ───────────────────
router.patch('/:id/members/:userId', validateBody(updateMemberSchema), async (req, res) => {
  if (!(await requireRole(req, res, req.params.id, 'owner'))) return

  if (req.body.role !== 'owner') {
    const blocked = await wouldRemoveLastOwner(req.params.id, req.params.userId)
    if (blocked) return res.status(400).json({ error: 'A server must have at least one owner' })
  }

  const { data, error } = await supabase
    .from('server_members')
    .update({ role: req.body.role })
    .eq('server_id', req.params.id)
    .eq('user_id', req.params.userId)
    .select('user_id, role')
    .single()

  if (error || !data) return res.status(404).json({ error: 'Member not found' })

  invalidateServerMemberCache(req.params.id)
  auditLog({ req, action: 'members:update-role', target: req.params.userId, serverId: req.params.id })
  res.json({ member: { userId: data.user_id, role: data.role } })
})

// ── DELETE /api/servers/:id/members/:userId ──────────────────
router.delete('/:id/members/:userId', async (req, res) => {
  if (!(await requireRole(req, res, req.params.id, 'owner'))) return

  const blocked = await wouldRemoveLastOwner(req.params.id, req.params.userId)
  if (blocked) return res.status(400).json({ error: 'A server must have at least one owner' })

  const { error } = await supabase
    .from('server_members')
    .delete()
    .eq('server_id', req.params.id)
    .eq('user_id', req.params.userId)

  if (error) return res.status(500).json({ error: 'Failed to remove member' })

  invalidateServerMemberCache(req.params.id)
  auditLog({ req, action: 'members:remove', target: req.params.userId, serverId: req.params.id })
  res.status(204).end()
})

// True if changing/removing this member's role would leave the server
// with zero owners.
async function wouldRemoveLastOwner(serverId, userId) {
  const { data: member } = await supabase
    .from('server_members')
    .select('role')
    .eq('server_id', serverId)
    .eq('user_id', userId)
    .single()

  if (member?.role !== 'owner') return false

  const { count } = await supabase
    .from('server_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('server_id', serverId)
    .eq('role', 'owner')

  return (count ?? 0) <= 1
}

export default router