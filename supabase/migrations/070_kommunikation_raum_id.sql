-- ============================================================
-- Migration 070 · raum_id auf kommunikation
--
-- Kommunikations-Einträge können bisher nur auf Projekt-Ebene
-- geführt werden. Für raumbezogene Gespräche (z.B. "Kunde fragte
-- zum Bad nach Lieferzeit") fehlt der Raum-Kontext.
--
-- timeline_events hat raum_id bereits (Mig. 052).
-- ============================================================

ALTER TABLE kommunikation
  ADD COLUMN IF NOT EXISTS raum_id uuid REFERENCES raeume(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_kommunikation_raum
  ON kommunikation(raum_id)
  WHERE raum_id IS NOT NULL;

COMMENT ON COLUMN kommunikation.raum_id IS
  'Optional: Raum, auf den sich der Kommunikations-Eintrag bezieht. '
  'Wird gesetzt wenn das Gespräch raumspezifisch ist (z.B. Badplanung).';
