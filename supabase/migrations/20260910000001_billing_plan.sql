-- Billing: adds a plan tier to each account. Payment provider (Razorpay)
-- integration is wired separately — this just gives the app somewhere to
-- read/write the current plan and enforce plan-based limits.

alter table public.profiles
  add column if not exists plan text not null default 'free' check (plan in ('free', 'pro'));
