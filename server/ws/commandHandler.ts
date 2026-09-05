import type { WebSocket } from 'ws'
import { wsRateLimit } from '../middleware/rateLimiter.js'
import { auditLog } from '../services/auditService.js'
import { getMembership } from '../services/membershipService.js'
import * as serverRepo from '../repositories/serverRepository.js'
import {
  validateContainerId,
  validateImageId,
  validateContainerName,
  validatePortMapping,
  validateEnvVar,
  validateVolumeName,
  validateNetworkId,
  validateNetworkDriver,
  validateCidrOrIp,
  validateSessionId,
  validateExecDimension,
  validateExecInput,
  validateDockerfileText,
  validateBuildArgs,
  validateStackName,
  validateComposeYaml,
} from '../validators/dockerValidators.js'
import { agentSockets } from './state.js'
import type { AgentUser } from './state.js'

// Allowed actions the frontend can request
export const ALLOWED_ACTIONS = new Set([
  'containers:list',
  'containers:inspect',
  'containers:start',
  'containers:stop',
  'containers:restart',
  'containers:pause',
  'containers:unpause',
  'containers:logs',
  'containers:remove',
  'containers:create',
  'containers:stats',
  'system:stats',
  'images:list',
  'images:pull',
  'images:remove',
  'images:prune',
  'images:dangling',
  'system:diskUsage',
  'volumes:list',
  'volumes:inspect',
  'volumes:remove',
  'networks:list',
  'networks:inspect',
  'networks:create',
  'networks:remove',
  'containers:exec:start',
  'containers:exec:input',
  'containers:exec:resize',
  'containers:exec:stop',
  'images:build:start',
  'stacks:list',
  'stacks:deploy:start',
  'stacks:down:start',
  'system:engineInfo',
  'system:logsTail',
])

// Exec input/resize fire on every keystroke/window-resize — exempt them from
// the per-minute mutation rate limit (still gated by ownership + agent-online
// checks below), or a terminal session would get throttled mid-typing.
export const EXEC_STREAM_ACTIONS = new Set([
  'containers:exec:input',
  'containers:exec:resize',
])

// Actions a 'viewer' role may send — everything else needs operator/owner.
// Exec, build, and deploy are excluded even though they're read-adjacent in
// name (e.g. logs) because exec/deploy grant effective code execution.
export const VIEWER_ALLOWED_ACTIONS = new Set([
  'containers:list',
  'containers:inspect',
  'containers:logs',
  'containers:stats',
  'system:stats',
  'images:list',
  'images:dangling',
  'system:diskUsage',
  'volumes:list',
  'volumes:inspect',
  'networks:list',
  'networks:inspect',
  'stacks:list',
  'system:engineInfo',
  'system:logsTail',
])

export function sendError(ws: WebSocket, message: string) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'error', error: message }))
  }
}

// ══════════════════════════════════════════════════════════════
// HANDLE COMMAND: frontend → backend → agent
// ══════════════════════════════════════════════════════════════
export async function handleClientCommand(user: AgentUser, msg: any, ws: WebSocket) {
  const {
    action,
    serverId,
    containerId,
    imageId,
    imageName,
    image,
    name,
    ports,
    env,
    volumeName,
    networkId,
    networkDriver,
    subnet,
    gateway,
    sessionId,
    cols,
    rows,
    data,
    dockerfile,
    buildArgs,
    stackName,
    composeYaml,
  } = msg

  // Rate limit per user (exempt high-frequency exec keystroke/resize traffic)
  if (!EXEC_STREAM_ACTIONS.has(action)) wsRateLimit(user.id)

  // Validate action is in the allowed list
  if (!action || !ALLOWED_ACTIONS.has(action)) {
    return sendError(ws, 'Unknown or disallowed action')
  }

  // Validate serverId present
  if (!serverId) return sendError(ws, 'Missing serverId')

  // Membership check — is this user a member of this server, and with a
  // role that permits this action? Replaces the old owner-only check.
  const membership = await getMembership(serverId, user.id)
  if (!membership) return sendError(ws, 'Server not found or access denied')
  if (membership.role === 'viewer' && !VIEWER_ALLOWED_ACTIONS.has(action)) {
    return sendError(ws, 'Insufficient permissions for this action')
  }

  const { data: server } = await serverRepo.findConnectionState(serverId)

  if (!server) return sendError(ws, 'Server not found or access denied')
  if (!server.agent_connected) return sendError(ws, 'Agent is offline')

  // Get the agent's WebSocket
  const agentWs = agentSockets.get(serverId)
  if (!agentWs || agentWs.readyState !== 1) {
    return sendError(ws, 'Agent is not connected')
  }

  // Validate container/image IDs to prevent injection
  const payload: Record<string, unknown> = { action, serverId }
  if (containerId) payload.containerId = validateContainerId(containerId)
  if (imageId) payload.imageId = validateImageId(imageId)
  if (imageName) payload.imageName = validateImageId(imageName)
  if (image) payload.image = validateImageId(image)
  if (name) payload.name = validateContainerName(name)
  if (Array.isArray(ports)) payload.ports = ports.map(validatePortMapping)
  if (Array.isArray(env)) payload.env = env.map(validateEnvVar)
  if (volumeName) payload.volumeName = validateVolumeName(volumeName)
  if (networkId) payload.networkId = validateNetworkId(networkId)
  if (networkDriver) payload.networkDriver = validateNetworkDriver(networkDriver)
  if (subnet) payload.subnet = validateCidrOrIp(subnet)
  if (gateway) payload.gateway = validateCidrOrIp(gateway)
  if (sessionId) payload.sessionId = validateSessionId(sessionId)
  if (cols !== undefined) payload.cols = validateExecDimension(cols)
  if (rows !== undefined) payload.rows = validateExecDimension(rows)
  if (data !== undefined) payload.data = validateExecInput(data)
  if (dockerfile !== undefined) payload.dockerfile = validateDockerfileText(dockerfile)
  if (buildArgs !== undefined) payload.buildArgs = validateBuildArgs(buildArgs)
  if (stackName) payload.stackName = validateStackName(stackName)
  if (composeYaml !== undefined) payload.composeYaml = validateComposeYaml(composeYaml)

  // Sign message before forwarding to agent
  agentWs.send(JSON.stringify(payload))

  // Audit log every action except high-frequency exec keystroke/resize traffic
  // (an exec session's start/stop is still logged — that's the meaningful event)
  if (!EXEC_STREAM_ACTIONS.has(action)) {
    auditLog({
      req: { user, ip: null },
      action,
      target: containerId ?? imageId ?? volumeName ?? networkId ?? 'n/a',
      serverId,
    })
  }
}
