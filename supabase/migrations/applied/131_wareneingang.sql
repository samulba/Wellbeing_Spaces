-- ============================================================
-- Migration 131 · Wareneingang pro Position (Teil-Lieferung)
--
-- Bisher kennt der Bestell-Lifecycle nur „alles geliefert" (statusUebergang
-- schaltet die GANZE Bestellung + alle Positionen). Für echten Wareneingang
-- braucht jede Position eine eigene Empfangs-Markierung (auch Teilmenge).
--
-- VOLLSTÄNDIG ADDITIV. Kein Enum-Wechsel, kein neuer Fremdschlüssel.
-- raum_produkte.bestellstatus hat 'teilgeliefert' bereits (Migration 021).
-- Der Teil-Status der GESAMTbestellung wird in der UI abgeleitet angezeigt
-- (X von Y Positionen erhalten), NICHT persistiert.
-- ============================================================

ALTER TABLE lieferanten_bestellung_positionen
  ADD COLUMN IF NOT EXISTS menge_erhalten NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS empfangen_am   TIMESTAMPTZ;

COMMENT ON COLUMN lieferanten_bestellung_positionen.menge_erhalten IS
  'Tatsächlich erhaltene Menge (Wareneingang). NULL = noch nichts erhalten. '
  '< menge = Teil-Lieferung (raum_produkt → teilgeliefert), >= menge = voll (→ geliefert).';
COMMENT ON COLUMN lieferanten_bestellung_positionen.empfangen_am IS
  'Zeitpunkt des (letzten) Wareneingangs dieser Position.';
