-- 登入使用者（authenticated）可讀寫案件附件 metadata
DO $$
BEGIN
  CREATE POLICY "Allow authenticated select case_attachments" ON public.case_attachments
    FOR SELECT TO authenticated USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Allow authenticated insert case_attachments" ON public.case_attachments
    FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Allow authenticated delete case_attachments" ON public.case_attachments
    FOR DELETE TO authenticated USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Storage：authenticated 可上傳、讀取、刪除（signed URL 需 SELECT）
DO $$
BEGIN
  CREATE POLICY "Allow authenticated insert case-attachments storage" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'case-attachments');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Allow authenticated select case-attachments storage" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'case-attachments');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Allow authenticated delete case-attachments storage" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'case-attachments');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
