# doco-pilot E2E test worksheet

Living tracker for the Playwright suite in `e2e/`. Update this file every
time a module's tests are added, fixed, or verified — this is where we keep
track of what's covered, what's in progress, and what's still missing, the
same way `doco-pilot-seo-audit-2026-09-22.md` tracks the SEO work.

**Last updated:** 2026-09-22 (Images module added)

---

## How we build a module's tests (the method)

Every module follows the same sequence — don't skip steps, they're each
there because skipping them caused a real bug earlier in this project:

1. **Read the actual page component first.** Never guess selectors. This
   codebase has no `data-testid`s — buttons are matched by `title=""`
   attributes (a lot of icon-only buttons), inputs by `placeholder` or a
   linked `<label htmlFor>`. Grep the component for `title=`, `placeholder=`,
   and `getByRole`-friendly text before writing a single line of test.
2. **Check the real error/success message text server-side**, not what you'd
   guess it says — e.g. the server literally returns `"Email already
   registered"`, not `"User already exists"`. Grep `server/routes` for the
   string before asserting on it.
3. **Write the test against the real backend + real Supabase (local) + real
   Docker agent** — no mocking. See `e2e/README.md` for local setup.
4. **Run it, don't just write it.** A test that's never been run is a guess,
   not a test. This worksheet only marks a module "✅ Passing" once someone
   has actually run it against a real stack and watched it go green.
5. **If a test fails, figure out whether it's the test or the product.**
   The `useServers` polling gap (see Known issues found below) was a real
   product bug the servers test surfaced — we fixed the product, not just
   the test. Don't paper over a real bug with a longer timeout.
6. **Update this worksheet** — status, what the test actually covers, and
   anything non-obvious for whoever (including future us) extends it.

---

## Module status

| Module | Spec file | Status | Covers |
|---|---|---|---|
| Landing page | `landing.spec.ts` | ✅ Passing | Hero/nav for logged-out visitor, anchor nav scrolling, comparison table + FAQ content, register CTA |
| Auth | `auth.spec.ts` | ✅ Passing | Register → lands on `/servers`, duplicate email error, logout+login, wrong password error, protected-route redirect, forgot-password request |
| Servers | `servers.spec.ts` | ✅ Passing | Register a server, real agent connects (via real `docker run`), "Agent Online" shows after poll, delete a server |
| Containers | `containers.spec.ts` | ✅ Passing | Real container shows in list, stop via UI actually stops it in Docker, remove via UI actually removes it |
| Images | `images.spec.ts` | ✅ Passing | Real image shows in list, pulling via UI actually pulls it (event-driven, no workaround), removing via UI actually removes it |
| Volumes | `volumes.spec.ts` | ✅ Passing | Real volume shows in list, an unattached volume is marked "Orphaned" and can be removed via the UI |
| Networks | `networks.spec.ts` | ✅ Passing | Real network shows in list, creating via UI actually creates it in Docker, removing an unattached network via UI actually removes it |
| Alerts | `alerts.spec.ts` | ✅ Passing | Saving webhook URL + CPU threshold persists across a reload, agent status shows "Online" once connected |
| Stacks | `stacks.spec.ts` | 🟡 Partial | Saved-stack CRUD (create/edit/delete YAML — pure REST, no agent needed for these) is ✅ passing. Actual Deploy/Down is 🔴 blocked — see Known issues — and that one test is intentionally `test.skip`ped, not deleted |
| Audit Log | `audit-log.spec.ts` | ✅ Passing | Server create/delete actions appear in the log with "ok" result, pagination "Newer" button disabled on the first page |
| Settings | `settings.spec.ts` | ✅ Passing | Danger Zone: deleting a server removes it and correctly lands back on the Servers list (only the Danger Zone delete path is covered — Members/Engine Logs/Server Setup sections not yet tested) |
| Profile | `profile.spec.ts` | ✅ Passing | Edit name persists across reload, changing password actually works (old password rejected, new one logs in), logout clears the session |
| Billing | — | ⬜ Not started | Currently a "Pro coming soon" placeholder per Landing page copy — low priority until billing actually ships |
| Reset password / Verify email | — | ⬜ Not started | Needs a way to read the token (email is logged in dev, not sent — see e2e/README.md) |

**Legend:** ⬜ Not started · 🟡 Written but not confirmed passing against a real stack · ✅ Passing (confirmed by a real run) · 🔴 Failing / blocked

---

## What's next

