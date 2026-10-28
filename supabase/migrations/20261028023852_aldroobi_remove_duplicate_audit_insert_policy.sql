-- Remove the redundant permissive INSERT policy.
-- The canonical policy already requires actor_user_id = auth.uid() and admin app_metadata.
-- PostgreSQL combines permissive policies with OR, so keep only the canonical policy.
drop policy if exists aldroobi_admin_insert_operation_logs
  on public.aldroobi_operation_logs;
