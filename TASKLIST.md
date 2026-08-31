# docoPilot — Implementation Task List (module-wise)

Derived from [MONETIZATION_PRODUCT_PLAN.md](MONETIZATION_PRODUCT_PLAN.md), section 5 build order. Each task is scoped so it can be handed over independently. Checkboxes track progress; tasks within a module are roughly sequential, modules are ordered by the plan's priority.

---

## Module 1 — Per-container resource stats (Containers page)
*Plan ref: §2.3, build-order #1*

- [x] **1.1** Agent: add `getContainerStats(id)` in `agent/src/docker.js` using dockerode `container.stats({stream:false})`; compute CPU % (from cpu_stats/precpu_stats delta), memory used/limit, network rx/tx bytes.
- [x] **1.2** Agent: add `containers:stats` action to `agent/src/actions.js` router, returning per-container or all-containers stats.
- [x] **1.3** Server: add `containers:stats` to the `ALLOWED_ACTIONS` whitelist in `server/ws/index.js` relay.
- [x] **1.4** Client: add `WS_ACTIONS.CONTAINERS_STATS` in `client/src/lib/actions.js`, wire into `websocket-handlers.js` → container store.
- [x] **1.5** Client: extend Containers table with CPU %, Memory (used/limit), Network I/O columns; make sortable.
- [x] **1.6** Client: add restart-count badge and Docker healthcheck badge per row (from existing `inspect` data — `RestartCount`, `State.Health.Status`).
- [x] **1.7** Remove the old hardcoded "RESOURCE UTIL 75%" stat and fake pagination footer (from prior cut list) as part of this page's rework.

---

## Module 2 — Real disk usage & image cleanup (Images page)
*Plan ref: §2.4, build-order #2*

- [x] **2.1** Agent: add `getDiskUsage()` in `agent/src/docker.js` using dockerode `docker.df()`; return images/containers/volumes/build-cache size + reclaimable bytes.
- [x] **2.2** Agent: add `getDanglingImages()` using `listImages({filters:{dangling:["true"]}})`.
- [x] **2.3** Agent/Server/Client: wire a new `system:diskUsage` action end-to-end (agent action → server whitelist → client store), same pattern as Module 1.
- [x] **2.4** Client: replace fake "Storage Used / Unused Images / Registry Sync" stat row with real disk-usage breakdown and dangling-image count.
- [x] **2.5** Client: add one-click "Prune unused images" button wired to existing `images:remove` (bulk) or a new `images:prune` agent action.
- [x] **2.6** Client: remove "Recent Registry Events" fake panel and "Registry Health" donut entirely (no registry integration exists).

---

## Module 3 — Volumes page (new)
*Plan ref: §2.5, build-order #3*

- [x] **3.1** Agent: add `listVolumes`, `inspectVolume`, `removeVolume` in `agent/src/docker.js` (dockerode `docker.listVolumes()` / `getVolume(name)`).
- [x] **3.2** Agent: add corresponding `volumes:list` / `volumes:inspect` / `volumes:remove` actions in `agent/src/actions.js`.
- [x] **3.3** Server: add `volumes:*` actions to `ALLOWED_ACTIONS` in `server/ws/index.js`.
- [x] **3.4** Client: new `pages/Volumes.jsx` + route `/:serverId/volumes`, `store/volume.js`, table (name, mountpoint, driver, in-use-by containers, orphaned flag), remove action.
- [x] **3.5** Client: add "Volumes" nav entry to Layout sidebar/topnav.

---

## Module 4 — Networks page (new)
*Plan ref: §2.6, build-order #3*

- [x] **4.1** Agent: add `listNetworks`, `inspectNetwork`, `createNetwork`, `removeNetwork` in `agent/src/docker.js`.
- [x] **4.2** Agent: add `networks:*` actions in `agent/src/actions.js`.
- [x] **4.3** Server: add `networks:*` to `ALLOWED_ACTIONS`.
- [x] **4.4** Client: new `pages/Networks.jsx` + route `/:serverId/networks`, `store/network.js`, table (name, driver, subnet, connected containers), create/remove UI.
- [x] **4.5** Client: add "Networks" nav entry.

---

## Module 5 — Metrics & events history store (backend foundation)
*Plan ref: §3, build-order #4 — prerequisite for Modules 6 & 7*

