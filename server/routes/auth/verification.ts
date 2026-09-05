import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.js'
import { authLimiter } from '../../middleware/rateLimiter.js'
import { validateBody } from '../../middleware/validate.js'
import { verifyEmailSchema } from '../../schemas/index.js'
import { auditLog } from '../../services/auditService.js'
import { compareToken } from '../../utils/auth.js'
import * as profiles from '../../repositories/profileRepository.js'
import * as tokens from '../../repositories/authTokenRepository.js'
import { sendVerificationEmail } from './shared.js'

const router = Router()

// ── POST /api/auth/verify-email ──────────────────────────────
router.post('/verify-email', authLimiter, validateBody(verifyEmailSchema), async (req, res) => {
  const { token } = req.body

  const { data: pending } = await tokens.listActiveEmailVerifications()

  if (!pending || pending.length === 0) {
    return res.status(400).json({ error: 'Invalid or expired verification token' })
  }

  let matched = null
  for (const p of pending) {
    if (await compareToken(token, p.token_hash)) {
      matched = p
      break
    }
  }

  if (!matched) {
    return res.status(400).json({ error: 'Invalid or expired verification token' })
  }

  await profiles.markEmailVerified(matched.user_id)
  await tokens.deleteEmailVerificationsForUser(matched.user_id)

  auditLog({ req: { user: { id: matched.user_id, email: '' }, ip: req.ip }, action: 'auth:verify-email', target: matched.user_id })

  res.json({ message: 'Email verified' })
})

// ── POST /api/auth/resend-verification ───────────────────────
router.post('/resend-verification', requireAuth, authLimiter, async (req, res) => {
  const { data: profile } = await profiles.findVerificationStatus(req.user!.id)

  if (!profile) return res.status(404).json({ error: 'User not found' })
  if (profile.email_verified) return res.json({ message: 'Email already verified' })

  await tokens.deleteEmailVerificationsForUser(profile.id)
  await sendVerificationEmail(profile.id, profile.email)

  res.json({ message: 'Verification email sent' })
})

export default router
