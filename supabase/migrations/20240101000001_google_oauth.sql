-- Google OAuth support for profiles

alter table public.profiles
alter column password_hash drop not null;

alter table public.profiles
add column if not exists google_id text unique;

alter table public.profiles
add column if not exists email_verified boolean not null default false;

create unique index if not exists profiles_google_id_idx on public.profiles(google_id)
where google_id is not null;
