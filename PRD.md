# doco-pilot — Feature Breakdown & PRD

## ✅ Features Already Implemented

**Auth & Security**
- Email/password registration & login (bcrypt hashing)
- JWT access + refresh token auth (cookie-based)
- Refresh token storage/rotation table in DB
- Rate limiting (API: 200/15min, Auth: 20/15min, WS: 60 cmds/min)
- CORS locked to `FRONTEND_URL`
- AES-256-GCM encryption of agent credentials at rest
- Agent handshake via HMAC-signed key/secret, verified against bcrypt hash
- Row-Level Security enabled on all Supabase tables

**Server Management**
- Add/register a server (generates unique agent key/secret pair)
- Auto-generated `docker run` install command for the agent
- Agent connection status tracking (`agent_connected`, `last_seen_at`)

**Container/Image Operations (real-time via WebSocket)**
- List containers, live container list updates
- Start / stop / pause / unpause / restart container
- List Docker images (size, age)
- Live system stats streaming
- Live Docker event streaming (agent → browser)
- Agent online/offline status push

**Client UI**
- Login / Register pages
- Home dashboard, Containers page, Images page
- Infrastructure page (agent install instructions)
- Settings page (stub/minimal)
- Root redirect logic based on server state

---

## 🚧 Features Not Yet Implemented

- Multi-user roles/permissions (teams, RBAC) — skipped per user decision
- Exec into container (interactive shell) — skipped per user decision (security exposure)
- Build image from Dockerfile
- Docker Compose stack management
- Persisted historical stats (current version is a client-side rolling window, resets on reload)
- Host-deploy step (image build/push to GHCR is automated; pulling + restarting on your actual host is not)
- Rate-limit/backoff visibility to user (agent reconnect status in UI)
- Rest of the Settings page (Engine Config, live log stream) — still mocked UI

See the checklist below for everything already done in detail.

---

## 📋 PRD — doco-pilot v1

### 1. Authentication & Account
- [x] Register with email/password
- [x] Login with JWT (access + refresh cookies)
- [x] Logout
- [x] Forgot/reset password (delivered via Resend; logs the link instead if RESEND_API_KEY is unset)
- [x] Email verification (Resend; banner + resend button in Settings when unverified)
- [x] Change password + profile (name) editing (Settings page)

### 2. Server (Node) Management
- [x] Register a new server, generate agent credentials
- [x] Display install command for agent
- [x] Track agent connected/disconnected + last seen
- [x] Edit/rename server (API existed; still no client UI form)
- [x] Delete/deregister server (revoke agent credentials)
- [x] Multiple servers dashboard/overview view (`/servers` page)

### 3. Container Management
- [x] List containers (real-time)
- [x] Start / Stop / Restart / Pause / Unpause
- [x] View container logs (streamed)
- [ ] Exec into container (interactive shell)
- [x] Create new container (image, name, port mappings, env vars)
- [x] Remove container
- [x] Inspect container (env vars, mounts, network)

### 4. Image Management
- [x] List images
- [x] Pull image
- [x] Remove image
- [ ] Build image from Dockerfile

### 5. Monitoring
- [x] Live system stats (CPU/mem/disk via `system:stats`)
- [x] Live Docker event feed
- [x] Historical stats/graphs (client-side rolling window, last ~2.5 min — not a persisted time series)
- [x] Alerting (webhook on container crash + high CPU usage, configurable per server, 10-min cooldown per alert kind)

### 6. Security & Ops
> Alerting config lives per-server (webhook URL + CPU threshold) on the Infrastructure page. Email delivery needs `RESEND_API_KEY` set in the server's `.env` — without it, verification/reset links are logged instead of emailed (see `.env.example`).
- [x] Rate limiting (API, auth, WS)
- [x] CORS restriction
- [x] Encrypted credential storage
- [x] HMAC-signed agent handshake
- [x] Centralized structured logging (pino — JSON in prod, pretty in dev)
- [x] Persisted audit trail (DB `audit_logs` table, console kept as fallback)
- [x] Input validation (zod) on auth + servers routes
- [x] Automated tests (vitest — encryption + schema validation, 12 tests passing)

### 7. Deployment & DevOps
- [x] Server Dockerfile
- [x] Agent Dockerfile
- [x] Client Dockerfile / static build hosting (nginx)
- [x] `docker-compose.yml` for local stack (server + client)
- [x] CI/CD pipeline (GitHub Actions — lint/test/build per component; deploy.yml builds & pushes images to GHCR on tag push, no host-deploy step wired up)
- [x] `.env.example` for server and client
- [x] Reverse proxy + TLS config (example Caddyfile — deploy/Caddyfile.example)

---

## 🚀 Minimum Changes to Deploy v1 (Go-Live Checklist)

These are the **blockers only** — the smallest set of changes to get this live safely, not full feature completeness:

1. **Fix hardcoded client env values**
   - `doco-pilot-client/.env` has `http://localhost:3001` and `ws://localhost:3001/ws` committed directly. Replace with a `.env.production` pointing to real domain, e.g. `https://api.yourdomain.com` and `wss://api.yourdomain.com/ws`. Remove the committed `.env` from git if it's tracked and add `.env.example` instead.

2. **Add a client build/hosting path**
   - No Dockerfile for client. Either:
     - Add a simple static Dockerfile (Vite build → nginx serve), or
     - Deploy client to Vercel/Netlify/Cloudflare Pages instead (simplest for v1).

3. **Set production env vars on server host**
   - `NODE_ENV=production`, `FRONTEND_URL=https://yourdomain.com`, real `JWT_SECRET`, `MASTER_ENCRYPTION_KEY` (strong random 32-byte keys — do not reuse dev secrets), `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` for prod Supabase project, `BACKEND_WS_URL=wss://api.yourdomain.com/ws`.

4. **TLS/HTTPS termination**
   - Server has no HTTPS enforcement built in — it assumes a reverse proxy. Put it behind Nginx/Caddy/Cloudflare or your host's managed TLS (Railway/Render/Fly.io handle this automatically) before exposing publicly, since auth cookies and WS handshakes must not travel over plain HTTP/WS.

5. **Set secure cookie flags in production**
   - Verify `NODE_ENV=production` actually flips cookies to `Secure`/`SameSite=None` (needed if client and server are on different subdomains) — check `utils/auth.js`/`middleware/auth.js` cookie options.

6. **CORS lockdown**
   - Confirm `FRONTEND_URL` is set to the exact production origin, not `*` or localhost.

7. **Agent install command domain**
   - The generated `docker run` command (from `routes/servers.js` using `BACKEND_WS_URL`) must point to the production WS URL, not localhost, or newly registered agents will fail to connect.

8. **Rotate/generate real secrets**
   - Any dev secrets (`JWT_SECRET`, `MASTER_ENCRYPTION_KEY`, Supabase service key) must be freshly generated for prod and stored in the hosting platform's secret manager — never committed.

9. **Minimal smoke test before go-live**
   - Manually verify: register → login → add server → run agent install command on a real box → confirm `agent_connected` flips true → start/stop a container from UI. (No automated tests exist, so this must be manual for v1.)

That's the minimum bar — no new features required, just closing the localhost/dev-only gaps. Tests, CI/CD, logging, and audit trail are strongly recommended next but not hard blockers for a v1 launch.
