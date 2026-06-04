import type { CaseLog } from "@/types";

const LEGACY_FIELDS: { key: keyof Pick<CaseLog, "cause" | "solution" | "improvement" | "note">; label: string }[] = [
  { key: "cause", label: "原因" },
  { key: "solution", label: "解決方案" },
  { key: "improvement", label: "改善措施" },
  { key: "note", label: "備註" },
];

/** 處理紀錄內文：優先 content，否則組合舊版 cause / solution / improvement / note */
export function getCaseLogDisplayContent(log: CaseLog): string | null {
  const content = log.content?.trim();
  if (content) return content;

  const parts: string[] = [];
  for (const { key, label } of LEGACY_FIELDS) {
    const value = log[key]?.trim();
    if (value) parts.push(`${label}：${value}`);
  }

  return parts.length > 0 ? parts.join("\n") : null;
}
