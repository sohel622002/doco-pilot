import { Router } from 'express'
import { requireRole } from '../../services/membershipService.js'
import * as serverRepo from '../../repositories/serverRepository.js'
import * as metricsRepo from '../../repositories/metricsRepository.js'
import { logger } from '../../utils/logger.js'

const router = Router()

// ── GET /api/servers/:id/metrics ─────────────────────────────
// Historical CPU/mem/disk/network samples for trend charts
const METRICS_RANGE_MS: Record<string, number> = {
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
}

router.get('/:id/metrics', async (req, res) => {
  const requestedRange = req.query.range as string
  const range = METRICS_RANGE_MS[requestedRange] ? requestedRange : '1h'

  if (!(await requireRole(req, res, req.params.id, 'viewer'))) return

  const since = new Date(Date.now() - METRICS_RANGE_MS[range]).toISOString()

  const { data, error } = await metricsRepo.listMetrics(req.params.id, since)

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

  const { data, error } = await metricsRepo.listDockerEvents(req.params.id, limit)

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

  const { data, error } = await metricsRepo.listAlertEvents(req.params.id, limit)

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

  const { data: server } = await serverRepo.findForUptime(req.params.id)

  if (!server) return res.status(404).json({ error: 'Server not found' })

  const now = Date.now()
  const windowStart = now - UPTIME_WINDOW_DAYS * 24 * 60 * 60 * 1000
  const effectiveStart = Math.max(windowStart, new Date(server.created_at).getTime())

  // Seed state: the last known connection state before the window,
  // so a status change just outside the window is still accounted for.
  const { data: seedEvent } = await metricsRepo.findSeedStatusEvent(server.id, new Date(effectiveStart).toISOString())

  const { data: events, error } = await metricsRepo.listStatusEventsSince(server.id, new Date(effectiveStart).toISOString())

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
