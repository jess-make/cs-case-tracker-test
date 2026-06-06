-- 允許 admin 更新 users 表（使用者管理頁）

DO $$
BEGIN
  CREATE POLICY "Admin users can update profiles" ON public.users
    FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.users AS admin_user
        WHERE admin_user.id = auth.uid()
          AND admin_user.role = 'admin'
          AND admin_user.is_active = true
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.users AS admin_user
        WHERE admin_user.id = auth.uid()
          AND admin_user.role = 'admin'
          AND admin_user.is_active = true
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
