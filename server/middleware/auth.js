import jwt from 'jsonwebtoken'

export function requireAuth(req, res, next) {
  const token = req.cookies?.token

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET)

    // IP binding — reject if token was issued for a different IP
    if (user.ip && user.ip !== req.ip) {
      return res.status(401).json({ error: 'Token IP mismatch' })
    }

    req.user = user
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' })
    }
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// Optional auth — attaches user if token present, but doesn't block
export function optionalAuth(req, res, next) {
  const token = req.cookies?.token
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET)
    } catch {
      // ignore — treat as unauthenticated
    }
  }
  next()
}