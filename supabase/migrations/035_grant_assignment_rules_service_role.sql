-- Assignment rule management may be queried by server-side maintenance checks.
-- PostgREST still requires explicit table grants even when service_role bypasses RLS.

GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_assignment_rules TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_assignment_rule_steps TO service_role;

