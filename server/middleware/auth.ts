import jwt from 'jsonwebtoken'
import type { Request, Response, NextFunction } from 'express'
import type { AuthUser } from '../types/express.js'
import { env } from '../env.js'

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const user = jwt.verify(token, env.JWT_SECRET) as AuthUser & { ip?: string }

    // Optional IP binding — off by default. Behind Render/Cloudflare/etc.
    // req.ip often differs from the IP baked into the JWT (proxy hops,
    // IPv4↔IPv6, mobile/CGNAT), which falsely returns "Token IP mismatch".
    if (env.BIND_JWT_TO_IP && user.ip && user.ip !== req.ip) {
      return res.status(401).json({ error: 'Token IP mismatch' })
    }

    req.user = user
    next()
  } catch (err) {
    if ((err as Error).name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' })
    }
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// Optional auth — attaches user if token present, but doesn't block
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token
  if (token) {
    try {
      req.user = jwt.verify(token, env.JWT_SECRET) as AuthUser
    } catch {
      // ignore — treat as unauthenticated
    }
  }
  next()
}
