-- ============================================================
-- Migration 106 · Feedback-System
--
-- Nutzer (Org-User + Kunden ueber Portal) reichen Feedback ein:
-- Bugs, Features, Fragen, Lob. Super-Admins (App-Owner via
-- ENV-Whitelist) sehen alle Feedback-Eintraege org-uebergreifend
-- und triagieren sie.
-- ============================================================

CREATE TABLE IF NOT EXISTS feedback (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES organisationen(id) ON DELETE SET NULL,
  user_id         UUID REFERENCES auth.users(id)     ON DELETE SET NULL,
  user_email      TEXT,
  user_name       TEXT,

  -- Inhalt
  typ             TEXT NOT NULL CHECK (typ IN (
    'bug', 'feature', 'frage', 'lob', 'sonstiges'
  )),
  titel           TEXT NOT NULL CHECK (length(titel) BETWEEN 1 AND 200),
  beschreibung    TEXT NOT NULL CHECK (length(beschreibung) BETWEEN 1 AND 8000),

  -- Kontext (auto-erfasst beim Submit)
  url             TEXT,
  user_agent      TEXT,
  /* Storage-Pfad zum Screenshot (Bucket: feedback-screenshots) */
  screenshot_url  TEXT,

  -- Triage (nur Super-Admin schreibt das)
  status          TEXT NOT NULL DEFAULT 'neu' CHECK (status IN (
    'neu', 'in_arbeit', 'erledigt', 'abgelehnt', 'duplikat'
  )),
  prioritaet      TEXT NOT NULL DEFAULT 'normal' CHECK (prioritaet IN (
    'niedrig', 'normal', 'hoch', 'kritisch'
  )),
  interne_notiz   TEXT,
  /* Verknuepfung zu einer Aufgabe in Samuels persoenlichem Kanban */
  aufgabe_id      UUID REFERENCES aufgaben(id) ON DELETE SET NULL,

  -- Antwort an User
  antwort         TEXT,
  beantwortet_am  TIMESTAMPTZ,
  beantwortet_von UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_status_created
  ON feedback(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_user
  ON feedback(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_org
  ON feedback(organisation_id) WHERE organisation_id IS NOT NULL;

-- updated_at-Trigger
CREATE OR REPLACE FUNCTION feedback_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS feedback_updated_at ON feedback;
CREATE TRIGGER feedback_updated_at
  BEFORE UPDATE ON feedback
  FOR EACH ROW EXECUTE FUNCTION feedback_set_updated_at();

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- User sieht nur eigene Eintraege; Erstellen darf jeder eingeloggte User.
-- Super-Admin umgeht RLS via createAdminClient() im Server-Code.
CREATE POLICY "feedback_eigene" ON feedback
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "feedback_insert_eigene" ON feedback
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Updates duerfen nur Super-Admins (per Admin-Client) — keine Policy fuer
-- authenticated UPDATE noetig, RLS blockt das automatisch.

-- Storage-Bucket fuer Screenshots
INSERT INTO storage.buckets (id, name, public, file_size_limit)
  VALUES ('feedback-screenshots', 'feedback-screenshots', false, 10485760)  -- 10 MB
  ON CONFLICT (id) DO NOTHING;

-- Storage-Policies: jeder authentifizierte User darf eigene Screenshots
-- hochladen + lesen. Pfad-Convention: <user_id>/<random>.<ext>
CREATE POLICY "feedback_screenshots_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'feedback-screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "feedback_screenshots_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'feedback-screenshots'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
