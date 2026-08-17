import { createClient } from "@/lib/supabase/server";
import { assertSupabaseEnv } from "@/lib/supabase/env";
import {
  DEFAULT_ASSIGNMENT_RULE_DEFINITIONS,
  resolveAssignmentPlanFromDefinitions,
  type AssignmentRuleDefinition,
} from "@/lib/case-auto-assignment";
import type {
  CaseAssignmentRule,
  CaseAssignmentRuleStep,
} from "@/types";

function supabase() {
  assertSupabaseEnv();
  return createClient();
}

type SupabaseLikeError = {
  code?: string;
  message?: string;
};

export type CaseAssignmentRulesManagementResult = {
  rules: CaseAssignmentRule[];
  schemaReady: boolean;
  usingFallback: boolean;
};

export type SaveCaseAssignmentRuleInput = {
  id?: string | null;
  complaint_type: string;
  complaint_subtype?: string | null;
  applies_to_all_subtypes: boolean;
  is_active: boolean;
  note?: string | null;
  departments: string[];
};

function isSchemaUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { code, message } = error as SupabaseLikeError;
  return (
    code === "42P01" ||
    code === "42703" ||
    code === "PGRST200" ||
    code === "PGRST204" ||
    code === "PGRST205" ||
    (message?.includes("case_assignment_rules") ?? false) ||
    (message?.includes("case_assignment_rule_steps") ?? false)
  );
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function normalizeStep(raw: Record<string, unknown>): CaseAssignmentRuleStep {
  return {
    id: String(raw.id ?? ""),
    rule_id: String(raw.rule_id ?? ""),
    step_order: Number(raw.step_order ?? 0),
    department: String(raw.department ?? "").trim(),
    created_at: String(raw.created_at ?? new Date().toISOString()),
    updated_at: String(raw.updated_at ?? new Date().toISOString()),
  };
}

function normalizeRule(
  raw: Record<string, unknown>,
  stepsByRuleId: Map<string, CaseAssignmentRuleStep[]>,
  isFallback = false
): CaseAssignmentRule {
  const id = String(raw.id ?? "");
  return {
    id,
    complaint_type: String(raw.complaint_type ?? "").trim(),
    complaint_subtype: (raw.complaint_subtype as string | null) ?? null,
    applies_to_all_subtypes: raw.applies_to_all_subtypes === true,
    is_active: raw.is_active !== false,
    note: (raw.note as string | null) ?? null,
    created_at: String(raw.created_at ?? new Date().toISOString()),
    updated_at: String(raw.updated_at ?? new Date().toISOString()),
    steps: stepsByRuleId.get(id) ?? [],
    is_fallback: isFallback,
  };
}

function buildFallbackRules(): CaseAssignmentRule[] {
  const now = new Date().toISOString();
  return DEFAULT_ASSIGNMENT_RULE_DEFINITIONS.map((definition, index) => {
    const ruleId = `fallback-${index + 1}`;
    return {
      id: ruleId,
      complaint_type: definition.complaint_type,
      complaint_subtype: definition.complaint_subtype,
      applies_to_all_subtypes: definition.applies_to_all_subtypes,
      is_active: true,
      note: null,
      created_at: now,
      updated_at: now,
      is_fallback: true,
      steps: definition.steps.map((department, stepIndex) => ({
        id: `${ruleId}-step-${stepIndex + 1}`,
        rule_id: ruleId,
        step_order: stepIndex + 1,
        department,
        created_at: now,
        updated_at: now,
      })),
    };
  });
}

function rulesToDefinitions(
  rules: readonly CaseAssignmentRule[]
): AssignmentRuleDefinition[] {
  return rules
    .filter((rule) => rule.is_active)
    .map((rule) => ({
      complaint_type: rule.complaint_type,
      complaint_subtype: rule.applies_to_all_subtypes
        ? null
        : normalizeText(rule.complaint_subtype),
      applies_to_all_subtypes: rule.applies_to_all_subtypes,
      steps: rule.steps
        .slice()
        .sort((a, b) => a.step_order - b.step_order)
        .map((step) => step.department.trim())
        .filter(Boolean),
    }));
}

