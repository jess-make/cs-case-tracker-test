"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  deleteCaseAssignmentRuleAction,
  saveCaseAssignmentRuleAction,
  setCaseAssignmentRuleActiveAction,
} from "@/app/actions/case-assignment-rules";
import type {
  CaseAssignmentRule,
  ComplaintCategory,
} from "@/types";
import { cn } from "@/lib/utils";

interface CaseAssignmentRulesPanelProps {
  rules: CaseAssignmentRule[];
  categories: ComplaintCategory[];
  issuesByCategoryName: Record<string, Array<{ name: string }>>;
  departmentOptions: string[];
  schemaReady: boolean;
  usingFallback: boolean;
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
      )}
    >
      {active ? "啟用" : "停用"}
    </span>
  );
}

function scopeLabel(rule: CaseAssignmentRule): string {
  return rule.applies_to_all_subtypes
    ? "全部子分類"
    : rule.complaint_subtype?.trim() || "未指定";
}

function flowLabel(rule: CaseAssignmentRule): string {
  const departments = rule.steps
    .slice()
    .sort((a, b) => a.step_order - b.step_order)
    .map((step) => step.department.trim())
    .filter(Boolean);
  return departments.length > 0 ? departments.join(" → ") : "不需指派";
}

function mergeUnique(values: string[]): string[] {
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed && !result.includes(trimmed)) result.push(trimmed);
  }
  return result;
}

function getRuleDepartments(rule: CaseAssignmentRule | null): string[] {
  const departments =
    rule?.steps
      .slice()
      .sort((a, b) => a.step_order - b.step_order)
      .map((step) => step.department.trim())
      .filter(Boolean) ?? [];
  return departments.length > 0 ? departments : [""];
}

