import { Router } from 'express'
import { randomBytes } from 'crypto'
import { authLimiter } from '../../middleware/rateLimiter.js'
import { auditLog } from '../../services/auditService.js'
import { logger } from '../../utils/logger.js'
import {
  isGoogleAuthConfigured,
  buildGoogleAuthUrl,
  exchangeGoogleCode,
  fetchGoogleUser,
} from '../../services/googleAuthService.js'
import * as profiles from '../../repositories/profileRepository.js'
import { env } from '../../env.js'
import { issueSession, frontendRedirect } from './shared.js'

const router = Router()

// ── GET /api/auth/google ─────────────────────────────────────
router.get('/google', authLimiter, (req, res) => {
  if (!isGoogleAuthConfigured()) {
    return res.redirect(frontendRedirect('/login?error=google_not_configured'))
  }

  const state = randomBytes(16).toString('hex')
  const isProd = env.NODE_ENV === 'production'

  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000,
  })

  res.redirect(buildGoogleAuthUrl(state))
})

// ── GET /api/auth/google/callback ────────────────────────────
router.get('/google/callback', authLimiter, async (req, res) => {
  const fail = (reason = 'google_auth_failed') =>
    res.redirect(frontendRedirect(`/login?error=${encodeURIComponent(reason)}`))

  try {
    if (!isGoogleAuthConfigured()) return fail('google_not_configured')

    const { code, state, error: oauthError } = req.query
    const savedState = req.cookies?.oauth_state
    res.clearCookie('oauth_state')

    if (oauthError || !code || !state || !savedState || state !== savedState) {
      return fail('google_auth_failed')
    }

    const tokenResponse = await exchangeGoogleCode(String(code))
    if (!tokenResponse.access_token) return fail('google_auth_failed')

    const googleUser = await fetchGoogleUser(tokenResponse.access_token as string)

    // Prefer existing Google-linked account
    let { data: user } = await profiles.findByGoogleId(googleUser.googleId)

    if (!user) {
      // Link or create by email
      const { data: byEmail } = await profiles.findByEmailForGoogleLink(googleUser.email)

      if (byEmail) {
        const { data: linked, error: linkError } = await profiles.linkGoogleAccount(byEmail.id, {
          google_id: googleUser.googleId,
          email_verified: googleUser.emailVerified || byEmail.email_verified,
          ...(byEmail.name ? {} : { name: googleUser.name }),
        })

        if (linkError || !linked) {
          logger.error({ err: linkError }, 'Google auth: failed to link account')
          return fail('google_auth_failed')
        }
        user = linked
      } else {
        const { data: created, error: createError } = await profiles.createGoogleAccount({
          name: googleUser.name,
          email: googleUser.email,
          google_id: googleUser.googleId,
          password_hash: null,
          email_verified: googleUser.emailVerified,
        })

        if (createError || !created) {
          logger.error({ err: createError }, 'Google auth: failed to create account')
          return fail('google_auth_failed')
        }
        user = created
      }
    }

    await issueSession(res, user, req.ip)
    auditLog({
      req: { user: { id: user.id, email: user.email }, ip: req.ip },
      action: 'auth:google',
      target: user.id,
    })

    res.redirect(frontendRedirect('/'))
  } catch (err) {
    logger.error({ err }, 'Google auth callback failed')
    return fail('google_auth_failed')
  }
})

export default router
