-- ============================================================
-- Migration 056 · Kommunikation: SMS → Chat + neuer Typ Vor Ort
-- ============================================================

-- Bestehenden CHECK-Constraint droppen
ALTER TABLE kommunikation DROP CONSTRAINT IF EXISTS kommunikation_typ_check;

-- Alle alten 'sms'-Einträge auf 'chat' migrieren
UPDATE kommunikation SET typ = 'chat' WHERE typ = 'sms';

-- Neuen CHECK-Constraint mit 'chat' + 'vor_ort' setzen
ALTER TABLE kommunikation
  ADD CONSTRAINT kommunikation_typ_check
  CHECK (typ IN ('email','anruf','meeting','notiz','chat','vor_ort','sonstiges'));
