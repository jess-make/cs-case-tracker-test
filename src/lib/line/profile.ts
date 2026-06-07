const LINE_PROFILE_URL = "https://api.line.me/v2/bot/profile";

export interface LineUserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  language?: string;
}

/** 取得 LINE 使用者 profile（需 Channel Access Token） */
export async function fetchLineUserProfile(
  userId: string
): Promise<LineUserProfile | null> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  if (!token) {
    console.warn("[LINE profile] LINE_CHANNEL_ACCESS_TOKEN not configured");
    return null;
  }

  try {
    const res = await fetch(`${LINE_PROFILE_URL}/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[LINE profile] fetch failed:", res.status, body);
      return null;
    }

    return (await res.json()) as LineUserProfile;
  } catch (err) {
    console.error(
      "[LINE profile] fetch error:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}
