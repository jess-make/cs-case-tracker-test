-- 案件指派規則主檔與指派步驟

CREATE TABLE IF NOT EXISTS public.case_assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_type TEXT NOT NULL,
  complaint_subtype TEXT,
  applies_to_all_subtypes BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT case_assignment_rules_scope_check CHECK (
    (
      applies_to_all_subtypes = true
      AND complaint_subtype IS NULL
    )
    OR
    (
      applies_to_all_subtypes = false
      AND complaint_subtype IS NOT NULL
      AND btrim(complaint_subtype) <> ''
    )
  ),
  CONSTRAINT case_assignment_rules_type_check CHECK (btrim(complaint_type) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_case_assignment_rules_all_unique
  ON public.case_assignment_rules (complaint_type)
  WHERE applies_to_all_subtypes = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_case_assignment_rules_subtype_unique
  ON public.case_assignment_rules (complaint_type, complaint_subtype)
  WHERE applies_to_all_subtypes = false;

CREATE INDEX IF NOT EXISTS idx_case_assignment_rules_active
  ON public.case_assignment_rules(is_active);

DROP TRIGGER IF EXISTS trg_case_assignment_rules_updated_at
  ON public.case_assignment_rules;
CREATE TRIGGER trg_case_assignment_rules_updated_at
  BEFORE UPDATE ON public.case_assignment_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE IF NOT EXISTS public.case_assignment_rule_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.case_assignment_rules(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  department TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT case_assignment_rule_steps_order_check CHECK (step_order > 0),
  CONSTRAINT case_assignment_rule_steps_department_check CHECK (btrim(department) <> ''),
  UNIQUE (rule_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_case_assignment_rule_steps_rule_id
  ON public.case_assignment_rule_steps(rule_id);

DROP TRIGGER IF EXISTS trg_case_assignment_rule_steps_updated_at
  ON public.case_assignment_rule_steps;
CREATE TRIGGER trg_case_assignment_rule_steps_updated_at
  BEFORE UPDATE ON public.case_assignment_rule_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.case_assignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_assignment_rule_steps ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Authenticated read active case_assignment_rules"
    ON public.case_assignment_rules
    FOR SELECT TO authenticated
    USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE POLICY "Admin read all case_assignment_rules"
    ON public.case_assignment_rules
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.users AS u
        WHERE u.id = auth.uid()
          AND u.role = 'admin'
          AND u.is_active = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE POLICY "Admin insert case_assignment_rules"
    ON public.case_assignment_rules
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.users AS u
        WHERE u.id = auth.uid()
          AND u.role = 'admin'
          AND u.is_active = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE POLICY "Admin update case_assignment_rules"
    ON public.case_assignment_rules
    FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.users AS u
        WHERE u.id = auth.uid()
          AND u.role = 'admin'
          AND u.is_active = true
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.users AS u
        WHERE u.id = auth.uid()
          AND u.role = 'admin'
          AND u.is_active = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE POLICY "Admin delete case_assignment_rules"
    ON public.case_assignment_rules
    FOR DELETE TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.users AS u
        WHERE u.id = auth.uid()
          AND u.role = 'admin'
          AND u.is_active = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE POLICY "Authenticated read case_assignment_rule_steps"
    ON public.case_assignment_rule_steps
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.case_assignment_rules AS r
        WHERE r.id = rule_id
          AND r.is_active = true
      )
      OR
      EXISTS (
        SELECT 1
        FROM public.users AS u
        WHERE u.id = auth.uid()
          AND u.role = 'admin'
          AND u.is_active = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE POLICY "Admin insert case_assignment_rule_steps"
    ON public.case_assignment_rule_steps
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.users AS u
        WHERE u.id = auth.uid()
          AND u.role = 'admin'
          AND u.is_active = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE POLICY "Admin update case_assignment_rule_steps"
    ON public.case_assignment_rule_steps
    FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.users AS u
        WHERE u.id = auth.uid()
          AND u.role = 'admin'
          AND u.is_active = true
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.users AS u
        WHERE u.id = auth.uid()
          AND u.role = 'admin'
          AND u.is_active = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  CREATE POLICY "Admin delete case_assignment_rule_steps"
    ON public.case_assignment_rule_steps
    FOR DELETE TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.users AS u
        WHERE u.id = auth.uid()
          AND u.role = 'admin'
          AND u.is_active = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_assignment_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_assignment_rule_steps TO authenticated;

CREATE OR REPLACE FUNCTION pg_temp.seed_case_assignment_rule(
  p_complaint_type TEXT,
  p_complaint_subtype TEXT,
  p_applies_to_all_subtypes BOOLEAN,
  p_departments TEXT[]
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_rule_id UUID;
  v_index INTEGER;
BEGIN
  IF p_applies_to_all_subtypes THEN
    INSERT INTO public.case_assignment_rules (
      complaint_type,
      complaint_subtype,
      applies_to_all_subtypes,
      is_active
    )
    VALUES (p_complaint_type, NULL, true, true)
    ON CONFLICT (complaint_type) WHERE applies_to_all_subtypes = true
    DO UPDATE SET
      is_active = EXCLUDED.is_active,
      updated_at = now()
    RETURNING id INTO v_rule_id;
  ELSE
    INSERT INTO public.case_assignment_rules (
      complaint_type,
      complaint_subtype,
      applies_to_all_subtypes,
      is_active
    )
    VALUES (p_complaint_type, p_complaint_subtype, false, true)
    ON CONFLICT (complaint_type, complaint_subtype)
      WHERE applies_to_all_subtypes = false
    DO UPDATE SET
      is_active = EXCLUDED.is_active,
      updated_at = now()
    RETURNING id INTO v_rule_id;
  END IF;

  DELETE FROM public.case_assignment_rule_steps
  WHERE rule_id = v_rule_id;

  IF p_departments IS NULL OR array_length(p_departments, 1) IS NULL THEN
    RETURN;
  END IF;

  FOR v_index IN 1..array_length(p_departments, 1) LOOP
    INSERT INTO public.case_assignment_rule_steps (
      rule_id,
      step_order,
      department
    )
    VALUES (
      v_rule_id,
      v_index,
      p_departments[v_index]
    );
  END LOOP;
END;
$$;

SELECT pg_temp.seed_case_assignment_rule('諮詢服務', NULL, true, ARRAY['業務部-客服']);
SELECT pg_temp.seed_case_assignment_rule('商品問題', NULL, true, ARRAY['業務部-客服']);
SELECT pg_temp.seed_case_assignment_rule('商品問題', '缺件', false, ARRAY['業務部-電商', '後勤部-倉儲']);
SELECT pg_temp.seed_case_assignment_rule('門市問題', '服務態度', false, ARRAY['業務部-門市']);
SELECT pg_temp.seed_case_assignment_rule('門市問題', '業務不熟/解說錯誤', false, ARRAY['業務部-門市']);
SELECT pg_temp.seed_case_assignment_rule('門市問題', '其他門市問題', false, ARRAY['業務部-門市']);
SELECT pg_temp.seed_case_assignment_rule('門市問題', '現場環境與設備', false, ARRAY['業務部-門市']);
SELECT pg_temp.seed_case_assignment_rule('門市問題', '庫存', false, ARRAY['業務部-門市']);
SELECT pg_temp.seed_case_assignment_rule('物流問題', '配送延遲', false, ARRAY['業務部-電商']);
SELECT pg_temp.seed_case_assignment_rule('物流問題', '包裹遺失/毀損', false, ARRAY['業務部-電商']);
SELECT pg_temp.seed_case_assignment_rule('物流問題', '錯誤件', false, ARRAY['業務部-電商']);
SELECT pg_temp.seed_case_assignment_rule('物流問題', '其他物流問題', false, ARRAY['業務部-電商']);
SELECT pg_temp.seed_case_assignment_rule('物流問題', '其他', false, ARRAY['業務部-電商']);
SELECT pg_temp.seed_case_assignment_rule('退貨', NULL, true, ARRAY['業務部-電商', '後勤部-品檢']);
SELECT pg_temp.seed_case_assignment_rule('換貨', NULL, true, ARRAY['業務部-電商', '後勤部-品檢']);
SELECT pg_temp.seed_case_assignment_rule('退換貨', NULL, true, ARRAY['業務部-電商', '後勤部-品檢']);
SELECT pg_temp.seed_case_assignment_rule('舊機回收', NULL, true, ARRAY['後勤部-品檢']);
SELECT pg_temp.seed_case_assignment_rule('其他', NULL, true, ARRAY['業務部-客服']);

