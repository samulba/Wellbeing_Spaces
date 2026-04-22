-- ============================================================
-- Migration 078 · Timeline: Spalten-Sanity + Schema-Cache-Reload
--
-- Stellt sicher, dass alle Felder, die der Code auf timeline_events
-- verwendet, auch wirklich existieren — idempotent. Nötig weil sich
-- manche Installationen den Fehler
--   "Could not find the 'abhaengig_von' column of 'timeline_events'
--    in the schema cache"
-- fangen — meist weil PostgREST eine alte Cache-Version hält.
--
-- NOTIFY pgrst am Ende triggert den Cache-Reload.
-- ============================================================

ALTER TABLE timeline_events
  ADD COLUMN IF NOT EXISTS abhaengig_von   uuid[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS erinnerung_tage integer,
  ADD COLUMN IF NOT EXISTS verantwortlich  text,
  ADD COLUMN IF NOT EXISTS farbe           text,
  ADD COLUMN IF NOT EXISTS kunde_sichtbar  boolean NOT NULL DEFAULT true;

NOTIFY pgrst, 'reload schema';
