-- ============================================================
-- Migration 058 · Produkt-Hinweis + Rabatt + Verfügbarkeits-Refactor
-- ============================================================
-- Drei zusammenhängende Änderungen:
-- 1) verfuegbarkeit: dynamische Status-Werte raus (ausverkauft/begrenzt/verfuegbar),
--    nur statische Eigenschaften bleiben
-- 2) produkte.hinweis_extern + hinweis_extern_sichtbar: Vermerk-Feature
-- 3) raum_produkte.rabatt_prozent: prozentualer Aktions-Rabatt pro Raum-Produkt

-- 1) Alte dynamische Verfügbarkeits-Werte auf NULL setzen.
--    Neue gültige Werte: 'auf_anfrage' | 'saisonal' | 'lieferzeit_4_6' | 'standard' | NULL
UPDATE produkte SET verfuegbarkeit = NULL
  WHERE verfuegbarkeit IN ('verfuegbar', 'begrenzt', 'ausverkauft');

-- 2) Hinweis-Feld auf produkte (Vermerk + Sichtbarkeit für Kunden)
ALTER TABLE produkte
  ADD COLUMN IF NOT EXISTS hinweis_extern           text,
  ADD COLUMN IF NOT EXISTS hinweis_extern_sichtbar  boolean NOT NULL DEFAULT false;

-- 3) Rabatt pro raum_produkt (0-100%, nullable = kein Rabatt)
ALTER TABLE raum_produkte
  ADD COLUMN IF NOT EXISTS rabatt_prozent numeric(5,2)
    CHECK (rabatt_prozent IS NULL OR (rabatt_prozent >= 0 AND rabatt_prozent <= 100));

COMMENT ON COLUMN produkte.hinweis_extern IS
  'Frei formulierter Vermerk zum Produkt (Designer-Hinweis, z.B. "Preis kann schwanken")';
COMMENT ON COLUMN produkte.hinweis_extern_sichtbar IS
  'TRUE = Hinweis wird auch in Kunden-Views (Freigabe, Konfigurator, Portal) gezeigt';
COMMENT ON COLUMN raum_produkte.rabatt_prozent IS
  'Prozentualer Rabatt auf den effektiven VP (0–100). Wird nach verkaufspreis_override angewendet.';
