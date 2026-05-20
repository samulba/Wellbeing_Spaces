-- ============================================================
-- Migration 112 · Projekt-Kalkulation erweitern
--
-- Zwei neue Tabellen — komplett additiv, keine Aenderungen an
-- bestehenden Spalten oder Daten:
--
-- 1) raum_zusatzkosten — Lieferkosten, Handwerker, Malerarbeiten,
--    Montage, Sonstiges. Eine Zeile pro Position pro Raum, mit
--    Netto-Betrag + optionalem prozentualem Aufschlag, MwSt erfolgt
--    zentral ueber getMwstSatz().
--
-- 2) service_raten — Raten der Service-Pauschale (Beispiel:
--    900 EUR Pauschale = 3 Raten a 300 EUR). Eine Zeile pro Rate
--    mit Faelligkeit, Rechnungsdatum, Zahlungsstatus.
--
-- Beide Tabellen sind org-scoped mit RLS, haben Realtime-Publication
-- fuer Live-UI-Updates und nutzen organisationen(id) als FK (korrekt,
-- nicht der frueher fehlerhafte auth.users-FK aus Mig 054/055).
-- ============================================================

-- ── 1) raum_zusatzkosten ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS raum_zusatzkosten (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  raum_id         UUID NOT NULL REFERENCES raeume(id)         ON DELETE CASCADE,
  titel           TEXT NOT NULL CHECK (length(titel) BETWEEN 1 AND 200),
  kategorie       TEXT NOT NULL DEFAULT 'sonstiges'
                  CHECK (kategorie IN ('lieferung', 'handwerker', 'malerarbeiten', 'montage', 'sonstiges')),
  -- Netto-Betrag. MwSt wird zentral aus getMwstSatz() angewendet.
  betrag_netto    NUMERIC(12,2) NOT NULL CHECK (betrag_netto >= 0),
  notiz           TEXT,
  reihenfolge     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_raum_zusatzkosten_raum
  ON raum_zusatzkosten(raum_id, reihenfolge);
CREATE INDEX IF NOT EXISTS idx_raum_zusatzkosten_org
  ON raum_zusatzkosten(organisation_id);

-- updated_at-Trigger
CREATE OR REPLACE FUNCTION raum_zusatzkosten_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS raum_zusatzkosten_updated_at ON raum_zusatzkosten;
CREATE TRIGGER raum_zusatzkosten_updated_at
  BEFORE UPDATE ON raum_zusatzkosten
  FOR EACH ROW EXECUTE FUNCTION raum_zusatzkosten_set_updated_at();

ALTER TABLE raum_zusatzkosten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "raum_zusatzkosten_org_access" ON raum_zusatzkosten
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());


-- ── 2) service_raten ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_raten (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  projekt_id      UUID NOT NULL REFERENCES projekte(id)       ON DELETE CASCADE,
  -- Netto-Betrag der Rate
  betrag          NUMERIC(12,2) NOT NULL CHECK (betrag >= 0),
  faellig_am      DATE,
  rechnungsdatum  DATE,
  bezahlt_am      DATE,
  status          TEXT NOT NULL DEFAULT 'offen'
                  CHECK (status IN ('offen', 'gestellt', 'bezahlt', 'storniert')),
  notiz           TEXT,
  reihenfolge     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_raten_projekt
  ON service_raten(projekt_id, reihenfolge);
CREATE INDEX IF NOT EXISTS idx_service_raten_org
  ON service_raten(organisation_id);
CREATE INDEX IF NOT EXISTS idx_service_raten_faellig
  ON service_raten(faellig_am) WHERE status IN ('offen', 'gestellt') AND faellig_am IS NOT NULL;

-- updated_at-Trigger
CREATE OR REPLACE FUNCTION service_raten_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS service_raten_updated_at ON service_raten;
CREATE TRIGGER service_raten_updated_at
  BEFORE UPDATE ON service_raten
  FOR EACH ROW EXECUTE FUNCTION service_raten_set_updated_at();

ALTER TABLE service_raten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_raten_org_access" ON service_raten
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());


-- ── 3) Realtime-Publication ────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'raum_zusatzkosten'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE raum_zusatzkosten';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'service_raten'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE service_raten';
  END IF;
END
$$;
