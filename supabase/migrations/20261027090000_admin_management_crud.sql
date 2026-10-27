-- Admin CRUD for exchange-shop management. All admin checks rely on trusted app_metadata claims.
create policy aldroobi_admin_insert_exchange_shops on public.exchange_shops
for insert to authenticated with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy aldroobi_admin_update_exchange_shops on public.exchange_shops
for update to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'admin')
with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');

create policy aldroobi_admin_insert_shop_subscriptions on public.shop_subscriptions
for insert to authenticated with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy aldroobi_admin_update_shop_subscriptions on public.shop_subscriptions
for update to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'admin')
with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');

create policy aldroobi_admin_insert_shop_memberships on public.shop_memberships
for insert to authenticated with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy aldroobi_admin_update_shop_memberships on public.shop_memberships
for update to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'admin')
with check ((auth.jwt()->'app_metadata'->>'role') = 'admin');
