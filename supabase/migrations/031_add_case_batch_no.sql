ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS batch_no TEXT;

CREATE INDEX IF NOT EXISTS idx_cases_batch_no
  ON public.cases(batch_no)
  WHERE batch_no IS NOT NULL;
