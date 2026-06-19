-- 客訴類別主檔（cases.complaint_type 仍存類別名稱文字，不建立 FK）

CREATE TABLE IF NOT EXISTS public.complaint_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_complaint_categories_is_active
  ON public.complaint_categories(is_active);

DROP TRIGGER IF EXISTS trg_complaint_categories_updated_at ON public.complaint_categories;
CREATE TRIGGER trg_complaint_categories_updated_at
  BEFORE UPDATE ON public.complaint_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.complaint_categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Authenticated read active complaint_categories" ON public.complaint_categories
    FOR SELECT TO authenticated
    USING (is_active = true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Admin read all complaint_categories" ON public.complaint_categories
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

DO $$
BEGIN
  CREATE POLICY "Admin insert complaint_categories" ON public.complaint_categories
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

DO $$
BEGIN
  CREATE POLICY "Admin update complaint_categories" ON public.complaint_categories
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

DO $$
BEGIN
  CREATE POLICY "Admin delete complaint_categories" ON public.complaint_categories
    FOR DELETE TO authenticated
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.complaint_categories TO authenticated;

-- 預設匯入（與 src/lib/constants.ts COMPLAINT_CATEGORY_KEYS 一致）
INSERT INTO public.complaint_categories (name) VALUES
  ('商品問題'),
  ('物流問題'),
  ('服務問題'),
  ('退款/金流問題'),
  ('退換貨'),
  ('系統/設備問題'),
  ('其他')
ON CONFLICT (name) DO NOTHING;

-- 匯入 cases 中尚未登記的 complaint_type
INSERT INTO public.complaint_categories (name)
SELECT DISTINCT trim(c.complaint_type)
FROM public.cases AS c
WHERE c.complaint_type IS NOT NULL
  AND trim(c.complaint_type) <> ''
ON CONFLICT (name) DO NOTHING;
