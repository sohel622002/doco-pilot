# docoPilot — Monetization-Ready Product Plan
**Author:** Product owner plan (clean-slate design) · **Date:** 2026-08-31
**Premise:** Ignore what's currently shown today. Starting from "what should a paying customer see on each page," constrained to what our actual stack (`dockerode` + `systeminformation` on the agent, Supabase on the server, WebSocket relay, no SSH/no third-party integrations yet) can really deliver without hiring new capability.

This is the target information architecture to build toward, and which of it can ship now vs. needs a scoped follow-up feature (still using only our current tech, e.g. "add a DB table" — not "integrate a new vendor").

---

## 0. Ground rules I'm designing against

1. **Every card/number must map to a real field.** No decorative stats. If a page has nothing real to show yet in a slot, the slot doesn't exist yet — it's not filled with placeholder chrome.
2. **Buildable with what we have:**
   - Agent can report: host CPU/mem/disk-IO/disk-capacity/network throughput/uptime (`systeminformation`), full container/image lifecycle + per-container stats + docker events + docker disk usage (`dockerode`).
   - Server can: store/relay data, persist anything in Supabase (including time-series if we add a table), send webhooks, run scheduled jobs, do auth/billing.
   - Server CANNOT (without a new integration): scan images for vulnerabilities, talk to Docker Hub/registries, SSH into a box, see anything the agent doesn't report.
3. **Monetization lens:** what would make someone pay monthly vs. self-host a free dashboard? Answer: reliability visibility over time (history, alerts, uptime %), operational leverage (do things faster/safer than raw CLI), and multi-server management. Single-glance real-time stats alone are a commodity — free tools already do that.

---

## 1. Packaging shape (so page design has a reason)

| Tier | Who it's for | What it unlocks |
|---|---|---|
| **Free** | Solo dev, 1 server | Live container/image management, live host stats, no history, no alerts |
| **Pro** (paid, per server or flat) | Small team, few servers | + history/trends (7–30 days), + alerting (webhook/email), + per-container resource breakdown, + multi-server view |
| **Team** (paid, higher tier) | Agency/company running several VPS for clients | + multi-user access/roles, + audit log of who did what, + uptime SLA reporting, + on-call/alert routing |

Every page below is written with this in mind: what's free (hook), what's paywalled (the actual product), and what's aspirational (needs a follow-up build, not a new vendor).

---

## 2. Page-by-page plan

### 2.1 Servers (fleet list) — entry point
**Show:**
- Server cards: name, connection status (agent connected / last seen), quick health chip (OK / Warning / Critical, computed from thresholds), CPU/mem sparkline (tiny, last hour)
- Add server, install command, delete/rename
- **Paid differentiator:** sort/filter by health, group by tag/environment (prod/staging) once user has >1 server

**Feasible now:** connection status + last-seen exist today (Supabase columns). Health chip = simple threshold logic on latest stats, buildable immediately. Sparkline needs 1 hour of stored samples (see §3, history store) — small backend addition, no new tech.

---

### 2.2 Server Overview (Home) — "is this server OK right now, and was it OK earlier"
**Show:**
- Host status header: Operational / Degraded / Critical — **computed**, never decorative (agent connected + thresholds)
- KPI row: CPU %, Memory %, Disk used % (host, not just Docker), Uptime — four numbers a sysadmin actually checks first
- Container summary: running/stopped/paused counts, plus "N containers unhealthy" if any container's Docker healthcheck is failing (dockerode inspect exposes `State.Health.Status` — currently unused, free to add)
- Trend chart: CPU/mem over selectable window (1h / 24h / 7d) — **real**, backed by stored samples, not a client-side buffer that resets
- Recent activity: a real feed of docker events (container started/stopped/crashed, image pulled) — dockerode already streams these; we just need to log and display them instead of discarding
- **Paid gate:** anything beyond "last 1 hour" of trend/activity is Pro

**Feasible now:** KPIs, container counts, docker-healthcheck status — yes, today, with agent fields we already have or one extra dockerode field.
**Needs small build (our stack only):** disk-used %, uptime (`si.fsSize()`, `si.time()` — already in the `systeminformation` lib, just call them), trend history and event feed (needs a Supabase table + a write path when the server relays stats/events — no new vendor).

---

### 2.3 Containers — the core management surface
**Show:**
- Table: name, image, status, uptime (of the container, not host), CPU %, memory (used/limit), network I/O — **per-container resource columns**, sortable ("who's eating CPU right now")
- Actions: start/stop/pause/restart/remove/logs/inspect — already solid, keep
- Docker healthcheck badge per row if the image defines one
- Restart-count badge (dockerode inspect exposes `RestartCount` — flags crash-looping containers, high value, currently unused)
- Deploy/create container flow — keep
- **Paid gate:** per-container historical CPU/mem graph (needs stored samples), restart-loop alerting

**Feasible now:** per-container CPU/mem/network via `container.stats()` — dockerode supports it, we're just not calling it. This single addition is probably the highest perceived-value, lowest-effort change available.
**Not feasible without new tech:** nothing on this page requires anything beyond dockerode. This entire page can be made fully real with zero new dependencies.

---

### 2.4 Images
**Show:**
- Table: repo, tag, id, size, created — keep
- Real disk breakdown: total Docker disk usage split into images/containers/volumes/build-cache, with "reclaimable" amount — this is the actually useful "am I about to run out of disk" view
- Dangling/unused images count with one-click prune
- Pull/remove — keep
- **What NOT to show:** any vulnerability/CVE data, any "registry sync" status, any Docker Hub activity feed — we have no registry integration. Leave this page scoped to local disk/image management until that's a real roadmap item.

