-- ============================================================
-- WBC Studio – Datenbankschema
-- Ausführen im Supabase SQL Editor
-- ============================================================

-- UUID-Extension (in Supabase standardmäßig aktiv)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- TABELLEN
-- ============================================================

-- Kunden
CREATE TABLE IF NOT EXISTS kunden (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  ansprechpartner TEXT,
  email         TEXT,
  telefon       TEXT,
  notizen       TEXT,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projekte
CREATE TABLE IF NOT EXISTS projekte (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  kunde_id      UUID        NOT NULL REFERENCES kunden(id) ON DELETE RESTRICT,
  name          TEXT        NOT NULL,
  beschreibung  TEXT,
  status        TEXT        NOT NULL DEFAULT 'offen'
                  CHECK (status IN ('offen', 'in_bearbeitung', 'freigegeben', 'abgeschlossen')),
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Räume
CREATE TABLE IF NOT EXISTS raeume (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  projekt_id    UUID        NOT NULL REFERENCES projekte(id) ON DELETE RESTRICT,
  name          TEXT        NOT NULL,
  beschreibung  TEXT,
  reihenfolge   INTEGER     NOT NULL DEFAULT 0,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partner / Lieferanten
CREATE TABLE IF NOT EXISTS partner (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  ansprechpartner TEXT,
  email         TEXT,
  telefon       TEXT,
  website       TEXT,
  notizen       TEXT,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Produkte
CREATE TABLE IF NOT EXISTS produkte (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  raum_id             UUID          NOT NULL REFERENCES raeume(id) ON DELETE RESTRICT,
  partner_id          UUID          REFERENCES partner(id) ON DELETE SET NULL,
  name                TEXT          NOT NULL,
  beschreibung        TEXT,
  menge               NUMERIC(10,2) NOT NULL DEFAULT 1,
  einheit             TEXT          NOT NULL DEFAULT 'Stk',
  einkaufspreis       NUMERIC(10,2),           -- intern, NIE für Kunden sichtbar
  marge_prozent       NUMERIC(5,2),            -- intern
  provision_prozent   NUMERIC(5,2),            -- intern
  verkaufspreis       NUMERIC(10,2),           -- extern sichtbar
  bild_url            TEXT,
  produkt_url         TEXT,
  notizen_intern      TEXT,                    -- intern
  reihenfolge         INTEGER       NOT NULL DEFAULT 0,
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Produktstatus (Freigabe-Status pro Produkt)
CREATE TABLE IF NOT EXISTS produktstatus (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  produkt_id      UUID        NOT NULL UNIQUE REFERENCES produkte(id) ON DELETE CASCADE,
  status          TEXT        NOT NULL DEFAULT 'ausstehend'
                    CHECK (status IN ('ausstehend', 'freigegeben', 'abgelehnt', 'ueberarbeitung')),
  kommentar       TEXT,                        -- Kommentar vom Kunden
  freigegeben_am  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Freigabe-Tokens (für externe Kundenansicht)
CREATE TABLE IF NOT EXISTS freigabe_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  projekt_id  UUID        NOT NULL REFERENCES projekte(id) ON DELETE CASCADE,
  token       TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  gueltig_bis TIMESTAMPTZ,
  aktiv       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- INDIZES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_projekte_kunde_id     ON projekte(kunde_id)    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_raeume_projekt_id     ON raeume(projekt_id)    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_produkte_raum_id      ON produkte(raum_id)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_produkte_partner_id   ON produkte(partner_id)  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_freigabe_token        ON freigabe_tokens(token) WHERE aktiv = TRUE;


-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_kunden_updated_at
  BEFORE UPDATE ON kunden
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_projekte_updated_at
  BEFORE UPDATE ON projekte
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_raeume_updated_at
  BEFORE UPDATE ON raeume
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_partner_updated_at
  BEFORE UPDATE ON partner
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_produkte_updated_at
  BEFORE UPDATE ON produkte
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_produktstatus_updated_at
  BEFORE UPDATE ON produktstatus
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE kunden            ENABLE ROW LEVEL SECURITY;
ALTER TABLE projekte          ENABLE ROW LEVEL SECURITY;
ALTER TABLE raeume            ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner           ENABLE ROW LEVEL SECURITY;
ALTER TABLE produkte          ENABLE ROW LEVEL SECURITY;
ALTER TABLE produktstatus     ENABLE ROW LEVEL SECURITY;
ALTER TABLE freigabe_tokens   ENABLE ROW LEVEL SECURITY;


-- ---- Admins (authentifizierte User) haben vollen Zugriff ----

CREATE POLICY "Admin: voller Zugriff" ON kunden
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin: voller Zugriff" ON projekte
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin: voller Zugriff" ON raeume
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin: voller Zugriff" ON partner
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin: voller Zugriff" ON produkte
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin: voller Zugriff" ON produktstatus
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin: voller Zugriff" ON freigabe_tokens
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ---- Freigabe-Link: Lesezugriff über gültigen Token ----
-- Der Server prüft den Token und liest Daten via service_role.
-- Anon-Zugriff bleibt gesperrt – Validierung läuft serverseitig.

-- Freigabe-Tokens: anon darf Token-Gültigkeit prüfen (nur lesen)
CREATE POLICY "Anon: Token prüfen" ON freigabe_tokens
  FOR SELECT TO anon
  USING (aktiv = TRUE AND (gueltig_bis IS NULL OR gueltig_bis > NOW()));


-- ============================================================
-- HINWEIS
-- ============================================================
-- Produkte.einkaufspreis, marge_prozent, provision_prozent und
-- notizen_intern werden im API-Layer (Server Action / Route Handler)
-- NIEMALS an die externe Kundenansicht übergeben.
-- Die Filterung erfolgt im Code, nicht nur über RLS.
-- ============================================================
