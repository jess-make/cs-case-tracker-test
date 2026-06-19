-- 客訴問題、來源、管道主檔（cases 仍存文字欄位，不建立 FK）

-- A. 客訴問題（綁定 complaint_categories）
CREATE TABLE IF NOT EXISTS public.complaint_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.complaint_categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category_id, name)
);

CREATE INDEX IF NOT EXISTS idx_complaint_issues_category_id
  ON public.complaint_issues(category_id);

CREATE INDEX IF NOT EXISTS idx_complaint_issues_is_active
  ON public.complaint_issues(is_active);

DROP TRIGGER IF EXISTS trg_complaint_issues_updated_at ON public.complaint_issues;
CREATE TRIGGER trg_complaint_issues_updated_at
  BEFORE UPDATE ON public.complaint_issues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- B. 客訴來源
CREATE TABLE IF NOT EXISTS public.complaint_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_complaint_sources_is_active
  ON public.complaint_sources(is_active);

DROP TRIGGER IF EXISTS trg_complaint_sources_updated_at ON public.complaint_sources;
CREATE TRIGGER trg_complaint_sources_updated_at
  BEFORE UPDATE ON public.complaint_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- C. 客訴管道（綁定 complaint_sources）
CREATE TABLE IF NOT EXISTS public.complaint_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.complaint_sources(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_id, name)
);

CREATE INDEX IF NOT EXISTS idx_complaint_channels_source_id
  ON public.complaint_channels(source_id);

CREATE INDEX IF NOT EXISTS idx_complaint_channels_is_active
  ON public.complaint_channels(is_active);

DROP TRIGGER IF EXISTS trg_complaint_channels_updated_at ON public.complaint_channels;
CREATE TRIGGER trg_complaint_channels_updated_at
  BEFORE UPDATE ON public.complaint_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS: complaint_issues
ALTER TABLE public.complaint_issues ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Authenticated read active complaint_issues" ON public.complaint_issues
    FOR SELECT TO authenticated USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE POLICY "Admin read all complaint_issues" ON public.complaint_issues
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.users AS u
        WHERE u.id = auth.uid() AND u.role = 'admin' AND u.is_active = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE POLICY "Admin insert complaint_issues" ON public.complaint_issues
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.users AS u
        WHERE u.id = auth.uid() AND u.role = 'admin' AND u.is_active = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE POLICY "Admin update complaint_issues" ON public.complaint_issues
    FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.users AS u
        WHERE u.id = auth.uid() AND u.role = 'admin' AND u.is_active = true
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.users AS u
        WHERE u.id = auth.uid() AND u.role = 'admin' AND u.is_active = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE POLICY "Admin delete complaint_issues" ON public.complaint_issues
    FOR DELETE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.users AS u
        WHERE u.id = auth.uid() AND u.role = 'admin' AND u.is_active = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.complaint_issues TO authenticated;

-- RLS: complaint_sources
ALTER TABLE public.complaint_sources ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Authenticated read active complaint_sources" ON public.complaint_sources
    FOR SELECT TO authenticated USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE POLICY "Admin read all complaint_sources" ON public.complaint_sources
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.users AS u
        WHERE u.id = auth.uid() AND u.role = 'admin' AND u.is_active = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE POLICY "Admin insert complaint_sources" ON public.complaint_sources
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.users AS u
        WHERE u.id = auth.uid() AND u.role = 'admin' AND u.is_active = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE POLICY "Admin update complaint_sources" ON public.complaint_sources
    FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.users AS u
        WHERE u.id = auth.uid() AND u.role = 'admin' AND u.is_active = true
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.users AS u
        WHERE u.id = auth.uid() AND u.role = 'admin' AND u.is_active = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE POLICY "Admin delete complaint_sources" ON public.complaint_sources
    FOR DELETE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.users AS u
        WHERE u.id = auth.uid() AND u.role = 'admin' AND u.is_active = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.complaint_sources TO authenticated;

