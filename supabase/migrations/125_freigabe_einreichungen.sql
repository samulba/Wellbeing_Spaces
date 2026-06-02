-- 125 — Unveränderlicher Einreichungs-Beleg pro abgesendeter Freigabe
--
-- Sendet ein Kunde eine Freigabe ab, wird hier ein EINGEFRORENER Snapshot aller
-- Entscheidungen gespeichert (wer, wann, was — inkl. Produktnamen, Status,
-- Kommentaren, gewählter Alternative, Menge, Preis). Unabhängig von späteren
-- Änderungen an den live raum_produkte → späterer Nachweis bleibt erhalten.
--
-- Append-only (wie freigabe_audit): nur SELECT + INSERT, KEIN UPDATE/DELETE →
-- der Beleg ist unveränderlich. Mehrere Einreichungen je Projekt = Freigabe 1/2/3
-- (lfd_nr).

CREATE TABLE IF NOT EXISTS freigabe_einreichungen (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id       UUID NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  projekt_id            UUID NOT NULL REFERENCES projekte(id)       ON DELETE CASCADE,
  freigabe_token_id     UUID REFERENCES freigabe_tokens(id)         ON DELETE SET NULL,
  lfd_nr                INTEGER     NOT NULL DEFAULT 1,            -- Freigabe 1/2/3 je Projekt
  unterzeichner_name    TEXT        NOT NULL,
  abgesendet_am         TIMESTAMPTZ NOT NULL DEFAULT now(),
  allgemeiner_kommentar TEXT,
  scope_typ             TEXT,
  scope_ids             UUID[]      NOT NULL DEFAULT '{}',
  scope_bereich_ids     UUID[]      NOT NULL DEFAULT '{}',
  positionen            JSONB       NOT NULL DEFAULT '[]'::jsonb,  -- eingefrorene Positions-Snapshots
  summen                JSONB       NOT NULL DEFAULT '{}'::jsonb,  -- Zähler + Summen
  content_hash          TEXT,                                     -- SHA-256 der Positionen (Manipulationsschutz)
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_freigabe_einreichungen_projekt
  ON freigabe_einreichungen(projekt_id, abgesendet_am DESC);
CREATE INDEX IF NOT EXISTS idx_freigabe_einreichungen_token
  ON freigabe_einreichungen(freigabe_token_id);

ALTER TABLE freigabe_einreichungen ENABLE ROW LEVEL SECURITY;

-- Append-only: SELECT + INSERT (org-scoped), KEIN UPDATE/DELETE.
DROP POLICY IF EXISTS "freigabe_einreichungen_select" ON freigabe_einreichungen;
CREATE POLICY "freigabe_einreichungen_select" ON freigabe_einreichungen
  FOR SELECT TO authenticated
  USING (organisation_id = get_user_org_id());

DROP POLICY IF EXISTS "freigabe_einreichungen_insert" ON freigabe_einreichungen;
CREATE POLICY "freigabe_einreichungen_insert" ON freigabe_einreichungen
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_user_org_id());
