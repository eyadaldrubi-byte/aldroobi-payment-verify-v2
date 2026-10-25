-- Admin read access for the Aldroobi dashboard.
-- Additive policies only; existing policies are not removed.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='exchange_shops' AND policyname='aldroobi_admin_read_exchange_shops') THEN
    CREATE POLICY aldroobi_admin_read_exchange_shops ON public.exchange_shops
      FOR SELECT TO authenticated
      USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='shop_subscriptions' AND policyname='aldroobi_admin_read_shop_subscriptions') THEN
    CREATE POLICY aldroobi_admin_read_shop_subscriptions ON public.shop_subscriptions
      FOR SELECT TO authenticated
      USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='verification_logs' AND policyname='aldroobi_admin_read_verification_logs') THEN
    CREATE POLICY aldroobi_admin_read_verification_logs ON public.verification_logs
      FOR SELECT TO authenticated
      USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
  END IF;
END $$;
