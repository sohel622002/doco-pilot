import { WebSocketServer, type WebSocket } from 'ws'
import type { IncomingMessage, Server as HttpServer } from 'http'
import { logger } from '../utils/logger.js'
import { handleAgentConnection } from './agentConnection.js'
import { handleClientConnection } from './clientConnection.js'

export function setupWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || '', 'http://x')
    const type = url.searchParams.get('type')

    if (type === 'agent') {
      handleAgentConnection(ws, url, req)
    } else if (type === 'client') {
      handleClientConnection(ws, url, req)
    } else {
      ws.close(4000, 'Unknown connection type')
    }
  })

  logger.info('WebSocket server ready at /ws')
}

export { invalidateServerMemberCache, broadcastToUser } from './broadcast.js'
export { agentSockets, clientSockets } from './state.js'
export { ALLOWED_ACTIONS, VIEWER_ALLOWED_ACTIONS, EXEC_STREAM_ACTIONS } from './commandHandler.js'
export { checkForAlert } from './alerts.js'
