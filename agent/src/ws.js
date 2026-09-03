import WebSocket from 'ws'
import { buildHandshakeUrl } from './sign.js'
import { handleAction } from './actions.js'
import { watchDockerEvents, startExecSession, resizeExecSession, buildImageFromDockerfile } from './docker.js'
import { deployStack, downStack } from './stacks.js'

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

// sessionId → { exec, stream } — active interactive exec sessions
const execSessions = new Map()

function closeExecSession(sessionId) {
  const session = execSessions.get(sessionId)
  if (!session) return
  execSessions.delete(sessionId)
  try {
    session.stream.end()
  } catch {
    // stream may already be closed
  }
}

function closeAllExecSessions() {
  for (const sessionId of [...execSessions.keys()]) closeExecSession(sessionId)
}

async function handleExecStart({ sessionId, containerId, cols, rows }) {
  try {
    const { exec, stream } = await startExecSession(containerId, { cols, rows })
    execSessions.set(sessionId, { exec, stream })

    stream.on('data', (chunk) => {
      send({ type: 'containers:exec:data', sessionId, data: chunk.toString('utf8') })
    })
    stream.on('end', () => {
      execSessions.delete(sessionId)
      send({ type: 'containers:exec:exit', sessionId })
    })
    stream.on('error', (err) => {
      execSessions.delete(sessionId)
      send({ type: 'containers:exec:exit', sessionId, error: err.message })
    })

    send({ type: 'containers:exec:ready', sessionId, containerId })
  } catch (err) {
    send({ type: 'containers:exec:error', sessionId, error: err.message })
  }
}

function handleExecInput({ sessionId, data }) {
  const session = execSessions.get(sessionId)
  if (session?.stream?.writable && typeof data === 'string') {
    session.stream.write(data)
  }
}

async function handleExecResize({ sessionId, cols, rows }) {
  const session = execSessions.get(sessionId)
  if (!session || !(cols > 0) || !(rows > 0)) return
  try {
    await resizeExecSession(session.exec, cols, rows)
  } catch {
    // container may have exited between keystrokes — ignore
  }
}

function handleExecStop({ sessionId }) {
  closeExecSession(sessionId)
}

// ── Image build (streamed log lines, one-shot — not cancellable in V2) ──
async function handleImageBuildStart({ sessionId, imageName, dockerfile, buildArgs }) {
  try {
    const result = await buildImageFromDockerfile(
      dockerfile,
      { tag: imageName, buildArgs },
      (line) => send({ type: 'images:build:log', sessionId, line }),
    )
    send({ type: 'images:build:done', sessionId, ok: true, tag: result.tag })
  } catch (err) {
    send({ type: 'images:build:done', sessionId, ok: false, error: err.message })
  }
}

// ── Compose stack deploy/down (streamed log lines, one-shot) ────
async function handleStackDeployStart({ sessionId, stackName, composeYaml }) {
  try {
    await deployStack(stackName, composeYaml, (line) =>
      send({ type: 'stacks:deploy:log', sessionId, line }),
    )
    send({ type: 'stacks:deploy:done', sessionId, ok: true, name: stackName })
  } catch (err) {
    send({ type: 'stacks:deploy:done', sessionId, ok: false, error: err.message })
  }
}

async function handleStackDownStart({ sessionId, stackName }) {
  try {
    await downStack(stackName, (line) => send({ type: 'stacks:down:log', sessionId, line }))
    send({ type: 'stacks:down:done', sessionId, ok: true, name: stackName })
  } catch (err) {
    send({ type: 'stacks:down:done', sessionId, ok: false, error: err.message })
  }
}

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

    // Interactive exec is a persistent stream, not a single request/response —
    // handle it separately from the ACTION_HANDLERS request/reply model.
    switch (payload.action) {
      case 'containers:exec:start':
        return handleExecStart(payload)
      case 'containers:exec:input':
        return handleExecInput(payload)
      case 'containers:exec:resize':
        return handleExecResize(payload)
      case 'containers:exec:stop':
        return handleExecStop(payload)
      case 'images:build:start':
        return handleImageBuildStart(payload)
      case 'stacks:deploy:start':
        return handleStackDeployStart(payload)
      case 'stacks:down:start':
        return handleStackDownStart(payload)
    }

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
    closeAllExecSessions()
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
  closeAllExecSessions()
  if (ws) ws.close(1000, 'Agent shutting down')
}