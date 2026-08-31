-- Agent connect/disconnect log, used to derive 30-day uptime % on the
-- Alerts & Monitoring page (see MONETIZATION_PRODUCT_PLAN.md §2.7).
-- Run in the Supabase SQL editor.

create table if not exists public.agent_status_events (
  id         uuid primary key default gen_random_uuid(),
  server_id  uuid not null references public.servers(id) on delete cascade,
  ts         timestamptz not null default now(),
  connected  boolean not null
);

create index if not exists agent_status_events_server_id_ts_idx
  on public.agent_status_events(server_id, ts desc);

alter table public.agent_status_events enable row level security;
