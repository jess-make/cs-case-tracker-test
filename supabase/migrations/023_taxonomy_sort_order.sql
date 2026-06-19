-- 客訴主資料排序欄位（依目前 name + created_at 順序填入初始值）

ALTER TABLE public.complaint_categories
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.complaint_issues
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.complaint_sources
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.complaint_channels
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT
    id,
    (ROW_NUMBER() OVER (ORDER BY name ASC, created_at ASC) - 1)::INTEGER AS rn
  FROM public.complaint_categories
)
UPDATE public.complaint_categories AS c
SET sort_order = ranked.rn
FROM ranked
WHERE c.id = ranked.id;

WITH ranked AS (
  SELECT
    id,
    (
      ROW_NUMBER() OVER (
        PARTITION BY category_id
        ORDER BY name ASC, created_at ASC
      ) - 1
    )::INTEGER AS rn
  FROM public.complaint_issues
)
UPDATE public.complaint_issues AS i
SET sort_order = ranked.rn
FROM ranked
WHERE i.id = ranked.id;

WITH ranked AS (
  SELECT
    id,
    (ROW_NUMBER() OVER (ORDER BY name ASC, created_at ASC) - 1)::INTEGER AS rn
  FROM public.complaint_sources
)
UPDATE public.complaint_sources AS s
SET sort_order = ranked.rn
FROM ranked
WHERE s.id = ranked.id;

WITH ranked AS (
  SELECT
    id,
    (
      ROW_NUMBER() OVER (
        PARTITION BY source_id
        ORDER BY name ASC, created_at ASC
      ) - 1
    )::INTEGER AS rn
  FROM public.complaint_channels
)
UPDATE public.complaint_channels AS ch
SET sort_order = ranked.rn
FROM ranked
WHERE ch.id = ranked.id;

CREATE INDEX IF NOT EXISTS idx_complaint_categories_sort_order
  ON public.complaint_categories(sort_order, created_at);

CREATE INDEX IF NOT EXISTS idx_complaint_issues_sort_order
  ON public.complaint_issues(category_id, sort_order, created_at);

CREATE INDEX IF NOT EXISTS idx_complaint_sources_sort_order
  ON public.complaint_sources(sort_order, created_at);

CREATE INDEX IF NOT EXISTS idx_complaint_channels_sort_order
  ON public.complaint_channels(source_id, sort_order, created_at);
