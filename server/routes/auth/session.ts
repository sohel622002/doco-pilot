import { Router } from 'express'
import { signAccessToken, generateRefreshToken, setAuthCookies, clearAuthCookies, hashToken, compareToken } from '../../utils/auth.js'
import { requireAuth } from '../../middleware/auth.js'
import * as profiles from '../../repositories/profileRepository.js'
import * as tokens from '../../repositories/authTokenRepository.js'
import { REFRESH_TOKEN_TTL_MS } from './shared.js'

const router = Router()

// ── POST /api/auth/refresh ───────────────────────────────────
router.post('/refresh', async (req, res) => {
  const incomingToken: string | undefined = req.cookies?.refresh_token
  const [selector, verifier] = incomingToken?.split('.') ?? []

  if (!selector || !verifier) {
    return res.status(401).json({ error: 'No refresh token' })
  }

  // Indexed lookup by selector instead of scanning + bcrypt-comparing every
  // active token in the table.
  const { data: matchedToken } = await tokens.findActiveRefreshTokenBySelector(selector)

  if (!matchedToken || !(await compareToken(verifier, matchedToken.token_hash))) {
    clearAuthCookies(res)
    return res.status(401).json({ error: 'Invalid refresh token' })
  }

  // Fetch user profile
  const { data: profile } = await profiles.findProfile(matchedToken.user_id)

  if (!profile) {
    return res.status(401).json({ error: 'User not found' })
  }

  // Rotate: delete old, issue new
  await tokens.deleteRefreshTokenById(matchedToken.id)

  const user = { id: profile.id, email: profile.email }
  const newAccessToken = signAccessToken(user, req.ip)
  const { selector: newSelector, verifier: newVerifier, cookieValue: newRefreshToken } = generateRefreshToken()
  const newVerifierHash = await hashToken(newVerifier)

  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString()
  await tokens.insertRefreshToken(user.id, newSelector, newVerifierHash, expiresAt)
  tokens.deleteExpiredRefreshTokens().catch(() => {})

  setAuthCookies(res, newAccessToken, newRefreshToken)
  res.json({ user: { id: user.id, email: user.email } })
})

// ── POST /api/auth/logout ────────────────────────────────────
router.post('/logout', requireAuth, async (req, res) => {
  const incomingToken: string | undefined = req.cookies?.refresh_token
  const [selector, verifier] = incomingToken?.split('.') ?? []

  if (selector && verifier) {
    const { data: matchedToken } = await tokens.findActiveRefreshTokenBySelector(selector)

    if (matchedToken && matchedToken.user_id === req.user!.id && (await compareToken(verifier, matchedToken.token_hash))) {
      await tokens.deleteRefreshTokenById(matchedToken.id)
    }
  }

  clearAuthCookies(res)
  res.json({ message: 'Logged out' })
})

export default router
