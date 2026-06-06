export type UserRole = "admin" | "manager" | "user";

export type CaseStatus =
  | "new"
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
  is_active?: boolean;
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
  source_detail: string | null;
  complaint_type: string;
  complaint_subtype: string | null;
  description: string;
  urgency: UrgencyLevel;
  department: string | null;
  ecommerce_order_no: string | null;
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
  attachments?: CaseAttachment[];
}

export interface CaseAttachment {
  id: string;
  case_id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by_id: string | null;
  created_at: string;
  download_url?: string | null;
}

export interface CaseLog {
  id: string;
  case_id: string;
  user_id: string | null;
  action: string;
  content: string | null;
  /** 舊版 case_logs 欄位，僅供顯示，不刪除 */
  cause?: string | null;
  solution?: string | null;
  improvement?: string | null;
  note?: string | null;
  created_at: string;
  user?: User | null;
}

export interface DashboardStats {
  total: number;
  newCases: number;
  inProgress: number;
  pendingConfirm: number;
  closed: number;
}

export interface CreateCaseInput {
  customer_name: string;
  customer_contact: string;
  customer_gender: string;
  source: string;
  source_detail: string;
  complaint_type: string;
  complaint_subtype: string;
  description: string;
  urgency: UrgencyLevel;
  department: string | null;
  ecommerce_order_no?: string | null;
}

export interface UpdateCaseInput {
  customer_name: string;
  customer_contact: string;
  customer_gender: string;
  source: string;
  source_detail: string;
  complaint_type: string;
  complaint_subtype: string;
  description: string;
  urgency: UrgencyLevel;
  department: string | null;
  ecommerce_order_no: string | null;
}

export interface UpdateUserInput {
  name: string;
  role: UserRole;
  department: string | null;
  line_user_id: string | null;
  is_active: boolean;
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
