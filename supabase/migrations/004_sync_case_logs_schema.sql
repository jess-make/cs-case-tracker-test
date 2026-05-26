-- 同步 case_logs 結構（程式使用：id, case_id, user_id, action, content, created_at）

CREATE TABLE IF NOT EXISTS public.case_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL,
  user_id UUID,
  action TEXT NOT NULL DEFAULT '紀錄',
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.case_logs
  ADD COLUMN IF NOT EXISTS case_id UUID;

ALTER TABLE public.case_logs
  ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE public.case_logs
  ADD COLUMN IF NOT EXISTS action TEXT NOT NULL DEFAULT '紀錄';

ALTER TABLE public.case_logs
  ADD COLUMN IF NOT EXISTS content TEXT;

ALTER TABLE public.case_logs
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_case_logs_case_id ON public.case_logs(case_id);

GRANT SELECT, INSERT ON public.case_logs TO anon;
GRANT SELECT, INSERT ON public.case_logs TO authenticated;

ALTER TABLE public.case_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Allow anon select case_logs" ON public.case_logs
    FOR SELECT TO anon USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Allow anon insert case_logs" ON public.case_logs
    FOR INSERT TO anon WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
