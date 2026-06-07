/** 將 Supabase Auth Admin API 常見錯誤轉為中文訊息 */
export function mapSupabaseAuthError(error: {
  message: string;
  code?: string;
  status?: number;
}): string {
  const code = (error.code ?? "").toLowerCase();
  const msg = error.message.toLowerCase();

  if (
    code === "invalid_api_key" ||
    msg.includes("invalid api key") ||
    msg.includes("invalid jwt") ||
    (msg.includes("api key") && msg.includes("invalid"))
  ) {
    return "Service Role Key 無效，請檢查 .env.local 的 SUPABASE_SERVICE_ROLE_KEY";
  }

  if (
    code === "user_already_exists" ||
    code === "email_exists" ||
    msg.includes("already been registered") ||
    msg.includes("already exists") ||
    msg.includes("duplicate")
  ) {
    return "此 Email 已被使用";
  }

  if (
    code === "weak_password" ||
    msg.includes("password should be at least") ||
    msg.includes("password is too weak") ||
    (msg.includes("password") && msg.includes("weak"))
  ) {
    return "密碼強度不足";
  }

  if (
    msg.includes("trigger") ||
    msg.includes("database error") ||
    msg.includes("database error saving new user") ||
    code === "unexpected_failure"
  ) {
    return "資料庫 trigger 執行失敗，請確認 Supabase migrations 已完整執行";
  }

  return error.message;
}
