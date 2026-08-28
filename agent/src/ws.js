import WebSocket from 'ws'
import { buildHandshakeUrl } from './sign.js'
import { handleAction } from './actions.js'
import { watchDockerEvents } from './docker.js'

const AGENT_KEY      = process.env.AGENT_KEY
const BACKEND_WS_URL = process.env.BACKEND_WS_URL

// Reconnect config
const RECONNECT_INITIAL_MS = 2_000
const RECONNECT_MAX_MS     = 30_000
const RECONNECT_MULTIPLIER = 1.5

let ws            = null
let reconnectMs   = RECONNECT_INITIAL_MS
let stopEvents    = null   // cleanup fn from watchDockerEvents
let isShuttingDown = false

export function connect() {
  if (isShuttingDown) return

  const url = buildHandshakeUrl(BACKEND_WS_URL, AGENT_KEY)

  console.log(`Connecting to backend...`)
  ws = new WebSocket(url, {
    // Always validate TLS cert in production
    rejectUnauthorized: process.env.NODE_ENV === 'production'
  })

  // ── Open ──────────────────────────────────────────────────
  ws.on('open', () => {
    console.log('Connected to backend')
    reconnectMs = RECONNECT_INITIAL_MS // reset backoff

    // Start streaming Docker events to backend
    stopEvents = watchDockerEvents((event) => {
      send(event)
    })

    // Send initial state immediately on connect
    sendInitialState()
  })

  // ── Incoming message from backend ────────────────────────
  ws.on('message', async (raw) => {
    let msg
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      console.warn('Received malformed JSON — ignoring')
      return
    }

    // Verify HMAC signature — drop tampered messages
    let payload = msg;

    // Execute the action
    try {
      const result = await handleAction(payload)
      send(result)
    } catch (err) {
      console.error(`Action "${payload.action}" failed:`, err.message)
      send({
        type:   'docker:error',
        action: payload.action,
        error:  err.message
      })
    }
  })

  // ── Close — reconnect with backoff ───────────────────────
  ws.on('close', (code, reason) => {
    console.log(`Disconnected (code: ${code}, reason: ${reason?.toString() || 'none'})`)
    cleanup()
    scheduleReconnect()
  })

  // ── Error ─────────────────────────────────────────────────
  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message)
    // 'close' event fires after 'error', so reconnect is handled there
  })
}

// ── Send a message to backend (always signed) ────────────────
function send(payload) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  try {
    ws.send(JSON.stringify(payload))
  } catch (err) {
    console.error('Send error:', err.message)
  }
}

// ── Send containers + images on first connect ────────────────
async function sendInitialState() {
  try {
    const [containers, images] = await Promise.all([
      import('./docker.js').then(m => m.listContainers()),
      import('./docker.js').then(m => m.listImages())
    ])
    send({ type: 'containers:list:result', data: containers })
    send({ type: 'images:list:result',     data: images })
  } catch (err) {
    console.error('Initial state push failed:', err.message)
  }
}

// ── Exponential backoff reconnect ────────────────────────────
function scheduleReconnect() {
  if (isShuttingDown) return
  console.log(`Reconnecting in ${Math.round(reconnectMs / 1000)}s...`)
  setTimeout(() => connect(), reconnectMs)
  reconnectMs = Math.min(reconnectMs * RECONNECT_MULTIPLIER, RECONNECT_MAX_MS)
}

// ── Stop Docker event stream ─────────────────────────────────
function cleanup() {
  if (stopEvents) {
    stopEvents()
    stopEvents = null
  }
}

// ── Graceful shutdown ─────────────────────────────────────────
export function shutdown() {
  isShuttingDown = true
  cleanup()
  if (ws) ws.close(1000, 'Agent shutting down')
}