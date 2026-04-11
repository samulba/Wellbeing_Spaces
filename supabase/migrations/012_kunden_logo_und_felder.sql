-- Migration 012: Kunden – Logo, Beitrittsdatum, Gesamtumsatz
ALTER TABLE kunden
  ADD COLUMN IF NOT EXISTS logo_url          TEXT,
  ADD COLUMN IF NOT EXISTS beitrittsdatum    DATE,
  ADD COLUMN IF NOT EXISTS umsatz_gesamt     NUMERIC(12,2) DEFAULT 0;
