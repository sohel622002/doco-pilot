# doco-pilot

**Remote Docker management for your own servers** — a web console that talks to lightweight agents on your hosts, so you can manage containers and images without SSH-ing into every machine.

[![CI](https://github.com/sohel622002/doco-pilot/actions/workflows/server-ci.yml/badge.svg)](https://github.com/sohel622002/doco-pilot/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Status](https://img.shields.io/badge/status-work%20in%20progress-orange.svg)](#project-status)

> **Work in progress.** Core flows work (auth, servers, agent, containers, images), but some UI is still mock or incomplete. See [Project status](#project-status) before filing “button does nothing” bugs.

---

## Project status

doco-pilot is under active development. Treat it as an early open-source preview — useful for hacking on and local use, not a finished product.

**Working today**

- Register / login (email + Google OAuth), password reset, email verification hooks
- Add servers, agent install credentials, agent online/offline
- Containers: list, start/stop/pause/unpause/restart, create, remove, inspect, logs
- Images: list, pull, remove
- Live system stats and Docker events (via agent WebSocket)
- Per-server alert webhook settings (Infrastructure)

**Present in the UI but not fully wired (or still placeholder)**

- Some dashboard cards / charts use demo or rolling client-only data (not a persisted history)
- Header search and a few chrome actions (e.g. System Logs / Support in the sidebar) are layout-only for now
- Parts of Settings beyond profile / password / verification may still be stubbed
- Features such as interactive container exec, image build from Dockerfile, and Compose stack management are **not** implemented yet

If something looks clickable but does nothing, it is likely unfinished — contributions and issues that call these out are welcome. Behavior and APIs can change without a stability guarantee until a tagged release.

---

## The problem

Running Docker across multiple VPS or home-lab hosts usually means:

- SSH into each machine and typing `docker` commands by hand
- Fragments of scripts, Portainer installs, or one-off panels that don’t share auth or audit
- Exposing the Docker socket or API over the network (high risk)
- No single place for status, logs, and alerts across hosts

You want a **central UI**, but you don’t want to give a SaaS vendor your Docker socket — or open Docker to the public internet.

## How doco-pilot solves it

doco-pilot splits into three pieces:

| Piece | Role |
| --- | --- |
| **Client** | Web UI (React) — dashboards, containers, images, servers |
| **Server** | API + WebSocket hub — auth, server registry, relays commands |
| **Agent** | Small Node process on each host — holds the Docker socket locally |

```
Browser  ──HTTPS/WS──►  Server  ◄──WS──  Agent (on your VPS)
                           │                │
                      Supabase DB      docker.sock
```

1. You register a **server** in the UI → get an agent key/secret and a `docker run` install command.
2. You run the **agent** on that host (Docker socket mounted). It connects outbound to the server over WebSocket — **no inbound Docker port** on the host.
3. The UI sends actions (start/stop/pull/…) through the server; the agent executes them against local Docker and streams results and events back.

Credentials are stored encrypted (AES-256-GCM). Agent auth uses hashed keys. The browser never talks to Docker directly.

---

## Features

What the product is aiming for (see [Project status](#project-status) for what actually works today):

- **Auth** — email/password, Google OAuth, JWT cookies, email verify & password reset (Resend)
- **Multi-server** — register many hosts; switch between them in the UI
- **Containers** — list, start/stop/pause/restart, create, remove, inspect, live logs
- **Images** — list, pull, remove
- **Live ops** — system stats, Docker event feed, agent online/offline
- **Alerts** — optional webhook on container crash / high CPU (per server)
- **Security** — rate limits, CORS lock, audit log, zod validation

---

## Tech stack

| Area | Stack |
| --- | --- |
| Client | React, Vite, Tailwind CSS v4, TanStack Query, Zustand |
| Server | Node.js, Express, WebSocket (`ws`), Zod, Pino |
| Agent | Node.js, dockerode |
| Database | Supabase (Postgres) |
| Email | Resend (optional in dev) |
| Deploy | Docker / Compose, GHCR via GitHub Actions, Caddy example |

---

## Repository layout

```
doco-pilot/
├── client/                 # Vite React app
├── server/                 # Express API + WebSocket hub
│   ├── migrations/         # Incremental SQL (run in Supabase)
│   └── supabase-schema.sql # Full schema reference
├── agent/                  # Docker socket agent
├── deploy/                 # Example reverse-proxy configs
├── docker-compose.yml      # Server + client
├── docker-compose.agent.yml
├── CONTRIBUTING.md
└── package.json            # Root convenience scripts
```

---

## Prerequisites

- **Node.js** 20+
- **Docker Desktop** (or Docker Engine) — for the agent and optional Compose stack
- A **Supabase** project (free tier is fine)
- Optional: Google Cloud OAuth client, Resend API key

---

## Quick start (local development)

### 1. Clone and install

```bash
git clone https://github.com/sohel622002/doco-pilot.git
cd doco-pilot

npm install --prefix server
npm install --prefix client
# agent deps are installed inside its Docker image
```

### 2. Database

1. Create a Supabase project.
2. In the SQL editor, run `server/supabase-schema.sql`.
3. Also run any files under `server/migrations/` (in order), e.g.:
   - `001_google_oauth.sql`
   - `002_server_alerts.sql`

### 3. Environment files

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
cp agent/.env.example agent/.env
```

Fill at least these in **`server/.env`**:

| Variable | Notes |
| --- | --- |
| `FRONTEND_URL` | `http://localhost:5173` |
| `JWT_SECRET` | Long random string |
| `MASTER_ENCRYPTION_KEY` | 64 hex chars (32 bytes) — e.g. `openssl rand -hex 32` |
| `SUPABASE_URL` | From Supabase settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server only — never expose to the client) |
| `BACKEND_WS_URL` | `ws://localhost:3001/ws` for local agents |

**`client/.env`** (defaults usually work locally):

```env
VITE_BACKEND_API_URL=http://localhost:3001
VITE_BACKEND_WS=ws://localhost:3001/ws
```

### 4. Run server + client

From the repo root (two terminals):

```bash
npm run dev:server   # http://localhost:3001
npm run dev:client   # http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173), register an account, then add a server from the UI.

### 5. Run the agent (against this machine’s Docker)

1. In the app, open your server → **Infrastructure** and copy **Agent key** / **secret** into `agent/.env`.
2. Start Docker Desktop, then:

```bash
npm run dev:agent
```

Stop with:

```bash
npm run stop:agent
```

The compose file mounts the host Docker socket and points the agent at `ws://host.docker.internal:3001` so the container can reach the server on your machine.

---

## Optional: Google sign-in

1. [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) → OAuth 2.0 Client ID (Web).
2. Authorized redirect URI: `http://localhost:3001/api/auth/google/callback`
3. Set in `server/.env`:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback
```

4. Ensure `001_google_oauth.sql` has been applied, then restart the server.

---

## Optional: full stack with Compose

With `server/.env` filled:

```bash
docker compose up --build
```

- Client: [http://localhost:5173](http://localhost:5173)  
- API: [http://localhost:3001](http://localhost:3001)

For production TLS, see `deploy/Caddyfile.example`.

---

## Scripts (root)

| Command | Description |
| --- | --- |
| `npm run dev:server` | API + WS on port 3001 |
| `npm run dev:client` | Vite dev server on 5173 |
| `npm run dev:agent` | Build/run agent via Docker Compose |
| `npm run stop:agent` | Stop the agent container |

Server tests:

```bash
npm test --prefix server
```

---

## Security notes

- Keep `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, and `MASTER_ENCRYPTION_KEY` **out of the client** and out of git.
- Prefer agents that **dial out** over WebSocket; don’t expose `docker.sock` on a public port.
- In production set `NODE_ENV=production`, real `FRONTEND_URL` / `BACKEND_WS_URL` (`wss://…`), and terminate TLS at a reverse proxy.

---

## Contributing

Contributions are welcome — bug reports, docs, and PRs.  
Please read **[CONTRIBUTING.md](./CONTRIBUTING.md)** for setup, branch naming, and review expectations.

---

## License

Released under the [MIT License](./LICENSE).
