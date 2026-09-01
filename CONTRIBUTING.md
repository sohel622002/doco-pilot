# Contributing to doco-pilot

Thanks for helping improve doco-pilot. This guide covers how to set up a dev environment, what we expect in PRs, and how to report issues.

## Code of conduct

- Be respectful and constructive in issues, PRs, and reviews.
- Assume good intent; disagree on ideas, not people.
- Don’t share secrets, production credentials, or other people’s data in issues or PRs.
- The project is a **work in progress** — some UI is mock or unfinished. Prefer issues that say “this control is not wired yet” over assuming a regression, unless a previously working path broke.

## Ways to contribute

- **Bugs** — clear reproduction steps and environment (OS, Node, Docker).
- **Docs** — README, CONTRIBUTING, comments that match real behavior.
- **Features** — open an issue first for non-trivial changes so we can align on scope.
- **Tests** — especially `server/` (Vitest) and validation/encryption paths.
- **DX** — scripts, Docker, CI, migration clarity.

Good first areas: UI polish, error handling, missing tests, schema/docs sync, agent reconnect UX.

## Development setup

1. Fork the repo and clone your fork.
2. Follow **Quick start** in [README.md](./README.md) (Supabase schema, `.env` files, `dev:server` / `dev:client`).
3. For agent work, use Docker Desktop and `npm run dev:agent` with credentials from a registered server.

### Useful commands

```bash
# API
npm run dev --prefix server
npm test --prefix server

# UI
npm run dev --prefix client
npm run lint --prefix client
npm run build --prefix client

# Agent (Docker)
npm run dev:agent
npm run stop:agent
```

Never commit real `.env` files or keys. Use the `.env.example` files as templates.

## Branching and commits

- Create a branch from `main`:  
  `feature/…`, `fix/…`, `docs/…`, or `chore/…`
- Keep commits focused; prefer small PRs over mega-diffs.
- Write commit messages that explain **why**, not only what changed.

Examples:

```text
fix: handle untagged images on Images page
docs: document Google OAuth env vars
feat: add webhook cooldown for high-CPU alerts
```

## Pull requests

1. Ensure the app still runs for the path you touched (auth, servers, agent, UI).
2. Run relevant checks (`npm test --prefix server`, `npm run lint --prefix client`).
3. Open a PR against `main` with:
   - **Summary** — what and why
   - **Test plan** — steps you ran (or how reviewers can verify)
   - Screenshots for UI changes when useful
4. Link related issues (`Fixes #123`).
5. Keep scope tight — unrelated refactors belong in a separate PR.

Maintainers may ask for changes; please respond or mark the PR as draft if you’re still iterating.

## Project conventions

### Layout

| Path | Own |
| --- | --- |
| `client/` | React UI, Tailwind tokens in `src/index.css` |
| `server/` | REST + WebSocket, Supabase access, auth |
| `agent/` | Docker operations via dockerode |

### Client

- Prefer existing design tokens (`p-space-md`, `text-body-main`, color tokens) over one-off pixel values.
- Don’t introduce `--spacing-sm` / `--spacing-md` named like Tailwind container sizes — they collide with `max-w-md` (use `space-*` names).
- Match patterns already used on nearby pages (axios `withCredentials`, Zustand stores, WS actions).

### Server

- Validate inputs with Zod schemas under `server/schemas/`.
- Log with Pino; don’t `console.log` secrets.
- Schema changes: update `server/supabase-schema.sql` **and** add a migration with `npm run db:migration:new -- <name>` (files land in `supabase/migrations/`). Apply with `npm run db:push`. For DBs that already match the schema file, baseline with `npx supabase migration repair --status applied <timestamp>` instead of re-running SQL.
- Auth cookies and CORS must keep working across local client/server ports.

### Agent

- Keep the process able to reach Docker without exposing the socket remotely.
- Preserve non-root + `docker-entrypoint.sh` behavior unless you have a strong reason and document it.

## Reporting bugs

Use a GitHub issue and include:

- Expected vs actual behavior  
- Steps to reproduce  
- Component (client / server / agent)  
- Versions (Node, Docker, OS)  
- Relevant logs (redact keys and tokens)

Security-sensitive reports (auth bypass, secret leak): prefer a private channel to the maintainer if available; otherwise open a minimal issue without exploit detail and mark it security-related.

## License

By contributing, you agree that your contributions are licensed under the same [MIT License](./LICENSE) as the project.
