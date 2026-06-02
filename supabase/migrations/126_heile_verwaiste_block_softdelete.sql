-- 126 — Verwaiste Soft-Delete-Blöcke heilen
--
-- Bug-Symptom: Auswahl-Blöcke (produkt_gruppen) waren als gelöscht markiert
-- (deleted_at IS NOT NULL), obwohl ihre Produkte noch zugeordnet sind
-- (raum_produkte.produkt_gruppe_id zeigt weiter auf den Block). Folge: die
-- Produkte fielen im Freigabe-Link UND im Admin „Ohne Gruppe" / einzeln,
-- statt im Block zu erscheinen.
--
-- Die Block-Zugehörigkeit lebt auf raum_produkte.produkt_gruppe_id. Solange ein
-- Block dort referenziert wird, gehört er dazu → er darf nicht „gelöscht" sein.
-- Wir machen solche Blöcke wieder aktiv. (Echtes Löschen über die App löst die
-- Produkte zuerst, daher betrifft das nur inkonsistente Altzustände.)
-- raum_produkte hat KEINE deleted_at-Spalte → niemals darauf filtern.

UPDATE produkt_gruppen g
SET deleted_at = NULL
WHERE g.deleted_at IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM raum_produkte rp
    WHERE rp.produkt_gruppe_id = g.id
  );
