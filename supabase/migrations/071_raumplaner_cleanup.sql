-- ============================================================
-- Migration 071 · Raumplaner-Cleanup
--
-- Entfernt zwei Feature-Tabellen des Raumplaners, die im Zuge der
-- Reduktion auf Basics abgebaut werden:
--
--   - raumplan_versionen  (Mig. 049): Versionen + Vergleichs-Ansicht
--     entfallen; Auto-Save genügt.
--   - custom_moebel       (Mig. 046): Custom-Möbel-Editor entfällt;
--     die 19 System-Symbole + 60 aus Mig. 048 decken den Bedarf.
--
-- CASCADE löscht auch Trigger (`trg_custom_moebel_updated_at`) und
-- zugehörige Funktion (`update_custom_moebel_updated_at`).
-- ============================================================

DROP TRIGGER  IF EXISTS trg_custom_moebel_updated_at   ON custom_moebel;
DROP FUNCTION IF EXISTS update_custom_moebel_updated_at();

DROP TABLE IF EXISTS raumplan_versionen CASCADE;
DROP TABLE IF EXISTS custom_moebel      CASCADE;
