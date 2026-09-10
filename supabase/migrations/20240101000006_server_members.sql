-- Team sharing / RBAC: who can see and act on a server, and how much.
-- `servers.user_id` stays as the original creator and is left untouched —
-- membership (including the creator's own 'owner' row) is now the single
-- source of truth for access checks.

create table if not exists public.server_members (
  server_id  uuid not null references public.servers(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null check (role in ('owner', 'operator', 'viewer')),
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (server_id, user_id)
);

create index if not exists server_members_user_id_idx
  on public.server_members(user_id);

alter table public.server_members enable row level security;

-- Backfill: every existing server's creator becomes its 'owner' member,
-- so nothing loses access when membership checks replace user_id checks.
insert into public.server_members (server_id, user_id, role)
select id, user_id, 'owner'
from public.servers
on conflict (server_id, user_id) do nothing;
