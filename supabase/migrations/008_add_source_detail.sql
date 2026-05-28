-- 客訴管道（二層選單細項，對應 source）
ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS source_detail text;

-- 確保 case_logs 具備 action / content（不影響既有資料）
ALTER TABLE public.case_logs
  ADD COLUMN IF NOT EXISTS action TEXT NOT NULL DEFAULT '紀錄';

ALTER TABLE public.case_logs
  ADD COLUMN IF NOT EXISTS content TEXT;
