-- 案件附件 metadata
CREATE TABLE IF NOT EXISTS public.case_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_attachments_case_id
  ON public.case_attachments(case_id);

ALTER TABLE public.case_attachments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Allow anon select case_attachments" ON public.case_attachments
    FOR SELECT TO anon USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Allow anon insert case_attachments" ON public.case_attachments
    FOR INSERT TO anon WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

GRANT SELECT, INSERT ON public.case_attachments TO anon;
GRANT SELECT, INSERT ON public.case_attachments TO authenticated;

-- Storage bucket（private，下載使用 signed URL）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'case-attachments',
  'case-attachments',
  false,
  10485760,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS（開發用 anon；正式環境請改 authenticated）
DO $$
BEGIN
  CREATE POLICY "Allow anon insert case-attachments storage" ON storage.objects
    FOR INSERT TO anon
    WITH CHECK (bucket_id = 'case-attachments');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Allow anon select case-attachments storage" ON storage.objects
    FOR SELECT TO anon
    USING (bucket_id = 'case-attachments');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
