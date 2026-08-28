import 'dotenv/config'
import { pingDocker } from './docker.js'
import { connect, shutdown } from './ws.js'

// ── Validate required env vars ───────────────────────────────
const REQUIRED = ['AGENT_KEY', 'AGENT_SECRET', 'BACKEND_WS_URL']
const missing  = REQUIRED.filter(k => !process.env[k])

if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(', ')}`)
  process.exit(1)
}

// ── Validate AGENT_KEY format: {serverId}.{secret} ───────────
if (!process.env.AGENT_KEY.includes('.')) {
  console.error('AGENT_KEY format invalid — expected {serverId}.{secret}')
  process.exit(1)
}

// ── Start ────────────────────────────────────────────────────
async function main() {
  console.log('Docker Manager Agent starting...')

  // Verify Docker socket is reachable before connecting to backend
  try {
    await pingDocker()
  } catch (err) {
    console.error('Cannot reach Docker socket:', err.message)
    console.error('Make sure /var/run/docker.sock is mounted into this container')
    process.exit(1)
  }

  connect()
}

main()

// ── Graceful shutdown ─────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('SIGTERM received — shutting down')
  shutdown()
  process.exit(0)
})

process.on('SIGINT', () => {
  shutdown()
  process.exit(0)
})

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
  // Don't exit — keep the agent running
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
})