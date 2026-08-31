# docoPilot — Product Review Report
**Author:** Product review (self-audit) · **Date:** 2026-08-31
**Scope:** Every client page, what it currently shows, whether it should, whether the agent/server pipeline can actually supply that data, and what's fake/placeholder today.

---

## 0. How this review works

For each page I answer three questions:
1. **What does it show today?**
2. **Should it show that?** (user-perspective value, monetization-readiness)
3. **Can our stack actually produce that data?** (agent = `dockerode` + `systeminformation` on the VPS; server = Supabase + WebSocket relay, no direct Docker/SSH access)

Then a consolidated "cut list" and "build list" at the end.

### What our data pipeline can and can't do (read this first)

Everything Docker/host-related is collected by `agent/` running on the customer's VPS and pushed over WebSocket. The server never touches Docker directly — it's a relay + auth + metadata store (Supabase). This matters because **every stat on every page is bounded by what `dockerode` and `systeminformation` can report**, not by what looks good in a mock.

| Source | What it gives us today | What it does NOT give us (without more work) |
|---|---|---|
| `dockerode` | container list/inspect/logs/start/stop/pause/restart/remove, image list/pull/remove, live docker events | per-container CPU/mem/network/block-IO stats (`container.stats()` is available but **not called anywhere yet**), volumes, networks, docker-compose project grouping, registry vulnerability data, image layer history |
| `systeminformation` | host CPU %, memory (total/used/free), disk I/O throughput | disk **capacity/usage** (`si.fsSize()`), network throughput (`si.networkStats()`), host uptime (`si.time()`), per-process info, GPU, temperature |
| Supabase | server metadata, alert config, users/auth | no time-series/history storage (so no real trend charts beyond client-side rolling buffer), no vulnerability DB, no token/API-key system |

So a lot of the "cut list" below isn't just clutter — it's **currently unbuildable with the libraries we have**, and a lot of the "build list" is **cheap** because the library already has the call, we're just not using it.

---

## 1. Page-by-page audit

### `/servers` — Server list
**Shows:** list of registered VPS/agents, add-server form, generated `docker run` install command, delete.
**Verdict: Keep, correct as-is.** This is the entry point to a multi-server product — a user managing 1 VPS today may add more once paying. No fake data here. Nothing to fix structurally.

---

### `/:serverId` (Home) — "System Overview"
**Shows today:**
- StatCards: CPU %, Memory GB/%, Active/Paused/Stopped container counts (real, from agent `system:stats` + `containers:list`)
- Bar chart "Resource Usage Trend" — real data but only a 30-sample **client-side rolling buffer** (resets on page reload, no real history)
- Static header text: *"Cluster node DockerNode-01 is healthy and responding"* + `Status: Operational` badge — **hardcoded, not derived from anything**
- Commented-out fake "Recent Events" and "Quick Actions" blocks still sitting in source

**Should it show this?**
- CPU/Mem/container-count KPIs: **yes** — this is the single most important glance-value page in a Docker-monitoring product. A user opens docoPilot to answer "is my server OK right now?" in 2 seconds.
- Resource trend chart: yes in principle, but **today it's fake permanence** — it looks like history but is wiped on every refresh. That's actively misleading for a paid monitoring product. Either label it clearly as "session view" or invest in real time-series storage (see Build List).
- Static "healthy/operational" badge: **no.** This is the most dangerous kind of fake data — it tells the user everything is fine regardless of actual state. It should be computed (e.g. CPU/mem within threshold + agent connected) or removed.
- Dead commented-out code: remove entirely; it's not a feature decision, it's tech debt sitting in a page users never see, but it signals the page was never finished.

**Can we build it for real?** Yes, cheaply:
- "Operational" badge → derive from `agent_connected` + `last_seen_at` (already stored in Supabase per server) plus CPU/mem thresholds already used for alerts.
- Real trend → needs the server to persist `system:stats:result` samples (e.g. every poll) into a table/time-series store instead of discarding them after relay. This is the biggest real gap in the product.

---

### `/:serverId/containers`
**Shows today:** running/stopped/paused counts, a **hardcoded "RESOURCE UTIL: 75%"** stat, full container table (name/image/status/ports + start/stop/pause/restart/inspect/logs/remove), a **hardcoded "Showing 4 of 34 containers"** pagination footer with non-functional buttons, and a static "Docker Node Healthy — All 4 nodes..." message.

**Should it show this?**
- Container table + actions: **core feature, keep.** This is the "Docker Desktop" part of the product.
- "RESOURCE UTIL 75%": **no idea what this metric even means today** (per-container? host? which resource?) and it's hardcoded. Either replace with real per-container CPU/mem (see below) or remove — a fabricated percentage next to real data erodes trust in the real data too.
- Fake pagination ("4 of 34"): **remove immediately.** If there are ≤N containers, don't show pagination at all; if the list can genuinely grow large, build real pagination against the real count.
- "All 4 nodes healthy": **remove.** docoPilot per this codebase manages one VPS/agent per "server" entry — there's no multi-node cluster concept anywhere else in the product. This line implies a feature (clustering) that doesn't exist.

