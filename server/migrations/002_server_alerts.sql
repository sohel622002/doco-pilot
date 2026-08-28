-- Alert webhook columns on servers
-- Run in the Supabase SQL editor.

alter table public.servers
  add column if not exists alert_webhook_url text;

alter table public.servers
  add column if not exists alert_cpu_threshold int not null default 90;
