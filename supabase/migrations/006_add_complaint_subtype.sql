-- 客訴問題（二層選單之子項）；complaint_type 保留為客訴類別

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS complaint_subtype TEXT;

COMMENT ON COLUMN public.cases.complaint_type IS '客訴類別';
COMMENT ON COLUMN public.cases.complaint_subtype IS '客訴問題';
