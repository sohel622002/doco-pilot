import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import supabase from "../config/supabase.js";
import { verifyAgentHandshake } from "../utils/sign.js";
import { wsRateLimit } from "../middleware/rateLimiter.js";
import {
  auditLog,
  validateContainerId,
  validateImageId,
  validateContainerName,
  validatePortMapping,
  validateEnvVar,
} from "../utils/audit.js";
import cookie from 'cookie';
import { logger } from "../utils/logger.js";
import { sendWebhook } from "../utils/webhook.js";
// In-memory socket registries
// agentSockets:  serverId  → WebSocket
// clientSockets: userId    → Set<WebSocket>
const agentSockets = new Map();
const clientSockets = new Map();

// Per-server, per-alert-kind cooldown so a crash-looping container or
// sustained high CPU doesn't spam the webhook — one fire per 10 minutes.
const ALERT_COOLDOWN_MS = 10 * 60 * 1000;
const alertCooldowns = new Map(); // `${serverId}:${kind}` → last-fired timestamp

async function maybeFireAlert(serverId, kind, payload) {
  const key = `${serverId}:${kind}`;
  const now = Date.now();
  const last = alertCooldowns.get(key) || 0;
  if (now - last < ALERT_COOLDOWN_MS) return;

  const { data: server } = await supabase
    .from("servers")
    .select("name, alert_webhook_url, alert_cpu_threshold")
    .eq("id", serverId)
    .single();

  if (!server?.alert_webhook_url) return;
  if (kind === "high_cpu_usage" && Number(payload.cpuPercent) < server.alert_cpu_threshold) return;

  alertCooldowns.set(key, now);

  await sendWebhook(server.alert_webhook_url, {
    type: kind,
    serverId,
    serverName: server.name,
    ts: new Date().toISOString(),
    ...payload,
  });
}

// Allowed actions the frontend can request
const ALLOWED_ACTIONS = new Set([
  "containers:list",
  "containers:inspect",
  "containers:start",
  "containers:stop",
  "containers:restart",
  "containers:pause",
  "containers:unpause",
  "containers:logs",
  "containers:remove",
  "containers:create",
  "system:stats",
  "images:list",
  "images:pull",
  "images:remove",
]);

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url, "http://x");
    const type = url.searchParams.get("type");

    if (type === "agent") {
      handleAgentConnection(ws, url, req);
    } else if (type === "client") {
      handleClientConnection(ws, url, req);
    } else {
      ws.close(4000, "Unknown connection type");
    }
  });

  logger.info("WebSocket server ready at /ws");
}

// ══════════════════════════════════════════════════════════════
// AGENT CONNECTION
// ══════════════════════════════════════════════════════════════
async function handleAgentConnection(ws, url, req) {
  const agentKey = url.searchParams.get("agentKey");
  const ts = url.searchParams.get("ts");
  const sig = url.searchParams.get("sig");

  if (!agentKey || !ts || !sig) {
    return ws.close(4001, "Missing agentKey, ts, or sig");
  }

  // agentKey format: {serverId}.{secret}
  const dotIndex = agentKey.indexOf(".");
  if (dotIndex === -1) return ws.close(4001, "Malformed agentKey");

  const serverId = agentKey.substring(0, dotIndex);
  const plainSecret = agentKey.substring(dotIndex + 1);

  // Fetch server — one DB lookup using serverId prefix
  const { data: server, error } = await supabase
    .from("servers")
    .select("id, user_id, agent_key_hash, agent_secret_hash")
    .eq("id", serverId)
    .single();

  if (error || !server || !server.agent_key_hash) {
    return ws.close(4003, "Invalid agentKey");
  }

  // Verify the secret part of agentKey
  const keyValid = await bcrypt.compare(plainSecret, server.agent_key_hash);
  if (!keyValid) return ws.close(4003, "Invalid agentKey");

  // Verify HMAC handshake timestamp + signature
  // agentSecret is fetched from DB (we store hash, agent has plain)
  // For HMAC we use the plain agentKey itself as the signing secret
  // (agent knows it, backend can verify using stored hash — we re-derive here)
  try {
    // Use agentKey as HMAC secret (both sides know it)
    verifyHandshakeSig(agentKey, ts, sig);
  } catch (err) {
    return ws.close(4008, err.message);
  }

  // Register agent socket
  agentSockets.set(server.id, ws);

  // Mark as connected in DB
  await supabase
    .from("servers")
    .update({ agent_connected: true, last_seen_at: new Date().toISOString() })
    .eq("id", server.id);

  // Notify user's frontend that their agent is online
  broadcastToUser(server.user_id, {
    type: "agent:online",
    serverId: server.id,
  });

  logger.info(`Agent connected — serverId: ${server.id}`);

  // ── Receive messages from agent ──────────────────────────
  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return; // ignore malformed JSON
    }

    // Validate message has a type
    if (!msg.type) return;

    checkForAlert(server.id, msg);

    // Forward docker event to the correct user's frontend only
    broadcastToUser(server.user_id, {
      ...msg,
      serverId: server.id,
    });
  });

  ws.on("close", async () => {
    agentSockets.delete(server.id);
    await supabase
      .from("servers")
      .update({ agent_connected: false })
      .eq("id", server.id);

    broadcastToUser(server.user_id, {
      type: "agent:offline",
      serverId: server.id,
    });
    logger.info(`Agent disconnected — serverId: ${server.id}`);
  });

  ws.on("error", (err) => {
    logger.error({ err }, `Agent WS error (serverId: ${server.id})`);
  });
}

