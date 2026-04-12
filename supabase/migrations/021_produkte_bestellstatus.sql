-- Bestellstatus-Enum und Spalte in produkte
DO $$ BEGIN
  CREATE TYPE bestellstatus_enum AS ENUM (
    'ausstehend', 'bestellt', 'geliefert', 'rechnung_erhalten'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE produkte
  ADD COLUMN IF NOT EXISTS bestellstatus bestellstatus_enum NOT NULL DEFAULT 'ausstehend';
