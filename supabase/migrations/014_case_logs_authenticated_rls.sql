-- 確保登入使用者可寫入 case_logs（若尚未建立 policy）
DO $$
BEGIN
  CREATE POLICY "Allow authenticated insert case_logs" ON public.case_logs
    FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Allow authenticated select case_logs" ON public.case_logs
    FOR SELECT TO authenticated USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

GRANT SELECT, INSERT ON public.case_logs TO authenticated;
