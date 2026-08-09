ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS shipping_tracking_no TEXT;

CREATE INDEX IF NOT EXISTS idx_cases_shipping_tracking_no
  ON public.cases(shipping_tracking_no)
  WHERE shipping_tracking_no IS NOT NULL;
