-- ============================================================
-- Migration 076 · Bestell-/Liefer-/Freigabe-Status pro raum_produkte
--
-- Bisher liegen diese Felder auf den globalen Tabellen:
--   produkte.bestellstatus / bestellt_am / liefertermin /
--           liefertermin_bestaetigt / lieferung_erhalten_am
--   produktstatus.status / kommentar (1:1 an produkt_id)
--
-- Das führt dazu, dass derselbe Artikel (IKEA DEJSA o.ä.) in zwei
-- Räumen denselben Status teilt — Änderungen leaken zwischen
-- Projekten. Die Daten gehören logisch an die Raum↔Produkt-
-- Beziehung (raum_produkte), nicht ans globale Produkt.
--
-- Diese Migration dupliziert die Felder auf raum_produkte und
-- füllt sie mit den bisherigen Werten (Backfill pro Zeile).
-- Die globalen Spalten bleiben vorerst bestehen (kein Datenverlust),
-- werden vom Code aber ab Step 3 nicht mehr beschrieben.
-- ============================================================

-- ── Bestell-/Lieferdaten ─────────────────────────────────────
ALTER TABLE raum_produkte
  ADD COLUMN IF NOT EXISTS bestellstatus            bestellstatus_enum NOT NULL DEFAULT 'ausstehend',
  ADD COLUMN IF NOT EXISTS bestellt_am              DATE,
  ADD COLUMN IF NOT EXISTS liefertermin             DATE,
  ADD COLUMN IF NOT EXISTS liefertermin_bestaetigt  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lieferung_erhalten_am    DATE;

-- ── Freigabe-Status (vorher produktstatus-Tabelle) ───────────
ALTER TABLE raum_produkte
  ADD COLUMN IF NOT EXISTS freigabe_status    TEXT NOT NULL DEFAULT 'ausstehend'
    CHECK (freigabe_status IN ('ausstehend','freigegeben','abgelehnt','ueberarbeitung')),
  ADD COLUMN IF NOT EXISTS freigabe_kommentar TEXT;

-- ── Backfill aus produkte ────────────────────────────────────
UPDATE raum_produkte rp
SET
  bestellstatus            = COALESCE(p.bestellstatus,           'ausstehend'),
  bestellt_am              = p.bestellt_am,
  liefertermin             = p.liefertermin,
  liefertermin_bestaetigt  = COALESCE(p.liefertermin_bestaetigt, false),
  lieferung_erhalten_am    = p.lieferung_erhalten_am
FROM produkte p
WHERE rp.produkt_id = p.id;

-- ── Backfill aus produktstatus ───────────────────────────────
UPDATE raum_produkte rp
SET
  freigabe_status    = COALESCE(ps.status,    'ausstehend'),
  freigabe_kommentar = ps.kommentar
FROM produktstatus ps
WHERE rp.produkt_id = ps.produkt_id;

-- ── Indizes für die neuen Felder ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_raum_produkte_bestellstatus
  ON raum_produkte(bestellstatus)
  WHERE bestellstatus <> 'ausstehend';

CREATE INDEX IF NOT EXISTS idx_raum_produkte_liefertermin
  ON raum_produkte(liefertermin)
  WHERE liefertermin IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_raum_produkte_freigabe_status
  ON raum_produkte(freigabe_status)
  WHERE freigabe_status <> 'ausstehend';

COMMENT ON COLUMN raum_produkte.bestellstatus IS
  'Bestellstatus pro Raum↔Produkt (nicht global). Migration 076.';
COMMENT ON COLUMN raum_produkte.freigabe_status IS
  'Freigabe-Status pro Raum↔Produkt. Ersetzt produktstatus-Tabelle. Migration 076.';
