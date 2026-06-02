-- 124 — Bestehende „Auswahl"-Freigabe-Links einfrieren
--
-- Ab sofort werden Auswahl-Links beim Erstellen eingefroren (feste scope_ids).
-- Bereits bestehende, noch aktive/offene Auswahl-Links, die (auch) über ganze
-- Gruppen liefen (scope_bereich_ids gesetzt), werden hier EINMALIG zu festen
-- scope_ids aufgelöst:
--     scope_ids := scope_ids ∪ { alle Produkte, deren Bereich in scope_bereich_ids liegt }
-- Danach sind auch Alt-Links selbsttragend und können nie „nicht verfügbar" zeigen.
--
-- Voraussetzung: Migration 123 lief bereits (raum_produkte.bereich_id der
-- Block-Mitglieder ist an den Block-Bereich angeglichen) → rp.bereich_id ist
-- maßgeblich, auch für Produkte in Auswahl-Blöcken.
-- raum_produkte hat KEIN deleted_at → niemals darauf filtern.

UPDATE freigabe_tokens t
SET scope_ids = COALESCE(sub.ids, t.scope_ids)
FROM (
  SELECT t2.id AS token_id,
         (
           SELECT array_agg(DISTINCT x)
           FROM (
             SELECT unnest(t2.scope_ids) AS x
             UNION
             SELECT rp.id
             FROM raeume r
             JOIN raum_produkte rp ON rp.raum_id = r.id
             WHERE r.projekt_id = t2.projekt_id
               AND r.deleted_at IS NULL
               AND rp.bereich_id = ANY (t2.scope_bereich_ids)
           ) u
         ) AS ids
  FROM freigabe_tokens t2
  WHERE t2.scope_typ = 'auswahl'
    AND t2.deleted_at IS NULL
    AND t2.abgeschlossen_am IS NULL
    AND COALESCE(array_length(t2.scope_bereich_ids, 1), 0) > 0
) sub
WHERE t.id = sub.token_id;
