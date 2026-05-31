-- ============================================================
-- Migration 116b · OPTIONALER Backfill: produkt_gruppen -> produkt_bereiche
--
-- NUR ausfuehren, wenn die bestehenden "Gruppen" (die bisher als
-- organisatorische Abschnitte genutzt wurden) automatisch in die neue
-- "Gruppe"-Ebene (produkt_bereiche) ueberfuehrt werden sollen.
--
-- Effekt: Jede bestehende produkt_gruppe wird zu einem Bereich gleichen
-- Namens; ihre Produkte werden zu EINZELprodukten dieses Bereichs
-- (produkt_gruppe_id = NULL). Danach baut man die Auswahl-Bloecke
-- (Sessel/Tisch ...) frisch ueber "+ Alternative".
--
-- ⚠️  ACHTUNG: Loescht die Favoriten-Flags (admin_favorit/kunde_favorit)
-- der betroffenen Produkte und soft-deletet die alten produkt_gruppen.
-- Vor Launch mit wenig Echtdaten unkritisch; auf Produktivdaten gehen
-- damit gesetzte Empfehlungen verloren. Idempotent (WHERE bereich_id IS NULL).
-- Setzt voraus, dass Migration 116 bereits eingespielt ist.
-- ============================================================

BEGIN;

-- 1) Pro bestehender (nicht-geloeschter) produkt_gruppe ein Bereich
--    gleichen Namens/Raums/Reihenfolge. Idempotent: ueberspringt, wenn
--    bereits ein gleichnamiger Bereich im selben Raum existiert.
INSERT INTO produkt_bereiche (organisation_id, raum_id, name, reihenfolge, created_at)
SELECT pg.organisation_id, pg.raum_id, pg.name, pg.reihenfolge, now()
FROM produkt_gruppen pg
WHERE pg.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM produkt_bereiche pb
    WHERE pb.raum_id = pg.raum_id AND pb.name = pg.name AND pb.deleted_at IS NULL
  );

-- 2) Mitglieder umhaengen: auf den neuen Bereich zeigen, vom Block loesen,
--    Favoriten loeschen. Idempotenz-Guard: nur Zeilen ohne bereich_id.
UPDATE raum_produkte rp
SET bereich_id        = pb.id,
    produkt_gruppe_id = NULL,
    admin_favorit     = false,
    kunde_favorit     = false
FROM produkt_gruppen pg
JOIN produkt_bereiche pb
  ON pb.raum_id = pg.raum_id AND pb.name = pg.name AND pb.deleted_at IS NULL
WHERE rp.produkt_gruppe_id = pg.id
  AND rp.bereich_id IS NULL;

-- 3) Die nun leeren alten produkt_gruppen soft-deleten.
UPDATE produkt_gruppen pg
SET deleted_at = now()
WHERE pg.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM raum_produkte rp WHERE rp.produkt_gruppe_id = pg.id);

COMMIT;
