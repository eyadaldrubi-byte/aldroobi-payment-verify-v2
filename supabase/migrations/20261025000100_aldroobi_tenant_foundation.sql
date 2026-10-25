-- AL-Droubi multi-tenant foundation.
-- Apply only to the dedicated AL-Droubi Supabase project after reviewing.
-- No existing tables are dropped or altered by this migration.

create extension if not exists pgcrypto;

create table if not exists public.aldroobi_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  status text not null default 'active' check (status in ('active','suspended','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.aldroobi_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.aldroobi_organizations(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'shop' check (role in ('owner','admin','shop','auditor')),
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists aldroobi_memberships_user_idx
  on public.aldroobi_memberships(user_id, status);
create index if not exists aldroobi_memberships_org_idx
  on public.aldroobi_memberships(organization_id, status);

create table if not exists public.aldroobi_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.aldroobi_organizations(id) on delete restrict,
  plan text not null default 'trial' check (plan in ('trial','monthly','quarterly','yearly','custom')),
  status text not null default 'trial' check (status in ('trial','active','past_due','expired','cancelled')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  max_users integer not null default 3 check (max_users between 1 and 10000),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create table if not exists public.aldroobi_operation_logs (
  id bigint generated always as identity primary key,
  organization_id uuid references public.aldroobi_organizations(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (length(trim(action)) between 1 and 100),
  entity_type text not null check (length(trim(entity_type)) between 1 and 100),
  entity_id text,
  outcome text not null default 'success' check (outcome in ('success','failure','blocked')),
  details jsonb not null default '{}'::jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

create index if not exists aldroobi_operation_logs_org_time_idx
  on public.aldroobi_operation_logs(organization_id, created_at desc);
create index if not exists aldroobi_operation_logs_actor_time_idx
  on public.aldroobi_operation_logs(actor_user_id, created_at desc);

alter table public.aldroobi_organizations enable row level security;
alter table public.aldroobi_memberships enable row level security;
alter table public.aldroobi_subscriptions enable row level security;
alter table public.aldroobi_operation_logs enable row level security;

-- Members can see only organizations where they have an active membership.
create policy "aldroobi_org_select_member"
on public.aldroobi_organizations for select to authenticated
using (
  exists (
    select 1 from public.aldroobi_memberships m
    where m.organization_id = id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
);

create policy "aldroobi_membership_select_self_or_org_admin"
on public.aldroobi_memberships for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.aldroobi_memberships mine
    where mine.organization_id = aldroobi_memberships.organization_id
      and mine.user_id = (select auth.uid())
      and mine.status = 'active'
      and mine.role in ('owner','admin')
  )
);

create policy "aldroobi_subscription_select_org_admin"
on public.aldroobi_subscriptions for select to authenticated
using (
  exists (
    select 1 from public.aldroobi_memberships m
    where m.organization_id = aldroobi_subscriptions.organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('owner','admin')
  )
);

create policy "aldroobi_logs_select_org_admin"
on public.aldroobi_operation_logs for select to authenticated
using (
  actor_user_id = (select auth.uid())
  or exists (
    select 1 from public.aldroobi_memberships m
    where m.organization_id = aldroobi_operation_logs.organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role in ('owner','admin','auditor')
  )
);

-- Deliberately no client INSERT/UPDATE/DELETE policies on subscriptions or logs.
-- Privileged server code must write these using a server-only database credential.
-- Never expose a Supabase service-role/secret key to the browser.
