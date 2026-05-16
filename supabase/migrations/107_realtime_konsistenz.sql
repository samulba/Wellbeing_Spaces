-- ============================================================
-- Migration 107 · Realtime-Publication fuer aufgaben_vorlagen + feedback
--
-- Konsistenz-Fix: aufgaben (Mig 102) und aufgaben_labels (Mig 103)
-- waren bereits zur supabase_realtime-Publication hinzugefuegt, aber
-- aufgaben_vorlagen (Mig 105) und feedback (Mig 106) nicht. Damit
-- bekommt die Aufgaben-Vorlagen-Liste keine Live-Updates wenn ein
-- anderer Team-User eine Vorlage anlegt, und die Super-Admin-Inbox
-- /super-admin/feedback braucht manuelles Reload um neues Feedback
-- zu sehen.
--
-- Idempotent: Pruefung via pg_publication_tables vor dem ALTER.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'aufgaben_vorlagen'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE aufgaben_vorlagen';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'feedback'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE feedback';
  END IF;
END
$$;
