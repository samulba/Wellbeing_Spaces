-- ── 010_einstellungen_rls_insert_fix.sql ─────────────────────
-- Fix: INSERT/UPDATE auf einstellungen erfordert WITH CHECK
-- (USING allein gilt nur für SELECT/UPDATE existing rows)

DROP POLICY IF EXISTS "Admins können einstellungen schreiben" ON einstellungen;
DROP POLICY IF EXISTS "Einstellungen schreiben"               ON einstellungen;

CREATE POLICY "Einstellungen schreiben"
  ON einstellungen FOR ALL
  USING      (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
