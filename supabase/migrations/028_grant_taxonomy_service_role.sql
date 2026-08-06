-- Taxonomy management actions use the Supabase service role on the server.
-- PostgREST still requires explicit table grants even though RLS is bypassed.

GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, UPDATE ON public.cases TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.complaint_categories TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.complaint_issues TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.complaint_sources TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.complaint_channels TO service_role;
