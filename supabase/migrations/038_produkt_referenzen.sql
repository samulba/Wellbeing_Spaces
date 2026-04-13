-- ============================================================
-- Migration 038 · Produkt-Referenz-System (raum_produkte)
-- Produkte existieren einmal in der Bibliothek (raum_id = NULL)
-- und werden per Zwischentabelle n:m in Räume verlinkt.
-- ============================================================


-- ============================================================
-- 1. TABELLE: raum_produkte
-- ============================================================

CREATE TABLE IF NOT EXISTS raum_produkte (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id       UUID        NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  raum_id               UUID        NOT NULL REFERENCES raeume(id)         ON DELETE CASCADE,
  produkt_id            UUID        NOT NULL REFERENCES produkte(id)        ON DELETE CASCADE,
  menge                 NUMERIC(10,2) NOT NULL DEFAULT 1,
  verkaufspreis_override NUMERIC(10,2),          -- NULL = Preis vom Produkt
  reihenfolge           INTEGER     NOT NULL DEFAULT 0,
  notizen               TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (raum_id, produkt_id)
);


-- ============================================================
-- 2. INDIZES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_raum_produkte_raum    ON raum_produkte(raum_id);
CREATE INDEX IF NOT EXISTS idx_raum_produkte_produkt ON raum_produkte(produkt_id);


-- ============================================================
-- 3. RLS: nur eigene Org
-- ============================================================

ALTER TABLE raum_produkte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "raum_produkte_org_access" ON raum_produkte
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());


-- ============================================================
-- 4. DATENMIGRATION: bestehende produkte.raum_id → raum_produkte
--    Nur für Produkte die NICHT gelöscht sind und eine raum_id haben.
-- ============================================================

INSERT INTO raum_produkte (
  organisation_id, raum_id, produkt_id, menge, reihenfolge, created_at
)
SELECT
  p.organisation_id,
  p.raum_id,
  p.id,
  COALESCE(p.menge, 1),
  COALESCE(p.reihenfolge, 0),
  p.created_at
FROM produkte p
WHERE p.raum_id        IS NOT NULL
  AND p.deleted_at     IS NULL
  AND p.organisation_id IS NOT NULL
ON CONFLICT (raum_id, produkt_id) DO NOTHING;
