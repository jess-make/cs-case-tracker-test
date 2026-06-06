-- 重構 users.role：admin / manager / user
-- 將既有 cs、handler 遷移為 user

-- 1. 暫改為 text，以便執行 UPDATE
ALTER TABLE public.users
  ALTER COLUMN role DROP DEFAULT;

ALTER TABLE public.users
  ALTER COLUMN role TYPE text USING role::text;

-- 2. 更新既有資料（需求：cs → user）
UPDATE public.users SET role = 'user' WHERE role = 'cs';
UPDATE public.users SET role = 'user' WHERE role = 'handler';

-- 3. 建立新 enum 並套用
CREATE TYPE public.user_role_new AS ENUM ('admin', 'manager', 'user');

ALTER TABLE public.users
  ALTER COLUMN role TYPE public.user_role_new
  USING (
    CASE role
      WHEN 'admin' THEN 'admin'::public.user_role_new
      WHEN 'manager' THEN 'manager'::public.user_role_new
      WHEN 'user' THEN 'user'::public.user_role_new
      ELSE 'user'::public.user_role_new
    END
  );

ALTER TABLE public.users
  ALTER COLUMN role SET DEFAULT 'user'::public.user_role_new;

DROP TYPE public.user_role;
ALTER TYPE public.user_role_new RENAME TO user_role;

COMMENT ON COLUMN public.users.role IS 'admin | manager | user';

-- 4. 更新 Auth 註冊 trigger 預設角色
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_role text := NEW.raw_user_meta_data->>'role';
  resolved_role public.user_role;
BEGIN
  resolved_role := CASE
    WHEN meta_role IN ('admin', 'manager', 'user') THEN meta_role::public.user_role
    WHEN meta_role = 'cs' THEN 'user'::public.user_role
    WHEN meta_role = 'handler' THEN 'user'::public.user_role
    ELSE 'user'::public.user_role
  END;

  INSERT INTO public.users (id, email, name, role, department, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    resolved_role,
    NEW.raw_user_meta_data->>'department',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();

  RETURN NEW;
END;
$$;
