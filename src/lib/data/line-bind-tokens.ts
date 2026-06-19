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
    console.log("[LINE webhook] bind consume: missing token or lineUserId", {
      token,
      lineId,
    });
    return { ok: false, message: MSG_INVALID_TOKEN };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  console.log("[LINE webhook] bind lookup token before query:", { token, now });

  const { data: bindToken, error: tokenError } = await admin
    .from("line_bind_tokens")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (tokenError) {
    console.error("[LINE webhook] bind lookup token error:", tokenError);
    throw tokenError;
  }

  const tokenFound = Boolean(bindToken);
  const isUsed = Boolean(bindToken?.used_at);
  const isExpired = bindToken ? String(bindToken.expires_at) <= now : false;

  console.log("[LINE webhook] bind lookup token after query:", {
    tokenFound,
    tokenId: bindToken?.id ?? null,
    userId: bindToken?.user_id ?? null,
    expiresAt: bindToken?.expires_at ?? null,
    usedAt: bindToken?.used_at ?? null,
    isExpired,
    isUsed,
  });

  if (!bindToken || isUsed || isExpired) {
    console.log("[LINE webhook] bind reject: token invalid", {
      reason: !bindToken ? "not_found" : isUsed ? "used" : "expired",
    });
    return { ok: false, message: MSG_INVALID_TOKEN };
  }

  const targetUserId = String(bindToken.user_id);
  console.log("[LINE webhook] bind check duplicate line_user_id before query:", {
    targetUserId,
    lineId,
  });

  const { data: existingUser, error: existingError } = await admin
    .from("users")
    .select("id")
    .eq("line_user_id", lineId)
    .neq("id", targetUserId)
    .maybeSingle();

  if (existingError) {
    console.error("[LINE webhook] bind duplicate check error:", existingError);
    throw existingError;
  }

  console.log("[LINE webhook] bind check duplicate line_user_id after query:", {
    alreadyBoundToOtherUser: Boolean(existingUser),
    otherUserId: existingUser?.id ?? null,
  });

  if (existingUser) {
    return { ok: false, message: MSG_ALREADY_BOUND };
  }

  console.log("[LINE webhook] bind update users before:", {
    targetUserId,
    lineId,
    fields: { line_user_id: lineId, must_bind_line: false },
  });

  const { data: updatedUser, error: userError } = await admin
    .from("users")
    .update({
      line_user_id: lineId,
      must_bind_line: false,
    })
    .eq("id", targetUserId)
    .select("id, line_user_id, must_bind_line")
    .maybeSingle();

  if (userError) {
    console.error("[LINE webhook] bind update users error:", userError);
    throw userError;
  }

  console.log("[LINE webhook] bind update users after:", {
    success: Boolean(updatedUser),
    updatedUser,
  });

  const { data: markedToken, error: markError } = await admin
    .from("line_bind_tokens")
    .update({
      used_at: now,
      line_user_id: lineId,
    })
    .eq("id", bindToken.id)
    .is("used_at", null)
    .select("id, used_at, line_user_id")
    .maybeSingle();

  if (markError) {
    console.error("[LINE webhook] bind mark token used error:", markError);
    throw markError;
  }

  console.log("[LINE webhook] bind mark token used after:", {
    success: Boolean(markedToken),
    markedToken,
  });

  return { ok: true };
}

export async function handleLineBindMessage(
  rawToken: string,
  lineUserId: string | undefined,
  replyToken: string | undefined
): Promise<void> {
  const userId = lineUserId?.trim();
  const token = replyToken?.trim();

  console.log("[LINE webhook] bind handleLineBindMessage:", {
    rawToken,
    hasLineUserId: Boolean(userId),
    lineUserId: userId ?? null,
    hasReplyToken: Boolean(token),
  });

  if (!userId || !token) {
    console.log("[LINE webhook] bind abort: missing userId or replyToken", {
      hasLineUserId: Boolean(userId),
      hasReplyToken: Boolean(token),
    });
    return;
  }

  let replyMessage: string;

  try {
    const result = await consumeLineBindToken(rawToken, userId);
    replyMessage = result.ok ? MSG_SUCCESS : result.message;
    console.log("[LINE webhook] bind consume result:", result);
  } catch (err) {
    console.error("[LINE webhook] bind consumeLineBindToken error:", err);
    replyMessage = MSG_INVALID_TOKEN;
  }

  console.log("[LINE webhook] bind reply before:", {
    hasReplyToken: Boolean(token),
    replyMessage,
  });

  try {
    const replyResult = await sendLineReply(token, replyMessage);
    console.log("[LINE webhook] bind reply after:", replyResult);
  } catch (err) {
    console.error("[LINE webhook] bind sendLineReply error:", err);
  }
}
