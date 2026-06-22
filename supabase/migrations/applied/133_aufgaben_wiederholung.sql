-- Migration 133: Wiederkehrende Aufgaben
-- Additiv: eine Wiederholungs-Spalte auf aufgaben. NULL = einmalige Aufgabe.
-- Beim Erledigen einer wiederkehrenden Aufgabe erzeugt der Server die nächste
-- Instanz mit vorgerücktem Fälligkeitsdatum (Hand-off-Modell in
-- src/app/actions/aufgaben.ts → wiederholungSpawnen).

ALTER TABLE aufgaben
  ADD COLUMN IF NOT EXISTS wiederholung TEXT
  CHECK (wiederholung IN ('taeglich', 'woechentlich', 'monatlich'));

COMMENT ON COLUMN aufgaben.wiederholung IS
  'Wiederholung: taeglich/woechentlich/monatlich. NULL = einmalig. Hand-off beim Erledigen.';
