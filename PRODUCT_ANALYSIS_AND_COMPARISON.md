# doco-pilot — Product Analysis & Competitive Comparison

*Research report, compiled 2026-09-02*

## 1. What is doco-pilot?

**doco-pilot is a hosted SaaS control plane for remote Docker *monitoring and management*, with a self-hosted agent that runs on the user's own VPS.** It is explicitly not a deployment/PaaS platform — it does not deploy, build, or run the user's applications for them. The pitch is: "hand us your VPS (by running our agent image on it), and we give you visibility and control over what's already running there" — container/image/volume/network state, live and historical resource metrics, event history, and alerting. It solves the problem of managing Docker on multiple VPS/bare-metal/home-lab machines without SSH-ing into each one, without exposing the Docker Engine API/socket to the internet, and without hand-rolling scripts across boxes.

**Important correction on terminology:** this is *not* "self-hosted" in the way Coolify/Dokploy/Portainer CE typically are. In the current deployment:

- **Client** (React SPA) is hosted on **Vercel**, operated by you.
- **Server** (Express/API/WebSocket relay) is hosted on **Render**, operated by you.
- **Database** is **Supabase**, operated by you.
- Only the **Agent** — a Docker image — is deployed by the end user, on their own VPS.

So the control plane (UI + API + database, i.e. the parts that hold user accounts, server metadata, encrypted credentials, and metrics history) is run by you as a SaaS. The user only ever runs the lightweight agent container. This is the same shape as **Netdata Cloud**, **Datadog's Agent**, or **Portainer's Business/Edge Agent Cloud offering** — a managed cloud control plane paired with a self-hosted collector/executor — not the same category as Coolify/Dokploy, where the user deploys the *entire* stack (UI + API + DB) themselves.

The repo does include the Docker Compose files needed to self-host the full stack (client + server, pointed at your own Supabase project), so doco-pilot is technically **self-hostable** — but as currently run in production, it is offered as a **hosted SaaS with a self-hosted agent**, and should be described that way rather than as a "self-hosted tool."

**Architecture:**

```
Browser (React SPA) ──HTTPS/WS──► Server (Express + ws relay + Supabase) ◄──WS── Agent (per VPS, dockerode)
     [Vercel]                          [Render]            [Supabase]                  │
                                                                                   /var/run/docker.sock
                                                                                     [user's own VPS]
```

- **Client** — React 19 + Vite + Tailwind SPA (dashboards, containers, images, volumes, networks, alerts). Hosted by you on Vercel.
- **Server** — Express/ws relay hub + Supabase (Postgres) for auth, server registry, metrics/event history, alerting. Hosted by you on Render. It never touches Docker directly.
- **Agent** — a small Node process the *user* installs on each managed VPS (as a Docker container), using `dockerode` for Docker Engine calls and `systeminformation` for host stats. It always **dials out** to your server over WebSocket — no inbound port is opened on the managed host.

This "thin relay, agent does the work" design is doco-pilot's core architectural bet, and it's the same shape Portainer's Edge Agent and Dokploy's remote-server agent use — though those products are typically self-hosted end-to-end, while doco-pilot currently runs its control plane as SaaS.

**Data-custody tradeoff worth flagging:** because the control plane is hosted by you, users are trusting your Supabase/Render instance with their server metadata, agent credentials (encrypted at rest, but decryptable by your server), and historical metrics — even though the Docker socket itself is never exposed. Coolify/Dokploy users who self-host the full stack keep 100% of that data on their own infrastructure. This is a real difference to be upfront about in any positioning against those tools, and to revisit if/when you offer a fully self-hostable mode as an alternative to the SaaS.

## 2. Core features

| Area | Feature |
|---|---|
| **Auth** | Email/password, Google OAuth, JWT sessions with IP-bound access tokens + rotating refresh tokens, email verification, password reset, rate limiting |
| **Multi-server** | Add unlimited remote servers, each gets a generated agent install command with encrypted (AES-256-GCM) + hashed (bcrypt) credentials |
| **Container management** | List/inspect/start/stop/pause/restart/remove/create, live logs |
| **Live stats** | Per-container CPU/mem/net stats, host-level CPU/mem/disk/network via the agent |
| **Images** | List/pull/remove/prune/dangling cleanup |
| **Volumes & Networks** | List/inspect/create/remove |
| **Disk usage** | Docker disk-usage breakdown (images/containers/volumes) |
| **Event feed** | Live Docker event stream, persisted history |
| **Metrics history** | Time-series server metrics persisted to Postgres, sampled ~1/min |
| **Alerting** | Threshold-based (e.g. high CPU, container crash) outbound webhook alerts with cooldown, alert history |
| **Agent uptime tracking** | Rolling 30-day uptime % per server |
| **Audit logging** | Server-side audit trail of actions |
| **Security** | HMAC-signed agent handshake, TLS-verified WS connections, input validation via Zod, CORS lockdown |

## 3. Known limitations (from the codebase and the project's own self-audit)

