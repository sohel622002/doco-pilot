import { Router } from 'express'
import { randomBytes } from 'crypto'
import {
  signAccessToken,
  generateRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  hashPassword,
  comparePassword,
  hashToken,
  compareToken,
} from '../../utils/auth.js'
import { requireAuth } from '../../middleware/auth.js'
import { authLimiter } from '../../middleware/rateLimiter.js'
import { validateBody } from '../../middleware/validate.js'
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from '../../schemas/index.js'
import { auditLog } from '../../services/auditService.js'
import { logger } from '../../utils/logger.js'
import { sendMail, passwordResetEmail } from '../../services/mailService.js'
import * as profiles from '../../repositories/profileRepository.js'
import * as tokens from '../../repositories/authTokenRepository.js'
import { env } from '../../env.js'
import { issueSession, sendVerificationEmail, REFRESH_TOKEN_TTL_MS } from './shared.js'

const router = Router()

// ── POST /api/auth/register ──────────────────────────────────
router.post('/register', authLimiter, validateBody(registerSchema), async (req, res) => {
  try {
    const { name, email, password } = req.body

    const normalizedEmail = email.toLowerCase()

    // Check if user exists
    const { data: existing } = await profiles.findIdByEmail(normalizedEmail)

    if (existing) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    const passwordHash = await hashPassword(password)

    const { data: user, error } = await profiles.insertProfile(name, normalizedEmail, passwordHash)

    if (error) {
      logger.error({ err: error }, 'Register: failed to create account')
      return res.status(500).json({ error: 'Failed to create account' })
    }

    const accessToken = signAccessToken(user, req.ip)
    const { selector, verifier, cookieValue } = generateRefreshToken()
    const verifierHash = await hashToken(verifier)

    await tokens.insertRefreshToken(user.id, selector, verifierHash, new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString())
    tokens.deleteExpiredRefreshTokens().catch(() => {})

    setAuthCookies(res, accessToken, cookieValue)

    // Fire-and-forget: don't block the response on email delivery
    sendVerificationEmail(user.id, normalizedEmail).catch((err) =>
      logger.error({ err }, 'Failed to send verification email')
    )

    res.status(201).json({ user })
  } catch (err) {
    logger.error({ err }, 'Register: unexpected error')
    res.status(500).json({ error: 'Server error' })
  }
})

// ── POST /api/auth/login ─────────────────────────────────────
router.post('/login', authLimiter, validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body

  const normalizedEmail = email.toLowerCase()

  const { data: user, error } = await profiles.findForLogin(normalizedEmail)

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  if (!user.password_hash) {
    return res.status(401).json({
      error: 'This account uses Google sign-in. Continue with Google.',
    })
  }

  const isValid = await comparePassword(password, user.password_hash)

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const payload = await issueSession(res, user, req.ip)
  res.json({ user: payload })
})

// ── POST /api/auth/forgot-password ───────────────────────────
// Always responds 200 regardless of whether the email exists, to avoid
// leaking which emails are registered.
router.post('/forgot-password', authLimiter, validateBody(forgotPasswordSchema), async (req, res) => {
  const normalizedEmail = req.body.email.toLowerCase()

  const { data: user } = await profiles.findIdByEmail(normalizedEmail)

  if (user) {
    const resetToken = randomBytes(32).toString('hex')
    const tokenHash = await hashToken(resetToken)

    await tokens.insertPasswordReset(user.id, tokenHash, new Date(Date.now() + 60 * 60 * 1000).toISOString())

    const resetLink = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`

    await sendMail({ to: normalizedEmail, subject: 'Reset your password', html: passwordResetEmail(resetLink) })

    auditLog({ req: { user: { id: user.id, email: normalizedEmail }, ip: req.ip }, action: 'auth:forgot-password', target: user.id })
  }

  res.json({ message: 'If that email is registered, a reset link has been sent' })
})

// ── POST /api/auth/reset-password ────────────────────────────
router.post('/reset-password', authLimiter, validateBody(resetPasswordSchema), async (req, res) => {
  const { token, password } = req.body

  const { data: resets } = await tokens.listActivePasswordResets()

  if (!resets || resets.length === 0) {
    return res.status(400).json({ error: 'Invalid or expired reset token' })
  }

  let matched = null
  for (const r of resets) {
    if (await compareToken(token, r.token_hash)) {
      matched = r
      break
    }
  }

  if (!matched) {
    return res.status(400).json({ error: 'Invalid or expired reset token' })
  }

  const passwordHash = await hashPassword(password)

  const { error: updateError } = await profiles.updatePasswordHash(matched.user_id, passwordHash)

  if (updateError) {
    return res.status(500).json({ error: 'Failed to reset password' })
  }

  // Invalidate this token and any other outstanding tokens/sessions for the user
  await tokens.deletePasswordResetsForUser(matched.user_id)
  await tokens.deleteRefreshTokensForUser(matched.user_id)

  auditLog({ req: { user: { id: matched.user_id, email: '' }, ip: req.ip }, action: 'auth:reset-password', target: matched.user_id })

  res.json({ message: 'Password reset — please log in again' })
})

// ── POST /api/auth/change-password ───────────────────────────
router.post('/change-password', requireAuth, validateBody(changePasswordSchema), async (req, res) => {
  const { currentPassword, newPassword } = req.body

  const { data: user, error } = await profiles.findPasswordHash(req.user!.id)

  if (error || !user) {
    return res.status(404).json({ error: 'User not found' })
  }

  if (!user.password_hash) {
    return res.status(400).json({
      error: 'This account uses Google sign-in and has no password to change',
    })
  }

  const isValid = await comparePassword(currentPassword, user.password_hash)
  if (!isValid) {
    return res.status(401).json({ error: 'Current password is incorrect' })
  }

  const newHash = await hashPassword(newPassword)

  const { error: updateError } = await profiles.updatePasswordHash(req.user!.id, newHash)

  if (updateError) {
    return res.status(500).json({ error: 'Failed to update password' })
  }

  // Invalidate all refresh tokens — every session (including this one) must log in again
  await tokens.deleteRefreshTokensForUser(req.user!.id)
  clearAuthCookies(res)

  auditLog({ req, action: 'auth:change-password', target: req.user!.id })

  res.json({ message: 'Password updated — please log in again' })
})

export default router
