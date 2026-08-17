"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { canUploadReturnExchangeCases } from "@/lib/auth/permissions";
import { getCaseAssignmentResolver } from "@/lib/data/case-assignment-rules";
import { createCase } from "@/lib/data/cases";
import { createCaseLog } from "@/lib/data/case-logs";
import {
  getCategoryIssueTaxonomy,
  getSourceChannelTaxonomy,
} from "@/lib/data/complaint-taxonomy-form";
import { notifyCaseCreated } from "@/lib/line/case-notifications";
import {
  RETURN_EXCHANGE_ALLOWED_CATEGORIES,
  RETURN_EXCHANGE_UPLOAD_FIELD_LABELS,
  RETURN_EXCHANGE_UPLOAD_FIELD_KEYS,
  isEmptyUploadRow,
  normalizeUploadCell,
  type ReturnExchangeUploadRow,
} from "@/lib/return-exchange-upload";
import type { CreateCaseInput } from "@/types";

type ImportSuccess = {
  ok: true;
  importedCount: number;
  caseNumbers: string[];
};

type ImportFailure = {
  ok: false;
  error: string;
  rowErrors?: string[];
};

type ValidateSuccess = {
  ok: true;
  validCount: number;
};

type ValidateFailure = ImportFailure;

export type ImportReturnExchangeCasesResult = ImportSuccess | ImportFailure;
export type ValidateReturnExchangeCasesResult =
  | ValidateSuccess
  | ValidateFailure;

const DEFAULT_CUSTOMER_CONTACT = "未提供";
const DEFAULT_CUSTOMER_GENDER = "不透露";
const DEFAULT_UPLOAD_SOURCE = "其他（備註）";
const ALLOWED_CATEGORY_KEYS = new Set(
  RETURN_EXCHANGE_ALLOWED_CATEGORIES.map((category) => normalizeKey(category))
);

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeRow(row: ReturnExchangeUploadRow): ReturnExchangeUploadRow {
  return {
    ecommerce_order_no: normalizeUploadCell(row.ecommerce_order_no),
    shipping_tracking_no: normalizeUploadCell(row.shipping_tracking_no),
    batch_no: normalizeUploadCell(row.batch_no),
    customer_name: normalizeUploadCell(row.customer_name),
    source_detail: normalizeUploadCell(row.source_detail),
    complaint_type: normalizeUploadCell(row.complaint_type),
    complaint_subtype: normalizeUploadCell(row.complaint_subtype),
    description: normalizeUploadCell(row.description),
  };
}

function buildChannelSourceMap(
  taxonomy: Awaited<ReturnType<typeof getSourceChannelTaxonomy>>
): Map<string, string> {
  const sourceById = new Map(
    taxonomy.sources
      .filter((source) => source.is_active)
      .map((source) => [source.id, source.name.trim()])
  );
  const channelToSource = new Map<string, string>();

  for (const [sourceId, channels] of Object.entries(taxonomy.channelsBySourceId)) {
    const sourceName = sourceById.get(sourceId);
    if (!sourceName) continue;

    for (const channel of channels) {
      if (!channel.is_active) continue;
      const channelName = channel.name.trim();
      if (!channelName) continue;

      const key = normalizeKey(channelName);
      if (
        !channelToSource.has(key) ||
        sourceName === DEFAULT_UPLOAD_SOURCE
      ) {
        channelToSource.set(key, sourceName);
      }
    }
  }

  return channelToSource;
}

function buildCategoryIssueMap(
  taxonomy: Awaited<ReturnType<typeof getCategoryIssueTaxonomy>>
): Map<string, { name: string; issues: Map<string, string> }> {
  const byCategory = new Map<string, { name: string; issues: Map<string, string> }>();

  for (const category of taxonomy.categories) {
    if (!category.is_active) continue;
    const issues = new Map<string, string>();
    for (const issue of taxonomy.issuesByCategoryId[category.id] ?? []) {
      if (!issue.is_active) continue;
      issues.set(normalizeKey(issue.name), issue.name.trim());
    }
    byCategory.set(normalizeKey(category.name), {
      name: category.name.trim(),
      issues,
    });
  }

  return byCategory;
}

