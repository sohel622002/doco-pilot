import { createHmac, timingSafeEqual } from 'crypto'

// Verify agent handshake (agentKey + timestamp + HMAC)
export function verifyAgentHandshake(agentKey: string, ts: string, sig: string, agentSecret: string) {
  const MAX_DRIFT_MS = 30_000 // 30 seconds

  if (Math.abs(Date.now() - Number(ts)) > MAX_DRIFT_MS) {
    throw new Error('Request expired')
  }

  const payload = `${agentKey}:${ts}`
  const expected = createHmac('sha256', agentSecret).update(payload).digest('hex')

  const a = Buffer.from(sig, 'hex')
  const b = Buffer.from(expected, 'hex')

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('Invalid handshake signature')
  }
}
