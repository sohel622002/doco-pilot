import rateLimit from 'express-rate-limit'
import { env } from '../env.js'

const isDev = env.NODE_ENV !== 'production'

// General API rate limit (disabled in local dev — HMR + auth retries burn the budget fast)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev,
  message: { error: 'Too many requests, please try again later' }
})

// Strict limit for auth endpoints (login / register)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again later' }
})

// Per-user in-memory WebSocket rate limiter (60 WS commands/min per user)
interface WsCounter {
  count: number
  resetAt: number
}
const wsCounters = new Map<string, WsCounter>() // userId → { count, resetAt }

export function wsRateLimit(userId: string) {
  const now = Date.now()
  let entry = wsCounters.get(userId)

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + 60_000 }
  }

  entry.count++
  wsCounters.set(userId, entry)

  if (entry.count > 60) {
    throw new Error('WebSocket rate limit exceeded')
  }
}

// Clean up stale counters every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of wsCounters.entries()) {
    if (now > val.resetAt) wsCounters.delete(key)
  }
}, 5 * 60 * 1000)
