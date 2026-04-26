-- ============================================================
-- Migration 098 · Moodboard Freigabe-Schutz
--
-- Erweitert die Freigabe-Funktion um:
--  - optionales Passwort (bcrypt-gehashed serverseitig)
--  - optionales Ablaufdatum
--
-- Anon-Policies pruefen Ablauf serverseitig (in der App-Action),
-- da bcrypt-Vergleich in RLS nicht praktikabel ist.
-- ============================================================

ALTER TABLE moodboards
  ADD COLUMN IF NOT EXISTS freigabe_passwort_hash TEXT,
  ADD COLUMN IF NOT EXISTS freigabe_ablauf TIMESTAMPTZ;

-- Anon-SELECT-Policy NICHT veraendern: wir lassen weiter freigabe_aktiv=true zu,
-- prufen Passwort + Ablauf in der Server-Action (getMoodboardOeffentlich).
-- Das vermeidet bcrypt im RLS-Check und ist ausreichend, da die Action
-- ohnehin der einzige Weg ist, das Board oeffentlich zu lesen.

-- Index fuer schnelle Ablauf-Cleanup-Jobs (optional, hinten dran)
CREATE INDEX IF NOT EXISTS idx_moodboards_freigabe_ablauf
  ON moodboards(freigabe_ablauf) WHERE freigabe_aktiv = true AND freigabe_ablauf IS NOT NULL;
