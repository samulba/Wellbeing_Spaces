-- Migration: Kategorie zu produkte hinzufügen
ALTER TABLE produkte ADD COLUMN IF NOT EXISTS kategorie TEXT;
