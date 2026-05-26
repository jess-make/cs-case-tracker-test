import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "./env";

/** Service role client — use only in server-side API routes */
export function createAdminClient() {
  return createClient(
    getSupabaseUrl(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