**Refactor note:** `connectedServer` (register a server + connect a real
agent + land on its dashboard) is no longer duplicated per-file — it's a
shared fixture at `fixtures/connected-server.ts`, built on top of
`fixtures/auth.ts` and `fixtures/docker-agent.ts`. Both `containers.spec.ts`
and `images.spec.ts` now import `test`/`expect` from it. Any new module that
needs a live agent should do the same rather than redefining it.

Only two modules left, both blocked on things other than test-writing
effort — see their notes below:

1. ~~Images~~ — done
2. ~~Volumes~~ — done
3. ~~Networks~~ — done
4. ~~Alerts~~ — done (found and fixed a real bug — see Known issues)
5. ~~Settings / Profile~~ — done (found and fixed two more real bugs — see
   Known issues); Settings only covers the Danger Zone delete path so far,
   not Members/Engine Logs/Server Setup
6. ~~Audit Log~~ — done, no bugs found
7. ~~Stacks~~ — done, saved-stack CRUD passing; deploy/down blocked on a
   stale published agent image, see Known issues (`@known-broken` tag, not
   deleted — re-enable once the image and the missing `docker:error`
   handler are both fixed)
8. Reset password / Verify email (needs an approach for reading the dev-logged email/token)
9. Billing (once real billing exists — currently a placeholder)

---

## Known issues found *by* these tests (not test bugs — product bugs)

Tests earning their keep: catching real problems, not just confirming happy
paths. Log them here as they turn up.

- **2026-09-22 — Servers page never showed "Agent Online" without a manual
  refresh.** `useServers.js` had no `refetchInterval`; the only cache
  invalidation happened once, immediately on server creation — before the
  agent had time to connect. Fixed by adding a 10s `refetchInterval` (only
  polls while the Servers page is mounted). Found while writing
  `servers.spec.ts`.
- **2026-09-22 — CORRECTION to an earlier entry in this file:** the
  original version of this bullet claimed `AGENT_ONLINE`/`AGENT_OFFLINE`
  were dead code because grepping `server/` for the constant *names*
  (`AGENT_ONLINE`, `AGENT_OFFLINE`) found nothing. That was a bad search —
  the server sends the raw string literals `'agent:online'`/`'agent:offline'`
  directly (see `server/ws/clientConnection.ts`'s `sendCurrentAgentStatuses`,
  called on every client WS connect for every server the user belongs to).
  So this mechanism is real and working; it's just scoped to a single
  global `systemData.agentState` in `store/system.js` rather than per-server
  — a user with two servers open in two tabs, one online and one offline,
  would have whichever status arrived last win globally. Not something our
  current single-server-per-test suite would catch; noting it as a possible
  future gap, not a confirmed bug. The `useServers` polling fix below is
  unrelated and still correct — that gap was in the plain REST `/api/servers`
  list, which genuinely has no live push.
- **2026-09-22 — FIXED: Alerts webhook config could silently lose the
  user's edit before it was ever saved.** `AlertRuleConfig` fetches the
  server's current `alert_webhook_url`/`alert_cpu_threshold` on mount via a
  plain `useEffect`, with no guard against the user editing the field
  before that fetch resolves. On a fast connection (or just a fast typist),
  the fetch's `.then()` fires *after* the user has already typed a new
  value, and unconditionally calls `setWebhookUrl(...)` with the old
  server value — silently wiping what was just typed. `alerts.spec.ts`
  reproduced this consistently (Playwright's `.fill()` plus a local/fast
  backend made the race easy to hit) and initial debugging pointed at React
  `StrictMode` double-invoking the effect (real, but a red herring — fixing
  that alone, via a `cancelled` flag, did not fix the test). Direct network
  logging (`page.on("request")`, printing the PATCH body) showed the actual
  cause: the *first, only, legitimate* fetch was resolving after `.fill()`
  and before the Save click, so the PATCH request itself carried an empty
  `alertWebhookUrl`. Fixed with a `editedRef` dirty-tracking ref set `true`
  in both fields' `onChange` — the load-fetch's `.then()` now bails if the
  user has already started editing. This is a real, always-present race
  (not StrictMode-specific, not test-specific) that could bite any real
  user who edits the form quickly after the page loads. Verified `npm run
  lint` (0 errors), `npm test` (41/41), `npm run build` clean; re-ran
  `alerts.spec.ts` multiple times after the fix with no flakes.
