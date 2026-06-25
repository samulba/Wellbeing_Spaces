-- Migration 136: Optionale Begleit-Nachricht des Admins am Freigabe-Link
-- Additiv & idempotent. Erlaubt es, beim Erstellen (oder nachträglich) eine kurze
-- Nachricht an den Kunden zu hinterlegen (wie eine Bemerkung in einer E-Mail), die
-- der Kunde oben im Freigabe-Link sieht. NULL = keine Nachricht.
-- Nicht-destruktiv: nur eine neue, nullable Spalte. Bis zum Einspielen degradiert
-- der Code fail-safe (Link-Erstellung, Kundenseite, Admin-Liste laufen ohne die Spalte).

ALTER TABLE freigabe_tokens ADD COLUMN IF NOT EXISTS begleit_nachricht TEXT;

COMMENT ON COLUMN freigabe_tokens.begleit_nachricht IS
  'Optionale Nachricht des Admins an den Kunden, angezeigt oben im Freigabe-Link. NULL = keine.';
