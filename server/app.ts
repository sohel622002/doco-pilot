import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import type { Request, Response, NextFunction } from 'express'
import { env } from './env.js'
import { logger } from './utils/logger.js'

import authRoutes   from './routes/auth/index.js'
import serverRoutes from './routes/servers/index.js'
import { apiLimiter } from './middleware/rateLimiter.js'

const app = express()

// ── CORS ─────────────────────────────────────────────────────
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true // required for cookies
}))

// ── Body parsing ─────────────────────────────────────────────
app.use(express.json({ limit: '10kb' })) // prevent large payload attacks
app.use(cookieParser())

// ── Trust proxy (needed for req.ip behind nginx/load balancer)
if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
}

// ── Global rate limit ────────────────────────────────────────
app.use('/api', apiLimiter)

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',    authRoutes)
app.use('/api/servers', serverRoutes)

// ── Health check ─────────────────────────────────────────────
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', ts: new Date().toISOString() })
})

// ── 404 handler ──────────────────────────────────────────────
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' })
})

// ── Error handler ────────────────────────────────────────────
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err }, 'Unhandled error')
  res.status(500).json({ error: 'Internal server error' })
})

export default app