**Can we build the real version?**
- Per-container CPU/mem/network: `dockerode`'s `container.stats({stream:false})` gives exactly this per container. **Not called anywhere in `agent/src/docker.js` today** — this is a real, cheap win and arguably the single most requested feature of any container dashboard ("which container is eating my CPU").

---

### `/:serverId/images`
**Shows today:** real image table (repo/tag/id/size/created) + pull/remove, plus a stats row and two panels that are **entirely fabricated**:
- "Storage Used: 12.4 GB of 50GB" — hardcoded
- "Unused Images: 8 / Cleanup due" — hardcoded
- "Registry Sync: Active / Docker Hub" — hardcoded
- Total Images real count but with a fake "+12%" trend badge
- "Recent Registry Events" — two static fake log lines, one claiming a CVE ("node:14 contains 12 critical security vulnerabilities")
- "Registry Health" donut fixed at 80%/Optimal via hardcoded SVG arc

**Should it show this?** This is the worst offender in the app. A **fabricated vulnerability claim** ("12 critical security vulnerabilities") is not just clutter — for a monetized product this is a liability: if a customer trusts it and it's wrong (either direction), that's a real support/trust problem, potentially a legal one if someone acted on a fake CVE claim.
- Storage used / disk capacity: **legitimate and valuable** ("am I about to run out of disk from images?") but must be real.
- Unused/dangling images: **legitimate and valuable** (`docker image prune` candidates) — directly actionable, drives engagement with the product.
- "Registry Sync/Docker Hub": we don't integrate with any registry API today — remove this concept entirely until (if ever) we build registry integration.
- Vulnerability scanning: **do not fake this, ever.** Either integrate a real scanner (Trivy, Docker Scout API) or don't mention vulnerabilities at all.
- "Registry Health" donut: meaningless invented metric — remove.

**Can we build the real version?**
- Storage used: `si.fsSize()` on the VPS gives real disk usage; dockerode `docker.df()` gives Docker-specific space breakdown (images/containers/volumes/cache reclaimable) — **this exists in dockerode today and isn't used.** This is the correct real replacement for the fake "12.4 GB of 50GB" card.
- Unused/dangling images: `docker.listImages({filters: {dangling:["true"]}})` — trivial with dockerode, not used today.
- Vulnerability scanning: not available from dockerode/systeminformation at all — would require a new integration (Trivy sidecar or Docker Scout API call from the agent). This is a "build list" item, not a quick fix.

---

### `/:serverId/settings`
Not fully inspected in the explore pass (account/profile settings) — standard account settings, no Docker data shown, low risk. No action needed beyond normal QA.

---

### `/:serverId/infrastructure`
**Shows today:** agent install instructions (real docker run command, good), an alerts card for webhook URL + CPU threshold (real, wired to Supabase), a **breadcrumb hardcoded to "DockerNode-01"** regardless of actual server name, a commented-out fake API endpoint URL, and a **fully fabricated "API Access & Security" token table** (fake token strings, fake "last used" timestamps, non-functional create/rotate/reveal buttons).

**Should it show this?**
- Agent install + alert config: **keep, this is real and useful** — the alerting (CPU threshold → webhook on breach, container crash → webhook) is one of the few genuinely monetizable "pro" features already implemented server-side. It's currently under-surfaced given how good it is (see Build List: surface alert history, not just config).
- Hardcoded server name in breadcrumb: bug, not a product decision — must reflect the actual server name from Supabase.
- Fake API token management: **remove entirely until real.** Showing "Create API Token" / fake keys implies programmatic API access exists — it doesn't (there's no public API/token auth system in `server/routes/*`, only cookie-based JWT for the web app). This is exactly the kind of fake affordance that will generate support tickets ("my token stopped working") for a feature that was never real.

---

## 2. Cut list — remove now, before monetizing

Fabricated data that misrepresents system state is the highest-priority fix — it directly undermines the trust a monitoring product depends on.

| Item | Location | Why cut |
|---|---|---|
| "12 critical security vulnerabilities" fake CVE line | Images.jsx | Fabricated security claim — real liability risk |
| Registry Health donut (fixed 80%) | Images.jsx | Meaningless invented metric |
| Storage/Unused Images/Registry Sync stat row | Images.jsx | All hardcoded; misleads on real disk risk |
| "RESOURCE UTIL: 75%" | Containers.jsx | Unlabeled fake percentage |
| "Showing 4 of 34 containers" + dead pagination buttons | Containers.jsx | Fake count, non-functional controls |
| "All 4 nodes healthy" | Containers.jsx | Implies multi-node clustering feature that doesn't exist |
| "Cluster node DockerNode-01 is healthy" + Operational badge | Home.jsx | Static, not derived from real health |
| Hardcoded "DockerNode-01" breadcrumb | Infrastructure.jsx | Bug — ignores actual server name |
| Fake API Access & Security token table | Infrastructure.jsx | Implies non-existent API/token feature |
| Commented-out fake "Recent Events"/"Quick Actions" blocks | Home.jsx | Dead code implying unfinished feature; either finish or delete |
| `RedesignedHome.jsx` (unrouted) | client/src/pages | Dead file, remove or document why it's kept |
| Placeholder domain `api.dockerdessk.io` in copy | AgentInstallation.jsx | Leftover/wrong branding in real product page |

