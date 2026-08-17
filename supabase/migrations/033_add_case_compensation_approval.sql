ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS compensation_type TEXT,
  ADD COLUMN IF NOT EXISTS compensation_status TEXT,
  ADD COLUMN IF NOT EXISTS compensation_requested_by_id UUID,
  ADD COLUMN IF NOT EXISTS compensation_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS compensation_reviewed_by_id UUID,
  ADD COLUMN IF NOT EXISTS compensation_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS compensation_review_note TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cases_compensation_type_check'
  ) THEN
    ALTER TABLE public.cases
      ADD CONSTRAINT cases_compensation_type_check
      CHECK (
        compensation_type IS NULL OR
        compensation_type IN ('部分退款', '折價券', '其他補償')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cases_compensation_status_check'
  ) THEN
    ALTER TABLE public.cases
      ADD CONSTRAINT cases_compensation_status_check
      CHECK (
        compensation_status IS NULL OR
        compensation_status IN ('pending', 'approved', 'rejected')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cases_compensation_requested_by_id_fkey'
  ) THEN
    ALTER TABLE public.cases
      ADD CONSTRAINT cases_compensation_requested_by_id_fkey
      FOREIGN KEY (compensation_requested_by_id)
      REFERENCES public.users(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cases_compensation_reviewed_by_id_fkey'
  ) THEN
    ALTER TABLE public.cases
      ADD CONSTRAINT cases_compensation_reviewed_by_id_fkey
      FOREIGN KEY (compensation_reviewed_by_id)
      REFERENCES public.users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cases_compensation_status
  ON public.cases(compensation_status)
  WHERE compensation_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cases_compensation_requested_by_id
  ON public.cases(compensation_requested_by_id)
  WHERE compensation_requested_by_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cases_compensation_reviewed_by_id
  ON public.cases(compensation_reviewed_by_id)
  WHERE compensation_reviewed_by_id IS NOT NULL;
