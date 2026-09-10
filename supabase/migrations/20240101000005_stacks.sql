-- Saved Compose stacks (per server) — stores the YAML so a redeploy
-- doesn't require re-pasting it. Actual deploy/down/list happens live
-- through the agent (docker compose CLI); this table is just storage.

create table if not exists public.stacks (
  id            uuid primary key default gen_random_uuid(),
  server_id     uuid not null references public.servers(id) on delete cascade,
  name          text not null,
  compose_yaml  text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (server_id, name)
);

create index if not exists stacks_server_id_idx
  on public.stacks(server_id);

alter table public.stacks enable row level security;
