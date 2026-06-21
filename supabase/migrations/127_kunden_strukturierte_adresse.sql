-- 127 — Strukturierte Adresse am Kunden (Straße / PLZ / Ort)
--
-- Ziel: In der Kunden-Übersicht sollen Adressbestandteile einzeln kopierbar
-- sein (für den Bestellprozess). Bisher gab es nur ein einzelnes Freitextfeld
-- `kunden.adresse`. Wir ergänzen drei strukturierte, optionale Spalten.
--
-- WICHTIG / Backward-Compat:
--  - `kunden.adresse` bleibt erhalten und wird von der App weiterhin als
--    zusammengesetzter String gepflegt (Verträge {{kunde_adresse}}, PDF-Exporte
--    lesen weiter `adresse`). Diese Migration löscht/ändert KEINE Bestandsdaten.
--  - Kein automatischer Backfill der Bestandsadressen (Freitext ist zu uneinheitlich
--    für ein zuverlässiges Parsing). Bestandskunden zeigen weiter die Freitext-
--    Adresse, bis sie einmal über das Bearbeiten-Formular aufgeteilt werden.
--  - Additiv & idempotent (IF NOT EXISTS) — gefahrlos mehrfach ausführbar.

ALTER TABLE kunden
  ADD COLUMN IF NOT EXISTS strasse TEXT,
  ADD COLUMN IF NOT EXISTS plz     TEXT,
  ADD COLUMN IF NOT EXISTS ort     TEXT;

COMMENT ON COLUMN kunden.strasse IS 'Straße & Hausnummer (strukturierte Adresse, Migration 127)';
COMMENT ON COLUMN kunden.plz     IS 'Postleitzahl (strukturierte Adresse, Migration 127)';
COMMENT ON COLUMN kunden.ort     IS 'Ort/Stadt (strukturierte Adresse, Migration 127)';
