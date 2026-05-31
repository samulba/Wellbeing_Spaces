-- ============================================================
-- Migration 117 · Atomarer PIN-Fehlversuch-Zähler
--
-- Härtung des Freigabe-PIN-Brute-Force-Schutzes (Migration 115):
-- ersetzt das nicht-atomare read-then-write in pinPruefen durch ein
-- einzelnes UPDATE mit Selbstreferenz (race-condition-sicher).
--
-- Fail-safe: pinPruefen ruft die Funktion via RPC; fehlt sie (Migration
-- nicht eingespielt), greift weiterhin der bisherige nicht-atomare Pfad.
-- Konstanten (5 Versuche / 15 Min) entsprechen PIN_MAX_VERSUCHE / PIN_SPERRE_MS.
-- ============================================================

CREATE OR REPLACE FUNCTION freigabe_pin_fehlversuch(p_projekt_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE projekte
  SET freigabe_pin_versuche = COALESCE(freigabe_pin_versuche, 0) + 1,
      freigabe_pin_gesperrt_bis = CASE
        WHEN COALESCE(freigabe_pin_versuche, 0) + 1 >= 5
          THEN now() + interval '15 minutes'
        ELSE freigabe_pin_gesperrt_bis
      END
  WHERE id = p_projekt_id;
$$;
