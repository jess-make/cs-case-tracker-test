import { createAdminClient } from "@/lib/supabase/admin";
import { sendLineReply } from "@/lib/line/reply";

const TOKEN_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TOKEN_LENGTH = 6;
const TOKEN_TTL_MS = 10 * 60 * 1000;

export interface LineBindTokenRow {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  line_user_id: string | null;
  created_at: string;
}

export interface ActiveLineBindToken {
  token: string;
  expiresAt: string;
}

function randomToken(): string {
  let result = "";
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    result += TOKEN_CHARS[Math.floor(Math.random() * TOKEN_CHARS.length)];
  }
  return result;
}

function isTokenUniqueError(error: { code?: string }): boolean {
  return error.code === "23505";
}

/** 產生綁定碼（重用未過期未使用，或新建） */
export async function getOrCreateLineBindToken(
  userId: string
): Promise<ActiveLineBindToken> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: existing, error: readError } = await admin
    .from("line_bind_tokens")
    .select("token, expires_at")
    .eq("user_id", userId)
    .is("used_at", null)
    .gt("expires_at", now)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (readError) throw readError;
  if (existing?.token) {
    return {
      token: String(existing.token),
      expiresAt: String(existing.expires_at),
    };
  }

  return insertLineBindToken(userId);
}

/** 重新產生綁定碼（作廢既有未使用 token） */
export async function regenerateLineBindToken(
  userId: string
): Promise<ActiveLineBindToken> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error: expireError } = await admin
    .from("line_bind_tokens")
    .update({ expires_at: now })
    .eq("user_id", userId)
    .is("used_at", null)
    .gt("expires_at", now);

  if (expireError) throw expireError;

  return insertLineBindToken(userId);
}

async function insertLineBindToken(userId: string): Promise<ActiveLineBindToken> {
  const admin = createAdminClient();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  for (let attempt = 0; attempt < 8; attempt++) {
    const token = randomToken();
    const { data, error } = await admin
      .from("line_bind_tokens")
      .insert({
        user_id: userId,
        token,
        expires_at: expiresAt,
      })
      .select("token, expires_at")
      .single();

    if (!error && data) {
      return {
        token: String(data.token),
        expiresAt: String(data.expires_at),
      };
    }
    if (!isTokenUniqueError(error)) throw error;
  }

  throw new Error("無法產生綁定碼，請稍後再試");
}

export async function getActiveLineBindTokenForUser(
  userId: string
): Promise<ActiveLineBindToken | null> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("line_bind_tokens")
    .select("token, expires_at")
    .eq("user_id", userId)
    .is("used_at", null)
    .gt("expires_at", now)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.token) return null;

  return {
    token: String(data.token),
    expiresAt: String(data.expires_at),
  };
}

const MSG_INVALID_TOKEN = "綁定碼無效或已過期，請回系統重新產生。";
const MSG_ALREADY_BOUND = "此 LINE 已綁定其他帳號，請聯絡管理員。";
const MSG_SUCCESS = "LINE 綁定成功";

export async function consumeLineBindToken(
  rawToken: string,
  lineUserId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const token = rawToken.trim().toUpperCase();
  const lineId = lineUserId.trim();

  if (!token || !lineId) {
    return { ok: false, message: MSG_INVALID_TOKEN };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: bindToken, error: tokenError } = await admin
    .from("line_bind_tokens")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (tokenError) throw tokenError;
  if (
    !bindToken ||
    bindToken.used_at ||
    String(bindToken.expires_at) <= now
  ) {
    return { ok: false, message: MSG_INVALID_TOKEN };
  }

  const { data: existingUser, error: existingError } = await admin
    .from("users")
    .select("id")
    .eq("line_user_id", lineId)
    .neq("id", bindToken.user_id)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existingUser) {
    return { ok: false, message: MSG_ALREADY_BOUND };
  }

  const { error: userError } = await admin
    .from("users")
    .update({
      line_user_id: lineId,
      must_bind_line: false,
    })
    .eq("id", bindToken.user_id);

  if (userError) throw userError;

  const { error: markError } = await admin
    .from("line_bind_tokens")
    .update({
      used_at: now,
      line_user_id: lineId,
    })
    .eq("id", bindToken.id)
    .is("used_at", null);

  if (markError) throw markError;

  return { ok: true };
}

export async function handleLineBindMessage(
  rawToken: string,
  lineUserId: string | undefined,
  replyToken: string | undefined
): Promise<void> {
  const userId = lineUserId?.trim();
  if (!userId || !replyToken?.trim()) {
    console.log("[LINE webhook] bind message missing userId or replyToken");
    return;
  }

  const result = await consumeLineBindToken(rawToken, userId);
  const message = result.ok ? MSG_SUCCESS : result.message;
  await sendLineReply(replyToken, message);
}
