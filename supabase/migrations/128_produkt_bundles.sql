-- ============================================================
-- Migration 128 · Produkt-Bundles / Sets
--
-- Ein "Set/Bundle" ist ein Bibliotheksprodukt (ist_bundle=true), das
-- mehrere normale Produkte als Komponenten (mit Mengen) buendelt.
-- Beim Hinzufuegen zu einem Raum wird es in einzelne raum_produkte-
-- Komponentenzeilen "explodiert", gruppiert via raum_produkte.bundle_id.
--
-- VOLLSTAENDIG ADDITIV. Keine Aenderung an bestehenden Spalten/Daten.
-- Der Set-Preis im Raum wird ueber die BESTEHENDE Spalte
-- raum_produkte.rabatt_prozent realisiert → Kalkulation/CSV/PDF
-- funktionieren ohne jede Aenderung.
-- ============================================================

-- ── 1) produkte: Bundle-Kopf-Felder ────────────────────────────
ALTER TABLE produkte
  ADD COLUMN IF NOT EXISTS ist_bundle            BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bundle_preis_modus    TEXT
    CHECK (bundle_preis_modus IN ('summe','rabatt','festpreis')),
  ADD COLUMN IF NOT EXISTS bundle_rabatt_prozent NUMERIC,
  ADD COLUMN IF NOT EXISTS bundle_festpreis      NUMERIC;

CREATE INDEX IF NOT EXISTS idx_produkte_ist_bundle
  ON produkte(ist_bundle) WHERE ist_bundle = true;

-- ── 2) bundle_komponenten: Bundle → Komponenten (Mengen) ───────
CREATE TABLE IF NOT EXISTS bundle_komponenten (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id       UUID NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  bundle_id             UUID NOT NULL REFERENCES produkte(id)        ON DELETE CASCADE,
  komponente_produkt_id UUID NOT NULL REFERENCES produkte(id)        ON DELETE CASCADE,
  menge                 NUMERIC NOT NULL DEFAULT 1 CHECK (menge > 0),
  reihenfolge           INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bundle_id, komponente_produkt_id)
);

CREATE INDEX IF NOT EXISTS idx_bundle_komp_bundle     ON bundle_komponenten(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_komp_komponente ON bundle_komponenten(komponente_produkt_id);
CREATE INDEX IF NOT EXISTS idx_bundle_komp_org        ON bundle_komponenten(organisation_id);

ALTER TABLE bundle_komponenten ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bundle_komponenten_org_access" ON bundle_komponenten;
CREATE POLICY "bundle_komponenten_org_access" ON bundle_komponenten
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());

-- ── 3) raum_produkte: Set-Instanz-Gruppierungsschluessel ───────
-- bundle_id = produkte.id des Bundle-Kopfes. Markiert eine Zeile als
-- Komponente einer Set-Instanz in diesem Raum. ON DELETE SET NULL
-- (analog Varianten-eltern_produkt_id): wird der Bundle-Kopf hart
-- geloescht, bleiben bereits explodierte Komponenten als normale Zeilen.
ALTER TABLE raum_produkte
  ADD COLUMN IF NOT EXISTS bundle_id UUID REFERENCES produkte(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_raum_produkte_bundle
  ON raum_produkte(bundle_id) WHERE bundle_id IS NOT NULL;
