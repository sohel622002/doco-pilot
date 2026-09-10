import { createServer } from 'http'
import { env } from './env.js'
import app from './app.js'
import { setupWebSocket } from './ws/index.js'
import { logger } from './utils/logger.js'
import { startRetentionSchedule } from './services/retentionService.js'

const server = createServer(app)

// Attach WebSocket to the same HTTP server
setupWebSocket(server)

// Periodically prune old metrics/events rows
startRetentionSchedule()

server.listen(env.PORT, () => {
  logger.info(`Backend running on port ${env.PORT}`)
  logger.info(`Environment: ${env.NODE_ENV}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully')
  server.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  server.close(() => process.exit(0))
})
