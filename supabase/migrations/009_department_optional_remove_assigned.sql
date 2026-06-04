-- 指派部門改為選填
ALTER TABLE public.cases
  ALTER COLUMN department DROP NOT NULL;

-- 舊狀態 assigned 併入處理中
UPDATE public.cases
SET status = 'in_progress'::case_status
WHERE status = 'assigned'::case_status;
