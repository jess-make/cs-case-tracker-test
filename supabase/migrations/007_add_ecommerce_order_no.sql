-- 電商訂單編號（選填，供案件查詢使用）
ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS ecommerce_order_no text;

CREATE INDEX IF NOT EXISTS idx_cases_ecommerce_order_no
  ON cases (ecommerce_order_no)
  WHERE ecommerce_order_no IS NOT NULL;
