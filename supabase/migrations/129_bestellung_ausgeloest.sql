-- ============================================================
-- Migration 129 · Einmalige Bestell-Glückwunsch-Markierung
--
-- Gate für die "Glückwunsch, Ihre Bestellung wurde ausgelöst"-
-- Celebration: füllt sich beim ERSTEN ausgelösten Lieferanten-Auftrag
-- pro Projekt. Folgebestellungen aktualisieren nur die Lieferübersicht.
-- Rein additiv, idempotent.
-- ============================================================

ALTER TABLE projekte
  ADD COLUMN IF NOT EXISTS bestellung_ausgeloest_am TIMESTAMPTZ;

COMMENT ON COLUMN projekte.bestellung_ausgeloest_am IS
  'Zeitpunkt der ersten ausgelösten Lieferanten-Bestellung in diesem Projekt. '
  'NULL = noch nie ausgelöst. Steuert die einmalige Kunden-Celebration.';
