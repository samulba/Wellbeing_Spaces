-- Migration: Provisionsmodell und Einkaufskonditionen zu partner hinzufügen
ALTER TABLE partner ADD COLUMN IF NOT EXISTS provisionsmodell    TEXT CHECK (provisionsmodell IN ('Prozent', 'Fix', 'Individuell'));
ALTER TABLE partner ADD COLUMN IF NOT EXISTS provisions_wert     NUMERIC(10,2);
ALTER TABLE partner ADD COLUMN IF NOT EXISTS einkaufskonditionen TEXT;
