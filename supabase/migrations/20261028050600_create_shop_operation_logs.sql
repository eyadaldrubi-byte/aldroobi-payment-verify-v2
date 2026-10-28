-- Shop-scoped audit log used by account creation and subscription lifecycle.
create table if not exists public.aldroodi_operation_logs (
 id uuid primary key default gen_random_uuid(),
 shop_id uuid not null references public.exchange_shops(id) on delete cascade,
 actor_user_id uuid references auth.users(id) on delete set null,
 action text not null,
 entity_type text not null,
 entity_id text,
 outcome text not null default 'success',
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists aldroodi_operation_logs_shop_created_idx on public.aldroodi_operation_logs(shop_id,created_at desc);
alter table public.aldroodi_operation_logs enable row level security;
revoke all on public.aldroodi_operation_logs from anon,authenticated;
grant select,insert on public.aldroodi_operation_logs to authenticated;
drop policy if exists aldroobi_admin_read_operation_logs on public.aldroodi_operation_logs;
create policy aldroobi_admin_read_operation_logs on public.aldroodi_operation_logs for select to authenticated using ((auth.jwt()->'app_metadata'->>'role')='admin');
drop policy if exists aldroobi_admin_insert_operation_logs on public.aldroodi_operation_logs;
create policy aldroobi_admin_insert_operation_logs on public.aldroodi_operation_logs for insert to authenticated with check ((auth.jwt()->'app_metadata'->>'role')='admin' and actor_user_id=auth.uid());
