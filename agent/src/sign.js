import { createHmac, timingSafeEqual } from 'crypto'

const SECRET = process.env.AGENT_SECRET

// Build the signed handshake query string for WS connection
// agentKey itself is used as HMAC secret (both sides know it)
export function buildHandshakeUrl(baseUrl, agentKey) {
  const ts      = Date.now()
  const payload = `${agentKey}:${ts}`
  const sig     = createHmac('sha256', agentKey).update(payload).digest('hex')

  const url = new URL('/ws', baseUrl)
  url.searchParams.set('type',     'agent')
  url.searchParams.set('agentKey', agentKey)
  url.searchParams.set('ts',       ts)
  url.searchParams.set('sig',      sig)
  url.protocol = baseUrl.startsWith('wss') ? 'wss:' : 'ws:'

  return url.toString()
}