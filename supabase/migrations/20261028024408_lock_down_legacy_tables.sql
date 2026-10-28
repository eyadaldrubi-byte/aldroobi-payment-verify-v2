-- Legacy organization-based tables are not used by the current shop-based V2 API.
-- They have RLS enabled but no policies; revoke API-role table privileges as defense in depth.
-- service_role and database owners retain operational access.
revoke all privileges on table
  public.organizations,
  public.users,
  public.sessions,
  public.subscription_plans,
  public.subscriptions,
  public.verification_history,
  public.audit_events
from anon, authenticated;
