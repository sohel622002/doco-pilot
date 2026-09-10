import { Router } from 'express'
import { logger } from '../utils/logger.js'
import { listVisibleAuditLogs } from '../repositories/auditRepository.js'
import { listMemberships } from '../repositories/membershipRepository.js'

const router = Router()

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 50

// ── GET /api/audit-logs ───────────────────────────────────────
// The caller's own actions, plus actions on any server they're a member of.
router.get('/', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, MAX_LIMIT)
  const offset = Math.max(Number(req.query.offset) || 0, 0)

  const { data: memberships, error: memError } = await listMemberships(req.user!.id)

  if (memError) {
    logger.error({ err: memError }, 'Fetch memberships for audit log error')
    return res.status(500).json({ error: 'Failed to fetch audit logs' })
  }

  const serverIds = (memberships ?? []).map((m: any) => m.server_id)

  const { data, error } = await listVisibleAuditLogs(req.user!.id, serverIds, limit, offset)

  if (error) {
    logger.error({ err: error }, 'Fetch audit logs error')
    return res.status(500).json({ error: 'Failed to fetch audit logs' })
  }

  res.json({ logs: data ?? [], limit, offset })
})

export default router
