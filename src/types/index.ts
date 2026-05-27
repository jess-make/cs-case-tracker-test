export type UserRole = "cs" | "handler" | "admin";

export type CaseStatus =
  | "new"
  | "assigned"
  | "in_progress"
  | "replied"
  | "cs_confirming"
  | "closed";

export type UrgencyLevel = "low" | "medium" | "high" | "critical";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department: string | null;
  line_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Case {
  id: string;
  case_number: string;
  customer_name: string;
  customer_contact: string;
  customer_gender: string | null;
  source: string;
  complaint_type: string;
  complaint_subtype: string | null;
  description: string;
  urgency: UrgencyLevel;
  department: string;
  assignee_id: string | null;
  created_by_id: string | null;
  status: CaseStatus;
  due_date: string | null;
  resolution: string | null;
  attachment_urls: string[];
  is_overdue: boolean;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  assignee?: User | null;
  created_by?: User | null;
}

export interface CaseLog {
  id: string;
  case_id: string;
  user_id: string | null;
  action: string;
  content: string | null;
  created_at: string;
  user?: User | null;
}

export interface DashboardStats {
  total: number;
  inProgress: number;
  pendingConfirm: number;
  closed: number;
  overdue: number;
}

export interface CreateCaseInput {
  customer_name: string;
  customer_contact: string;
  customer_gender: string;
  source: string;
  complaint_type: string;
  complaint_subtype: string;
  description: string;
  urgency: UrgencyLevel;
  department: string;
  attachment_urls?: string[];
}

export interface CaseFilters {
  status?: CaseStatus | "";
  assignee_id?: string | "";
  complaint_type?: string | "";
  urgency?: UrgencyLevel | "";
  q?: string;
  date_preset?: string;
  date_from?: string;
  date_to?: string;
}
