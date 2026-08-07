type AssignmentPlan = readonly string[];

const BUSINESS_ECOMMERCE = "業務部-電商";
const BUSINESS_STORE = "業務部-門市";
const BACKOFFICE_QA = "後勤部-品檢";
const BACKOFFICE_WAREHOUSE = "後勤部-倉儲";

type CategoryRule = {
  all?: AssignmentPlan;
  issues?: Record<string, AssignmentPlan>;
};

const ASSIGNMENT_RULES: Record<string, CategoryRule> = {
  諮詢服務: { all: [] },
  商品問題: {
    all: [],
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
      "包裹遺失/毀損": [BACKOFFICE_WAREHOUSE],
      錯誤件: [BUSINESS_ECOMMERCE],
      其他物流問題: [BUSINESS_ECOMMERCE],
      其他: [BUSINESS_ECOMMERCE],
    },
  },
  退貨: { all: [BUSINESS_ECOMMERCE, BACKOFFICE_QA] },
  換貨: { all: [BUSINESS_ECOMMERCE, BACKOFFICE_QA] },
  退換貨: { all: [BUSINESS_ECOMMERCE, BACKOFFICE_QA] },
  舊機回收: { all: [BACKOFFICE_QA] },
  其他: { all: [] },
};

function normalizeTaxonomyName(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/／/g, "/");
}

function getAssignmentPlan(
  category: string,
  issue: string | null | undefined
): AssignmentPlan {
  const rule = ASSIGNMENT_RULES[normalizeTaxonomyName(category)];
  if (!rule) return [];

  const issuePlan = rule.issues?.[normalizeTaxonomyName(issue)];
  if (issuePlan) return issuePlan;

  return rule.all ?? [];
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
  const current = (currentDepartment ?? "").trim();
  if (!current) return false;
  return getAssignmentPlan(category, issue).includes(current);
}
