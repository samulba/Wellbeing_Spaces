-- ============================================================
-- Migration 115 · Freigabe-Härtung (Pre-Launch-Audit)
--
-- 1) freigabe_audit append-only: Die bisherige FOR-ALL-Policy erlaubte
--    eingeloggten Usern theoretisch UPDATE/DELETE der eigenen Org-Audit-
--    Zeilen. Ein Audit-Trail muss unveränderlich sein. Neu: nur SELECT
--    (Admin-UI-Drawer) + INSERT (Bulk-Admin-Action schreibt über den
--    authenticated-Client) für die eigene Org. KEIN UPDATE/DELETE →
--    Einträge können nicht mehr verändert oder gelöscht werden.
--    (Der System-/Token-Pfad schreibt ohnehin über den Admin-Client.)
--
-- 2) PIN-Brute-Force-Schutz: Versuchszähler + Sperr-Zeitstempel auf
--    projekte. pinPruefen() wertet sie fail-safe aus (ohne Spalten →
--    kein Lockout, aber kein Fehler).
--
-- Komplett additiv, keine Daten betroffen.
-- ============================================================

-- ── 1) freigabe_audit: append-only ─────────────────────────────
DROP POLICY IF EXISTS "freigabe_audit_org_access" ON freigabe_audit;

CREATE POLICY "freigabe_audit_select" ON freigabe_audit
  FOR SELECT TO authenticated
  USING (organisation_id = get_user_org_id());

CREATE POLICY "freigabe_audit_insert" ON freigabe_audit
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_user_org_id());
-- Bewusst KEINE UPDATE/DELETE-Policy → für authenticated verboten (append-only).


-- ── 2) projekte: server-seitiger PIN-Lockout ───────────────────
ALTER TABLE projekte
  ADD COLUMN IF NOT EXISTS freigabe_pin_versuche     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freigabe_pin_gesperrt_bis TIMESTAMPTZ;
