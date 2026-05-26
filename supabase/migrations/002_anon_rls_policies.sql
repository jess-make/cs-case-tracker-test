-- 允許 anon key 讀寫（開發用；正式環境請改為 authenticated + 角色權限）

CREATE POLICY "Allow anon select users" ON users
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon select cases" ON cases
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert cases" ON cases
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update cases" ON cases
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon select case_logs" ON case_logs
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert case_logs" ON case_logs
  FOR INSERT TO anon WITH CHECK (true);
