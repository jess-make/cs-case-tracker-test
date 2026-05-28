-- Supabase Auth 與 users 表整合

-- 啟用必要欄位
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 將 users.id 與 auth.users 對齊（新環境請以 auth.users.id 建立 users 列）
-- 若既有 users 為獨立 UUID，需手動將 Auth 使用者 id 寫入 users.id

COMMENT ON COLUMN public.users.id IS '對應 auth.users.id';
COMMENT ON COLUMN public.users.role IS 'admin | cs | handler';
COMMENT ON COLUMN public.users.is_active IS '停用後無法登入';

-- RLS：登入使用者可讀取自己的 profile
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Users read own profile" ON public.users
    FOR SELECT TO authenticated
    USING (auth.uid() = id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users read all profiles for app" ON public.users
    FOR SELECT TO authenticated
    USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 新 Auth 註冊時自動建立 profile（若使用 Supabase 後台建立使用者可略過）
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, department, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'role', '')::user_role,
      'cs'::user_role
    ),
    NEW.raw_user_meta_data->>'department',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- 種子範例（請改為實際 Auth 使用者 id 後執行，或僅在 Supabase Auth 建立帳號後由 trigger 自動寫入）
-- INSERT INTO public.users (id, email, name, role, department, is_active) VALUES
--   ('00000000-0000-0000-0000-000000000001', 'admin@example.com', '管理員', 'admin', '管理部', true);
