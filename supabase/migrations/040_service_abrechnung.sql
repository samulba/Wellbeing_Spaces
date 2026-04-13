-- ============================================================
-- Migration 040 · Service-Abrechnung + Zeiterfassung
-- ============================================================


-- ============================================================
-- 1. Neue Spalten auf projekte
-- ============================================================

ALTER TABLE projekte
  ADD COLUMN IF NOT EXISTS service_modell       TEXT    CHECK (service_modell IN ('pauschale','stundensatz')),
  ADD COLUMN IF NOT EXISTS service_pauschale    NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS service_stundensatz  NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS produkt_budget       NUMERIC(12,2); -- Klient-sichtbares Produkt-Budget


-- ============================================================
-- 2. TABELLE: zeiterfassung
-- ============================================================

CREATE TABLE IF NOT EXISTS zeiterfassung (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID          NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  projekt_id      UUID          NOT NULL REFERENCES projekte(id)       ON DELETE CASCADE,
  user_id         UUID          REFERENCES auth.users(id),
  datum           DATE          NOT NULL DEFAULT CURRENT_DATE,
  stunden         NUMERIC(5,2)  NOT NULL,
  beschreibung    TEXT,
  abrechenbar     BOOLEAN       NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);


-- ============================================================
-- 3. INDIZES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_zeiterfassung_projekt_datum ON zeiterfassung(projekt_id, datum DESC);
CREATE INDEX IF NOT EXISTS idx_zeiterfassung_org           ON zeiterfassung(organisation_id);


-- ============================================================
-- 4. RLS: nur eigene Org
-- ============================================================

ALTER TABLE zeiterfassung ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zeiterfassung_org_access" ON zeiterfassung
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());
