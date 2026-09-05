import { Router } from 'express'
import { requireRole } from '../../services/membershipService.js'
import { auditLog } from '../../services/auditService.js'
import { validateBody } from '../../middleware/validate.js'
import { createStackSchema, updateStackSchema } from '../../schemas/index.js'
import { logger } from '../../utils/logger.js'
import * as stackRepo from '../../repositories/stackRepository.js'

const router = Router()

// ── Saved Compose stacks (metadata store — deploy/down/list happens ─
// live through the agent; this is just so redeploys don't require
// re-pasting the YAML) ────────────────────────────────────────────

// ── GET /api/servers/:id/stacks ──────────────────────────────
router.get('/:id/stacks', async (req, res) => {
  if (!(await requireRole(req, res, req.params.id, 'viewer'))) return

  const { data, error } = await stackRepo.listStacks(req.params.id)

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
  const { data, error } = await stackRepo.upsertStack(req.params.id, name, composeYaml)

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

  const { data, error } = await stackRepo.updateStack(req.params.stackId, req.params.id, req.body.composeYaml)

  if (error || !data) return res.status(404).json({ error: 'Stack not found' })

  auditLog({ req, action: 'stacks:update', target: data.name, serverId: req.params.id })
  res.json({ stack: data })
})

// ── DELETE /api/servers/:id/stacks/:stackId ───────────────────
// Only removes the saved YAML — does not stop/remove a running stack.
router.delete('/:id/stacks/:stackId', async (req, res) => {
  if (!(await requireRole(req, res, req.params.id, 'owner'))) return

  const { data, error } = await stackRepo.deleteStack(req.params.stackId, req.params.id)

  if (error || !data) return res.status(404).json({ error: 'Stack not found' })

  auditLog({ req, action: 'stacks:delete', target: data.name, serverId: req.params.id })
  res.status(204).end()
})

export default router
