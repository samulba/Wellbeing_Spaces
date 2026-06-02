-- 123 — Block-Bereich konsistent machen (Single Source of Truth)
--
-- Ersetzt die nie erfolgreich gelaufene Migration 122 (die auf
-- raum_produkte.deleted_at filterte — diese Spalte existiert NICHT, daher
-- brach 122 ab). raum_produkte wird hart gelöscht → hier NIE auf deleted_at
-- filtern.
--
-- Ziel: Ein Produkt in einem Auswahl-Block (produkt_gruppen) liegt IMMER im
-- selben Bereich wie sein Block. Bisher konnten Block-Bereich
-- (produkt_gruppen.bereich_id) und Mitglieder-Bereich (raum_produkte.bereich_id)
-- auseinanderlaufen → Produkte fielen „Ohne Gruppe", Bereiche wirkten leer,
-- Produkte fehlten im Bereich-skopierten Freigabe-Link.
--
-- Reversibel & sicher: ändert nur bereich_id, keine Favoriten/Status.

-- ── A) Verwaiste Blöcke heilen ──────────────────────────────────────────────
-- Blöcke OHNE Bereich aus ihren Mitgliedern rekonstruieren (Favorit zuerst,
-- sonst erstes Mitglied mit gültigem, nicht-gelöschtem Bereich).
UPDATE produkt_gruppen g
SET bereich_id = sub.bereich_id
FROM (
  SELECT DISTINCT ON (rp.produkt_gruppe_id)
         rp.produkt_gruppe_id AS gruppe_id,
         rp.bereich_id,
         rp.organisation_id
  FROM raum_produkte rp
  WHERE rp.produkt_gruppe_id IS NOT NULL
    AND rp.bereich_id IS NOT NULL
  ORDER BY rp.produkt_gruppe_id, rp.admin_favorit DESC, rp.reihenfolge ASC
) sub
WHERE g.id = sub.gruppe_id
  AND g.organisation_id = sub.organisation_id
  AND g.bereich_id IS NULL
  AND g.deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM produkt_bereiche b
    WHERE b.id = sub.bereich_id AND b.deleted_at IS NULL
  );

-- ── B) Mitglieder an den Bereich ihres (nicht gelöschten) Blocks angleichen ──
-- Damit ist raum_produkte.bereich_id der Block-Mitglieder = produkt_gruppen.bereich_id
-- (Single Source). Hat der Block keinen Bereich (NULL), werden auch die Mitglieder
-- NULL → konsistent „Ohne Gruppe".
UPDATE raum_produkte rp
SET bereich_id = g.bereich_id
FROM produkt_gruppen g
WHERE rp.produkt_gruppe_id = g.id
  AND g.deleted_at IS NULL
  AND rp.bereich_id IS DISTINCT FROM g.bereich_id;
