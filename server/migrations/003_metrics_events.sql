-- Metrics & events history store — backend foundation for trend charts,
-- activity feed, and the alerts page (see MONETIZATION_PRODUCT_PLAN.md §3).
-- Run in the Supabase SQL editor.

-- Sampled system stats per server, used for trend charts & sparklines.
create table if not exists public.server_metrics (
  id         uuid primary key default gen_random_uuid(),
  server_id  uuid not null references public.servers(id) on delete cascade,
  ts         timestamptz not null default now(),
  cpu_pct    numeric,
  mem_pct    numeric,
  disk_pct   numeric,
  disk_io    jsonb,
  net_rx     bigint,
  net_tx     bigint
);

create index if not exists server_metrics_server_id_ts_idx
  on public.server_metrics(server_id, ts desc);

-- Raw docker events (container/image lifecycle), used for the activity feed.
create table if not exists public.docker_events (
  id         uuid primary key default gen_random_uuid(),
  server_id  uuid not null references public.servers(id) on delete cascade,
  ts         timestamptz not null default now(),
  type       text not null,
  action     text,
  actor_name text,
  details    jsonb
);

create index if not exists docker_events_server_id_ts_idx
  on public.docker_events(server_id, ts desc);

-- Alert fire/resolve history, used for the alerts page + uptime calculation.
create table if not exists public.alert_events (
  id         uuid primary key default gen_random_uuid(),
  server_id  uuid not null references public.servers(id) on delete cascade,
  ts         timestamptz not null default now(),
  rule_type  text not null,
  value      numeric,
  threshold  numeric,
  status     text not null check (status in ('fired', 'resolved'))
);

create index if not exists alert_events_server_id_ts_idx
  on public.alert_events(server_id, ts desc);

alter table public.server_metrics enable row level security;
alter table public.docker_events  enable row level security;
alter table public.alert_events   enable row level security;
