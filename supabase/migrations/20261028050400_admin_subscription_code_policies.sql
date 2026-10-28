grant select, insert on public.subscription_codes to authenticated;
drop policy if exists aldroobi_admin_read_subscription_codes on public.subscription_codes;
create policy aldroobi_admin_read_subscription_codes on public.subscription_codes
for select to authenticated
using ((auth.jwt()->'app_metadata'->>'role') = 'admin');
drop policy if exists aldroobi_admin_insert_subscription_codes on public.subscription_codes;
create policy aldroobi_admin_insert_subscription_codes on public.subscription_codes
for insert to authenticated
with check ((auth.jwt()->'app_metadata'->>'role') = 'admin' and created_by = auth.uid());