- **2026-09-22 — NOT FIXED (documented per user's choice): the published
  `ghcr.io/sohel622002/doco-pilot-agent:latest` image predates the Stacks
  feature entirely.** Deploying a stack via the UI hung forever on
  "Waiting for output…" with zero error shown. Initial hypothesis (the
  published `agent/Dockerfile` is minimal Alpine with no `docker` CLI or
  compose plugin, so `docker compose up` would fail inside the agent
  container) was directionally right about the Dockerfile but not the
  actual cause observed — `docker logs` on the real running agent
  container showed `Action "stacks:list" failed: Unknown action:
  stacks:list` and `Action "stacks:deploy:start" failed: Unknown action:
  stacks:deploy:start`. The agent code actually running doesn't recognize
  these actions at all, meaning the *published image* predates
  `agent/src`'s Stacks support — not a missing-CLI problem, a stale-image
  problem. Root cause: `.github/workflows/deploy.yml` only rebuilds and
  republishes `:latest` on a version-tag push (`v*`) or manual
  `workflow_dispatch` — not on every push to `main`/`development` — so
  ordinary commits to `agent/src` (including whenever Stacks landed) never
  reach the image every generated `docker run` command actually pulls.
  **Second, separate bug found in the process:** even once the image is
  current, this specific failure mode (an error via the generic
  `docker:error` catch-all path in `agent/src/ws.js`) has nowhere to go
  client-side — `Stacks.jsx`/`StackOpModal` has no `docker:error` listener
  (only `Images.jsx` does, added for the pull-timing fix), so the modal
  would hang silently on *any* deploy/down failure that takes that path,
  not just this one. User chose to document both rather than fix now —
  see `stacks.spec.ts`'s second test, `test.skip`ped with the tag
  `@known-broken` and a full explanation inline, not deleted. Re-enable it
  once (a) the agent image is republished and (b) a `docker:error` handler
  is added to Stacks.jsx following the same pattern already in Images.jsx.
- **2026-09-22 — FIXED (found from a server-side terminal log, reported by
  the user, not by a failing test): deleting a server left its agent's
  WebSocket connection open, spamming foreign-key-violation errors.**
  `DELETE /api/servers/:id` deleted the DB row but never closed the
  matching entry in `agentSockets` (`server/ws/state.ts`). The still-running
  agent container (spawned for real by our `connectedServer` fixture) kept
  streaming `docker:event`/`system:stats:result` messages, and
  `metricsPersist.ts` kept trying to insert them against a `server_id` that
  no longer existed in `servers` — a `23503` foreign key violation logged
  on every single event, indefinitely, until the agent happened to
  reconnect on its own and get rejected for revoked credentials. Fixed by
  closing and removing the agent's socket from `agentSockets` immediately
  after a successful delete in `routes/servers/core.ts`. Verified
  `npm run typecheck` and `npm test` (71/71) in `server/` clean; re-ran
  `settings.spec.ts` (the test that exercises this exact delete path)
  after the fix with no regressions. This is a good example of the limits
  of Playwright-only testing here: the *frontend* behavior (redirect,
  server disappearing from the list) looked completely correct in every
  browser assertion — the bug only showed up in the backend's own logs,
  which the test suite doesn't watch. Worth keeping an eye on the server
  terminal during future agent-teardown-heavy test runs (Servers,
  Settings), not just relying on green checkmarks.
- **2026-09-22 — FIXED: deleting a server from Settings' Danger Zone
  redirected the user straight back into the server they just deleted.**
  `DangerZoneSection.handleDeleteServer` in `Settings.jsx` called
  `navigate("/dashboard")` after the DELETE succeeded, but never
  invalidated the `["servers"]` React Query cache — unlike `Servers.jsx`'s
  own delete handler, which does. `RootRedirect` (mounted at `/dashboard`)
  reads that same cached list via `useServers()`; with `staleTime: 5min`
  and no invalidation, it saw the just-deleted server as still the user's
  "first server" and redirected right back into it. `settings.spec.ts`
  caught this: asserting a landing on `/servers` after delete consistently
  failed, ending up back on the deleted server's URL instead. Fixed by
  adding the same `queryClient.invalidateQueries({ queryKey: ["servers"] })`
  call already used in `Servers.jsx`, before navigating. Verified `npm run
  lint` (0 errors), `npm test` (41/41), `npm run build` clean; re-ran the
  test after the fix, passing.
- **2026-09-22 — FIXED: Images page didn't reflect a real pull if it took
  longer than 3 seconds.** Confirmed real (the pull test needed a
  reload-poll workaround to pass), then fixed properly: `IMAGES_PULL_RESULT`
  and `IMAGES_REMOVE_RESULT` (WS action types that already existed as
  constants but were never handled) now dispatch `images:pulled` /
  `images:removed` window events, the same pattern already used for
  `images:pruned`/`images:built`. `Images.jsx`'s `handlePull`/`handleRemove`
  no longer guess with `setTimeout` — they react to the real result. Also
  added a `DOCKER_ERROR` ('docker:error') handler so a failed pull surfaces
  a real error message in the UI instead of the button silently resetting
  after 3s with nothing pulled. `images.spec.ts`'s pull test simplified back
  to a plain `toBeVisible` (no more reload-poll workaround needed) —
  **re-run confirmed all 3 Images tests green with the fix in place.**

---

## Known test-infra gotchas (so we don't rediscover these)

- **Windows + the generated `docker run` command:** `DockerCommandBlock`
  renders bash/PowerShell/cmd.exe tabs with different line-continuation
  syntax. The bash tab is selected by default in the UI, but on Windows we
  run it through `powershell.exe` — so `fixtures/docker-agent.ts` clicks the
  "PowerShell" tab before extracting the command text when
  `process.platform === "win32"`. If you add a new fixture that reads this
  block, don't forget this.
- **Supabase creds:** never run these tests against production Supabase —
  see `server/.env`, `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` must point
  at the local `supabase start` stack (`http://127.0.0.1:54321` + the
  printed "Secret key", not the hosted project). The base schema now lives
  at `supabase/migrations/20240100000000_base_schema.sql` so `supabase
  start` applies it automatically — no manual `psql` step needed.
- **`BACKEND_WS_URL` in `server/.env`** must be
  `ws://host.docker.internal:3001/ws`, not `ws://localhost:3001/ws` — that
  value gets baked into the generated agent install command and run inside
  a separate container, where `localhost` means the container itself.
- **Types:** `e2e/` has its own `tsconfig.json` + `@types/node` — needed for
  `process.platform` etc. in fixtures to type-check.

---

## Changelog

- **2026-09-22** — Worksheet created. Auth and Servers confirmed passing
  against a real local stack. Landing and Containers written but not yet
  run. Logged the two product bugs found so far.
- **2026-09-22** — Renamed this file from `TESTING.mdx` to `TESTING.md` and
  moved it to the repo root (was briefly under `e2e/`).
- **2026-09-22** — Added `images.spec.ts` (3 tests: list, pull, remove).
  Extracted the repeated `connectedServer` setup out of `containers.spec.ts`
  into a shared `fixtures/connected-server.ts` since Images needed the same
  thing. Added Docker helpers `pullThrowawayImage`, `removeImageIfPresent`,
  `imageExistsLocally` to `fixtures/docker-agent.ts`. Flagged a suspected
  (unconfirmed) timing gap in the Images pull flow — see Known issues.
  All 18 tests across 5 files verified to compile (`playwright test --list`);
  not yet run against a real stack.
- **2026-09-22** — Images module confirmed passing against a real stack —
  the reload-poll workaround in the pull test proved the timing gap was
  real. Fixed it in the product (see Known issues) instead of leaving the
  workaround in place: wired up `IMAGES_PULL_RESULT`/`IMAGES_REMOVE_RESULT`
  and a `DOCKER_ERROR` handler in `websocket-handlers.js`, rewired
  `Images.jsx` off the `setTimeout` guesses, simplified the test back to a
  plain wait. Verified `npm run lint` (0 errors), `npm test` (41/41),
  `npm run build` all clean after the change — re-run of `images.spec.ts`
  against a real stack confirmed all 3 tests green with the fix in place.
- **2026-09-22** — Ran `landing.spec.ts` for the first time. 2 of 4 tests
  failed on ambiguous selectors (test bugs, not product bugs): "Features"/
  "Security"/"Pricing"/"Compare" link text also matches the footer, and
  "Portainer" text matches four different places on the page. Fixed by
  scoping the nav-anchor test to `page.getByRole("navigation")` and the
  comparison-table assertion to the table's `columnheader` role specifically.
  All 4 tests confirmed passing after the fix.
- **2026-09-22** — Ran `containers.spec.ts` for the first time. All 3 failed
  initially, all test bugs, not product bugs: (1) the first test's 20s
  visibility timeout was too tight against a cold `docker pull nginx:alpine`
  (~30s) plus the agent WebSocket round trip, and a Playwright trace-write
  race on Windows masked the real timeout error — bumped to 30s; (2) tests
  2 and 3 used `getByTitle("Start")` without `exact: true`, which also
  matched the disabled exec button titled "Start the container to open a
  shell" — fixed by adding `exact: true` to all the action-button title
  matches. Also swapped em dashes for plain hyphens in every spec file's
  `describe()`/`test.skip()` title strings (Windows derives
  `test-results/` folder names from these; cheap insurance against
  encoding-related path flakiness, even though the real cause above was
  the timeout). All 3 tests confirmed passing after the fixes.
- **2026-09-22** — Added `volumes.spec.ts` (2 tests: list, remove an
  orphaned volume). Note for anyone extending this: the Remove button is
  only enabled when `volume.orphaned` is true (a volume attached to any
  container can't be removed from this UI) — `createThrowawayVolume()` in
  `fixtures/docker-agent.ts` makes an unattached volume on purpose so
  removal tests have something removable. First run failed on one test:
  `getByText(target.name)` without `exact: true` also matched the volume's
  mountpoint path text (`/var/lib/docker/volumes/<name>/_data` contains the
  name as a substring) — fixed, both tests confirmed passing.
- **2026-09-22** — Added `networks.spec.ts` (3 tests: list, create via UI,
  remove an unattached network). Unlike Images/Volumes, Networks already has
  a proper create form in the UI, and `NETWORKS_CREATE_RESULT` was already
  correctly wired to a `networks:created` event (no timing bug to work
  around, unlike the Images pull gap). All 3 tests passed on the first run —
  no test or product bugs found this time.
- **2026-09-22** — Added `alerts.spec.ts` (2 tests: save-and-reload
  persistence, agent status display). Discovered along the way that Alerts
  needs a connected agent to even reach the page, despite being pure REST
  with no live container/image data — `Layout.jsx` gates every per-server
  route except `/billing`, `/audit-log`, `/profile` behind
  `agentState === "online"`, and `/alerts` isn't exempted. Also **corrected
  a mistake in this file's own earlier entry**: `AGENT_ONLINE`/
  `AGENT_OFFLINE` are not dead code — the server sends the raw string
  literals directly rather than via the shared constant names, which an
  earlier grep missed. Found and fixed a real race-condition bug in
  `Alerts.jsx` (see Known issues) via careful diagnostic logging rather
  than guessing. Both tests confirmed passing, twice, after the fix.
- **2026-09-22** — Added `profile.spec.ts` (3 tests: edit name, change
  password, log out) and `settings.spec.ts` (1 test: Danger Zone delete).
  Noticed `Profile.jsx` has the exact same fetch-without-dirty-guard
  pattern just fixed in `Alerts.jsx` (`api.get("/api/auth/me").then(...)`
  with no guard) — not yet exploited by a failing test, since the fetch
  reliably resolves before the user can open the Edit Profile modal in
  practice, but worth watching if a future test starts flaking here.
  Also: neither `FormField` in `Profile.jsx` links its `<label>` to its
  input (no `htmlFor`/`id`), so `getByLabel` doesn't work on the Edit
  Profile / Change Password modals — used input type/order instead (one
  text input; three password inputs in current/new/confirm order). Added
  `registerServerNoAgent()` to `fixtures/docker-agent.ts` for tests that
  need *a* valid serverId in the URL without needing a connected agent
  (Profile is exempted from Layout's agent-online gate; Settings is not).
  One test bug found in `profile.spec.ts` (wrong assumption that login
  always lands on `/servers` — it only does for a zero-server user;
  `RootRedirect` sends a user with one server straight to it) and one real
  product bug found in `settings.spec.ts` (see Known issues). All 4 tests
  across both files confirmed passing after fixes.
- **2026-09-22** — While verifying the Settings delete fix, the user
  reported a `23503` foreign-key-violation error appearing repeatedly in
  the server's own terminal — not caught by any Playwright assertion (see
  Known issues for the fix: agent sockets weren't closed on server
  delete). Worth remembering: this suite only watches the browser: it
  needs the server terminal watched too, especially around any test that
  deletes a server or otherwise tears down something an agent still holds
  a live connection to.
- **2026-09-22** — Added `audit-log.spec.ts` (2 tests: create/delete
  actions appear in the log, pagination "Newer" disabled on first page).
  Audit Log is account-level (exempted from Layout's agent-online gate,
  like Profile), and `/api/audit-logs` has no serverId param — it returns
  every action across every server the user can access, so no agent
  fixture was needed at all, just `registerServerNoAgent()`. Deleted the
  test server via the Servers list page rather than Settings' Danger Zone,
  since Settings does need a connected agent and Audit Log doesn't — no
  reason to pull in that extra setup cost just to generate a `server:delete`
  log entry. Both tests passed on the first run.
- **2026-09-22** — Added `stacks.spec.ts` (2 tests: saved-stack CRUD,
  deploy). The CRUD test (create/edit/delete a stack's saved YAML — pure
  REST, never touches the agent) passed cleanly. The deploy test uncovered
  a real, significant gap — the published agent image is stale — which the
  user chose to document rather than fix in this pass; see Known issues
  for the full investigation. That test is intentionally `test.skip`ped
  with a `@known-broken` tag and a detailed inline comment, not deleted,
  so it's easy to find and re-enable later.