Note: several items below (Compose deploy, image builds, templates, Git deploy, SSL automation) are only "limitations" if doco-pilot were trying to be a deployment/PaaS platform. Since it isn't — it's a monitoring/management tool for containers that already exist on the VPS — these are more accurately **out-of-scope by design** than gaps. They're still listed here because they matter for the comparison section below, where competitors do include them.

Genuine limitations, within doco-pilot's own stated scope (monitoring/managing existing Docker workloads):

- **Single-owner model only** — no teams, organizations, or RBAC. Every server belongs to exactly one user; there's no way to share access.
- **No public/programmatic API** — no API tokens exist (an earlier UI mockup of one was fabricated and flagged for removal).
- **No interactive container exec** — no in-browser terminal / `docker exec` (useful for debugging a running container even without deploying anything).
- **No vulnerability/security scanning** (no Trivy/Docker Scout-style CVE reporting on running images).
- **No backup/restore functionality** for containers or volumes.
- **Notifications = outbound webhooks only** — no email/Slack/Discord/in-app notification center.
- **No CLI tool** — web UI + agent image only.
- Project is explicitly **"work in progress"** — no tagged stable release; some UI polish/dead code remains from earlier iterations.

Out of scope by design (not gaps, since doco-pilot doesn't attempt to be a deploy/PaaS tool):

- No Docker Compose / stack orchestration, image builds from Dockerfile, Git-based deploy/CI, templates/app marketplace, or automated SSL/domain provisioning — these are all "deploy an app" features, which is a different product category (see §5).
- No Docker Swarm / Kubernetes / clustering — doco-pilot manages one Docker Engine per agent/host, matching its "monitor what's there" scope.

## 4. Feature comparison vs. Portainer / Coolify / Dokploy

**Read this table with the category difference in mind:** Portainer is a genuine peer — a Docker/container *management and monitoring* tool, same as doco-pilot. Coolify and Dokploy are **deployment/PaaS platforms** — their primary job is taking a Git repo or Compose file and running it for you (build, deploy, SSL, domains), with container management as a byproduct of that. Rows like Compose deploy, Git-based deploy, templates, and SSL automation aren't features doco-pilot is behind on — they're a different product's core job.

| Feature | **doco-pilot** | Portainer (peer) | Coolify (PaaS) | Dokploy (PaaS) |
|---|---|---|---|---|
| Deployment model | Hosted SaaS control plane (Vercel/Render/Supabase) + self-hosted agent | Self-hosted (CE) or Business Cloud | Self-hosted (or Coolify Cloud) | Self-hosted |
| Open source | ✅ (control plane; agent is deployed by user) | ✅ (CE) | ✅ (Apache 2.0) | ✅ (Apache 2.0) |
| User keeps full data custody | ❌ (metadata/credentials/metrics live in your Supabase/Render) | ✅ (self-hosted) | ✅ (self-hosted) | ✅ (self-hosted) |
| Multi-server management | ✅ (agent per host) | ✅ (Edge Agent) | ✅ | ✅ (SSH + remote Docker API control plane) |
| No inbound port on managed host | ✅ (agent dials out) | ✅ (Edge tunnel) | Partial (SSH-based) | Partial (SSH-based) |
| Container start/stop/logs/inspect | ✅ | ✅ | ✅ | ✅ |
| Image pull/remove/prune | ✅ | ✅ | ✅ | ✅ |
| Image **build** from Dockerfile | ❌ | ✅ | ✅ | ✅ |
| Volumes / Networks management | ✅ | ✅ | ✅ | ✅ |
| Interactive container exec (web terminal) | ❌ | ✅ | ✅ | ✅ |
| Docker Compose / stack deploy | ❌ | ✅ (stacks) | ✅ (core feature) | ✅ (core feature) |
| One-click app templates/marketplace | ❌ | ✅ (App Templates) | ✅ (280+ services) | ✅ (500+ templates) |
| Git-based deploy / CI-on-push | ❌ | ❌ | ✅ | ✅ |
| Preview deployments (per PR) | ❌ | ❌ | ✅ (GitHub App) | ❌ |
| Automated SSL (Let's Encrypt) | ❌ | ❌ | ✅ | ✅ (Traefik-integrated) |
| Live metrics (CPU/mem/disk/net) | ✅ | ✅ | ✅ | ✅ |
| Historical metrics persisted | ✅ | ✅ | ✅ | ✅ |
| Alerting / notifications | Webhook only | Limited | Email/Slack/Telegram/Discord | Email/Slack/Telegram/Discord/webhook |
| Teams / RBAC | ❌ | ✅ (mature) | ✅ (via Teams) | ✅ (granular, owner/admin/member) |
| SSO/SAML/2FA | ❌ | ✅ (Business Edition) | Partial | ✅ (Enterprise) |
| Backups (S3, etc.) | ❌ | ❌ (native) | ✅ (S3-compatible) | ✅ |
| Public/programmatic API | ❌ | ✅ | ✅ | ✅ |
| Kubernetes support | ❌ | ✅ | ❌ (roadmap only) | ❌ |
| Docker Swarm support | ❌ | ✅ | ❌ | ✅ |
| Audit logging | ✅ | ✅ (Business) | Partial | ✅ |
| Google OAuth login | ✅ | ❌ (native) | Via OIDC | Via OIDC |

**Positioning:** doco-pilot currently sits closest to a **lightweight, security-conscious Docker fleet monitoring/management dashboard delivered as SaaS** — its architecture (encrypted agent credentials, HMAC handshake, IP-bound JWTs, dial-out-only agent) is more rigorous than what Portainer typically documents, but its management feature surface (exec, builds, RBAC, API) is smaller. Its true competitive set is **Portainer**, not Coolify/Dokploy — those two solve "deploy my app," while doco-pilot solves "show me and let me control what's already running on my VPS."

## 5. A note on category and deployment model

Two separate axes are easy to conflate here — worth keeping distinct:

1. **Product category** — "monitor/manage existing Docker workloads" (doco-pilot, Portainer) vs. "deploy and run my app" (Coolify, Dokploy, which happen to include container management as a side effect of deploying). Comparing doco-pilot's missing Compose/Git-deploy/SSL/templates against Coolify/Dokploy is really comparing it against a different product category, not a weaker competitor in its own category.
2. **Deployment model** — "user runs the whole stack themselves" (Portainer, Coolify, Dokploy, all true self-hosted) vs. "vendor runs the control plane as SaaS, user only runs a small agent" (doco-pilot, closer in shape to Netdata Cloud or Datadog). This is orthogonal to category — it's about who operates the UI/API/DB, not what the product does.

When pitching against Portainer specifically (the real peer), lead with the zero-install convenience — no server/DB to run yourself, just drop in an agent — and be upfront that this trades away full data custody (Portainer self-hosted keeps everything on the user's own infra; doco-pilot's control plane holds server metadata, encrypted credentials, and metrics history in your Supabase/Render). When Coolify/Dokploy come up, the honest answer is "different job" rather than "missing features."

## 6. Features Portainer has that doco-pilot lacks (the real gap)

- Image builds from a Dockerfile/Git repo
- Interactive in-browser container terminal/exec (`docker exec`)
- Teams, organizations, and role-based access control
- SSO/SAML/2FA (Business Edition)
- Public/programmatic REST API with API tokens
- Docker Swarm and Kubernetes cluster support
- App/stack templates (Portainer's are still container/Compose-focused, not a full PaaS)

## 7. Features Coolify/Dokploy have that are simply a different product category

These aren't gaps in doco-pilot — they're the core job of a deployment/PaaS platform, which doco-pilot doesn't attempt to be:

- Docker Compose / multi-container stack deployment
- One-click application template marketplaces (Coolify 280+, Dokploy 500+)
- Git-based deployment with automatic CI/CD on push
- Pull-request preview deployments (Coolify)
- Automated SSL/TLS certificate issuance and renewal
- Automated backups to S3-compatible storage
- Multi-channel notifications — email, Slack, Telegram, Discord (doco-pilot currently only supports outbound webhooks — this one is a genuine, category-agnostic gap worth closing regardless)

## Sources

- [Portainer Alternatives 2026 — Rackspace Spot](https://spot.rackspace.com/blog/portainer-alternatives)
- [Dokploy vs Coolify 2026 — INTROSERV](https://introserv.com/blog/dokploy-vs-coolify-complete-comparison-of-the-best-self-hosted-paas-platforms-for-vps-and-dedicated-servers-2026/)
- [Portainer Alternatives — Dokploy blog](https://dokploy.com/blog/portainer-alternatives)
- [Coolify vs Dokploy — LumaDock](https://lumadock.com/tutorials/coolify-vs-dokploy)
- [Coolify Docs — Docker Compose](https://www.coolify.io/docs/api-reference/applications/create-docker-compose)
- [Coolify Features Full Overview 2026 — VyomCloud](https://www.vyomcloud.com/blog/coolify-features-full-overview-2026/)
- [Dokploy — Multi-Server Management (DeepWiki)](https://deepwiki.com/Dokploy/dokploy/10-multi-server-management)
- [Dokploy — Docker Compose Deployments (DeepWiki)](https://deepwiki.com/dokploy/dokploy/5.1-docker-compose-deployments)
- [Portainer Features](https://portainer.io/features)
- [Portainer Edge Agent Docs](https://docs.portainer.io/advanced/edge-agent)
- [Coolify vs Portainer — Contabo Blog](https://contabo.com/blog/coolify-vs-portainer-paas-vs-container-management-explained-2026/)
- [Coolify RBAC discussion — GitHub](https://github.com/coollabsio/coolify/discussions/8086)
- [Dokploy Role-Based Access Control](https://dokploy.com/features/role-based-access-control)
- [Dokploy Templates](https://dokploy.com/templates)
- [Dokploy Enterprise](https://dokploy.com/enterprise)
