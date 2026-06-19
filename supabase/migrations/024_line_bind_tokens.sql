-- LINE 綁定碼與首次登入綁定流程

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS must_bind_line BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.must_bind_line IS '首次登入須完成 LINE 綁定（管理員手動填入 line_user_id 時應設為 false）';

UPDATE public.users
SET must_bind_line = false
WHERE must_bind_line IS DISTINCT FROM false;

CREATE TABLE IF NOT EXISTS public.line_bind_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ NULL,
  line_user_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_line_bind_tokens_user_id
  ON public.line_bind_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_line_bind_tokens_token
  ON public.line_bind_tokens(token);

CREATE INDEX IF NOT EXISTS idx_line_bind_tokens_active
  ON public.line_bind_tokens(user_id, expires_at)
  WHERE used_at IS NULL;

ALTER TABLE public.line_bind_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Users read own line_bind_tokens" ON public.line_bind_tokens
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users insert own line_bind_tokens" ON public.line_bind_tokens
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.line_bind_tokens TO service_role;
