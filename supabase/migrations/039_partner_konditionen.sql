-- ============================================================
-- Migration 039 · Partner-Konditionen + erweiterte Partner-Felder
-- ============================================================


-- ============================================================
-- 1. updated_at-Trigger-Funktion (idempotent)
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 2. TABELLE: partner_konditionen
-- ============================================================

CREATE TABLE IF NOT EXISTS partner_konditionen (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id       UUID          NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  partner_id            UUID          NOT NULL REFERENCES partner(id)         ON DELETE CASCADE,
  name                  TEXT          NOT NULL DEFAULT 'Standard',
  typ                   TEXT          NOT NULL CHECK (typ IN (
    'prozent_fix',
    'prozent_gestaffelt',
    'fix_pro_produkt',
    'fix_pro_bestellung',
    'kategorie_basiert',
    'rabatt_einkauf',
    'mindestbestellwert'
  )),
  wert                  NUMERIC(10,2),           -- Hauptwert (% oder €)
  staffelung            JSONB,                   -- [{ ab_umsatz: 1000, prozent: 5 }, ...]
  kategorie_werte       JSONB,                   -- { "kategorie_id": prozent, ... }
  gueltig_von           DATE,
  gueltig_bis           DATE,
  zahlungsziel_tage     INTEGER       DEFAULT 30,
  skonto_prozent        NUMERIC(5,2),
  skonto_tage           INTEGER,
  notizen               TEXT,
  aktiv                 BOOLEAN       NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TRIGGER partner_konditionen_updated_at
  BEFORE UPDATE ON partner_konditionen
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- 3. INDIZES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_partner_konditionen_partner ON partner_konditionen(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_konditionen_org     ON partner_konditionen(organisation_id);


-- ============================================================
-- 4. RLS: nur eigene Org
-- ============================================================

ALTER TABLE partner_konditionen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_konditionen_org_access" ON partner_konditionen
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());


-- ============================================================
-- 5. Neue Spalten auf der partner-Tabelle
-- ============================================================

ALTER TABLE partner
  ADD COLUMN IF NOT EXISTS partner_typ        TEXT    CHECK (partner_typ IN ('lieferant','hersteller','handwerker','planer','sonstiges')),
  ADD COLUMN IF NOT EXISTS zahlungsziel_tage  INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS iban               TEXT,
  ADD COLUMN IF NOT EXISTS ust_id             TEXT,
  ADD COLUMN IF NOT EXISTS bewertung          INTEGER CHECK (bewertung BETWEEN 1 AND 5);
