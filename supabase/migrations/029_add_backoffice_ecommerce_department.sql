-- 自動指派規則使用的後勤電商部門。
INSERT INTO public.departments (name)
VALUES ('後勤部-電商')
ON CONFLICT (name) DO NOTHING;
