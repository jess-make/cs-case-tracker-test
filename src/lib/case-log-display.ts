import type { CaseLog } from "@/types";
import { getCaseStatusLabel } from "@/lib/case-status";

const LEGACY_FIELDS: {
  key: keyof Pick<CaseLog, "cause" | "solution" | "improvement" | "note">;
  label: string;
}[] = [
  { key: "cause", label: "原因" },
  { key: "solution", label: "解決方案" },
  { key: "improvement", label: "改善措施" },
  { key: "note", label: "備註" },
];

/** DB 狀態碼（含舊版 assigned） */
const STATUS_CODE_PATTERN =
  /^(new|assigned|in_progress|replied|cs_confirming|closed)$/;

/**
 * 將「狀態變更為：closed」等英文狀態碼轉為中文顯示。
 * 已是中文或不符合格式時原樣返回。
 */
export function localizeStatusChangeContent(content: string): string {
  const trimmed = content.trim();
  const match = trimmed.match(/^狀態變更為[：:]\s*(.+)$/);
  if (!match) return content;

  const statusToken = match[1].trim();
  if (!STATUS_CODE_PATTERN.test(statusToken)) return content;

  return `狀態變更為：${getCaseStatusLabel(statusToken)}`;
}

function shouldLocalizeStatusContent(log: CaseLog, content: string): boolean {
  if (log.action === "狀態更新") return true;
  return content.trimStart().startsWith("狀態變更為");
}

/** 處理紀錄內文：優先 content，否則組合舊版 cause / solution / improvement / note */
export function getCaseLogDisplayContent(log: CaseLog): string | null {
  const content = log.content?.trim();
  if (content) {
    if (shouldLocalizeStatusContent(log, content)) {
      return localizeStatusChangeContent(content);
    }
    return content;
  }

  const parts: string[] = [];
  for (const { key, label } of LEGACY_FIELDS) {
    const value = log[key]?.trim();
    if (value) parts.push(`${label}：${value}`);
  }

  return parts.length > 0 ? parts.join("\n") : null;
}
