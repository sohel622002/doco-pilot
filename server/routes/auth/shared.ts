import type { Response } from 'express'
import { randomBytes } from 'crypto'
import { signAccessToken, signRefreshToken, setAuthCookies, hashToken } from '../../utils/auth.js'
import { sendMail, verificationEmail } from '../../services/mailService.js'
import * as tokens from '../../repositories/authTokenRepository.js'
import { env } from '../../env.js'

// Shared by the register/login/google/refresh sub-routers — a session is
// always "sign an access token + a fresh refresh token + persist its hash".
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

export async function issueSession(res: Response, user: { id: string; email: string }, ip?: string) {
  const payload = { id: user.id, email: user.email }
  const accessToken = signAccessToken(payload, ip)
  const refreshToken = signRefreshToken()
  const refreshTokenHash = await hashToken(refreshToken)

  await tokens.insertRefreshToken(user.id, refreshTokenHash, new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString())

  setAuthCookies(res, accessToken, refreshToken)
  return payload
}

// Used by the Google OAuth flow to redirect back to the SPA (success or error).
export function frontendRedirect(path = '/') {
  const base = env.FRONTEND_URL.replace(/\/$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

// Shared by register + resend-verification.
export async function sendVerificationEmail(userId: string, email: string) {
  const token = randomBytes(32).toString('hex')
  const tokenHash = await hashToken(token)

  await tokens.insertEmailVerification(userId, tokenHash, new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())

  const link = `${env.FRONTEND_URL}/verify-email?token=${token}`
  await sendMail({ to: email, subject: 'Verify your email', html: verificationEmail(link) })
}
