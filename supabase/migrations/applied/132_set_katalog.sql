-- ============================================================
-- Migration 132 · Set-Katalog & Empfehlungen
--
-- Damit Laien beim „Produkt hinzufügen → Sets" sofort sehen, WELCHES
-- Set sie brauchen: Sets lassen sich als „empfohlen" markieren und mit
-- einem kurzen Einsatzbereich/Anwendungsfall versehen (z. B.
-- „LED-Strip-Installation"). Kategorie/Beschreibung existieren bereits.
--
-- VOLLSTÄNDIG ADDITIV. Felder gelten nur für Set-Köpfe (ist_bundle=true);
-- bei normalen Produkten bleiben sie einfach false/NULL.
-- ============================================================

ALTER TABLE produkte
  ADD COLUMN IF NOT EXISTS bundle_empfohlen      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bundle_einsatzbereich TEXT;

CREATE INDEX IF NOT EXISTS idx_produkte_bundle_empfohlen
  ON produkte(bundle_empfohlen) WHERE bundle_empfohlen = true;

COMMENT ON COLUMN produkte.bundle_empfohlen IS
  'Set als empfohlen markiert → erscheint im Set-Katalog oben in der „Empfohlen"-Sektion.';
COMMENT ON COLUMN produkte.bundle_einsatzbereich IS
  'Kurzer Anwendungsfall des Sets (z. B. „LED-Strip-Installation") für den Katalog.';
