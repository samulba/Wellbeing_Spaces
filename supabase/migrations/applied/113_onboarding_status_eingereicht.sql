-- ============================================================
-- Migration 113 · Neuer Onboarding-Status 'eingereicht'
--
-- Bisheriger Flow:
--   offen → in_bearbeitung → abgeschlossen
-- Problem: 'abgeschlossen' wurde sowohl gesetzt, wenn der Kunde
-- das Formular abschickt, als auch wenn der Admin den Kunden+
-- Projekt aus der Anfrage anlegt — kein Unterschied zwischen
-- 'eingereicht, wartet auf Admin' und 'fertig verarbeitet'.
--
-- Neuer Flow:
--   offen → in_bearbeitung → eingereicht → abgeschlossen
--
-- 'eingereicht' = Kunde hat abgeschickt, Admin muss noch
--                 'Als Kunde anlegen' klicken.
-- 'abgeschlossen' = Admin hat Kunde+Projekt angelegt.
--
-- Schritte:
--   1) CHECK-Constraint auf onboarding_anfragen.status erweitern
--   2) RLS-Policy fuer anonyme UPDATE-Aktion erweitern (Kunde
--      muss beim Absenden auf 'eingereicht' setzen koennen)
--   3) Backfill: alte 'abgeschlossen'-Eintraege ohne kunde_id
--      (= alte Submits, noch nicht verarbeitet) auf 'eingereicht'
--      umstellen, damit das Dashboard sie korrekt einsortiert.
-- ============================================================

-- 1. CHECK-Constraint neu setzen
DO $$
DECLARE
  v_name TEXT;
BEGIN
  SELECT conname INTO v_name
  FROM   pg_constraint
  WHERE  conrelid = 'public.onboarding_anfragen'::regclass
    AND  contype  = 'c'
    AND  conname  LIKE '%status%';
  IF v_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE onboarding_anfragen DROP CONSTRAINT IF EXISTS %I', v_name);
  END IF;
END $$;

ALTER TABLE onboarding_anfragen
  ADD CONSTRAINT onboarding_anfragen_status_check
  CHECK (status IN ('offen','in_bearbeitung','eingereicht','abgeschlossen','abgelehnt','abgelaufen'));

-- 2. RLS-Policy fuer anon UPDATE erweitern, damit der Kunde
--    beim Absenden status='eingereicht' setzen darf.
DROP POLICY IF EXISTS "public_anfragen_update" ON onboarding_anfragen;

CREATE POLICY "public_anfragen_update" ON onboarding_anfragen
  FOR UPDATE TO anon
  USING (status IN ('offen','in_bearbeitung'))
  WITH CHECK (status IN ('offen','in_bearbeitung','eingereicht','abgeschlossen'));

-- 3. Backfill: alte 'abgeschlossen'-Eintraege ohne kunde_id sind
--    in Wahrheit nur 'eingereicht' (Kunde hat abgeschickt, Admin
--    hat aber nie 'Als Kunde anlegen' geklickt).
UPDATE onboarding_anfragen
SET    status = 'eingereicht'
WHERE  status = 'abgeschlossen'
  AND  kunde_id IS NULL
  AND  antworten IS NOT NULL;
