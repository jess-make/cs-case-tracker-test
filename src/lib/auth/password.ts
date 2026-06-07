import { randomBytes } from "crypto";

const MIN_LENGTH = 8;
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghjkmnpqrstuvwxyz";
const DIGITS = "23456789";
const ALL = UPPER + LOWER + DIGITS;

/** 驗證密碼強度；通過回傳 null，否則回傳錯誤訊息 */
export function validatePassword(password: string): string | null {
  if (password.length < MIN_LENGTH) {
    return "密碼至少 8 碼";
  }
  if (!/[A-Za-z]/.test(password)) {
    return "密碼需包含英文字母";
  }
  if (!/\d/.test(password)) {
    return "密碼需包含數字";
  }
  return null;
}

/** 產生符合強度要求的臨時密碼（不記錄、不儲存） */
export function generateTemporaryPassword(length = 12): string {
  const chars: string[] = [
    UPPER[randomBytes(1)[0] % UPPER.length],
    LOWER[randomBytes(1)[0] % LOWER.length],
    DIGITS[randomBytes(1)[0] % DIGITS.length],
  ];

  while (chars.length < length) {
    chars.push(ALL[randomBytes(1)[0] % ALL.length]);
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomBytes(1)[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}
