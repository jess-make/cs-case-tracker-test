import {
  CASE_STATUS_LABELS,
  URGENCY_LABELS,
  formatComplaintLabel,
} from "@/lib/constants";
import { resolveDateRange, formatSlashDate } from "@/lib/date-range";
import { getAssigneeDisplayName } from "@/lib/case-display";
import { formatDate, formatDateOnly } from "@/lib/utils";
import {
  formatTaipeiDateTime,
  formatTaipeiFilenameTimestamp,
  formatTaipeiMonthKey,
} from "@/lib/taipei-time";
import type { Case, CaseStatus } from "@/types";

type ReportFilters = {
  status?: string;
  assignee_id?: string;
  department?: string;
  source?: string;
  source_detail?: string;
  complaint_type?: string;
  complaint_subtype?: string;
  urgency?: string;
  q?: string;
  date_preset?: string;
  date_from?: string;
  date_to?: string;
};

type GroupStats = {
  key: string;
  total: number;
  closed: number;
  overdue: number;
  critical: number;
  totalCloseDays: number;
  closedWithDuration: number;
};

const STATUS_ORDER: CaseStatus[] = [
  "new",
  "in_progress",
  "replied",
  "cs_confirming",
  "closed",
];

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function row(values: Array<string | number | null | undefined>): string {
  return values.map(csvCell).join(",");
}

