-- 允許編輯案件時刪除附件（開發用 anon；正式環境請改 authenticated）
DO $$
BEGIN
  CREATE POLICY "Allow anon delete case_attachments" ON public.case_attachments
    FOR DELETE TO anon USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

GRANT DELETE ON public.case_attachments TO anon;
GRANT DELETE ON public.case_attachments TO authenticated;

DO $$
BEGIN
  CREATE POLICY "Allow anon delete case-attachments storage" ON storage.objects
    FOR DELETE TO anon
    USING (bucket_id = 'case-attachments');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
