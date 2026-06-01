-- Migration 120 · Produkt: provision_typ / provision_fix + einkaufsrabatt_prozent
--
-- Ermöglicht eine Fix-€-Provision (zusätzlich zur prozentualen) und speichert den
-- Einkaufsrabatt je Produkt (z.B. per Knopfdruck aus den Partner-Konditionen übernommen).
-- Alles nullable + fail-safe: die App läuft auch ohne diese Spalten.

ALTER TABLE produkte
  ADD COLUMN IF NOT EXISTS provision_typ          TEXT
      CHECK (provision_typ IN ('prozent','fix')),
  ADD COLUMN IF NOT EXISTS provision_fix          NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS einkaufsrabatt_prozent NUMERIC(5,2);

-- Bestehende Produkte mit prozentualer Provision explizit auf 'prozent' setzen,
-- damit provision_typ konsistent ist (NULL wird vom Code wie 'prozent' behandelt).
UPDATE produkte
   SET provision_typ = 'prozent'
 WHERE provision_typ IS NULL
   AND provision_prozent IS NOT NULL;
