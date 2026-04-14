-- Migration 050: Raumplan-Etagen (Stockwerke pro Raum)
-- Erstellt: 2026-04-14

CREATE TABLE IF NOT EXISTS raumplan_etagen (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raum_id          UUID NOT NULL REFERENCES raeume(id) ON DELETE CASCADE,
  organisation_id  UUID REFERENCES organisationen(id),
  name             TEXT NOT NULL DEFAULT 'Erdgeschoss',
  etage_nummer     INTEGER DEFAULT 0,
  grundriss_json   JSONB DEFAULT '{}',
  hoehe_m          DECIMAL(4,2) DEFAULT 2.5,
  sortierung       INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raumplan_etagen_raum ON raumplan_etagen(raum_id);
CREATE INDEX IF NOT EXISTS idx_raumplan_etagen_org  ON raumplan_etagen(organisation_id);

ALTER TABLE raumplan_etagen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org-Mitglieder verwalten Etagen" ON raumplan_etagen
  FOR ALL USING (
    organisation_id = get_user_org_id()
    OR organisation_id IS NULL
  );
