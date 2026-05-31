-- ============================================================
-- Migration 116 · Produkt-Bereiche (UI: "Gruppe")
--
-- Neue Organisations-Ebene OBERHALB der produkt_gruppen. Ein
-- "Bereich" (UI-Label "Gruppe", z.B. "Lounge-Ecke", "Lichtplanung")
-- buendelt mehrere Auswahl-Bloecke (produkt_gruppen) + Einzelprodukte
-- innerhalb eines Raums. Dadurch sind MEHRERE Empfehlungen pro
-- "Gruppe" moeglich (= mehrere Bloecke, je 1 Favorit).
--
-- Komplett ADDITIV. Die Favoriten-/Freigabe-Logik (Mig 114) bleibt
-- unveraendert auf produkt_gruppe-Ebene ("1 von N" pro Block). Ein
-- Bereich ist ein reiner organisatorischer Eltern-Container.
--
-- 1) produkt_bereiche            — Abschnitt VON Bloecken/Produkten je Raum.
-- 2) produkt_gruppen.bereich_id  — Block -> Bereich.
-- 3) raum_produkte.bereich_id    — Einzelprodukt -> Bereich (bei Produkten
--    IN einem Block ignoriert; deren Bereich kommt vom Block).
-- 4) freigabe_tokens.scope_bereich_ids — Scope "auswahl" kann ganze
--    Bereiche umfassen (dynamisch zur Ladezeit aufgeloest).
-- ============================================================

-- ── 1) produkt_bereiche ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS produkt_bereiche (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  raum_id         UUID NOT NULL REFERENCES raeume(id)         ON DELETE CASCADE,
  name            TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  beschreibung    TEXT,
  farbe           TEXT,                       -- optionaler HEX-Akzent, NULL = neutral
  reihenfolge     INTEGER NOT NULL DEFAULT 0,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_produkt_bereiche_raum
  ON produkt_bereiche(raum_id, reihenfolge) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_produkt_bereiche_org
  ON produkt_bereiche(organisation_id);

-- updated_at-Trigger
CREATE OR REPLACE FUNCTION produkt_bereiche_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS produkt_bereiche_updated_at ON produkt_bereiche;
CREATE TRIGGER produkt_bereiche_updated_at
  BEFORE UPDATE ON produkt_bereiche
  FOR EACH ROW EXECUTE FUNCTION produkt_bereiche_set_updated_at();

ALTER TABLE produkt_bereiche ENABLE ROW LEVEL SECURITY;

CREATE POLICY "produkt_bereiche_org_access" ON produkt_bereiche
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());


-- ── 2) produkt_gruppen: Bereich-Zuordnung (Block -> Bereich) ────
ALTER TABLE produkt_gruppen
  ADD COLUMN IF NOT EXISTS bereich_id UUID REFERENCES produkt_bereiche(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_produkt_gruppen_bereich
  ON produkt_gruppen(bereich_id) WHERE bereich_id IS NOT NULL;


-- ── 3) raum_produkte: Bereich-Zuordnung (Einzelprodukt -> Bereich) ──
ALTER TABLE raum_produkte
  ADD COLUMN IF NOT EXISTS bereich_id UUID REFERENCES produkt_bereiche(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_raum_produkte_bereich
  ON raum_produkte(bereich_id) WHERE bereich_id IS NOT NULL;


-- ── 4) freigabe_tokens: Scope "auswahl" kann ganze Bereiche umfassen ──
ALTER TABLE freigabe_tokens
  ADD COLUMN IF NOT EXISTS scope_bereich_ids UUID[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN freigabe_tokens.scope_bereich_ids IS
  'Bei scope_typ=auswahl: zusaetzlich ganze Bereiche (produkt_bereiche.id). Produkte werden zur Ladezeit dynamisch aufgeloest (Union mit scope_ids).';


-- ── 5) Realtime-Publication ────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'produkt_bereiche'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE produkt_bereiche';
  END IF;
END
$$;
