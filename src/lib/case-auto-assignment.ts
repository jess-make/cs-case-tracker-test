type AssignmentPlan = readonly string[];
export type AssignmentRuleDefinition = {
  complaint_type: string;
  complaint_subtype: string | null;
  applies_to_all_subtypes: boolean;
  steps: AssignmentPlan;
};

const BUSINESS_ECOMMERCE = "業務部-電商";
const BUSINESS_STORE = "業務部-門市";
const BACKOFFICE_QA = "後勤部-品檢";
const BACKOFFICE_WAREHOUSE = "後勤部-倉儲";
const CUSTOMER_SERVICE = "業務部-客服";

type CategoryRule = {
  all?: AssignmentPlan;
  issues?: Record<string, AssignmentPlan>;
};

export const DEFAULT_ASSIGNMENT_RULE_DEFINITIONS: readonly AssignmentRuleDefinition[] = [
  {
    complaint_type: "諮詢服務",
    complaint_subtype: null,
    applies_to_all_subtypes: true,
    steps: [CUSTOMER_SERVICE],
  },
  {
    complaint_type: "商品問題",
    complaint_subtype: null,
    applies_to_all_subtypes: true,
    steps: [CUSTOMER_SERVICE],
  },
  {
    complaint_type: "商品問題",
    complaint_subtype: "缺件",
    applies_to_all_subtypes: false,
    steps: [BUSINESS_ECOMMERCE, BACKOFFICE_WAREHOUSE],
  },
  {
    complaint_type: "門市問題",
    complaint_subtype: "服務態度",
    applies_to_all_subtypes: false,
    steps: [BUSINESS_STORE],
  },
  {
    complaint_type: "門市問題",
    complaint_subtype: "業務不熟/解說錯誤",
    applies_to_all_subtypes: false,
    steps: [BUSINESS_STORE],
  },
  {
    complaint_type: "門市問題",
    complaint_subtype: "其他門市問題",
    applies_to_all_subtypes: false,
    steps: [BUSINESS_STORE],
  },
  {
    complaint_type: "門市問題",
    complaint_subtype: "現場環境與設備",
    applies_to_all_subtypes: false,
    steps: [BUSINESS_STORE],
  },
  {
    complaint_type: "門市問題",
    complaint_subtype: "庫存",
    applies_to_all_subtypes: false,
    steps: [BUSINESS_STORE],
  },
  {
    complaint_type: "物流問題",
    complaint_subtype: "配送延遲",
    applies_to_all_subtypes: false,
    steps: [BUSINESS_ECOMMERCE],
  },
  {
    complaint_type: "物流問題",
    complaint_subtype: "包裹遺失/毀損",
    applies_to_all_subtypes: false,
    steps: [BUSINESS_ECOMMERCE],
  },
  {
    complaint_type: "物流問題",
    complaint_subtype: "錯誤件",
    applies_to_all_subtypes: false,
    steps: [BUSINESS_ECOMMERCE],
  },
  {
    complaint_type: "物流問題",
    complaint_subtype: "其他物流問題",
    applies_to_all_subtypes: false,
    steps: [BUSINESS_ECOMMERCE],
  },
  {
    complaint_type: "物流問題",
    complaint_subtype: "其他",
    applies_to_all_subtypes: false,
    steps: [BUSINESS_ECOMMERCE],
  },
  {
    complaint_type: "退貨",
    complaint_subtype: null,
    applies_to_all_subtypes: true,
    steps: [BUSINESS_ECOMMERCE, BACKOFFICE_QA],
  },
  {
    complaint_type: "換貨",
    complaint_subtype: null,
    applies_to_all_subtypes: true,
    steps: [BUSINESS_ECOMMERCE, BACKOFFICE_QA],
  },
  {
    complaint_type: "退換貨",
    complaint_subtype: null,
    applies_to_all_subtypes: true,
    steps: [BUSINESS_ECOMMERCE, BACKOFFICE_QA],
  },
  {
    complaint_type: "舊機回收",
    complaint_subtype: null,
    applies_to_all_subtypes: true,
    steps: [BACKOFFICE_QA],
  },
  {
    complaint_type: "其他",
    complaint_subtype: null,
    applies_to_all_subtypes: true,
    steps: [CUSTOMER_SERVICE],
  },
] as const;

