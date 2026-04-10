-- ── 011_produkte_raum_optional.sql ──────────────────────────
-- Produkte können ohne Raum-Zuordnung existieren (Produktbibliothek)
-- raum_id = NULL → freies Produkt ohne Projektzuordnung

ALTER TABLE produkte ALTER COLUMN raum_id DROP NOT NULL;
