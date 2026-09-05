import { Router } from 'express'
import { signAccessToken, signRefreshToken, setAuthCookies, clearAuthCookies, hashToken, compareToken } from '../../utils/auth.js'
import { requireAuth } from '../../middleware/auth.js'
import * as profiles from '../../repositories/profileRepository.js'
import * as tokens from '../../repositories/authTokenRepository.js'
import { REFRESH_TOKEN_TTL_MS } from './shared.js'

const router = Router()

// ── POST /api/auth/refresh ───────────────────────────────────
router.post('/refresh', async (req, res) => {
  const incomingToken = req.cookies?.refresh_token

  if (!incomingToken) {
    return res.status(401).json({ error: 'No refresh token' })
  }

  // Find all non-expired refresh tokens and compare
  // (we don't store plain token so we must scan recent ones)
  const { data: activeTokens } = await tokens.listActiveRefreshTokens()

  if (!activeTokens || activeTokens.length === 0) {
    clearAuthCookies(res)
    return res.status(401).json({ error: 'Invalid refresh token' })
  }

  // Find matching token
  let matchedToken = null
  for (const t of activeTokens) {
    if (await compareToken(incomingToken, t.token_hash)) {
      matchedToken = t
      break
    }
  }

  if (!matchedToken) {
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
  const newRefreshToken = signRefreshToken()
  const newRefreshTokenHash = await hashToken(newRefreshToken)

  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString()
  await tokens.insertRefreshToken(user.id, newRefreshTokenHash, expiresAt)

  setAuthCookies(res, newAccessToken, newRefreshToken)
  res.json({ user: { id: user.id, email: user.email } })
})

// ── POST /api/auth/logout ────────────────────────────────────
router.post('/logout', requireAuth, async (req, res) => {
  const incomingToken = req.cookies?.refresh_token

  if (incomingToken) {
    const { data: userTokens } = await tokens.listRefreshTokensForUser(req.user!.id)

    for (const t of userTokens ?? []) {
      if (await compareToken(incomingToken, t.token_hash)) {
        await tokens.deleteRefreshTokenById(t.id)
        break
      }
    }
  }

  clearAuthCookies(res)
  res.json({ message: 'Logged out' })
})

export default router