export function CaseAssignmentRulesPanel({
  rules,
  categories,
  issuesByCategoryName,
  departmentOptions,
  schemaReady,
  usingFallback,
}: CaseAssignmentRulesPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<CaseAssignmentRule | null>(null);
  const [complaintType, setComplaintType] = useState("");
  const [appliesToAllSubtypes, setAppliesToAllSubtypes] = useState(true);
  const [complaintSubtype, setComplaintSubtype] = useState("");
  const [departments, setDepartments] = useState<string[]>([""]);
  const [isActive, setIsActive] = useState(true);
  const [note, setNote] = useState("");

  const categoryOptions = useMemo(
    () =>
      mergeUnique([
        ...categories.map((category) => category.name),
        ...rules.map((rule) => rule.complaint_type),
      ]),
    [categories, rules]
  );

  const currentIssueOptions = useMemo(() => {
    const issueNames =
      issuesByCategoryName[complaintType]?.map((issue) => issue.name) ?? [];
    const ruleIssueNames = rules
      .filter((rule) => rule.complaint_type === complaintType)
      .map((rule) => rule.complaint_subtype ?? "");
    return mergeUnique([...issueNames, ...ruleIssueNames]);
  }, [complaintType, issuesByCategoryName, rules]);

  const currentDepartmentOptions = useMemo(
    () => mergeUnique([...departmentOptions, ...departments]),
    [departmentOptions, departments]
  );

  const inputClass =
    "w-full min-h-11 rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";
  const labelClass = "mb-1 block text-sm font-medium text-slate-700";

  function resetForm() {
    setEditingRule(null);
    setComplaintType("");
    setAppliesToAllSubtypes(true);
    setComplaintSubtype("");
    setDepartments([""]);
    setIsActive(true);
    setNote("");
    setError(null);
  }

  function startEdit(rule: CaseAssignmentRule) {
    setEditingRule(rule);
    setComplaintType(rule.complaint_type);
    setAppliesToAllSubtypes(rule.applies_to_all_subtypes);
    setComplaintSubtype(rule.complaint_subtype ?? "");
    setDepartments(getRuleDepartments(rule));
    setIsActive(rule.is_active);
    setNote(rule.note ?? "");
    setError(null);
  }

  function updateDepartment(index: number, value: string) {
    setDepartments((current) =>
      current.map((department, currentIndex) =>
        currentIndex === index ? value : department
      )
    );
  }

  function addDepartmentStep() {
    const next = departmentOptions.find(
      (department) => !departments.includes(department)
    );
    setDepartments((current) => [...current, next ?? ""]);
  }

  function removeDepartmentStep(index: number) {
    setDepartments((current) =>
      current.length <= 1
        ? current
        : current.filter((_, currentIndex) => currentIndex !== index)
    );
  }

  function moveDepartmentStep(index: number, direction: -1 | 1) {
    setDepartments((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(nextIndex, 0, moved);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!schemaReady) {
      setError("請先執行指派規則資料表 migration 後再儲存。");
      return;
    }
    if (!complaintType.trim()) {
      setError("請選擇案件類別");
      return;
    }
    if (!appliesToAllSubtypes && !complaintSubtype.trim()) {
      setError("請選擇子分類");
      return;
    }
    const selectedDepartments = departments
      .map((department) => department.trim())
      .filter(Boolean);
    if (selectedDepartments.length === 0) {
      setError("請至少設定一個指派部門");
      return;
    }
    if (new Set(selectedDepartments).size !== selectedDepartments.length) {
      setError("同一條規則內不可重複指派同一個部門");
      return;
    }

    const formData = new FormData();
    formData.set("id", editingRule?.is_fallback ? "" : editingRule?.id ?? "");
    formData.set("complaint_type", complaintType);
    formData.set(
      "applies_to_all_subtypes",
      appliesToAllSubtypes ? "true" : "false"
    );
    formData.set("complaint_subtype", appliesToAllSubtypes ? "" : complaintSubtype);
    formData.set("is_active", isActive ? "true" : "false");
    formData.set("note", note);
    selectedDepartments.forEach((department) =>
      formData.append("departments", department)
    );

    setError(null);
    startTransition(async () => {
      const result = await saveCaseAssignmentRuleAction(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      resetForm();
      router.refresh();
    });
  }

  function runRuleAction(
    rule: CaseAssignmentRule,
    fn: () => Promise<{ error?: string } | undefined>
  ) {
    if (rule.is_fallback || !schemaReady) {
      setError("請先執行指派規則資料表 migration 後再修改。");
      return;
    }

    setError(null);
    setActionPendingId(rule.id);
    startTransition(async () => {
      const result = await fn();
      setActionPendingId(null);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {usingFallback && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          目前顯示系統預設指派規則。套用資料庫 migration 後，即可在此頁新增與修改規則。
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {editingRule ? "編輯指派規則" : "新增指派規則"}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              指定子分類規則會優先於全部子分類規則。
            </p>
          </div>
          {editingRule && (
            <button
              type="button"
              onClick={resetForm}
              disabled={pending}
              className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              取消編輯
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="assignment-complaint-type">
              案件類別 *
            </label>
            <select
              id="assignment-complaint-type"
              value={complaintType}
              onChange={(event) => {
                setComplaintType(event.target.value);
                setComplaintSubtype("");
              }}
              className={inputClass}
              disabled={pending || !schemaReady}
            >
              <option value="">請選擇</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={appliesToAllSubtypes}
                onChange={(event) => {
                  setAppliesToAllSubtypes(event.target.checked);
                  if (event.target.checked) setComplaintSubtype("");
                }}
                disabled={pending || !schemaReady}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              全部子分類
            </label>
          </div>

          {!appliesToAllSubtypes && (
            <div>
              <label className={labelClass} htmlFor="assignment-complaint-subtype">
                子分類 *
              </label>
              <select
                id="assignment-complaint-subtype"
                value={complaintSubtype}
                onChange={(event) => setComplaintSubtype(event.target.value)}
                className={inputClass}
                disabled={pending || !schemaReady || !complaintType}
              >
                <option value="">請選擇</option>
                {currentIssueOptions.map((issue) => (
                  <option key={issue} value={issue}>
                    {issue}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={labelClass} htmlFor="assignment-note">
              備註
            </label>
            <input
              id="assignment-note"
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={inputClass}
              placeholder="選填"
              disabled={pending || !schemaReady}
            />
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className={labelClass}>指派流程 *</label>
            <button
              type="button"
              onClick={addDepartmentStep}
              disabled={pending || !schemaReady}
              className="inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <Plus className="h-3.5 w-3.5" />
              新增步驟
            </button>
          </div>

          <div className="space-y-2">
            {departments.map((department, index) => (
              <div
                key={`${index}-${department}`}
                className="grid grid-cols-[auto,1fr,auto] items-center gap-2"
              >
                <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-600">
                  {index + 1}
                </span>
                <select
                  value={department}
                  onChange={(event) => updateDepartment(index, event.target.value)}
                  className={inputClass}
                  disabled={pending || !schemaReady}
                >
                  <option value="">請選擇部門</option>
                  {currentDepartmentOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveDepartmentStep(index, -1)}
                    disabled={pending || !schemaReady || index === 0}
                    className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    title="上移"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDepartmentStep(index, 1)}
                    disabled={
                      pending ||
                      !schemaReady ||
                      index === departments.length - 1
                    }
                    className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    title="下移"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeDepartmentStep(index)}
                    disabled={pending || !schemaReady || departments.length <= 1}
                    className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
                    title="移除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              disabled={pending || !schemaReady}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            啟用此規則
          </label>

          <button
            type="submit"
            disabled={pending || !schemaReady}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {editingRule ? "儲存規則" : "新增規則"}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">指派規則清單</h2>
        </div>

        {rules.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">目前沒有指派規則</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="grid gap-3 px-4 py-4 lg:grid-cols-[1.1fr,1fr,1.8fr,auto]"
              >
                <div>
                  <p className="text-xs font-medium text-slate-500">案件類別</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {rule.complaint_type}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">適用範圍</p>
                  <p className="mt-1 text-sm text-slate-700">{scopeLabel(rule)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">指派流程</p>
                  <p className="mt-1 break-words text-sm text-slate-800">
                    {flowLabel(rule)}
                  </p>
                  {rule.note && (
                    <p className="mt-1 text-xs text-slate-500">{rule.note}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-start justify-start gap-2 lg:justify-end">
                  <ActiveBadge active={rule.is_active} />
                  {rule.is_fallback && (
                    <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                      預設
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => startEdit(rule)}
                    disabled={pending || !schemaReady}
                    className="inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    編輯
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      runRuleAction(rule, () =>
                        setCaseAssignmentRuleActiveAction(rule.id, !rule.is_active)
                      )
                    }
                    disabled={pending || !schemaReady}
                    className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {pending && actionPendingId === rule.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : rule.is_active ? (
                      "停用"
                    ) : (
                      "啟用"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        !confirm(
                          `確定要刪除「${rule.complaint_type}／${scopeLabel(rule)}」指派規則嗎？`
                        )
                      ) {
                        return;
                      }
                      runRuleAction(rule, () => deleteCaseAssignmentRuleAction(rule.id));
                    }}
                    disabled={pending || !schemaReady}
                    className="inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    刪除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
