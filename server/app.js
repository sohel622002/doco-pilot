import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import 'dotenv/config'
import { logger } from './utils/logger.js'

import authRoutes   from './routes/auth.js'
import serverRoutes from './routes/servers.js'
import { apiLimiter } from './middleware/rateLimiter.js'

const app = express()

// ── CORS ─────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true // required for cookies
}))

// ── Body parsing ─────────────────────────────────────────────
app.use(express.json({ limit: '10kb' })) // prevent large payload attacks
app.use(cookieParser())

// ── Trust proxy (needed for req.ip behind nginx/load balancer)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
}

// ── Global rate limit ────────────────────────────────────────
app.use('/api', apiLimiter)

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',    authRoutes)
app.use('/api/servers', serverRoutes)

// ── Health check ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() })
})

// ── 404 handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// ── Error handler ────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error({ err }, 'Unhandled error')
  res.status(500).json({ error: 'Internal server error' })
})

export default app