async function fetchRules(): Promise<CaseAssignmentRule[]> {
  const client = await supabase();
  const [rulesResult, stepsResult] = await Promise.all([
    client
      .from("case_assignment_rules")
      .select("*")
      .order("complaint_type", { ascending: true })
      .order("applies_to_all_subtypes", { ascending: false })
      .order("complaint_subtype", { ascending: true }),
    client
      .from("case_assignment_rule_steps")
      .select("*")
      .order("step_order", { ascending: true }),
  ]);

  if (rulesResult.error) throw rulesResult.error;
  if (stepsResult.error) throw stepsResult.error;

  const stepsByRuleId = new Map<string, CaseAssignmentRuleStep[]>();
  for (const rawStep of (stepsResult.data as Record<string, unknown>[]) ?? []) {
    const step = normalizeStep(rawStep);
    const steps = stepsByRuleId.get(step.rule_id) ?? [];
    steps.push(step);
    stepsByRuleId.set(step.rule_id, steps);
  }

  return ((rulesResult.data as Record<string, unknown>[]) ?? []).map((rule) =>
    normalizeRule(rule, stepsByRuleId)
  );
}

export async function getCaseAssignmentRulesForManagement(): Promise<CaseAssignmentRulesManagementResult> {
  try {
    const rules = await fetchRules();
    return {
      rules,
      schemaReady: true,
      usingFallback: false,
    };
  } catch (error) {
    if (!isSchemaUnavailableError(error)) {
      console.error("[getCaseAssignmentRulesForManagement]", error);
    }
    return {
      rules: buildFallbackRules(),
      schemaReady: false,
      usingFallback: true,
    };
  }
}

export async function getActiveCaseAssignmentRuleDefinitions(): Promise<AssignmentRuleDefinition[]> {
  try {
    const rules = await fetchRules();
    return rulesToDefinitions(rules);
  } catch (error) {
    if (!isSchemaUnavailableError(error)) {
      console.error("[getActiveCaseAssignmentRuleDefinitions]", error);
    }
    return [...DEFAULT_ASSIGNMENT_RULE_DEFINITIONS];
  }
}

export async function getCaseAssignmentPlan(
  complaintType: string,
  complaintSubtype: string | null | undefined
): Promise<string[]> {
  const definitions = await getActiveCaseAssignmentRuleDefinitions();
  return resolveAssignmentPlanFromDefinitions(
    definitions,
    complaintType,
    complaintSubtype
  );
}

export async function getInitialCaseAssignmentDepartment(
  complaintType: string,
  complaintSubtype: string | null | undefined
): Promise<string | null> {
  return (await getCaseAssignmentPlan(complaintType, complaintSubtype))[0] ?? null;
}

export async function getCaseAssignmentResolver(): Promise<
  (complaintType: string, complaintSubtype: string | null | undefined) => string[]
> {
  const definitions = await getActiveCaseAssignmentRuleDefinitions();
  return (complaintType, complaintSubtype) =>
    resolveAssignmentPlanFromDefinitions(
      definitions,
      complaintType,
      complaintSubtype
    );
}

function normalizeDepartments(departments: string[]): string[] {
  const unique: string[] = [];
  for (const department of departments) {
    const trimmed = department.trim();
    if (!trimmed || unique.includes(trimmed)) continue;
    unique.push(trimmed);
  }
  return unique;
}

function validateSaveInput(input: SaveCaseAssignmentRuleInput): {
  complaint_type: string;
  complaint_subtype: string | null;
  applies_to_all_subtypes: boolean;
  is_active: boolean;
  note: string | null;
  departments: string[];
} {
  const complaintType = normalizeText(input.complaint_type);
  if (!complaintType) {
    throw new Error("請選擇案件類別");
  }

  const appliesToAllSubtypes = input.applies_to_all_subtypes === true;
  const complaintSubtype = appliesToAllSubtypes
    ? null
    : normalizeText(input.complaint_subtype);
  if (!appliesToAllSubtypes && !complaintSubtype) {
    throw new Error("請選擇子分類");
  }

  const departments = normalizeDepartments(input.departments);
  if (departments.length === 0) {
    throw new Error("請至少設定一個指派部門");
  }

  return {
    complaint_type: complaintType,
    complaint_subtype: complaintSubtype,
    applies_to_all_subtypes: appliesToAllSubtypes,
    is_active: input.is_active === true,
    note: normalizeText(input.note) || null,
    departments,
  };
}

