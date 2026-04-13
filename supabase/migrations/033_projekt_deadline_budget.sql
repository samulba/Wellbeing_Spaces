-- Migration 033: Projekt Deadline + Verantwortlicher, Raum Budget, Aktivitäten

ALTER TABLE projekte
  ADD COLUMN IF NOT EXISTS deadline DATE,
  ADD COLUMN IF NOT EXISTS verantwortlicher_id UUID REFERENCES auth.users(id);

ALTER TABLE raeume
  ADD COLUMN IF NOT EXISTS budget NUMERIC(12,2);

CREATE TABLE IF NOT EXISTS projekt_aktivitaeten (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  projekt_id  UUID        NOT NULL REFERENCES projekte(id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES auth.users(id),
  typ         TEXT        NOT NULL,
  beschreibung TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projekt_aktivitaeten_projekt_id
  ON projekt_aktivitaeten(projekt_id);

CREATE INDEX IF NOT EXISTS idx_projekt_aktivitaeten_created_at
  ON projekt_aktivitaeten(created_at DESC);
