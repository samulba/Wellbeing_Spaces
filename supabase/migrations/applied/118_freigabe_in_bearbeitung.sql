-- ============================================================
-- Migration 118 · Freigabe „In Bearbeitung"-Signal
--
-- Der Kunden-Freigabe-Link arbeitet ab jetzt mit lokalem Entwurf +
-- finalem Sammel-Absenden. Damit das Team trotzdem sieht, dass ein Link
-- gerade bearbeitet wird (bevor abgesendet wurde), bekommt der Token
-- einen Zeitstempel, der beim ersten Entscheidungs-Klick gesetzt wird.
--
-- Rein additiv, fail-safe: fehlt die Spalte, bleibt das Verhalten wie bisher
-- (kein „In Bearbeitung"-Badge), der restliche Flow funktioniert unverändert.
-- ============================================================

ALTER TABLE freigabe_tokens
  ADD COLUMN IF NOT EXISTS bearbeitung_begonnen_am TIMESTAMPTZ;

COMMENT ON COLUMN freigabe_tokens.bearbeitung_begonnen_am IS
  'Zeitpunkt der ersten Kunden-Entscheidung im Link (Entwurf). Solange gesetzt + abgeschlossen_am NULL = „In Bearbeitung".';
