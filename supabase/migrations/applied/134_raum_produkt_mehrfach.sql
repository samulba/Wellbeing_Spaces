-- Migration 134: Gleiches Produkt mehrfach pro Raum erlauben
-- Entfernt die UNIQUE(raum_id, produkt_id)-Sperre auf raum_produkte (aus Mig 038),
-- damit ein Produkt mehrfach in einem Raum liegen kann (z. B. ein Controller je
-- Lichtgruppe). Alle Downstream-Operationen (Status/Freigabe/Bestellung/Timeline)
-- sind auf raum_produkte.id (PK) gekeyt → Duplikate sind unabhängig & unkritisch.
-- Nicht-destruktiv: keine Bestandsdaten werden geändert.

ALTER TABLE raum_produkte DROP CONSTRAINT IF EXISTS raum_produkte_raum_id_produkt_id_key;

-- Defensiv: falls die Sperre unter anderem Namen oder als UNIQUE INDEX existiert
DO $$
DECLARE
  c text;
  raum_attnum    smallint;
  produkt_attnum smallint;
BEGIN
  SELECT attnum INTO raum_attnum    FROM pg_attribute WHERE attrelid = 'raum_produkte'::regclass AND attname = 'raum_id';
  SELECT attnum INTO produkt_attnum FROM pg_attribute WHERE attrelid = 'raum_produkte'::regclass AND attname = 'produkt_id';

  -- UNIQUE-Constraint genau über (raum_id, produkt_id)
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'raum_produkte'::regclass
      AND contype = 'u'
      AND array_length(conkey, 1) = 2
      AND conkey @> ARRAY[raum_attnum, produkt_attnum]
      AND conkey <@ ARRAY[raum_attnum, produkt_attnum]
  LOOP
    EXECUTE format('ALTER TABLE raum_produkte DROP CONSTRAINT %I', c);
  END LOOP;
END $$;
