-- Migration 031: Produkt-Felder Erweiterung
-- Neue Felder für Lieferzeit, Maße, Material, Farbe, Artikelnummer,
-- Verfügbarkeit, Tags und mehrere Bilder (JSONB Array)

ALTER TABLE produkte
  ADD COLUMN IF NOT EXISTS lieferzeit      text,
  ADD COLUMN IF NOT EXISTS breite_cm       numeric(10,1),
  ADD COLUMN IF NOT EXISTS tiefe_cm        numeric(10,1),
  ADD COLUMN IF NOT EXISTS hoehe_cm        numeric(10,1),
  ADD COLUMN IF NOT EXISTS material        text,
  ADD COLUMN IF NOT EXISTS farbe           text,
  ADD COLUMN IF NOT EXISTS artikelnummer   text,
  ADD COLUMN IF NOT EXISTS verfuegbarkeit  text DEFAULT 'verfuegbar',
  ADD COLUMN IF NOT EXISTS tags            text[],
  ADD COLUMN IF NOT EXISTS bilder_urls     text[];
