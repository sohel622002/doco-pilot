# Doco-Pilot V2 — Plan

Baseline: see `V1.md` for what's real today. V2 scope per your priorities: **fill V1 gaps → reliability/ops → new capabilities**. UI polish is opportunistic, not a workstream.

> **Recheck (2026-09-03):** verified against the current codebase. Most of Phase 0 and Phase 0.5 (which were written against an earlier snapshot described in PRODUCT_REVIEW_REPORT.md, dated 2026-08-31) turned out to already be implemented — real per-container stats, real disk usage, real historical trend charts, real alert history, Volumes/Networks pages, and the fabricated-data cut list were all already done in the working tree. Completed items have been removed below rather than left as stale checkboxes; only genuinely outstanding work remains. See "Already done" at the bottom for what was verified and removed.

## Positioning takeaway (from PRODUCT_ANALYSIS_AND_COMPARISON.md + PRODUCT_REVIEW_REPORT.md)

doco-pilot's real peer is **Portainer**, not Coolify/Dokploy (those are PaaS/deploy tools solving a different job). Against Portainer, doco-pilot's structural edge is architecture — dial-out-only agent (no inbound port), HMAC handshake, encrypted+hashed credentials, optional IP-bound JWTs — which is more rigorous than what Portainer typically documents, plus zero-install convenience (no server/DB to stand up, just drop in an agent). To actually stand out on that edge, three things have to happen, in this order:

> **Note (2026-09-03):** IP-bound JWTs are now **opt-in, off by default** (`BIND_JWT_TO_IP=true`) — see [`server/middleware/auth.js`](server/middleware/auth.js) and commit `64bcbd4`. It was hard-enforced and caused false "Token IP mismatch" logouts on Render/Cloudflare (proxy hops, IPv4↔IPv6, mobile/CGNAT) — i.e. it was actively broken for real deployments, not just a nice-to-have. Don't market it as a default-on guarantee; if it's promoted as a security feature, it needs a plan (see Phase 0 addition below) for how self-hosters can safely turn it on without false-positive lockouts.

1. **Trust first.** The self-audit (PRODUCT_REVIEW_REPORT.md) found fabricated stats across Home, Containers, Images, and Infrastructure — including a fake CVE claim. A security-conscious pitch is worthless if the product itself ships invented numbers. **Done** — verified fixed in the current codebase (see "Already done").
2. **Close the "online Docker Desktop" gap.** Per-container CPU/mem/network, disk usage, volumes/networks pages — these are table-stakes Portainer already has. **Done** — verified implemented (see "Already done").
3. **Double down on the differentiator instead of chasing Coolify/Dokploy's feature list.** Compose/Git-deploy/SSL/templates are a different product category — don't build them to "catch up." Real history/trends and surfaced alerting are **already done** too (see "Already done"). What's still genuinely missing on this front: the security posture becoming a *visible* feature (audit log UI — Phase 2 item 4) and RBAC/session visibility (Phase 1 item 5).

## Phase 0 — Quick fixes — **done**

- **IP-bound JWT decision (2026-09-03):** keeping `BIND_JWT_TO_IP` strictly opt-in, off by default. Client (Vercel) and server (Render) are hosted separately with no stable/known client-egress IP, so default-on enforcement isn't viable here — that's a real infrastructure constraint, not a workaround to revisit. Positioning copy corrected accordingly in `PRODUCT_ANALYSIS_AND_COMPARISON.md` (row 41 + the architecture-rigor sentence + a new explanatory note) so nothing implies default-on IP binding.

*(`buildDockerCommand` real-config fix, the `axios.js` dead `localStorage` reference, and the Supabase CLI migration runner were already done — see "Already done" below.)*

## Phase 0.5 — Cut fabricated data — **done**

- Fixed the last remaining stale copy: `AgentInstallation.jsx` referenced a fake `api.dockerdessk.io` domain and an untrue "short-lived installation token" claim — corrected to describe the real WS endpoint and the actual embedded agent key/secret.

