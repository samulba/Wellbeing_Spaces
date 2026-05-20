-- ============================================================
-- Migration 110 · Kunden-Anlage: Kundenname + Firmenname getrennt
--
-- Bisher hatte die kunden-Tabelle nur ein Feld `name`, das implizit als
-- Firmenname genutzt wurde. Wir erweitern additiv um zwei neue Spalten:
--
--   firmenname TEXT (nullable)
--   kunden_typ TEXT NOT NULL DEFAULT 'firma'
--     CHECK in ('privat', 'firma', 'beide')
--
-- Bestehende Daten bleiben unangetastet — Backfill setzt
--   firmenname = name
--   kunden_typ = 'firma'
-- damit bisherige Firmenkunden weiterhin korrekt angezeigt werden.
-- ============================================================

ALTER TABLE kunden
  ADD COLUMN IF NOT EXISTS firmenname TEXT;

-- DEFAULT NICHT setzen, damit kein implicit-Locking auf alten Zeilen passiert.
-- Wir adden nullable, backfillen, dann setzen wir NOT NULL + DEFAULT.
ALTER TABLE kunden
  ADD COLUMN IF NOT EXISTS kunden_typ TEXT;

-- Backfill: firmenname aus name uebernehmen wo NULL.
UPDATE kunden
SET firmenname = name
WHERE firmenname IS NULL AND name IS NOT NULL;

-- Backfill: kunden_typ = 'firma' fuer Bestand (war implizite Annahme).
UPDATE kunden
SET kunden_typ = 'firma'
WHERE kunden_typ IS NULL;

-- Jetzt NOT NULL + Default + Check setzen.
ALTER TABLE kunden
  ALTER COLUMN kunden_typ SET DEFAULT 'firma';
ALTER TABLE kunden
  ALTER COLUMN kunden_typ SET NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'kunden' AND column_name = 'kunden_typ'
      AND constraint_name = 'kunden_typ_check'
  ) THEN
    ALTER TABLE kunden
      ADD CONSTRAINT kunden_typ_check
        CHECK (kunden_typ IN ('privat', 'firma', 'beide'));
  END IF;
END $$;
