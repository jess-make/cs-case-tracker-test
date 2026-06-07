-- 首次登入／重設密碼後強制修改密碼

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.must_change_password IS '首次登入或管理員重設密碼後須強制修改';

-- 使用者完成改密碼：僅允許將自己的 must_change_password 由 true 改為 false
DO $$
BEGIN
  CREATE POLICY "Users clear own must_change_password" ON public.users
    FOR UPDATE TO authenticated
    USING (
      auth.uid() = id
      AND must_change_password = true
    )
    WITH CHECK (
      auth.uid() = id
      AND must_change_password = false
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
