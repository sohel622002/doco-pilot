import type { WebSocket } from 'ws'

// In-memory socket registries, shared across the ws/ package.
// agentSockets:  serverId  → WebSocket
// clientSockets: userId    → Set<WebSocket>
export const agentSockets = new Map<string, WebSocket>()
export const clientSockets = new Map<string, Set<WebSocket>>()

export interface AgentUser {
  id: string
  email: string
  name?: string
}
