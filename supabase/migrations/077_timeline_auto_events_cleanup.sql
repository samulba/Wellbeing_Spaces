-- ============================================================
-- Migration 077 · Alte Auto-Events aus Migration 075 löschen
--
-- Seit Migration 076 haben Bestellstatus/Liefertermin per raum_produkte
-- eigene Status. Der Timeline-Auto-Sync nutzt ab dem dazugehörigen
-- Code-Release raum_produkte.id als quelle_id.
--
-- Alle Auto-Events, die VOR dieser Umstellung angelegt wurden, haben
-- noch die globale produkte.id als quelle_id. Die würden beim nächsten
-- Sync nie aktualisiert — neue Events kämen daneben und das Zählen
-- auf der Raum-Detail-Seite stimmt nicht.
--
-- Lösung: alle quelle=produkt und quelle=bestellstatus Auto-Events
-- einmal löschen. Beim nächsten Produkt-Update im UI werden sie
-- automatisch neu angelegt – dann mit raum_produkte.id als quelle_id,
-- und damit pro Raum eindeutig.
-- ============================================================

DELETE FROM timeline_events
WHERE quelle IN ('produkt', 'bestellstatus');
