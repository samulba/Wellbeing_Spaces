-- ============================================================
-- Migration 114 · Freigabe-Gruppen + Favorit/Alternative
--
-- Zwei neue Gruppierungs-Ebenen + Favoriten-Markierung. Komplett
-- additiv, keine Aenderung an bestehenden Spalten oder Daten:
--
-- 1) raum_gruppen     — benannte Gruppen VON Raeumen (Projekt-Ebene),
--    rein fuer eine kompaktere Uebersicht/Navigation (z.B. "EG", "OG").
--
-- 2) produkt_gruppen  — Auswahl-Sets VON Produkten innerhalb eines
--    Raums (z.B. "Sofa-Auswahl" mit mehreren Alternativen). Genau ein
--    Favorit pro Gruppe.
--
-- 3) raeume.raum_gruppe_id — Zuordnung Raum -> Raum-Gruppe.
--
-- 4) raum_produkte.produkt_gruppe_id + admin_favorit + kunde_favorit —
--    Zuordnung Produkt -> Auswahl-Set + zwei Favoriten-Flags. Der
--    Kunden-Favorit ist gleichzeitig die Freigabe (Kopplung erfolgt in
--    der Server-Action, nicht im Schema). Favoriten als Booleans auf
--    raum_produkte (triviales Row-Rendering, Praezedenz custom_moebel.
--    ist_favorit Mig 046); "genau ein Favorit pro Gruppe" wird durch
--    partielle Unique-Indizes abgesichert, der Setter raeumt Geschwister
--    zuerst (clear-before-set).
--
-- Beide neuen Tabellen sind org-scoped mit RLS, haben Realtime-
-- Publication und nutzen organisationen(id) als FK.
-- raum_produkte ist bereits in der Realtime-Publication — die neuen
-- Spalten werden automatisch mitgetragen.
-- ============================================================

-- ── 1) raum_gruppen ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS raum_gruppen (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  projekt_id      UUID NOT NULL REFERENCES projekte(id)       ON DELETE CASCADE,
  name            TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  farbe           TEXT,                       -- optionaler HEX-Akzent, NULL = neutral
  reihenfolge     INTEGER NOT NULL DEFAULT 0,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_raum_gruppen_projekt
  ON raum_gruppen(projekt_id, reihenfolge) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_raum_gruppen_org
  ON raum_gruppen(organisation_id);

-- updated_at-Trigger
CREATE OR REPLACE FUNCTION raum_gruppen_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS raum_gruppen_updated_at ON raum_gruppen;
CREATE TRIGGER raum_gruppen_updated_at
  BEFORE UPDATE ON raum_gruppen
  FOR EACH ROW EXECUTE FUNCTION raum_gruppen_set_updated_at();

ALTER TABLE raum_gruppen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "raum_gruppen_org_access" ON raum_gruppen
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());


-- ── 2) produkt_gruppen ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS produkt_gruppen (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  raum_id         UUID NOT NULL REFERENCES raeume(id)         ON DELETE CASCADE,
  name            TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  beschreibung    TEXT,
  -- auswahl_modus: 'einzel' = genau ein Favorit (Default, aktuell einziger
  -- Modus). Feld reserviert fuer spaetere Mehrfach-Auswahl.
  auswahl_modus   TEXT NOT NULL DEFAULT 'einzel' CHECK (auswahl_modus IN ('einzel')),
  reihenfolge     INTEGER NOT NULL DEFAULT 0,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_produkt_gruppen_raum
  ON produkt_gruppen(raum_id, reihenfolge) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_produkt_gruppen_org
  ON produkt_gruppen(organisation_id);

-- updated_at-Trigger
CREATE OR REPLACE FUNCTION produkt_gruppen_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS produkt_gruppen_updated_at ON produkt_gruppen;
CREATE TRIGGER produkt_gruppen_updated_at
  BEFORE UPDATE ON produkt_gruppen
  FOR EACH ROW EXECUTE FUNCTION produkt_gruppen_set_updated_at();

ALTER TABLE produkt_gruppen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "produkt_gruppen_org_access" ON produkt_gruppen
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());


-- ── 3) raeume: Raum-Gruppen-Zuordnung ──────────────────────────
ALTER TABLE raeume
  ADD COLUMN IF NOT EXISTS raum_gruppe_id UUID REFERENCES raum_gruppen(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_raeume_raum_gruppe
  ON raeume(raum_gruppe_id) WHERE raum_gruppe_id IS NOT NULL;


-- ── 4) raum_produkte: Produkt-Gruppe + Favoriten ───────────────
ALTER TABLE raum_produkte
  ADD COLUMN IF NOT EXISTS produkt_gruppe_id UUID REFERENCES produkt_gruppen(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_favorit BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kunde_favorit BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_raum_produkte_produkt_gruppe
  ON raum_produkte(produkt_gruppe_id) WHERE produkt_gruppe_id IS NOT NULL;

-- "genau ein Favorit pro Gruppe" (defensiv; Setter raeumt Geschwister
-- zuerst, sonst transiente Kollision beim zweiten UPDATE).
CREATE UNIQUE INDEX IF NOT EXISTS idx_rp_admin_favorit_one_per_gruppe
  ON raum_produkte (produkt_gruppe_id)
  WHERE admin_favorit = true AND produkt_gruppe_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_rp_kunde_favorit_one_per_gruppe
  ON raum_produkte (produkt_gruppe_id)
  WHERE kunde_favorit = true AND produkt_gruppe_id IS NOT NULL;


-- ── 5) Realtime-Publication ────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'raum_gruppen'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE raum_gruppen';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'produkt_gruppen'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE produkt_gruppen';
  END IF;
END
$$;
