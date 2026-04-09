-- Migration: Adresse-Feld zu kunden hinzufügen
ALTER TABLE kunden ADD COLUMN IF NOT EXISTS adresse TEXT;
