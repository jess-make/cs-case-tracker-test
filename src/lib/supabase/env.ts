/** 正規化 Supabase URL（移除誤填的 /rest/v1/ 後綴） */
export function getSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  return raw.replace(/\/rest\/v1\/?$/i, "").replace(/\/$/, "");
}

export function getSupabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
}

export function getServiceRoleKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
}

export function assertSupabaseEnv(): void {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) {
    throw new Error(
      "請在 .env.local 設定 NEXT_PUBLIC_SUPABASE_URL 與 NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
}

export function assertServiceRoleEnv(): void {
  assertSupabaseEnv();
  if (!getServiceRoleKey()) {
    throw new Error("請在 .env.local 設定 SUPABASE_SERVICE_ROLE_KEY（僅 server 使用）");
  }
}
