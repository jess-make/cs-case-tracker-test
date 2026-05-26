-- =============================================================================
-- CS Case Tracker — 同步 public.cases 結構（依專案程式實際使用欄位）
-- =============================================================================
--
-- 【程式使用的 cases 欄位】來源：src/types/index.ts、src/lib/data/cases.ts
--
--   id, case_number, customer_name, customer_contact, source, complaint_type,
--   description, urgency, department, assignee_id, created_by_id, status,
--   due_date, resolution, attachment_urls, is_overdue, closed_at,
--   created_at, updated_at
--
-- 【與 001_initial_schema.sql 對照】目標結構一致，僅補齊缺少欄位，不刪除既有欄位。
--
-- 【Live DB 探測結果】（執行 migration 前）
--   已存在：id, case_number, customer_name, customer_contact, source, description,
--            department, assignee_id, status, due_date, resolution, attachment_urls,
--            is_overdue, closed_at, created_at, updated_at
--   缺少：complaint_type, urgency, created_by_id
--
-- 使用方式：Supabase Dashboard → SQL Editor → 貼上並執行全文
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ENUM 類型（若已存在則略過）
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  CREATE TYPE case_status AS ENUM (
    'new',
    'assigned',
    'in_progress',
    'replied',
    'cs_confirming',
    'closed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE urgency_level AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 2. 確保 cases 資料表存在（全新環境用；已有表則不變）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_contact TEXT NOT NULL,
  source TEXT NOT NULL,
  complaint_type TEXT NOT NULL DEFAULT '其他',
  description TEXT NOT NULL,
  urgency urgency_level NOT NULL DEFAULT 'medium',
  department TEXT NOT NULL,
  assignee_id UUID,
  created_by_id UUID,
  status case_status NOT NULL DEFAULT 'new',
  due_date TIMESTAMPTZ,
  resolution TEXT,
  attachment_urls TEXT[] NOT NULL DEFAULT '{}',
  is_overdue BOOLEAN NOT NULL DEFAULT false,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 3. 逐欄補齊（ADD COLUMN IF NOT EXISTS — 不刪除、不覆寫既有欄位）
-- -----------------------------------------------------------------------------

-- 主鍵與編號
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS case_number TEXT;

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS customer_name TEXT;

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS customer_contact TEXT;

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS source TEXT;

-- 客訴分類（Live DB 缺少）
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS complaint_type TEXT NOT NULL DEFAULT '其他';

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS description TEXT;

-- 緊急程度（Live DB 缺少）
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS urgency urgency_level NOT NULL DEFAULT 'medium';

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS department TEXT;

-- 指派與建立者（Live DB 缺少 created_by_id）
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS assignee_id UUID;

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS created_by_id UUID;

-- 流程狀態
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS status case_status NOT NULL DEFAULT 'new';

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS resolution TEXT;

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS attachment_urls TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS is_overdue BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- -----------------------------------------------------------------------------
-- 4. 既有資料列：補齊 NOT NULL 欄位預設值（僅更新 NULL）
-- -----------------------------------------------------------------------------
UPDATE public.cases
SET complaint_type = '其他'
WHERE complaint_type IS NULL;

UPDATE public.cases
SET urgency = 'medium'
WHERE urgency IS NULL;

UPDATE public.cases
SET attachment_urls = '{}'
WHERE attachment_urls IS NULL;

UPDATE public.cases
SET is_overdue = false
WHERE is_overdue IS NULL;

UPDATE public.cases
SET created_at = now()
WHERE created_at IS NULL;

UPDATE public.cases
SET updated_at = now()
WHERE updated_at IS NULL;

-- -----------------------------------------------------------------------------
-- 5. 外鍵（僅在 users 表存在且約束尚未建立時）
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'cases'
      AND constraint_name = 'cases_assignee_id_fkey'
  ) THEN
    ALTER TABLE public.cases
      ADD CONSTRAINT cases_assignee_id_fkey
      FOREIGN KEY (assignee_id) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'cases'
      AND constraint_name = 'cases_created_by_id_fkey'
  ) THEN
    ALTER TABLE public.cases
      ADD CONSTRAINT cases_created_by_id_fkey
      FOREIGN KEY (created_by_id) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 6. 索引
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_cases_status ON public.cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_assignee ON public.cases(assignee_id);
CREATE INDEX IF NOT EXISTS idx_cases_complaint_type ON public.cases(complaint_type);
CREATE INDEX IF NOT EXISTS idx_cases_due_date ON public.cases(due_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cases_case_number ON public.cases(case_number);

-- -----------------------------------------------------------------------------
-- 7. updated_at 觸發器（可選，與 001 一致）
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cases_updated_at ON public.cases;
CREATE TRIGGER trg_cases_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------------------------------------
-- 8. 權限（anon / authenticated 讀寫 cases）
-- -----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON public.cases TO anon;
GRANT SELECT, INSERT, UPDATE ON public.cases TO authenticated;

-- -----------------------------------------------------------------------------
-- 9. RLS 政策（若已存在則略過錯誤）
-- -----------------------------------------------------------------------------
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Allow anon select cases" ON public.cases
    FOR SELECT TO anon USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Allow anon insert cases" ON public.cases
    FOR INSERT TO anon WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Allow anon update cases" ON public.cases
    FOR UPDATE TO anon USING (true) WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Allow authenticated all cases" ON public.cases
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 10. 驗證：列出 cases 目前所有欄位
-- -----------------------------------------------------------------------------
SELECT
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'cases'
ORDER BY ordinal_position;
