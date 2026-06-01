-- 122 — Heilt Auswahl-Blöcke, die durch das Alternativen-Anlegen ihren Bereich verloren haben.
--
-- Bug (bis S79): ensureGruppeFuerHaupt() in produkt-gruppen.ts legte beim „+ Alternative"
-- eine neue produkt_gruppen-Zeile OHNE bereich_id an. Dadurch landete der Block (und sein
-- Hauptprodukt) „Ohne Gruppe" — im bereich-skopierten Freigabe-Link fiel das Produkt dann
-- aus seiner Gruppe und die Alternative fehlte ganz.
--
-- Das Hauptprodukt behielt aber seinen eigenen raum_produkte.bereich_id. Daraus
-- rekonstruieren wir den Block-Bereich (Favorit zuerst, sonst erstes Mitglied mit Bereich).
-- Nur Blöcke ohne Bereich, nur wenn ein Mitglied einen gültigen, nicht-gelöschten Bereich hat.
-- Sicher & reversibel (Admin kann den Bereich jederzeit per Block-Header-Dropdown ändern).

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
    AND rp.deleted_at IS NULL
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
