import { createClient } from "@supabase/supabase-js";
import { assertServiceRoleEnv, getSupabaseUrl, getServiceRoleKey } from "./env";

/** Service role client — 僅供 server action / route handler，不可在 client 使用 */
export function createAdminClient() {
  assertServiceRoleEnv();
  return createClient(getSupabaseUrl(), getServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
