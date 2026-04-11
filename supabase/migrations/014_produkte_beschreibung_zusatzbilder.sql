-- Migration 014: Produkte – Kundenbeschreibung und Zusatzbilder
ALTER TABLE produkte
  ADD COLUMN IF NOT EXISTS beschreibung_kunde TEXT,
  ADD COLUMN IF NOT EXISTS zusatz_bilder      TEXT[];
