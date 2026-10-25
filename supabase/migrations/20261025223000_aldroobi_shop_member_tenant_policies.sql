-- Tenant isolation policies for shop accounts.
-- These policies are additive and preserve existing admin-read policies.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='shop_memberships' AND policyname='aldroobi_member_read_own_memberships') THEN
    CREATE POLICY aldroobi_member_read_own_memberships ON public.shop_memberships
      FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='exchange_shops' AND policyname='aldroobi_members_read_their_shop') THEN
    CREATE POLICY aldroobi_members_read_their_shop ON public.exchange_shops
      FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.shop_memberships m WHERE m.shop_id = exchange_shops.id AND m.user_id = auth.uid() AND m.status = 'active')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='shop_subscriptions' AND policyname='aldroobi_members_read_their_subscription') THEN
    CREATE POLICY aldroobi_members_read_their_subscription ON public.shop_subscriptions
      FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.shop_memberships m WHERE m.shop_id = shop_subscriptions.shop_id AND m.user_id = auth.uid() AND m.status = 'active')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='verification_logs' AND policyname='aldroobi_members_read_their_verification_logs') THEN
    CREATE POLICY aldroobi_members_read_their_verification_logs ON public.verification_logs
      FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM public.shop_memberships m WHERE m.shop_id = verification_logs.shop_id AND m.user_id = auth.uid() AND m.status = 'active')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='verification_logs' AND policyname='aldroobi_members_insert_their_verification_logs') THEN
    CREATE POLICY aldroobi_members_insert_their_verification_logs ON public.verification_logs
      FOR INSERT TO authenticated WITH CHECK (
        initiated_by = auth.uid() AND EXISTS (
          SELECT 1 FROM public.shop_memberships m WHERE m.shop_id = verification_logs.shop_id AND m.user_id = auth.uid() AND m.status = 'active'
        )
      );
  END IF;
END $$;
