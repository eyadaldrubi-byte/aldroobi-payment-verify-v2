-- Subscription activation and renewal codes.
-- Raw codes are encrypted by the server using SUBSCRIPTION_CODE_ENCRYPTION_KEY.
-- Only server-side admin endpoints may read encrypted_code; client roles have no table privileges.
create table if not exists public.subscription_codes (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.exchange_shops(id) on delete cascade,
  subscription_id uuid not null references public.shop_subscriptions(id) on delete cascade,
  code_hash text not null unique,
  encrypted_code text not null,
  code_type text not null check (code_type in ('activation','renewal')),
  status text not null default 'unused' check (status in ('unused','used','revoked','expired')),
  expires_at timestamptz,
  used_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subscription_codes_shop_created_idx
  on public.subscription_codes(shop_id, created_at desc);
create index if not exists subscription_codes_subscription_idx
  on public.subscription_codes(subscription_id, created_at desc);
alter table public.subscription_codes enable row level security;
revoke all on public.subscription_codes from anon, authenticated;
