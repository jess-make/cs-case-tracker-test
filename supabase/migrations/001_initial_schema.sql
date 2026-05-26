-- CS Case Tracker - Initial Schema

-- 使用者角色
CREATE TYPE user_role AS ENUM ('cs', 'handler', 'admin');

-- 案件狀態流程：新案件 → 已指派 → 處理中 → 已回覆改善結果 → 客服確認中 → 已結案
CREATE TYPE case_status AS ENUM (
  'new',
  'assigned',
  'in_progress',
  'replied',
  'cs_confirming',
  'closed'
);

CREATE TYPE urgency_level AS ENUM ('low', 'medium', 'high', 'critical');

-- 使用者表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'cs',
  department TEXT,
  line_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 案件表
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_contact TEXT NOT NULL,
  source TEXT NOT NULL,
  complaint_type TEXT NOT NULL,
  description TEXT NOT NULL,
  urgency urgency_level NOT NULL DEFAULT 'medium',
  department TEXT NOT NULL,
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status case_status NOT NULL DEFAULT 'new',
  due_date TIMESTAMPTZ,
  resolution TEXT,
  attachment_urls TEXT[] DEFAULT '{}',
  is_overdue BOOLEAN NOT NULL DEFAULT false,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 案件處理紀錄
CREATE TABLE case_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_assignee ON cases(assignee_id);
CREATE INDEX idx_cases_complaint_type ON cases(complaint_type);
CREATE INDEX idx_cases_due_date ON cases(due_date);
CREATE INDEX idx_case_logs_case_id ON case_logs(case_id);

-- 自動產生案件編號
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.case_number IS NULL OR NEW.case_number = '' THEN
    NEW.case_number := 'CS-' || to_char(now(), 'YYYYMMDD') || '-' ||
      lpad(nextval('case_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE case_number_seq START 1;

CREATE TRIGGER trg_case_number
  BEFORE INSERT ON cases
  FOR EACH ROW
  EXECUTE FUNCTION generate_case_number();

-- 更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 逾期標記
CREATE OR REPLACE FUNCTION mark_overdue_cases()
RETURNS void AS $$
BEGIN
  UPDATE cases
  SET is_overdue = true
  WHERE status NOT IN ('closed')
    AND due_date < now()
    AND is_overdue = false;
END;
$$ LANGUAGE plpgsql;

-- Storage bucket for attachments (run in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('case-attachments', 'case-attachments', true);

-- RLS policies (basic - adjust per auth setup)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read users" ON users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated all cases" ON cases
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated all case_logs" ON case_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 種子資料（示範用）
INSERT INTO users (email, name, role, department) VALUES
  ('cs@example.com', '王小美', 'cs', '客服部'),
  ('handler@example.com', '李大華', 'handler', '品保部'),
  ('admin@example.com', '張經理', 'admin', '管理部');