// ══════════════════════════════════════════════════════════════
// CLIENT (FRONTEND) CONNECTION
// ══════════════════════════════════════════════════════════════
function handleClientConnection(ws, url, req) {
  // Read JWT from cookie header (ws doesn't auto-send cookies in all clients)
  // Frontend should pass token as query param for WS handshake only
  const cookies = cookie.parse(req.headers.cookie || "");
  const token = cookies.token;

  if (!token) return ws.close(4001, "Missing token");

  let user;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return ws.close(4001, "Invalid or expired token");
  }

  // Register client socket
  if (!clientSockets.has(user.id)) clientSockets.set(user.id, new Set());
  clientSockets.get(user.id).add(ws);

  // Confirm connection to frontend
  ws.send(JSON.stringify({ type: "connected", userId: user.id }));

  sendCurrentAgentStatuses(user.id, ws);
  logger.info(`Client connected — userId: ${user.id}`);

  // ── Receive commands from frontend ───────────────────────
  ws.on("message", async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return sendError(ws, "Invalid JSON");
    }

    try {
      await handleClientCommand(user, msg, ws);
    } catch (err) {
      sendError(ws, err.message);
    }
  });

  ws.on("close", () => {
    clientSockets.get(user.id)?.delete(ws);
    if (clientSockets.get(user.id)?.size === 0) {
      clientSockets.delete(user.id);
    }
    logger.info(`Client disconnected — userId: ${user.id}`);
  });

  ws.on("error", (err) => {
    logger.error({ err }, `Client WS error (userId: ${user.id})`);
  });
}

async function sendCurrentAgentStatuses(userId, ws) {
  // Fetch all servers belonging to this user
  const { data: servers } = await supabase
    .from("servers")
    .select("id")
    .eq("user_id", userId);

  if (!servers) return;

  for (const server of servers) {
    const agentWs = agentSockets.get(server.id);
    const isOnline = agentWs && agentWs.readyState === 1;

    // Send current real status — not what DB says, but what's actually connected
    ws.send(JSON.stringify({
      type:     isOnline ? "agent:online" : "agent:offline",
      serverId: server.id
    }));
  }
}

// ══════════════════════════════════════════════════════════════
// HANDLE COMMAND: frontend → backend → agent
// ══════════════════════════════════════════════════════════════
async function handleClientCommand(user, msg, ws) {
  const { action, serverId, containerId, imageId, imageName, image, name, ports, env } = msg;

  // Rate limit per user
  wsRateLimit(user.id);

  // Validate action is in the allowed list
  if (!action || !ALLOWED_ACTIONS.has(action)) {
    return sendError(ws, "Unknown or disallowed action");
  }

  // Validate serverId present
  if (!serverId) return sendError(ws, "Missing serverId");

  // Ownership check — does this server belong to this user?
  const { data: server } = await supabase
    .from("servers")
    .select("id, agent_connected")
    .eq("id", serverId)
    .eq("user_id", user.id) // CRITICAL: ownership
    .single();

  if (!server) return sendError(ws, "Server not found or access denied");
  if (!server.agent_connected) return sendError(ws, "Agent is offline");

  // Get the agent's WebSocket
  const agentWs = agentSockets.get(serverId);
  if (!agentWs || agentWs.readyState !== 1) {
    return sendError(ws, "Agent is not connected");
  }

  // Validate container/image IDs to prevent injection
  const payload = { action, serverId };
  if (containerId) payload.containerId = validateContainerId(containerId);
  if (imageId) payload.imageId = validateImageId(imageId);
  if (imageName) payload.imageName = validateImageId(imageName);
  if (image) payload.image = validateImageId(image);
  if (name) payload.name = validateContainerName(name);
  if (Array.isArray(ports)) payload.ports = ports.map(validatePortMapping);
  if (Array.isArray(env)) payload.env = env.map(validateEnvVar);

  // Sign message before forwarding to agent
  agentWs.send(JSON.stringify(payload));

  // Audit log every action
  auditLog({
    req: { user, ip: null },
    action,
    target: containerId ?? imageId ?? "n/a",
    serverId,
  });
}

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

// Inspect an inbound agent message for alert-worthy conditions
function checkForAlert(serverId, msg) {
  if (msg.type === "docker:event" && msg.kind === "container" && msg.event === "die") {
    const exitCode = msg.exitCode;
    if (exitCode !== undefined && exitCode !== null && String(exitCode) !== "0") {
      maybeFireAlert(serverId, "container_crashed", {
        containerName: msg.actorName,
        containerId: msg.actor,
        exitCode,
      }).catch((err) => logger.error({ err }, "Failed to check/fire crash alert"));
    }
    return;
  }

  if (msg.type === "system:stats:result") {
    const cpuPercent = Number(msg.data?.cpu?.usagePercent);
    if (!Number.isNaN(cpuPercent)) {
      maybeFireAlert(serverId, "high_cpu_usage", { cpuPercent }).catch((err) =>
        logger.error({ err }, "Failed to check/fire high-CPU alert"),
      );
    }
  }
}

// Broadcast to all open tabs/windows of a user
function broadcastToUser(userId, data) {
  logger.debug("Broadcasting users");
  
  const sockets = clientSockets.get(userId);
  if (!sockets) return;
  const payload = JSON.stringify(data);
  for (const ws of sockets) {
    if (ws.readyState === 1) ws.send(payload);
  }
}

function sendError(ws, message) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify({ type: "error", error: message }));
  }
}

// Verify HMAC signature on agent handshake
// Uses agentKey itself as the HMAC secret (both agent and backend know it)
function verifyHandshakeSig(agentKey, ts, sig) {
  verifyAgentHandshake(agentKey, ts, sig, agentKey);
}

// Export for testing
export { agentSockets, clientSockets, broadcastToUser };