-- RLS: complaint_channels
ALTER TABLE public.complaint_channels ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Authenticated read active complaint_channels" ON public.complaint_channels
    FOR SELECT TO authenticated USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE POLICY "Admin read all complaint_channels" ON public.complaint_channels
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.users AS u
        WHERE u.id = auth.uid() AND u.role = 'admin' AND u.is_active = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE POLICY "Admin insert complaint_channels" ON public.complaint_channels
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.users AS u
        WHERE u.id = auth.uid() AND u.role = 'admin' AND u.is_active = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE POLICY "Admin update complaint_channels" ON public.complaint_channels
    FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.users AS u
        WHERE u.id = auth.uid() AND u.role = 'admin' AND u.is_active = true
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.users AS u
        WHERE u.id = auth.uid() AND u.role = 'admin' AND u.is_active = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE POLICY "Admin delete complaint_channels" ON public.complaint_channels
    FOR DELETE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.users AS u
        WHERE u.id = auth.uid() AND u.role = 'admin' AND u.is_active = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.complaint_channels TO authenticated;

-- 匯入客訴來源
INSERT INTO public.complaint_sources (name) VALUES
  ('綠途'),
  ('通路')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.complaint_sources (name)
SELECT DISTINCT trim(c.source)
FROM public.cases AS c
WHERE c.source IS NOT NULL AND trim(c.source) <> ''
ON CONFLICT (name) DO NOTHING;

-- 匯入客訴管道（依常數 + cases）
INSERT INTO public.complaint_channels (source_id, name)
SELECT s.id, v.channel_name
FROM public.complaint_sources AS s
CROSS JOIN (
  VALUES
    ('綠途', 'MO+'),
    ('綠途', '蝦皮直送'),
    ('綠途', '蝦皮商城'),
    ('綠途', 'PCHOME'),
    ('綠途', '門市'),
    ('通路', 'vivo'),
    ('通路', '全國電子')
) AS v(source_name, channel_name)
WHERE s.name = v.source_name
ON CONFLICT (source_id, name) DO NOTHING;

INSERT INTO public.complaint_channels (source_id, name)
SELECT s.id, trim(c.source_detail)
FROM public.cases AS c
JOIN public.complaint_sources AS s ON s.name = trim(c.source)
WHERE c.source_detail IS NOT NULL
  AND trim(c.source_detail) <> ''
ON CONFLICT (source_id, name) DO NOTHING;

-- 匯入客訴問題（依常數 + cases）
INSERT INTO public.complaint_issues (category_id, name)
SELECT cat.id, v.issue_name
FROM public.complaint_categories AS cat
CROSS JOIN (
  VALUES
    ('商品問題', '商品瑕疵'),
    ('商品問題', '規格不符'),
    ('商品問題', '缺件'),
    ('商品問題', '保固問題'),
    ('商品問題', '其他'),
    ('物流問題', '配送延遲'),
    ('物流問題', '錯誤件'),
    ('物流問題', '修改收件資料'),
    ('物流問題', '其他'),
    ('服務問題', '態度問題'),
    ('服務問題', '回覆過慢'),
    ('服務問題', '惡意客訴'),
    ('服務問題', '說明不清'),
    ('服務問題', '其他'),
    ('退款/金流問題', '發票問題'),
    ('退款/金流問題', '折價券'),
    ('退款/金流問題', '付款問題'),
    ('退款/金流問題', '其他'),
    ('退換貨', '功能異常'),
    ('退換貨', '外觀定義等級'),
    ('退換貨', '改變心意'),
    ('退換貨', '其他'),
    ('系統/設備問題', '無法操作'),
    ('系統/設備問題', '付款異常'),
    ('系統/設備問題', '設備故障'),
    ('系統/設備問題', '系統錯誤'),
    ('系統/設備問題', '其他'),
    ('其他', '其他')
) AS v(category_name, issue_name)
WHERE cat.name = v.category_name
ON CONFLICT (category_id, name) DO NOTHING;

INSERT INTO public.complaint_issues (category_id, name)
SELECT cat.id, trim(c.complaint_subtype)
FROM public.cases AS c
JOIN public.complaint_categories AS cat ON cat.name = trim(c.complaint_type)
WHERE c.complaint_subtype IS NOT NULL
  AND trim(c.complaint_subtype) <> ''
ON CONFLICT (category_id, name) DO NOTHING;
