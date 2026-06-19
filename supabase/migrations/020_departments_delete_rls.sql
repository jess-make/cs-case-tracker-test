-- 管理員可刪除未使用的部門

DO $$
BEGIN
  CREATE POLICY "Admin delete departments" ON public.departments
    FOR DELETE TO authenticated
    USING (
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

GRANT DELETE ON public.departments TO authenticated;