**Principle going forward:** if a number can't be traced to a real agent field or a real Supabase column, it doesn't ship. A blank state ("no data yet") is always more trustworthy than a plausible-looking fake number.

---

## 3. Build list — real replacements, ranked by effort

**Cheap (dockerode/systeminformation calls that already exist, just unused):**
1. Per-container CPU/mem/network via `container.stats()` — replaces fake "RESOURCE UTIL," makes the container table genuinely diagnostic (top CPU/mem offenders).
2. `docker.df()` for real image/container/volume disk usage — replaces fake storage card.
3. Dangling-image filter for real "unused images" count — replaces fake "8."
4. `si.fsSize()` for real host disk capacity (currently not shown at all, and disk-full is one of the most common reasons a Docker host falls over — this is a **gap**, not just a fake-data problem).
5. `si.networkStats()` for real network throughput (also currently missing entirely).
6. `si.time()` for real host uptime.
7. Derive "Operational/Degraded" badge from `agent_connected` + `last_seen_at` + threshold state — all already stored.
8. Fix breadcrumb/server name to pull from the real server record.

**Medium (needs new server-side storage, no new external integration):**
9. Real historical trend charts — persist `system:stats:result` samples server-side (even a simple time-bucketed table) instead of only relaying-and-discarding; today's chart resets on every page load, which is not "monitoring."
10. Alert history/log page — the alerting engine (`checkForAlert`, webhook, cooldown) already works server-side but is invisible to the user beyond configuring it; show "3 alerts fired this week" — this is a strong monetization/retention feature that's already 80% built and 0% surfaced.
11. Volumes and Networks pages — dockerode supports listing/inspecting both; currently the product only covers containers/images, which is an incomplete "Docker Desktop" parity story if that's the positioning.

**Larger (new integration required):**
12. Real vulnerability scanning (Trivy or Docker Scout) if we want to keep any "security" messaging on the Images page — otherwise drop the concept.
13. Real API token system if programmatic access is an actual roadmap item — otherwise drop the concept from Infrastructure page.
14. Multi-node/cluster view if that's a real future feature — otherwise stop implying it in copy.

---

## 4. Cross-cutting product structure notes

- **Consistency of "real vs. decorative":** Right now every page mixes real, wired data with static decorative cards that happen to look identical in styling to the real ones. A user (especially a paying one) cannot visually tell which numbers are live and which are set dressing. Before adding anything new, establish a rule: **a stat card only ships if it's backed by a real field**, and prefer showing nothing (or a clear "—") over a plausible fake number.
- **"Docker Desktop, but online" positioning check:** Docker Desktop's core value is container/image lifecycle management + resource visibility. This product covers containers and images well; it's missing volumes and networks entirely, and is missing the per-container resource breakdown that Docker Desktop is known for. Closing those gaps matters more for the "online Docker Desktop" pitch than any of the decorative panels currently present.
- **Alerting is under-marketed relative to how real it is.** It's one of the only genuinely differentiated, working, monetizable features (webhook alerts on CPU threshold / container crash with cooldown) and it's tucked into a settings-like page with no visibility into whether it's ever fired. This should probably be promoted, not hidden.
- **History/trends is the single biggest structural gap.** "Monitoring" as a product category implies time — customers will expect to see "what happened overnight," not just "what's happening right now." Nothing in the current architecture persists time-series data; this is worth prioritizing before monetizing, because it's the hardest gap to retrofit later (vs. cutting a fake card, which is a 10-minute fix).

---

## 5. Suggested next step

Given the above, a sensible order of operations before charging money:
1. Remove all fabricated stats/panels (Cut List) — low effort, removes trust risk immediately.
2. Wire up the "cheap" real replacements (per-container stats, disk usage, dangling images, uptime, network throughput) — same UI slots, real data.
3. Decide and commit on scope: is this "containers + images only" or full "Docker Desktop parity" (+volumes, +networks)? Positioning should match what's actually offered.
4. Invest in real historical data storage — this unlocks trend charts, alert history, and any future "reports" feature, and is the one gap that gets more expensive the longer it's deferred.
5. Only then consider anything registry/vulnerability/token related, and only as real integrations, never as static UI.

*(No code has been changed as part of this review — this is analysis only, for planning purposes.)*