*(Every other item on PRODUCT_REVIEW_REPORT.md's cut list — fake CVE line, Registry Health donut, fake storage/unused-images/registry-sync stats, fake "RESOURCE UTIL 75%", fake pagination, "All 4 nodes healthy", the hardcoded "DockerNode-01" breadcrumb, the fake API token table, `Infrastructure.jsx`, `RedesignedHome.jsx` — is already gone from the codebase. See "Already done" below.)*

## Phase 1 — Close V1 gaps

1. **Container exec / shell-in-container** — **done (2026-09-03)**
   - Agent (`agent/src/docker.js`, `agent/src/ws.js`): `containers:exec:start/input/resize/stop` — hijacked TTY exec stream per session, multiplexed by a client-generated `sessionId`, cleaned up on stream end/agent disconnect/shutdown.
   - Server (`server/ws/index.js`, `server/utils/audit.js`): new actions allowlisted, `sessionId`/`cols`/`rows`/`data` validated and passed through; exec input/resize exempted from the per-minute mutation rate limit (keystrokes would otherwise get throttled) but exec start/stop still audit-logged.
   - Client: `@xterm/xterm` + `@xterm/addon-fit` added; `ExecModal.jsx` + `store/exec.js` (imperative data-listener, not React state, so stdout doesn't re-render per keystroke); wired into `Containers.jsx` as a per-row "Open Shell" action, enabled only while the container is running.

2. **Image build support** — **done (2026-09-03)**
   - Agent (`agent/src/docker.js`, `agent/src/ws.js`): `images:build:start` — Dockerfile text (single-file build context; no COPY/ADD of extra files, since the WS protocol only carries the Dockerfile itself) packed into an in-memory tar via `tar-stream`, built with `docker.buildImage()`, streaming each log line back tagged by `sessionId`. One-shot, not cancellable in V2.
   - Server: new action allowlisted; `dockerfile` (size-capped) and `buildArgs` (key/value, capped) validated; reuses `imageName`/`sessionId` validators already added for the image tag and stream id.
   - Client: `BuildImageModal.jsx` + `store/imageBuild.js`, wired into Images.jsx next to "Pull Image"; on success dispatches `images:built` to refresh the image list (same pattern as the existing `images:pruned` refresh).

3. **Compose / stack deploy** — **done (2026-09-03)**
   - Agent (`agent/src/stacks.js`, `agent/src/ws.js`, `agent/src/actions.js`): compose file written to a per-project dir under `~/.doco-pilot/stacks/<name>` and run via the host's `docker compose` CLI (shelled out — a different trust profile than the dockerode calls used everywhere else, worth keeping in mind); `stacks:deploy:start`/`stacks:down:start` stream log lines by `sessionId` (same one-shot pattern as image build), `stacks:list` reads live state via `docker compose ls` (request/response, like the other list actions).
   - Server: new `stacks` table + migration (`supabase/migrations/20240101000005_stacks.sql`) storing name + compose YAML per server so redeploys don't require re-pasting it; REST CRUD at `/api/servers/:id/stacks` (list/save/update/delete — Zod-validated, ownership-checked); WS relay actions allowlisted with `stackName`/`composeYaml` validators.
   - Client: new `/​:serverId/stacks` page + nav entry — saved stacks (from REST) cross-referenced against live state (from `stacks:list`), deploy/down/edit/delete actions, a log-streaming modal for deploy/down, plus a section for stacks running on the host that aren't saved here.

4. **Real Engine & Logs panel** — **done (2026-09-03)**
   - Agent (`agent/src/docker.js`, `agent/src/actions.js`): `system:engineInfo` (Docker/API version, storage driver, OS/arch, container/image counts, CPUs, RAM — via `docker.version()`/`docker.info()`); `system:logsTail` fans out `container.logs()` across every running container and merges by timestamp prefix (no generic way to tail the dockerd daemon log from inside a container, so this is the real substitute, not a re-scope).
   - Server: both actions allowlisted (parameterless, no new validators needed).
   - Client: `EngineLogsPanel.jsx` + `store/engine.js`, added to Settings.jsx below Server Setup, auto-refreshing every 15s while connected.

5. **RBAC / team sharing** — **done (2026-09-03)**
   - Schema: `supabase/migrations/20240101000006_server_members.sql` — `server_members(server_id, user_id, role, invited_by)`, backfilled so every existing server's creator becomes its `owner` (zero-downtime, nothing loses access). `servers.user_id` untouched (stays the original creator).
   - Server REST (`server/routes/servers.js`): all 11 `eq('user_id', req.user.id)` ownership checks + the stacks routes' `requireOwnedServer` replaced with `requireRole(req, res, serverId, minRole)` (`server/utils/membership.js`) — `viewer` for all GETs, `operator` for mutations, `owner` for delete/regenerate-key/credentials/invite/remove-member. `GET /api/servers` now joins through `server_members` so shared servers show up too, with a `role` field per server. New `/api/servers/:id/members` CRUD (owner-only invite/role-change/remove; invite requires an existing registered account — found by email — rather than a pending-invite system, to keep the change scoped); a "last owner" guard blocks demoting/removing the only remaining owner.
   - WS relay (`server/ws/index.js`) — the part worth flagging: **broadcast was owner-only** (`broadcastToUser(server.user_id, ...)` at 3 call sites: agent online, docker events, agent offline) — a shared operator/viewer would never have seen live events. Replaced with `broadcastToServerMembers()` (30s-cached member list, invalidated on membership changes via `invalidateServerMemberCache()`). `sendCurrentAgentStatuses` similarly switched from `servers.user_id` to a `server_members` query. Per-action enforcement: a `viewer` is limited server-side to a `VIEWER_ALLOWED_ACTIONS` allowlist (list/inspect/logs/stats/diskUsage/stacks:list/engineInfo/logsTail) — exec, build, and deploy are excluded even though "logs" is in the name, since they grant effective code execution. This is enforced **at the relay**, not agent-side as originally scoped — the agent has no concept of roles and shouldn't need one.
   - Client: `lib/roles.js` (`canWrite`/`isOwner` helpers) gates mutating UI across Containers/Images/Volumes/Networks/Stacks (buttons disabled, not hidden, so a viewer can see what exists without a broken-looking page); `MembersPanel.jsx` on Settings (owner sees invite/role-change/remove, others see a read-only list); Settings' Danger Zone and Server Setup sections are owner-only; Servers.jsx shows a role badge on shared servers and hides Delete for non-owners.
   - Verified: all 16 existing server tests still pass, client builds clean, no remaining `eq('user_id', ...)` ownership checks on the `servers` table.

## Phase 2 — Reliability & ops

1. **Test coverage & CI** — **done (2026-09-03)**
   - Correction to the original scoping: `server-ci.yml` already ran `npm test` (server tests were CI-gated, just thin — encryption/schemas only). `client-ci.yml` and `agent-ci.yml` did not; both now do.
   - Server (71 tests total, up from 16): new `tests/audit.test.js` covers every validator added across V2 (the actual injection boundary for every WS action — container/image/network IDs, exec session id/dimensions/input, Dockerfile text, build args, stack name, compose YAML); new `tests/membership.test.js` covers `hasRole`'s rank comparison and `requireRole`'s 404-vs-403-vs-pass behavior (mocked supabase); new `tests/ws-allowlist.test.js` asserts the security invariant that matters most here — no mutating/code-execution action (exec, build, deploy, any container/image/volume/network mutation) is ever in `VIEWER_ALLOWED_ACTIONS`; new `tests/alerts.test.js` covers `checkForAlert`'s container-crash and high-CPU-threshold detection paths (fired/resolved transitions, cooldown, webhook-vs-no-webhook), mocking supabase + `sendWebhook`. Full supertest/real-Postgres route integration testing was descoped in favor of these — most of the actual risk in `servers.js`'s routes is now `requireRole` (covered directly) plus straightforward CRUD, not complex query logic.
   - Client: added `vitest` + `jsdom` + a `test` script (none existed). Chose not to add React Testing Library — the highest-value target named in the plan, `lib/websocket-handlers.js`, and the zustand stores are plain JS with no rendering involved. 41 tests: `websocket-handlers.test.js` (20 tests — routes every representative message type to its store, docker:event fan-out by action, exec session lifecycle, conditional `images:built`/`stacks:changed` window events, malformed-JSON/unknown-type/no-type resilience), `store/{container,system,logs,inspect}.test.js`, and `lib/roles.test.js` (the RBAC gating helpers added this session).
   - Agent: added `vitest` + a `test` script. `tests/actions.test.js` (12 tests, mocking `docker.js`/`system.js`/`stacks.js`) verifies the dispatch table routes each action to the right handler with the right args and rejects unknown actions. `tests/docker.test.js` (9 tests, mocking `dockerode` itself) verifies the real transformation logic — `listContainers`' restart/health enrichment (and its fallback when `inspect()` fails mid-list), `getDiskUsage`'s per-category reclaimable-bytes math, `getEngineInfo`'s field mapping, `getAggregatedLogs`' fan-out-and-sort-by-timestamp (plus a broken-container-doesn't-fail-the-batch case), and `listNetworks`' IPAM extraction.
   - All three suites use a pinned single-fork `vitest.config.js` (small suites — avoids flaky multi-process pool spawning seen locally without costing meaningful time) and were verified end-to-end with a clean `npm ci` in each project, not just the existing `node_modules`.

2. **WebSocket robustness**
   - Client: reconnect with backoff (currently `WebSocketContext.jsx` just sets `isConnected(false)` and gives up until the component remounts) — add exponential backoff reconnect and resubscribe (re-send `containers:list`/`system:stats` on reconnect, which is already there for `serverId` changes but not for a raw reconnect).
   - Agent: reconnect logic already exists in concept (`ws.js`) — confirm/extend backoff + jittered retry, and heartbeat/ping so `agent_connected`/`agent_status_events` reflect reality within a few seconds instead of relying on socket-close detection alone.
   - Server: WS relay should queue/drop-with-error rather than silently no-op when an agent is offline and a client sends an action — surface "agent offline" back to the client instead of the request hanging.

3. **Agent versioning & self-update visibility**
   - Agent reports its version on connect; server stores `agent_version` on `servers`; client shows an "update available" badge if it drifts from the latest published agent image tag.

4. **Audit trail UI**
   - `audit_log` is already written server-side (`utils/audit.js`) but still has no UI. Add a simple per-server "Activity Log" (admin/owner only) surfacing account-level actions (server created/deleted, key regenerated, credentials viewed) — distinct from the existing Docker-events "Recent Activity" feed.
   - This doubles as differentiation, not just ops hygiene: doco-pilot's security posture (HMAC handshake, encrypted credentials, optional IP-bound JWTs) is currently invisible to the user. Surfacing the audit trail turns "we built it securely" into something a security-conscious buyer can actually see and point to — a real edge over Portainer CE, which doesn't document this level of rigor. Keep claims accurate to actual defaults (see Phase 0 note on IP binding) rather than overstating what's on by default.

*(Real historical trend charts and surfaced alert history — both originally listed here — are already implemented: `server_metrics` is persisted and served via `/api/servers/:id/metrics`, powering a real trend chart on Home.jsx with 1H/24H/7D ranges, and Alerts.jsx already shows fired/resolved alert history alongside rule config. See "Already done" below.)*

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

Revised order given the "stand out" goal: **Phase 0 (JWT-binding decision) → Phase 1 items 1–3 (exec, image build, stacks) + Phase 2 item 2 (WS robustness) → RBAC → Phase 2 items 3–4 (agent versioning, audit trail UI) → Phase 3.**

Reasoning: exec/build/stacks/WS-robustness are the highest-value/highest-risk work since they touch the agent protocol, so they should land before RBAC (which needs to gate every action added by then, new and old). The trust-fix and cheap real-data work that used to anchor this sequencing is already done (see below), so the remaining backlog is smaller than originally scoped.

## Already done (verified 2026-09-03, removed from the active plan above)

Checked directly against the working tree rather than trusting the reports' snapshot dates:

- **Phase 0 quick fixes:** `buildDockerCommand` uses real `BACKEND_WS_URL`/`AGENT_IMAGE` env config, no placeholders (`server/routes/servers.js`); no vestigial `localStorage` token code in `client/src/lib/axios.js`; migrations already run through the Supabase CLI (`supabase/migrations/*.sql` + `supabase/config.toml`), not hand-applied files.
- **Phase 0.5 cut list:** no fake CVE line, Registry Health donut, fake storage/registry-sync stats, fake pagination, "All 4 nodes healthy", or fake API token table anywhere in the client. `Infrastructure.jsx` and `RedesignedHome.jsx` don't exist in the tree. Home.jsx's status badge is computed (`computeServerStatus`), not hardcoded. Only the `AgentInstallation.jsx` copy needed fixing today (done above).
- **Phase 1 item 0 (real data for existing slots):** `Containers.jsx` shows real per-container CPU/mem/network from agent stats, sortable, no fake "RESOURCE UTIL"; `Images.jsx` shows real disk usage (`docker.df()`-shaped `diskUsage` store) and real dangling-image count, no fake registry panels; `Home.jsx` shows real uptime and a real status badge. `Volumes.jsx` and `Networks.jsx` pages exist with full list/inspect/create/remove actions.
- **Phase 1 item 4 (Settings cleanup half):** dead `MOCK_LOGS`/daemon-JSON editor is gone — Settings.jsx now only has real Server Setup + Danger Zone sections. (The *replacement* Engine Info/Logs panel was never built — that part of the item still stands, reworded above.)
- **Phase 2 item 5 (real historical trends):** `server_metrics` is persisted server-side and served via `/api/servers/:id/metrics`; Home.jsx renders a real 1H/24H/7D trend chart from it, with proper "Collecting samples…" empty state instead of a fake permanent-looking buffer.
- **Phase 2 item 6 (surface alerting):** Alerts.jsx already shows fired/resolved alert history with timestamps alongside the CPU-threshold/webhook rule config — not hidden in a settings corner.

Still genuinely open: Phase 1 items 1–3 and 5 (exec, image build, compose/stacks, RBAC), Phase 1 item 4's real Engine/Logs panel, Phase 2 items 1–4 (test coverage, WS reconnect backoff, agent versioning, audit trail UI), and all of Phase 3 (backup/restore, container templates, email notification channel, multi-node dashboard) — none of these were found implemented.