- [x] **5.1** Supabase: create `server_metrics` table (server_id, ts, cpu_pct, mem_pct, disk_pct, disk_io, net_rx, net_tx) with an index on (server_id, ts).
- [x] **5.2** Supabase: create `docker_events` table (server_id, ts, type, action, actor_name, details jsonb).
- [x] **5.3** Supabase: create `alert_events` table (server_id, ts, rule_type, value, threshold, status: fired/resolved).
- [x] **5.4** Server: in `server/ws/index.js`, on each relayed `system:stats:result`, also insert a row into `server_metrics` (sampled, e.g. once per poll or throttled to once/min).
- [x] **5.5** Server: on each relayed `docker:event`, insert into `docker_events`.
- [x] **5.6** Server: add retention cleanup (scheduled job or Supabase cron) — e.g. 24h for Free tier rows, 30d for Pro — delete older rows.
- [x] **5.7** Server: add REST endpoints `GET /api/servers/:id/metrics?range=1h|24h|7d` and `GET /api/servers/:id/events?limit=`.

---

## Module 6 — Real trend charts & activity feed (Server Overview / Home)
*Plan ref: §2.2 — depends on Module 5*

- [x] **6.1** Client: replace client-side rolling-buffer chart in `Home.jsx` with data fetched from `GET /api/servers/:id/metrics`, with 1h/24h/7d range selector.
- [x] **6.2** Client: add real "Recent activity" feed from `GET /api/servers/:id/events`, replacing the removed commented-out fake events block.
- [x] **6.3** Agent/Client: add host disk-used % (`si.fsSize()`) and uptime (`si.time()`) to the `system:stats` payload and KPI row.
- [x] **6.4** Client: compute and display Operational/Degraded/Critical header status from `agent_connected` + threshold comparison (remove static "Cluster node healthy" text).
- [x] **6.5** Client: remove dead `RedesignedHome.jsx` and any remaining commented-out fake blocks in `Home.jsx`.
- [x] **6.6** Client: fix Infrastructure page breadcrumb to use the real server name instead of hardcoded "DockerNode-01".

---

## Module 7 — Alerts & Monitoring page (new, surfaces existing engine)
*Plan ref: §2.7, build-order #5 — depends on Module 5*

- [x] **7.1** Server: in `checkForAlert()` (wherever it currently lives), write a row to `alert_events` whenever an alert fires or resolves, in addition to sending the webhook.
- [x] **7.2** Server: add `GET /api/servers/:id/alerts` (history) endpoint.
- [x] **7.3** Server: add uptime % calculation endpoint — derive from `agent_connected` state changes over the last 30 days (needs a connection-state-change log; add a lightweight table or reuse `docker_events`/a new `agent_status_events` table).
- [x] **7.4** Client: new `pages/Alerts.jsx` + route `/:serverId/alerts` — alert rule config (move from Infrastructure page) + alert history table + 30-day uptime % display.
- [x] **7.5** Client: remove alert config card from Infrastructure page, replace with a link to the new Alerts page.
- [x] **7.6** Client: remove fake "API Access & Security" token table from Infrastructure page (no real token system exists).

---

## Module 8 — Server-list health & fleet view (Servers page)
*Plan ref: §2.1, build-order #6*

- [x] **8.1** Client: add health chip (OK/Warning/Critical) per server card, computed from latest stored `server_metrics` row + thresholds.
- [x] **8.2** Client: add small CPU/mem sparkline per card using last 1h from `server_metrics` (depends on Module 5).
- [x] **8.3** Client: add sort/filter by health status once a user has more than one server.

---

## Module 9 — Billing & plan gating
*Plan ref: build-order #7 — depends on Modules 1–8 existing to gate*

- [ ] **9.1** Decide and integrate a billing provider (e.g. Stripe) — new vendor, standard SaaS infra, out of "current stack only" scope but required for monetization itself.
- [ ] **9.2** Server: add `plan` field to user/account record, plan-check middleware for gated endpoints (history range beyond 1h, alerts page, multi-server sparkline, etc.).
- [ ] **9.3** Client: add locked/upsell states for Free-tier users on gated pages (Alerts page preview, history range selector beyond 1h).
- [ ] **9.4** Client: Settings page — add real billing/plan management UI.

---

## Explicitly deferred (do not schedule yet — needs new integration decision first)
- Vulnerability/CVE scanning (Trivy / Docker Scout)
- Registry sync / Docker Hub activity
- Multi-node clustering
- Real API token / programmatic access system
- SSH-based management

---

### How to use this list
Hand me one module (or specific task numbers) at a time, e.g. "do Module 1" or "do 5.1–5.3". Modules 1–4 have no dependencies on each other and can be done in any order; Modules 6 and 7 depend on Module 5; Module 9 depends on the features it gates existing first.