function percent(part: number, total: number): string {
  if (total <= 0) return "0.0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

function closeDays(caseData: Case): number | null {
  if (!caseData.closed_at) return null;
  const created = new Date(caseData.created_at).getTime();
  const closed = new Date(caseData.closed_at).getTime();
  if (!Number.isFinite(created) || !Number.isFinite(closed) || closed < created) {
    return null;
  }
  return (closed - created) / 86_400_000;
}

function avgDays(totalDays: number, count: number): string {
  if (!count) return "";
  return (totalDays / count).toFixed(1);
}

function makeGroupStats(key: string): GroupStats {
  return {
    key,
    total: 0,
    closed: 0,
    overdue: 0,
    critical: 0,
    totalCloseDays: 0,
    closedWithDuration: 0,
  };
}

function addCaseToGroup(group: GroupStats, caseData: Case): void {
  group.total += 1;
  if (caseData.status === "closed") group.closed += 1;
  if (caseData.is_overdue) group.overdue += 1;
  if (caseData.urgency === "critical") group.critical += 1;

  const days = closeDays(caseData);
  if (days != null) {
    group.totalCloseDays += days;
    group.closedWithDuration += 1;
  }
}

function groupBy(cases: Case[], keyForCase: (caseData: Case) => string): GroupStats[] {
  const groups = new Map<string, GroupStats>();
  for (const caseData of cases) {
    const key = keyForCase(caseData).trim() || "未分類";
    const group = groups.get(key) ?? makeGroupStats(key);
    addCaseToGroup(group, caseData);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
}

function appendGroupSection(
  lines: string[],
  title: string,
  cases: Case[],
  groups: GroupStats[]
): void {
  lines.push("");
  lines.push(row([title]));
  lines.push(
    row([
      "項目",
      "案件數",
      "案件佔比",
      "結案件數",
      "結案率",
      "逾期件數",
      "緊急件數",
      "平均結案天數",
    ])
  );

  for (const group of groups) {
    lines.push(
      row([
        group.key,
        group.total,
        percent(group.total, cases.length),
        group.closed,
        percent(group.closed, group.total),
        group.overdue,
        group.critical,
        avgDays(group.totalCloseDays, group.closedWithDuration),
      ])
    );
  }
}

function filterSummary(filters: ReportFilters): string {
  const active: string[] = [];
  if (filters.status) active.push(`狀態=${filters.status}`);
  if (filters.assignee_id) active.push(`處理人ID=${filters.assignee_id}`);
  if (filters.department) active.push(`部門=${filters.department}`);
  if (filters.source) active.push(`來源=${filters.source}`);
  if (filters.source_detail) active.push(`管道=${filters.source_detail}`);
  if (filters.complaint_type) active.push(`類別=${filters.complaint_type}`);
  if (filters.complaint_subtype) active.push(`問題=${filters.complaint_subtype}`);
  if (filters.urgency) active.push(`緊急程度=${filters.urgency}`);
  if (filters.q) active.push(`查詢=${filters.q}`);
  return active.length ? active.join("；") : "全部";
}

export function buildCaseReportCsv(cases: Case[], filters: ReportFilters): string {
  const now = new Date();
  const { from, to } = resolveDateRange(filters);
  const total = cases.length;
  const closed = cases.filter((caseData) => caseData.status === "closed").length;
  const overdue = cases.filter((caseData) => caseData.is_overdue).length;
  const critical = cases.filter((caseData) => caseData.urgency === "critical").length;
  const unassigned = cases.filter((caseData) => !caseData.department?.trim()).length;
  const closeDurations = cases
    .map(closeDays)
    .filter((days): days is number => days != null);

  const lines: string[] = [];
  lines.push(row(["Grevia 客服案件分析報表"]));
  lines.push(row(["產生時間", formatTaipeiDateTime(now)]));
  lines.push(row(["日期範圍", `${formatSlashDate(from)} - ${formatSlashDate(to)}`]));
  lines.push(row(["套用篩選", filterSummary(filters)]));

  lines.push("");
  lines.push(row(["整體摘要"]));
  lines.push(row(["指標", "數值"]));
  lines.push(row(["案件總數", total]));
  lines.push(row(["已結案件數", closed]));
  lines.push(row(["結案率", percent(closed, total)]));
  lines.push(row(["逾期件數", overdue]));
  lines.push(row(["逾期率", percent(overdue, total)]));
  lines.push(row(["緊急件數", critical]));
  lines.push(row(["緊急案件佔比", percent(critical, total)]));
  lines.push(row(["未指派部門件數", unassigned]));
  lines.push(row(["平均結案天數", avgDays(closeDurations.reduce((sum, days) => sum + days, 0), closeDurations.length)]));

  lines.push("");
  lines.push(row(["案件狀態分布"]));
  lines.push(row(["狀態", "案件數", "佔比"]));
  for (const status of STATUS_ORDER) {
    const count = cases.filter((caseData) => caseData.status === status).length;
    lines.push(row([CASE_STATUS_LABELS[status], count, percent(count, total)]));
  }

  appendGroupSection(
    lines,
    "各部門客訴量與結案率",
    cases,
    groupBy(cases, (caseData) => caseData.department?.trim() || "暫未指派")
  );
  appendGroupSection(
    lines,
    "客訴類別佔比",
    cases,
    groupBy(cases, (caseData) => caseData.complaint_type)
  );
  appendGroupSection(
    lines,
    "客訴問題佔比",
    cases,
    groupBy(cases, (caseData) => formatComplaintLabel(caseData.complaint_type, caseData.complaint_subtype))
  );
  appendGroupSection(
    lines,
    "客訴來源佔比",
    cases,
    groupBy(cases, (caseData) => caseData.source)
  );
  appendGroupSection(
    lines,
    "客訴管道佔比",
    cases,
    groupBy(cases, (caseData) => caseData.source_detail?.trim() || "未填寫")
  );

  appendGroupSection(
    lines,
    "月份趨勢",
    cases,
    groupBy(cases, (caseData) => formatTaipeiMonthKey(caseData.created_at))
  );

  lines.push("");
  lines.push(row(["案件明細"]));
  lines.push(
    row([
      "建檔日",
      "案件編號",
      "客戶",
      "客訴來源",
      "客訴管道",
      "客訴類別",
      "客訴問題",
      "指派部門",
      "處理人",
      "緊急程度",
      "狀態",
      "逾期",
      "結案日",
      "結案天數",
    ])
  );

  for (const caseData of cases) {
    const days = closeDays(caseData);
    lines.push(
      row([
        formatDateOnly(caseData.created_at),
        caseData.case_number,
        caseData.customer_name,
        caseData.source,
        caseData.source_detail ?? "",
        caseData.complaint_type,
        caseData.complaint_subtype ?? "",
        caseData.department?.trim() || "暫未指派",
        getAssigneeDisplayName(caseData),
        URGENCY_LABELS[caseData.urgency],
        CASE_STATUS_LABELS[caseData.status],
        caseData.is_overdue ? "是" : "否",
        formatDate(caseData.closed_at),
        days == null ? "" : days.toFixed(1),
      ])
    );
  }

  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function buildCaseReportFilename(): string {
  return `grevia-case-report-${formatTaipeiFilenameTimestamp()}.csv`;
}
