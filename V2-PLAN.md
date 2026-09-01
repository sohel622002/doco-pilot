# Doco-Pilot V2 — Plan

Baseline: see `V1.md` for what's real today. V2 scope per your priorities: **fill V1 gaps → reliability/ops → new capabilities**. UI polish is opportunistic, not a workstream.

## Phase 0 — Quick fixes (do first, low effort)

- Fix `buildDockerCommand` in `server/routes/servers.js` to use real config (published image tag, `BACKEND_WS_URL` from env with no fake fallback) instead of `your-dockerhub/...` / `wss://yourbackend.com` placeholders — currently shipped straight to users.
- Remove the vestigial `localStorage` access-token reference in `client/src/lib/axios.js` — dead code left over from before the httpOnly-cookie session model.
- Introduce a migration runner (e.g. `supabase migration` CLI or `node-pg-migrate`) over the four hand-applied `.sql` files so schema changes in V2 aren't applied by hand again.

## Phase 1 — Close V1 gaps

1. **Container exec / shell-in-container**
   - Agent: new WS action `containers:exec` opening a Docker `exec` stream (stdin/stdout) over the same WebSocket, multiplexed by a session id.
   - Client: terminal UI (xterm.js) in a modal, reusing the `LogsModal` pattern.

2. **Image build support**
   - Agent: `images:build` action — accept a tarred build context or Dockerfile text + build args, stream build log lines back like container logs.
   - Client: "Build Image" flow next to "Pull Image" on the Images page.

3. **Compose / stack deploy**
   - Agent: parse a docker-compose.yml (via `docker compose` CLI already on host, shelled out from the agent) — `stacks:deploy`, `stacks:list`, `stacks:down`.
   - Server: new `stacks` table (per-server, stores compose file + name) so redeploys don't require re-pasting YAML.
   - Client: new "Stacks" page — replaces the deleted `Infrastructure.jsx` with a real, working version instead of the old placeholder.

4. **Real Engine & Logs panel** (replace the dead `MOCK_LOGS` section in Settings)
   - Agent: `system:engineInfo` (docker version/info) and stream host-level daemon logs is out of scope (no generic way to tail dockerd logs in a container) — instead re-scope this panel to real, obtainable data: Docker Engine version/API version, storage driver, live container log tail aggregated across all running containers (reuse `containers:logs` fan-out).
   - Delete the daemon-JSON editor and fake toggles entirely — they have no backing action and shouldn't be resurrected as-is.

5. **RBAC / team sharing**
   - `server_members` table: server_id, user_id, role (owner/operator/viewer).
   - Update all `servers.js` ownership checks from `eq('user_id', ...)` to a membership check.
   - Invite-by-email flow (reuse the existing mail utility).
   - Viewer role: read-only WS actions only (list/inspect/logs/stats), enforced agent-side by role passed in the WS auth handshake.

## Phase 2 — Reliability & ops

1. **Test coverage & CI**
   - CI workflows already exist (`agent-ci.yml`, `client-ci.yml`, `server-ci.yml`, `deploy.yml`) but only run lint/build today — no real test step to add to, since the client has zero tests and the server only covers `encryption`/`schemas`.
   - Server: supertest-based integration tests per route file (auth, servers, and the new `server/ws/index.js` relay — ownership checks, action allowlist, alert-detection logic), hitting a test Supabase project or local Postgres via the same schema.
   - Client: add a test script (none exists in `client/package.json`) + Vitest/React Testing Library for the zustand stores (`container`, `system`, `logs`, `inspect`) and `lib/websocket-handlers.js`, the single integration point for every live feature.
   - Agent: unit tests for `actions.js` handler dispatch and `docker.js` wrappers (mock dockerode/socket).
   - Wire all of the above into the existing CI workflows so `*-ci.yml` actually fails on a broken test, not just a lint error.

2. **WebSocket robustness**
   - Client: reconnect with backoff (currently `WebSocketContext.jsx` just sets `isConnected(false)` and gives up until the component remounts) — add exponential backoff reconnect and resubscribe (re-send `containers:list`/`system:stats` on reconnect, which is already there for `serverId` changes but not for a raw reconnect).
   - Agent: reconnect logic already exists in concept (`ws.js`) — confirm/extend backoff + jittered retry, and heartbeat/ping so `agent_connected`/`agent_status_events` reflect reality within a few seconds instead of relying on socket-close detection alone.
   - Server: WS relay should queue/drop-with-error rather than silently no-op when an agent is offline and a client sends an action — surface "agent offline" back to the client instead of the request hanging.

3. **Agent versioning & self-update visibility**
   - Agent reports its version on connect; server stores `agent_version` on `servers`; client shows an "update available" badge if it drifts from the latest published agent image tag.

4. **Audit trail UI**
   - `audit_log` is already written server-side (`utils/audit.js`) but has no UI. Add a simple per-server "Activity Log" (admin/owner only) surfacing account-level actions (server created/deleted, key regenerated, credentials viewed) — distinct from the existing Docker-events "Recent Activity" feed.

## Phase 3 — New capabilities

1. **Backup / restore**
   - Volume backup: agent tars a named volume's contents on demand, streams to the client as a download (needs a real download path — WS isn't ideal for large binary transfer, so use a short-lived signed HTTP endpoint on the backend that proxies the agent's tar stream).
   - Server config export/import (list of servers + their alert settings) for account migration — no credentials included, those must be regenerated.

2. **Container templates**
   - A small curated set of one-click templates (e.g., Postgres, Redis, Nginx, n8n) with sane default env/port/volume config, surfaced in `DeployContainerModal` as presets. Start with a static JSON catalog, not a real marketplace — no user-submitted templates in V2.

3. **Notification channels beyond raw webhook**
   - Keep the existing generic webhook (it already works with Slack/Discord/n8n/Zapier).
   - Add a first-class email notification channel (reuse `utils/mail.js`) as a second delivery option per server, since not every user wants to stand up a webhook receiver.

4. **Multi-node awareness (lightweight, not full orchestration)**
   - Cross-server dashboard: a single page aggregating health/CPU/mem across all servers on the account (the data already exists per-server; this is a rollup view, not new agent capability).
   - Explicitly **not** in scope: actual container scheduling/orchestration across nodes (that's a different product, e.g. Swarm/K8s) — V2 stays single-host-per-action.

## Sequencing note

Phase 1 items 1–3 (exec, image build, stacks) and Phase 2 item 2 (WS robustness) are the highest-value/highest-risk work since they touch the agent protocol — do those before RBAC, since RBAC will need to gate every new action added here too.
