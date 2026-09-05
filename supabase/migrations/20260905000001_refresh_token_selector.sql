-- Refresh tokens were looked up by scanning every active row and bcrypt-comparing
-- each one, which got slower (and slower) as sessions accumulated. Add an indexed
-- "selector" (sent in the cookie alongside the secret verifier) so lookup becomes
-- a single indexed equality query instead of an O(n) bcrypt scan.
alter table public.refresh_tokens add column if not exists selector text;
create unique index if not exists refresh_tokens_selector_idx on public.refresh_tokens(selector);

-- Rows issued before this migration have no selector and can never be matched
-- again; drop them so they don't linger forever.
delete from public.refresh_tokens where selector is null;

alter table public.refresh_tokens alter column selector set not null;

-- Cheap cleanup target for expired rows (called opportunistically from the app).
create index if not exists refresh_tokens_expires_at_idx on public.refresh_tokens(expires_at);