const ASSIGNMENT_RULES: Record<string, CategoryRule> = {
  諮詢服務: { all: [CUSTOMER_SERVICE] },
  商品問題: {
    all: [CUSTOMER_SERVICE],
    issues: {
      缺件: [BUSINESS_ECOMMERCE, BACKOFFICE_WAREHOUSE],
    },
  },
  門市問題: {
    issues: {
      服務態度: [BUSINESS_STORE],
      "業務不熟/解說錯誤": [BUSINESS_STORE],
      其他門市問題: [BUSINESS_STORE],
      現場環境與設備: [BUSINESS_STORE],
      庫存: [BUSINESS_STORE],
    },
  },
  物流問題: {
    issues: {
      配送延遲: [BUSINESS_ECOMMERCE],
      "包裹遺失/毀損": [BUSINESS_ECOMMERCE],
      錯誤件: [BUSINESS_ECOMMERCE],
      其他物流問題: [BUSINESS_ECOMMERCE],
      其他: [BUSINESS_ECOMMERCE],
    },
  },
  退貨: { all: [BUSINESS_ECOMMERCE, BACKOFFICE_QA] },
  換貨: { all: [BUSINESS_ECOMMERCE, BACKOFFICE_QA] },
  退換貨: { all: [BUSINESS_ECOMMERCE, BACKOFFICE_QA] },
  舊機回收: { all: [BACKOFFICE_QA] },
  其他: { all: [CUSTOMER_SERVICE] },
};

export function normalizeAssignmentTaxonomyName(
  value: string | null | undefined
): string {
  return (value ?? "").trim().replace(/／/g, "/");
}

function getAssignmentPlan(
  category: string,
  issue: string | null | undefined
): AssignmentPlan {
  const rule = ASSIGNMENT_RULES[normalizeAssignmentTaxonomyName(category)];
  if (!rule) return [];

  const issuePlan = rule.issues?.[normalizeAssignmentTaxonomyName(issue)];
  if (issuePlan) return issuePlan;

  return rule.all ?? [];
}

export function resolveAssignmentPlanFromDefinitions(
  definitions: readonly AssignmentRuleDefinition[],
  category: string,
  issue: string | null | undefined
): string[] {
  const normalizedCategory = normalizeAssignmentTaxonomyName(category);
  const normalizedIssue = normalizeAssignmentTaxonomyName(issue);

  const exactRule = definitions.find(
    (rule) =>
      !rule.applies_to_all_subtypes &&
      normalizeAssignmentTaxonomyName(rule.complaint_type) === normalizedCategory &&
      normalizeAssignmentTaxonomyName(rule.complaint_subtype) === normalizedIssue
  );
  if (exactRule) return [...exactRule.steps];

  const allSubtypesRule = definitions.find(
    (rule) =>
      rule.applies_to_all_subtypes &&
      normalizeAssignmentTaxonomyName(rule.complaint_type) === normalizedCategory
  );
  if (allSubtypesRule) return [...allSubtypesRule.steps];

  return [];
}

export function getAutoAssignmentPlan(
  category: string,
  issue: string | null | undefined
): string[] {
  return [...getAssignmentPlan(category, issue)];
}

export function getInitialAutoAssignedDepartment(
  category: string,
  issue: string | null | undefined
): string | null {
  return getAssignmentPlan(category, issue)[0] ?? null;
}

export function getNextAutoAssignedDepartment(
  category: string,
  issue: string | null | undefined,
  currentDepartment: string | null | undefined
): string | null {
  const plan = getAssignmentPlan(category, issue);
  return getNextDepartmentInAssignmentPlan(plan, currentDepartment);
}

export function getNextDepartmentInAssignmentPlan(
  plan: readonly string[],
  currentDepartment: string | null | undefined
): string | null {
  const current = (currentDepartment ?? "").trim();
  if (!current) return null;

  const index = plan.findIndex((department) => department === current);
  if (index < 0) return null;

  return plan[index + 1] ?? null;
}

export function isAutoAssignedDepartmentStep(
  category: string,
  issue: string | null | undefined,
  currentDepartment: string | null | undefined
): boolean {
  return isDepartmentInAssignmentPlan(
    getAssignmentPlan(category, issue),
    currentDepartment
  );
}

export function isDepartmentInAssignmentPlan(
  plan: readonly string[],
  currentDepartment: string | null | undefined
): boolean {
  const current = (currentDepartment ?? "").trim();
  if (!current) return false;
  return plan.includes(current);
}
