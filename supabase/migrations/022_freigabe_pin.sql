-- PIN-Schutz für Freigabelinks
-- Wenn NULL = kein PIN, wenn gesetzt = Kunde muss PIN eingeben
ALTER TABLE projekte
  ADD COLUMN IF NOT EXISTS freigabe_pin text DEFAULT NULL;