**Feasible now:** `docker.df()` (dockerode) gives the exact image/container/volume/cache breakdown with reclaimable bytes — unused today, directly replaces every fake card from the old Images page with real equivalents. Dangling-image filter is a one-line dockerode call.
**Needs new integration (do not build yet):** vulnerability scanning (Trivy/Docker Scout), registry activity (Docker Hub API) — flag as "not in v1 monetization scope," not as "coming soon" copy, to avoid setting expectations we can't meet on the current stack.

---

### 2.5 Volumes (new page — currently doesn't exist)
**Show:** volume name, mountpoint, driver, size (if determinable), which containers use it, orphaned-volume detection, delete action.
**Why it matters for monetization:** "Docker Desktop parity" is the product's own positioning; volumes are one of Docker's four core objects (containers/images/volumes/networks) and we currently show zero volume management. This is a real gap, not a nice-to-have.
**Feasible now:** dockerode supports `listVolumes`/`inspectVolume`/`removeVolume` fully — same effort tier as the existing Images page, no new tech required.

---

### 2.6 Networks (new page — currently doesn't exist)
**Show:** network name, driver, subnet, connected containers, create/remove custom network.
**Why:** same parity argument as volumes; also directly useful when debugging why two containers can't talk to each other — a common real support pain point.
**Feasible now:** dockerode supports `listNetworks`/`inspectNetwork`/`createNetwork`/`removeNetwork` — same tier of effort as Images/Volumes.

---

### 2.7 Alerts & Monitoring (elevate from buried settings to its own page)
**Show:**
- Alert rules configuration: CPU/mem/disk threshold, container-crash, container-unhealthy, restart-loop — webhook/email destination
- **Alert history log**: timestamp, rule fired, value, resolved/still-firing — this makes the (already-built) alerting engine visible and is a core "why would I pay monthly" feature
- Uptime % per server over 30 days (derived from agent-connected history) — classic monitoring-product hero metric
- **Paid gate:** this entire page is a Pro-tier feature; Free tier sees a locked preview

**Feasible now:** the threshold-check-and-webhook engine already exists server-side (`checkForAlert`). What's missing is: (a) writing each fired alert to a table instead of only firing-and-forgetting, (b) a page to read that table. No new tech — this is the single best effort-to-differentiation ratio in the whole plan, because 80% of it is already built and just not surfaced or persisted.

---

### 2.8 Settings / Account
**Show:** profile, password, 2FA (if we build it), notification channel (email/webhook) management, billing/plan (Stripe or similar — new integration, but standard SaaS infra, expected for monetization).
**What NOT to show:** fake API tokens. If programmatic API access becomes a real paid feature later, build real token issuance + scoped auth middleware before advertising it — don't show it speculatively.

---

### 2.9 Infrastructure / Agent management
**Show:**
- Install/reinstall command, agent version, agent connection health, last-seen timestamp — keep, it's real and necessary
- Agent auto-update status if we build that capability
- Danger zone (delete server) — keep
**What NOT to show:** anything about "API access" unless real (see 2.8), anything about multi-node clustering unless that's an actual roadmap feature — don't imply capabilities we don't have.

---

## 3. The one infrastructure decision that unlocks most of the above: a metrics/events history table

Nearly every "Pro" feature above (trend charts beyond the current session, alert history, uptime %, per-container historical graphs) depends on one thing: **persisting samples server-side instead of only relaying them live.** This requires no new vendor — just:
- A Supabase table (or a lightweight time-series-friendly schema) for periodic `system:stats` samples per server, with a retention window matched to plan tier (e.g. 24h free / 30d Pro).
- A similar table for docker events and fired alerts.
- A rollup/downsample job if volume gets large (can be deferred — early customers won't need it).

This is the single highest-leverage build item: it is a prerequisite for roughly half of the monetizable features listed above, and it's ordinary backend work with tools already in the stack (Supabase + the existing WebSocket relay path), not a new integration.

---

## 4. What to explicitly NOT build for v1 monetization (out of scope, not "later this sprint")

- Vulnerability/CVE scanning (needs a scanner integration — Trivy/Docker Scout)
- Registry sync / Docker Hub activity (needs registry API integration)
- Multi-node clustering (no such architecture exists; "server" = one VPS/agent today)
- Real API token/programmatic access (needs new auth surface — build only if actually promised to customers)
- SSH-based management (architecture is agent-initiated WebSocket only; adding SSH would be a parallel, separate capability, not a page-level tweak)

Keeping these explicitly off the current roadmap prevents the page design from drifting back into aspirational placeholders.

---

## 5. Practical build order (all within current tech stack)

1. Per-container `stats()` on Containers page (dockerode, unused today) — highest visible impact, near-zero new infra.
2. `docker.df()` real disk breakdown + dangling-image prune on Images page — replaces the most damaging fake content with real, already-available data.
3. Volumes and Networks pages — closes the "Docker Desktop parity" gap, same effort tier as existing pages, dockerode already supports it.
4. Metrics/events history table (Supabase) — unlocks real trend charts, alert history, uptime %.
5. Alerts page (surfacing the already-built alerting engine + new history log) — best effort-to-monetization ratio in the plan.
6. Health/status computation (Operational/Degraded/Critical) across Servers list and Server Overview — small logic layer on top of data we already have.
7. Billing/plan gating wired to the above (Free vs Pro feature flags) — standard SaaS work once the features themselves exist.

Everything in this order uses only `dockerode`, `systeminformation`, Supabase, and the existing WebSocket relay — no new vendor integrations required to reach a credible, monetizable v1.
