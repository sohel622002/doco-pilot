import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.js'
import { validateBody } from '../../middleware/validate.js'
import { updateProfileSchema } from '../../schemas/index.js'
import { auditLog } from '../../services/auditService.js'
import * as profiles from '../../repositories/profileRepository.js'

const router = Router()

// ── GET /api/auth/me ─────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  const { data: profile } = await profiles.findProfile(req.user!.id)

  if (!profile) return res.status(404).json({ error: 'User not found' })
  res.json({ user: profile })
})

// ── PATCH /api/auth/me ───────────────────────────────────────
router.patch('/me', requireAuth, validateBody(updateProfileSchema), async (req, res) => {
  const { data: profile, error } = await profiles.updateName(req.user!.id, req.body.name)

  if (error || !profile) {
    return res.status(500).json({ error: 'Failed to update profile' })
  }

  auditLog({ req, action: 'auth:update-profile', target: req.user!.id })
  res.json({ user: profile })
})

export default router
