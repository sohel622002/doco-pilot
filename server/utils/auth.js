import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { randomBytes } from 'crypto'

const SALT_ROUNDS = 12

// ── JWT ──────────────────────────────────────────────────────

export function signAccessToken(user, ip) {
  return jwt.sign(
    { id: user.id, email: user.email, ip },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  )
}

export function signRefreshToken() {
  return randomBytes(64).toString('hex')
}

export function setAuthCookies(res, accessToken, refreshToken) {
  const isProd = process.env.NODE_ENV === 'production'

  res.cookie('token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000 // 15 min
  })

  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth/refresh' // only sent to refresh endpoint
  })
}

export function clearAuthCookies(res) {
  const isProd = process.env.NODE_ENV === 'production'
  const sameSite = isProd ? 'none' : 'lax'

  res.clearCookie('token', { httpOnly: true, secure: isProd, sameSite })
  res.clearCookie('refresh_token', { httpOnly: true, secure: isProd, sameSite, path: '/api/auth/refresh' })
}

// ── Hashing ──────────────────────────────────────────────────

export function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS)
}

export function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash)
}

export function hashToken(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS)
}

export function compareToken(plain, hash) {
  return bcrypt.compare(plain, hash)
}

// ── Agent key generation ─────────────────────────────────────
// Format: {serverId}.{randomSecret}
// On verify: split by '.', fetch server by id, bcrypt.compare the secret
export function generateAgentCredentials(serverId) {
  const secret = randomBytes(32).toString('hex')
  const agentKey = `${serverId}.${secret}`
  return { agentKey, secret }
}