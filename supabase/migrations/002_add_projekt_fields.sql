-- Migration: Standort, Projektart und Gesamtbudget zu projekte hinzufügen
ALTER TABLE projekte ADD COLUMN IF NOT EXISTS standort     TEXT;
ALTER TABLE projekte ADD COLUMN IF NOT EXISTS projektart   TEXT;
ALTER TABLE projekte ADD COLUMN IF NOT EXISTS gesamtbudget NUMERIC(12,2);
