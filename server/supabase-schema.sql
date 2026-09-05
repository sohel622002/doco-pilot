-- ============================================================
-- Run this in your Supabase SQL editor to set up the schema
-- ============================================================

-- Users table (extends Supabase Auth)
create table if not exists public.profiles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null unique,
  -- Nullable for Google-only accounts (no local password)
  password_hash text,
  google_id   text unique,
  email_verified boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Servers / VPN table
create table if not exists public.servers (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references public.profiles(id) on delete cascade,
  name                   text not null,
  ip                     text not null,

  -- Verification (bcrypt, one-way) — used during WS handshake
  agent_key_hash         text,
  agent_secret_hash      text,

  -- Retrieval (AES-256-GCM ciphertext) — decrypted only for the owner
  -- Format: hex(iv):hex(authTag):hex(ciphertext)
  agent_key_encrypted    text,
  agent_secret_encrypted text,

  agent_connected        boolean not null default false,
  last_seen_at           timestamptz,

  -- Webhook alerting (container crash / high resource usage)
  alert_webhook_url      text,
  alert_cpu_threshold    int not null default 90,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Refresh tokens table
create table if not exists public.refresh_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  selector    text not null unique,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

-- Password reset tokens
create table if not exists public.password_resets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

-- Email verification tokens
create table if not exists public.email_verifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

-- Persisted audit trail — every docker/server/auth action, who did it, and the result
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  ts          timestamptz not null default now(),
  user_id     uuid references public.profiles(id) on delete set null,
  email       text,
  ip          text,
  action      text not null,
  target      text,
  server_id   uuid,
  result      text not null default 'ok',
  error       text
);

-- Indexes
create index if not exists servers_user_id_idx on public.servers(user_id);
create index if not exists refresh_tokens_user_id_idx on public.refresh_tokens(user_id);
create index if not exists refresh_tokens_expires_at_idx on public.refresh_tokens(expires_at);
create index if not exists password_resets_user_id_idx on public.password_resets(user_id);
create index if not exists email_verifications_user_id_idx on public.email_verifications(user_id);
create index if not exists audit_logs_user_id_idx on public.audit_logs(user_id);
create index if not exists audit_logs_ts_idx on public.audit_logs(ts desc);

-- RLS: only service role can access (backend uses service role key)
alter table public.profiles       enable row level security;
alter table public.servers        enable row level security;
alter table public.refresh_tokens enable row level security;
alter table public.password_resets enable row level security;
alter table public.email_verifications enable row level security;
alter table public.audit_logs      enable row level security;

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure update_updated_at();

create trigger servers_updated_at
  before update on public.servers
  for each row execute procedure update_updated_at();