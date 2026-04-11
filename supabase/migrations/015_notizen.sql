-- Migration 015: Notizen-System (Kunden, Projekte, Partner)
CREATE TABLE IF NOT EXISTS notizen (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  typ          TEXT         NOT NULL CHECK (typ IN ('kunde', 'projekt', 'partner')),
  referenz_id  UUID         NOT NULL,
  inhalt       TEXT         NOT NULL,
  erstellt_von TEXT,
  erstellt_am  TIMESTAMPTZ  DEFAULT NOW(),
  bearbeitet_am TIMESTAMPTZ DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS notizen_referenz_idx ON notizen(typ, referenz_id) WHERE deleted_at IS NULL;

-- RLS aktivieren
ALTER TABLE notizen ENABLE ROW LEVEL SECURITY;

-- Policy: eingeloggte User dürfen alles lesen und schreiben
CREATE POLICY "notizen_authenticated_all" ON notizen
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
