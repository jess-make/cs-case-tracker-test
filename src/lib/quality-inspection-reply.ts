const QUALITY_INSPECTION_DEPARTMENT = "後勤部-品檢";
const QUALITY_INSPECTION_REPLY_CATEGORIES = new Set(["退貨", "換貨"]);

export const QUALITY_INSPECTION_REPLY_OPTIONS = [
  "一般退貨",
  "修正機況",
  "出錯貨",
  "鎖密碼",
  "爭議中",
  "取消退貨",
] as const;

export type QualityInspectionReplyOption =
  (typeof QUALITY_INSPECTION_REPLY_OPTIONS)[number];

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim();
}

export function isQualityInspectionReplyStep(caseData: {
  complaint_type: string;
  department: string | null;
}): boolean {
  return (
    QUALITY_INSPECTION_REPLY_CATEGORIES.has(normalize(caseData.complaint_type)) &&
    normalize(caseData.department) === QUALITY_INSPECTION_DEPARTMENT
  );
}

export function isQualityInspectionReplyOption(
  value: string
): value is QualityInspectionReplyOption {
  return QUALITY_INSPECTION_REPLY_OPTIONS.includes(
    value as QualityInspectionReplyOption
  );
}

export function buildQualityInspectionReplyContent(
  result: QualityInspectionReplyOption,
  note: string
): string {
  return `品檢結果：${result}\n簡述：${note.trim()}`;
}
