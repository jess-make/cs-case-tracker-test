-- 新增客戶性別欄位（程式使用：customer_gender text）

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS customer_gender TEXT;

COMMENT ON COLUMN public.cases.customer_gender IS '客戶性別：男 / 女';
