-- ============================================================
-- Migration 083 · Timeline: Freigabe-Quelle hinzufügen
--
-- Erlaubt in timeline_events.quelle den Wert 'freigabe' — damit
-- können Pflicht-Abschluss-Ereignisse als Auto-Event in der
-- Projekt-Timeline landen (kunde_sichtbar=false, rein intern).
-- ============================================================

ALTER TABLE timeline_events
  DROP CONSTRAINT IF EXISTS timeline_events_quelle_check;

ALTER TABLE timeline_events
  ADD CONSTRAINT timeline_events_quelle_check
  CHECK (quelle IN ('manuell','produkt','bestellstatus','deadline','angebot','vertrag','freigabe'));

COMMENT ON COLUMN timeline_events.quelle IS
  'Quelle des Events: manuell oder auto-synchronisiert aus Produkt/Bestellstatus/Deadline/Angebot/Vertrag/Freigabe.';
