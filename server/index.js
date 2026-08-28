import { createServer } from 'http'
import 'dotenv/config'
import app from './app.js'
import { setupWebSocket } from './ws/index.js'
import { logger } from './utils/logger.js'

const PORT = process.env.PORT || 3001

const server = createServer(app)

// Attach WebSocket to the same HTTP server
setupWebSocket(server)

server.listen(PORT, () => {
  logger.info(`Backend running on port ${PORT}`)
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
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