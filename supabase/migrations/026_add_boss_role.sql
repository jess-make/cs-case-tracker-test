-- Add boss role for read-only full case visibility.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'boss';

COMMENT ON COLUMN public.users.role IS 'admin | boss | manager | user';

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
    WHEN meta_role IN ('admin', 'boss', 'manager', 'user') THEN meta_role::public.user_role
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
