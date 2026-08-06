-- 更正上一版錯誤部門：系統沒有「後勤部-電商」，應回歸「業務部-電商」。
UPDATE public.users
SET department = '業務部-電商'
WHERE trim(department) = '後勤部-電商';

UPDATE public.cases
SET department = '業務部-電商'
WHERE trim(department) = '後勤部-電商';

DELETE FROM public.departments
WHERE name = '後勤部-電商';
