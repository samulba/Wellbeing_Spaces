-- Migration 013: Partner – Logo-URL
ALTER TABLE partner
  ADD COLUMN IF NOT EXISTS logo_url TEXT;
