-- ============================================================
-- Migration 042 · Kunden-Kommunikationslog
-- ============================================================


-- ============================================================
-- 1. TABELLE: kommunikation
-- ============================================================

CREATE TABLE IF NOT EXISTS kommunikation (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  UUID        NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  kunde_id         UUID        NOT NULL REFERENCES kunden(id)         ON DELETE CASCADE,
  projekt_id       UUID                 REFERENCES projekte(id)       ON DELETE SET NULL,
  typ              TEXT        NOT NULL CHECK (typ IN ('email','anruf','meeting','notiz','sms','sonstiges')),
  richtung         TEXT                 CHECK (richtung IN ('eingehend','ausgehend')),
  betreff          TEXT,
  inhalt           TEXT,
  kontaktperson    TEXT,
  user_id          UUID                 REFERENCES auth.users(id),
  datum            TIMESTAMPTZ NOT NULL DEFAULT now(),
  dauer_minuten    INTEGER,
  follow_up_datum  DATE,
  erledigt         BOOLEAN     NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- 2. Indizes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_kommunikation_kunde_datum
  ON kommunikation(kunde_id, datum DESC);

CREATE INDEX IF NOT EXISTS idx_kommunikation_projekt
  ON kommunikation(projekt_id)
  WHERE projekt_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_kommunikation_org_followup
  ON kommunikation(organisation_id, follow_up_datum)
  WHERE follow_up_datum IS NOT NULL AND erledigt = false;


-- ============================================================
-- 3. RLS: nur eigene Org
-- ============================================================

ALTER TABLE kommunikation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kommunikation_org_access" ON kommunikation
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());
