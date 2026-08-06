-- 部門主檔（users.department / cases.department 仍存部門名稱文字，不建立 FK）

CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_departments_is_active
  ON public.departments(is_active);

DROP TRIGGER IF EXISTS trg_departments_updated_at ON public.departments;
CREATE TRIGGER trg_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- 一般登入使用者可讀取啟用中的部門（下拉選單）
DO $$
BEGIN
  CREATE POLICY "Authenticated read active departments" ON public.departments
    FOR SELECT TO authenticated
    USING (is_active = true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 管理員可讀取全部部門
DO $$
BEGIN
  CREATE POLICY "Admin read all departments" ON public.departments
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.users AS admin_user
        WHERE admin_user.id = auth.uid()
          AND admin_user.role = 'admin'
          AND admin_user.is_active = true
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 管理員可新增部門
DO $$
BEGIN
  CREATE POLICY "Admin insert departments" ON public.departments
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.users AS admin_user
        WHERE admin_user.id = auth.uid()
          AND admin_user.role = 'admin'
          AND admin_user.is_active = true
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 管理員可更新部門（啟用/停用）
DO $$
BEGIN
  CREATE POLICY "Admin update departments" ON public.departments
    FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.users AS admin_user
        WHERE admin_user.id = auth.uid()
          AND admin_user.role = 'admin'
          AND admin_user.is_active = true
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.users AS admin_user
        WHERE admin_user.id = auth.uid()
          AND admin_user.role = 'admin'
          AND admin_user.is_active = true
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

GRANT SELECT, INSERT, UPDATE ON public.departments TO authenticated;

-- 預設部門（與 src/lib/constants.ts DEPARTMENTS 一致）
INSERT INTO public.departments (name) VALUES
  ('後勤部-維修'),
  ('後勤部-品檢'),
  ('後勤部-倉儲'),
  ('業務部-電商'),
  ('業務部-門市'),
  ('業務部-客服'),
  ('行銷部'),
  ('開發部')
ON CONFLICT (name) DO NOTHING;

-- 匯入 users / cases 中尚未登記的部門名稱（保留既有資料）
INSERT INTO public.departments (name)
SELECT DISTINCT trim(u.department)
FROM public.users AS u
WHERE u.department IS NOT NULL
  AND trim(u.department) <> ''
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.departments (name)
SELECT DISTINCT trim(c.department)
FROM public.cases AS c
WHERE c.department IS NOT NULL
  AND trim(c.department) <> ''
ON CONFLICT (name) DO NOTHING;
