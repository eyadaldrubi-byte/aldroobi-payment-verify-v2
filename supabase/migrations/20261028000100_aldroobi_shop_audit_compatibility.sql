-- Align the admin CRUD audit writer with the existing operation-log schema.
-- The tenant foundation uses organization_id; the shop-management API also needs shop_id.
-- Keep both dimensions nullable so older organization-level audit rows remain valid.
alter table public.aldroobi_operation_logs
  add column if not exists shop_id uuid references public.exchange_shops(id) on delete set null;

create index if not exists aldroobi_operation_logs_shop_time_idx
  on public.aldroobi_operation_logs(shop_id, created_at desc);

-- Only trusted admin JWTs may create audit records through the authenticated API.
-- No client update/delete policy is granted.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'aldroobi_operation_logs'
      and policyname = 'aldroobi_admin_insert_operation_logs'
  ) then
    create policy aldroobi_admin_insert_operation_logs
      on public.aldroobi_operation_logs
      for insert to authenticated
      with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
  end if;
end
$$;