function validateRows(
  rows: ReturnExchangeUploadRow[],
  channelToSource: Map<string, string>,
  categoryIssues: Map<string, { name: string; issues: Map<string, string> }>
): { validRows: Array<ReturnExchangeUploadRow & { source: string }>; errors: string[] } {
  const errors: string[] = [];
  const validRows: Array<ReturnExchangeUploadRow & { source: string }> = [];

  rows.forEach((rawRow, index) => {
    const rowNumber = index + 2;
    const row = normalizeRow(rawRow);
    if (isEmptyUploadRow(row)) return;
    const rowErrors: string[] = [];

    for (const key of RETURN_EXCHANGE_UPLOAD_FIELD_KEYS) {
      const optional =
        key === "ecommerce_order_no" ||
        key === "shipping_tracking_no" ||
        key === "batch_no" ||
        key === "description";
      if (!optional && !row[key]) {
        rowErrors.push(
          `第 ${rowNumber} 列：${RETURN_EXCHANGE_UPLOAD_FIELD_LABELS[key]} 不可空白`
        );
      }
    }

    const source = channelToSource.get(normalizeKey(row.source_detail));
    if (!source) {
      rowErrors.push(
        `第 ${rowNumber} 列：服務管道「${row.source_detail || "空白"}」未對應到啟用中的案件來源`
      );
    }

    const categoryKey = normalizeKey(row.complaint_type);
    const category = categoryIssues.get(categoryKey);
    if (!ALLOWED_CATEGORY_KEYS.has(categoryKey)) {
      rowErrors.push(
        `第 ${rowNumber} 列：案件類別只可填寫「${RETURN_EXCHANGE_ALLOWED_CATEGORIES.join("」或「")}」`
      );
    } else if (!category) {
      rowErrors.push(
        `第 ${rowNumber} 列：案件類別「${row.complaint_type || "空白"}」未啟用或不存在`
      );
    } else if (!category.issues.has(normalizeKey(row.complaint_subtype))) {
      rowErrors.push(
        `第 ${rowNumber} 列：子分類「${row.complaint_subtype || "空白"}」未在「${category.name}」底下啟用或不存在`
      );
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      return;
    }

    validRows.push({
      ...row,
      source: source!,
      complaint_type: category!.name,
      complaint_subtype:
        category!.issues.get(normalizeKey(row.complaint_subtype)) ??
        row.complaint_subtype,
    });
  });

  return { validRows, errors };
}

async function getValidatedRows(rows: ReturnExchangeUploadRow[]): Promise<
  | { ok: true; validRows: Array<ReturnExchangeUploadRow & { source: string }> }
  | { ok: false; error: string; rowErrors?: string[] }
> {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, error: "沒有可匯入的資料" };
  }

  const [sourceChannelTaxonomy, categoryIssueTaxonomy] = await Promise.all([
    getSourceChannelTaxonomy({ useAdmin: true }),
    getCategoryIssueTaxonomy({ useAdmin: true }),
  ]);
  const channelToSource = buildChannelSourceMap(sourceChannelTaxonomy);
  const categoryIssues = buildCategoryIssueMap(categoryIssueTaxonomy);
  const { validRows, errors } = validateRows(
    rows,
    channelToSource,
    categoryIssues
  );

  if (errors.length > 0) {
    return {
      ok: false,
      error: "匯入資料未通過檢查",
      rowErrors: errors.slice(0, 20),
    };
  }

  if (validRows.length === 0) {
    return { ok: false, error: "沒有可匯入的資料" };
  }

  return { ok: true, validRows };
}

export async function validateReturnExchangeCasesAction(
  rows: ReturnExchangeUploadRow[]
): Promise<ValidateReturnExchangeCasesResult> {
  try {
    const actor = await requireUser();
    if (!canUploadReturnExchangeCases(actor)) {
      return { ok: false, error: "無權限檢查退換貨案件" };
    }

    const validated = await getValidatedRows(rows);
    if (!validated.ok) return validated;

    return {
      ok: true,
      validCount: validated.validRows.length,
    };
  } catch (err) {
    console.error("[validateReturnExchangeCasesAction]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "檢查失敗，請稍後再試",
    };
  }
}

export async function importReturnExchangeCasesAction(
  rows: ReturnExchangeUploadRow[]
): Promise<ImportReturnExchangeCasesResult> {
  try {
    const actor = await requireUser();
    if (!canUploadReturnExchangeCases(actor)) {
      return { ok: false, error: "無權限匯入退換貨案件" };
    }

    const validated = await getValidatedRows(rows);
    if (!validated.ok) return validated;
    const resolveAssignmentPlan = await getCaseAssignmentResolver();

    const caseNumbers: string[] = [];
    for (const row of validated.validRows) {
      const assignmentPlan = resolveAssignmentPlan(
        row.complaint_type,
        row.complaint_subtype
      );
      const input: CreateCaseInput = {
        customer_name: row.customer_name,
        customer_contact: DEFAULT_CUSTOMER_CONTACT,
        customer_gender: DEFAULT_CUSTOMER_GENDER,
        source: row.source,
        source_detail: row.source_detail,
        complaint_type: row.complaint_type,
        complaint_subtype: row.complaint_subtype,
        description: row.description,
        urgency: "low",
        department: assignmentPlan[0] ?? null,
        ecommerce_order_no: row.ecommerce_order_no || null,
        shipping_tracking_no: row.shipping_tracking_no || null,
        batch_no: row.batch_no || null,
      };

      const created = await createCase(input, actor.id);
      caseNumbers.push(created.case_number);
      await createCaseLog(
        created.id,
        actor.id,
        "建立案件",
        "客服由退換貨案件上傳匯入案件"
      );
      await notifyCaseCreated(created);
    }

    revalidatePath("/");
    revalidatePath("/cases");
    revalidatePath("/return-exchange-upload");

    return {
      ok: true,
      importedCount: caseNumbers.length,
      caseNumbers,
    };
  } catch (err) {
    console.error("[importReturnExchangeCasesAction]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "匯入失敗，請稍後再試",
    };
  }
}