async function throwIfDuplicateScope(
  input: ReturnType<typeof validateSaveInput>,
  excludeId?: string | null
) {
  const client = await supabase();
  let query = client
    .from("case_assignment_rules")
    .select("id")
    .eq("complaint_type", input.complaint_type)
    .eq("applies_to_all_subtypes", input.applies_to_all_subtypes);

  query = input.applies_to_all_subtypes
    ? query.is("complaint_subtype", null)
    : query.eq("complaint_subtype", input.complaint_subtype);

  if (excludeId?.trim()) {
    query = query.neq("id", excludeId.trim());
  }

  const { data, error } = await query.limit(1).maybeSingle();
  if (error) throw error;
  if (data) {
    throw new Error("相同案件類別與子分類範圍已存在指派規則");
  }
}

async function replaceRuleSteps(ruleId: string, departments: string[]) {
  const client = await supabase();
  const { error: deleteError } = await client
    .from("case_assignment_rule_steps")
    .delete()
    .eq("rule_id", ruleId);
  if (deleteError) throw deleteError;

  const { error: insertError } = await client
    .from("case_assignment_rule_steps")
    .insert(
      departments.map((department, index) => ({
        rule_id: ruleId,
        step_order: index + 1,
        department,
      }))
    );
  if (insertError) throw insertError;
}

export async function saveCaseAssignmentRule(
  rawInput: SaveCaseAssignmentRuleInput
): Promise<void> {
  try {
    const input = validateSaveInput(rawInput);
    const id = rawInput.id?.trim() || null;
    await throwIfDuplicateScope(input, id);

    const client = await supabase();
    const payload = {
      complaint_type: input.complaint_type,
      complaint_subtype: input.complaint_subtype,
      applies_to_all_subtypes: input.applies_to_all_subtypes,
      is_active: input.is_active,
      note: input.note,
    };

    const { data, error } = id
      ? await client
          .from("case_assignment_rules")
          .update(payload)
          .eq("id", id)
          .select("id")
          .single()
      : await client
          .from("case_assignment_rules")
          .insert(payload)
          .select("id")
          .single();

    if (error) throw error;
    const ruleId = String(data.id ?? "");
    if (!ruleId) throw new Error("儲存指派規則失敗");

    await replaceRuleSteps(ruleId, input.departments);
  } catch (error) {
    if (isSchemaUnavailableError(error)) {
      throw new Error(
        "案件指派規則資料表尚未建立，請先執行 supabase/migrations/034_add_case_assignment_rules.sql"
      );
    }
    throw error;
  }
}

export async function setCaseAssignmentRuleActive(
  ruleId: string,
  isActive: boolean
): Promise<void> {
  try {
    const { error } = await (await supabase())
      .from("case_assignment_rules")
      .update({ is_active: isActive })
      .eq("id", ruleId);
    if (error) throw error;
  } catch (error) {
    if (isSchemaUnavailableError(error)) {
      throw new Error(
        "案件指派規則資料表尚未建立，請先執行 supabase/migrations/034_add_case_assignment_rules.sql"
      );
    }
    throw error;
  }
}

export async function deleteCaseAssignmentRule(ruleId: string): Promise<void> {
  try {
    const { error } = await (await supabase())
      .from("case_assignment_rules")
      .delete()
      .eq("id", ruleId);
    if (error) throw error;
  } catch (error) {
    if (isSchemaUnavailableError(error)) {
      throw new Error(
        "案件指派規則資料表尚未建立，請先執行 supabase/migrations/034_add_case_assignment_rules.sql"
      );
    }
    throw error;
  }
}

