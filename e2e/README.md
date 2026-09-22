# doco-pilot end-to-end tests

Real backend + real Docker agent, driven by Playwright. No mocking: tests
register real users against a real (local) Supabase project, register real
servers, spin up real `doco-pilot/agent` containers against your actual
Docker daemon, and assert on what the UI shows against what Docker actually
did.

## One-time setup

1. **Install the Supabase CLI** (https://supabase.com/docs/guides/cli) and
   start the local stack from the repo root:

   ```bash
   supabase init   # only if you haven't already
   supabase start
   ```

   This prints a local `API URL` and `service_role key` — put those into
   `server/.env` as `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`.

2. **Apply the schema** to the local stack:

   ```bash
   psql "$(supabase status -o env | grep DB_URL | cut -d= -f2)" -f server/supabase-schema.sql
   ```

3. **Fill in the rest of `server/.env`** (copy from `.env.example`):
   `JWT_SECRET`, `MASTER_ENCRYPTION_KEY` (32-byte hex).

   For `BACKEND_WS_URL`, **do not use `ws://localhost:3001/ws`** — that
   command gets baked in and run inside a separate agent *container*, where
   `localhost` means the container itself, not your machine. Use:
   - `ws://host.docker.internal:3001/ws` if the server runs directly on
     your host (`npm run dev` in `server/`, not in Docker) — Docker Desktop
     resolves this to the host automatically on Mac/Windows. On Linux, add
     `--add-host=host.docker.internal:host-gateway` to the agent's docker
     run command, or just use `ws://<your-LAN-IP>:3001/ws`.
   - `ws://server:3001/ws` if the server itself runs as the `server`
     service in `docker-compose.yml` — Docker's internal DNS resolves the
     service name, but only for containers on the same compose network,
     so the spawned agent container needs `--network doco-pilot_default`
     (or whatever `docker-compose config --services` calls your network).

   `fixtures/docker-agent.ts` runs the command exactly as generated — it
   doesn't rewrite the host, so get this right in `server/.env` up front.

   Leave `RESEND_API_KEY` unset — emails get logged instead of sent, which is
   fine for tests (we never click email links in these tests today).

4. **Start the app stack:**

   ```bash
   docker-compose up --build server client
   ```

   or run `npm run dev` in `server/` and `client/` separately.

5. **Install Playwright** (from this `e2e/` directory):

   ```bash
   cd e2e
   npm install
   npx playwright install --with-deps chromium
   cp .env.example .env
   ```

## Running the tests

```bash
cd e2e
npm test              # headless
npm run test:headed   # watch it click through the UI
npm run test:ui       # Playwright's interactive UI mode
```

Tests that register a server and connect a real agent (`servers.spec.ts`,
`containers.spec.ts`, and future `images`/`volumes`/`networks` specs) run
`docker run ...` for real against your local Docker daemon, using the exact
command the app generates. Make sure Docker is running locally. If it isn't
available (e.g. a CI runner without Docker), set `SKIP_AGENT_TESTS=1` in
`.env` to skip just those.

## Structure

```
e2e/
  fixtures/
    auth.ts          — registers a fresh real user per test, `authedPage` fixture
    docker-agent.ts  — extracts the real docker run command from the UI and
                        executes it, spins up throwaway containers for tests
                        to find
  tests/
    landing.spec.ts    — public marketing page
    auth.spec.ts        — register / login / logout / protected routes
    servers.spec.ts     — register a server, connect a real agent, delete
    containers.spec.ts  — list / stop / remove real containers via a real agent
```

Each test file gets its own fresh user (see `makeTestUser` in `fixtures/auth.ts`),
so tests never share state and can run in any order.

## Adding the next module

The pattern for a new page (Images, Volumes, Networks, Stacks, Alerts,
Settings, Profile, Audit Log) is:

1. Read the actual page component first — don't guess selectors. Use
   `getByRole`, `getByLabel`, `getByPlaceholder`, or `getByTitle` (this
   codebase uses `title=""` on a lot of icon buttons instead of visible
   text — that's usually your best selector for actions).
2. If the page needs a connected agent, reuse the `connectedServer` fixture
   pattern from `containers.spec.ts` (copy it into the new file, or promote
   it into `fixtures/docker-agent.ts` once a second spec needs it).
3. For anything that changes real Docker state (start/stop/remove/pull),
   assert against the UI **and** consider cross-checking with a raw
   `docker inspect` / `docker ps` call in the fixture, the way
   `containers.spec.ts` does implicitly (the UI removing a row is only
   trustworthy once the WebSocket round-trip to the real agent has happened,
   which is exactly what these tests are catching).
4. Always clean up containers/servers you create, even on failure — use
   `try/finally`, not just chained `.then()`.

## CI

See `.github/workflows/e2e.yml`. GitHub's `ubuntu-latest` runners have a
working Docker daemon already, so the real-agent tests run there without
Docker-in-Docker tricks — the runner IS the Docker host, same as your laptop.
