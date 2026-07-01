-- Generate case numbers in the database with Taiwan date and per-day counters.

CREATE TABLE IF NOT EXISTS public.case_number_counters (
  date_key TEXT PRIMARY KEY,
  last_value INTEGER NOT NULL DEFAULT 0 CHECK (last_value >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.generate_case_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  taipei_date_key TEXT;
  next_value INTEGER;
  candidate_number TEXT;
BEGIN
  IF NEW.case_number IS NULL OR btrim(NEW.case_number) = '' THEN
    taipei_date_key := to_char(
      timezone('Asia/Taipei', COALESCE(NEW.created_at, now())),
      'YYYYMMDD'
    );

    LOOP
      INSERT INTO public.case_number_counters (date_key, last_value, updated_at)
      VALUES (taipei_date_key, 1, now())
      ON CONFLICT (date_key)
      DO UPDATE SET
        last_value = public.case_number_counters.last_value + 1,
        updated_at = now()
      RETURNING last_value INTO next_value;

      candidate_number :=
        'CS-' ||
        taipei_date_key ||
        '-' ||
        CASE
          WHEN next_value > 9999 THEN next_value::text
          ELSE lpad(next_value::text, 4, '0')
        END;

      EXIT WHEN NOT EXISTS (
        SELECT 1
        FROM public.cases
        WHERE case_number = candidate_number
      );
    END LOOP;

    NEW.case_number := candidate_number;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_case_number ON public.cases;

CREATE TRIGGER trg_case_number
  BEFORE INSERT ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_case_number();

GRANT SELECT, INSERT, UPDATE ON public.case_number_counters TO service_role;
