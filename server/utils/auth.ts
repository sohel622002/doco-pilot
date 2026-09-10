import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { randomBytes } from 'crypto'
import type { Response } from 'express'
import { env } from '../env.js'

const SALT_ROUNDS = 12

interface UserPayload {
  id: string
  email: string
}

// ── JWT ──────────────────────────────────────────────────────

export function signAccessToken(user: UserPayload, ip?: string) {
  return jwt.sign(
    { id: user.id, email: user.email, ip },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
  )
}

// A refresh token cookie is "{selector}.{verifier}". The selector is stored in
// plaintext and indexed, so refresh can look up the owning row directly instead
// of bcrypt-comparing against every active token in the table. The verifier is
// the actual secret and is only ever stored hashed.
export function generateRefreshToken() {
  const selector = randomBytes(16).toString('hex')
  const verifier = randomBytes(64).toString('hex')
  return { selector, verifier, cookieValue: `${selector}.${verifier}` }
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const isProd = env.NODE_ENV === 'production'

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

export function clearAuthCookies(res: Response) {
  const isProd = env.NODE_ENV === 'production'
  const sameSite = isProd ? 'none' : 'lax'

  res.clearCookie('token', { httpOnly: true, secure: isProd, sameSite })
  res.clearCookie('refresh_token', { httpOnly: true, secure: isProd, sameSite, path: '/api/auth/refresh' })
}

// ── Hashing ──────────────────────────────────────────────────

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, SALT_ROUNDS)
}

export function comparePassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash)
}

export function hashToken(plain: string) {
  return bcrypt.hash(plain, SALT_ROUNDS)
}

export function compareToken(plain: string, hash: string) {
  return bcrypt.compare(plain, hash)
}

// ── Agent key generation ─────────────────────────────────────
// Format: {serverId}.{randomSecret}
// On verify: split by '.', fetch server by id, bcrypt.compare the secret
export function generateAgentCredentials(serverId: string) {
  const secret = randomBytes(32).toString('hex')
  const agentKey = `${serverId}.${secret}`
  return { agentKey, secret }
}
