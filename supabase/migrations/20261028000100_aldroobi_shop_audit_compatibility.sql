-- Align the admin CRUD audit writer with the existing operation-log schema.
-- The tenant foundation uses organization_id; the shop-management API also needs shop_id.
-- Keep both dimensions nullable so older organization-level audit rows remain valid.
alter table public.aldroobi_operation_logs
  add column if not exists shop_id uuid references public.exchange_shops(id) on delete set null;

create index if not exists aldroobi_operation_logs_shop_time_idx
  on public.aldroobi_operation_logs(shop_id, created_at desc);

-- The INSERT policy is defined by the original operation-logs migration and
-- must bind actor_user_id to auth.uid() as well as require trusted admin app_metadata.
-- Do not create a second permissive policy here; permissive policies are OR-combined.
