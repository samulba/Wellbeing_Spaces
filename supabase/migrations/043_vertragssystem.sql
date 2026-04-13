-- ============================================================
-- Migration 043 · Vertragssystem
-- ============================================================


-- ============================================================
-- 1. TABELLE: vertrags_vorlagen
-- ============================================================

CREATE TABLE IF NOT EXISTS vertrags_vorlagen (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  UUID        NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  beschreibung     TEXT,
  inhalt_html      TEXT        NOT NULL DEFAULT '',
  platzhalter      JSONB,      -- Beschreibung der verfügbaren Platzhalter
  kategorie        TEXT        CHECK (kategorie IN ('projektvertrag','rahmenvertrag','angebot','sonstiges')),
  ist_standard     BOOLEAN     NOT NULL DEFAULT false,
  version          INTEGER     NOT NULL DEFAULT 1,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vertrags_vorlagen_org ON vertrags_vorlagen(organisation_id);

ALTER TABLE vertrags_vorlagen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vertrags_vorlagen_org_access" ON vertrags_vorlagen
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());


-- ============================================================
-- 2. TABELLE: vertraege
-- ============================================================

CREATE TABLE IF NOT EXISTS vertraege (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id         UUID        NOT NULL REFERENCES organisationen(id)       ON DELETE CASCADE,
  vorlage_id              UUID                 REFERENCES vertrags_vorlagen(id)   ON DELETE SET NULL,
  projekt_id              UUID                 REFERENCES projekte(id)            ON DELETE SET NULL,
  kunde_id                UUID        NOT NULL REFERENCES kunden(id)              ON DELETE RESTRICT,
  titel                   TEXT        NOT NULL,
  inhalt_html             TEXT        NOT NULL DEFAULT '',
  pdf_url                 TEXT,
  status                  TEXT        NOT NULL DEFAULT 'entwurf'
                          CHECK (status IN ('entwurf','gesendet','unterschrieben_kunde','unterschrieben_beide','abgelaufen','storniert')),
  signatur_kunde_url      TEXT,
  signatur_kunde_datum    TIMESTAMPTZ,
  signatur_firma_url      TEXT,
  signatur_firma_datum    TIMESTAMPTZ,
  signatur_token          TEXT        UNIQUE,
  signatur_token_gueltig  TIMESTAMPTZ,
  gesamtwert              NUMERIC(12,2),
  gueltig_bis             DATE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vertraege_org       ON vertraege(organisation_id);
CREATE INDEX IF NOT EXISTS idx_vertraege_projekt   ON vertraege(projekt_id)  WHERE projekt_id  IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vertraege_kunde     ON vertraege(kunde_id);

ALTER TABLE vertraege ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vertraege_org_access" ON vertraege
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());


-- ============================================================
-- 3. updated_at Trigger (wiederverwendbare Funktion)
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vertrags_vorlagen_updated_at
  BEFORE UPDATE ON vertrags_vorlagen
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_vertraege_updated_at
  BEFORE UPDATE ON vertraege
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
