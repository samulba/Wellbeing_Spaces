-- ============================================================
-- Migration 069 · Kategorie-Dualismus auflösen
--
-- produkte hat historisch zwei Kategorie-Felder:
--   - kategorie     (TEXT,  Legacy seit Anfang)
--   - kategorie_id  (UUID,  FK auf kategorien-Tabelle, seit Mig. 037)
--
-- Beide wurden parallel geschrieben. Um die Inkonsistenz aufzulösen,
-- ohne sofort alle Lese-Queries umzustellen, sorgt ein BEFORE-Trigger
-- dafür, dass beide Felder immer synchron sind. Die FK wird zur
-- Source-of-Truth; das TEXT-Feld bleibt als Read-Through-Projection.
--
-- Später (separate Migration) kann die TEXT-Spalte gedroppt werden,
-- sobald alle Lese-Queries auf JOIN kategorien umgestellt sind.
-- ============================================================


-- 1) Backfill: bestehende Zeilen mit TEXT-Kategorie bekommen kategorie_id
UPDATE produkte p
   SET kategorie_id = k.id
  FROM kategorien k
 WHERE p.kategorie_id    IS NULL
   AND p.kategorie       IS NOT NULL
   AND p.organisation_id IS NOT NULL
   AND p.organisation_id = k.organisation_id
   AND k.typ             = 'produkt'
   AND lower(trim(p.kategorie)) = lower(trim(k.name));


-- 2) Sync-Trigger: hält kategorie TEXT und kategorie_id UUID in sync
CREATE OR REPLACE FUNCTION sync_produkt_kategorie()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Wenn kategorie_id gesetzt ist, TEXT aus kategorien.name nachziehen.
  IF NEW.kategorie_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.kategorie_id IS DISTINCT FROM OLD.kategorie_id)
  THEN
    SELECT name INTO NEW.kategorie
      FROM kategorien
     WHERE id = NEW.kategorie_id;

  -- Sonst: wenn nur TEXT-Kategorie gesetzt, kategorie_id via name-match lookupen.
  ELSIF NEW.kategorie IS NOT NULL
     AND NEW.kategorie_id    IS NULL
     AND NEW.organisation_id IS NOT NULL
  THEN
    SELECT id INTO NEW.kategorie_id
      FROM kategorien
     WHERE typ             = 'produkt'
       AND organisation_id = NEW.organisation_id
       AND lower(trim(name)) = lower(trim(NEW.kategorie))
     LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS trg_produkt_kategorie_sync ON produkte;

CREATE TRIGGER trg_produkt_kategorie_sync
  BEFORE INSERT OR UPDATE ON produkte
  FOR EACH ROW EXECUTE FUNCTION sync_produkt_kategorie();


-- 3) Doku-Kommentar
COMMENT ON COLUMN produkte.kategorie IS
  'Auto-gesynct mit kategorien.name via trg_produkt_kategorie_sync. '
  'kategorie_id ist Source-of-Truth. kategorie TEXT bleibt aktiv als '
  'Read-Through-Projection für Legacy-Queries. Wird später gedroppt.';

COMMENT ON COLUMN produkte.kategorie_id IS
  'FK auf kategorien(id). Source-of-Truth. Beim Schreiben wird '
  'kategorie TEXT automatisch via Trigger nachgezogen.';
