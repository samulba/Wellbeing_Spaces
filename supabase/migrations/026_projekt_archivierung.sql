-- Archivierungs-Felder für Projekte
ALTER TABLE projekte
  ADD COLUMN IF NOT EXISTS archiviert    boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archiviert_am timestamptz;

-- Index für schnelleres Filtern aktiver Projekte
CREATE INDEX IF NOT EXISTS projekte_archiviert_idx ON projekte (archiviert) WHERE archiviert = false;
