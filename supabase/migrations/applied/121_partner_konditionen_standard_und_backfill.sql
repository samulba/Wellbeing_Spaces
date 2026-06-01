-- Migration 121 · Partner-Konditionen: Standard-Flag + Backfill aus Alt-Provisionsmodell
--
-- partner_konditionen wird zur Single Source of Truth für Provision/Einkaufsrabatt.
-- Das alte partner.provisionsmodell/provisions_wert wird einmalig (idempotent) in eine
-- 'Standard (migriert)'-Kondition gefaltet. Die Alt-Spalten bleiben erhalten (back-compat),
-- werden aber nicht mehr gelesen/geschrieben.

ALTER TABLE partner_konditionen
  ADD COLUMN IF NOT EXISTS ist_standard BOOLEAN NOT NULL DEFAULT false;

-- Genau eine Standard-Kondition pro Partner.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_partner_kondition_standard
  ON partner_konditionen(partner_id) WHERE ist_standard;

-- Backfill: altes Provisionsmodell → eine Standard-Kondition je Partner.
--   'Prozent'      → typ 'prozent_fix'     (Prozent vom VK netto)
--   'Fix'          → typ 'fix_pro_produkt' (Fixbetrag pro Einheit)
--   'Individuell'  → übersprungen (kein Wert; via Konditionen-UI zu pflegen)
INSERT INTO partner_konditionen (
  organisation_id, partner_id, name, typ, wert,
  zahlungsziel_tage, aktiv, ist_standard, notizen
)
SELECT
  p.organisation_id,
  p.id,
  'Standard (migriert)',
  CASE p.provisionsmodell
    WHEN 'Prozent' THEN 'prozent_fix'
    WHEN 'Fix'     THEN 'fix_pro_produkt'
  END,
  p.provisions_wert,
  COALESCE(p.zahlungsziel_tage, 30),
  true,
  true,
  'Automatisch aus altem Provisionsmodell übernommen (Migration 121).'
FROM partner p
WHERE p.deleted_at IS NULL
  AND p.organisation_id IS NOT NULL
  AND p.provisionsmodell IN ('Prozent','Fix')
  AND p.provisions_wert IS NOT NULL
  -- Idempotenz: kein Doppel-Insert bei erneutem Lauf
  AND NOT EXISTS (
    SELECT 1 FROM partner_konditionen k
     WHERE k.partner_id = p.id
       AND k.name = 'Standard (migriert)'
  )
  -- Falls der Partner bereits eine (manuelle) Standard-Kondition hat: nicht anfassen
  AND NOT EXISTS (
    SELECT 1 FROM partner_konditionen k2
     WHERE k2.partner_id = p.id
       AND k2.ist_standard = true
  );
