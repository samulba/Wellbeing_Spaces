-- Migration 135: Freigabe-Stempel auf raum_produkte (wann & von wem freigegeben)
-- Additiv & idempotent. Speichert pro Raum↔Produkt direkt am Datensatz, WANN und
-- VON WEM die Freigabe erfolgte — als denormalisierter Anzeige-Cache. Die unveränder-
-- liche Quelle der Wahrheit bleibt `freigabe_audit` (Mig 082/115); diese Spalten sind
-- nur für die schnelle Stempel-Anzeige (Raum-Tabelle, Freigaben-Übersicht, Projekt-Tab,
-- Exporte) ohne Extra-Query gedacht.
-- Nicht-destruktiv: nur neue, nullable Spalten + Backfill aus dem Audit-Log.

ALTER TABLE raum_produkte ADD COLUMN IF NOT EXISTS freigegeben_am  TIMESTAMPTZ;
ALTER TABLE raum_produkte ADD COLUMN IF NOT EXISTS freigegeben_von TEXT;

-- Backfill: jüngster 'freigegeben'-Audit-Eintrag je raum_produkt (nur für Einträge,
-- die AKTUELL freigegeben sind und noch keinen Stempel tragen). So tragen auch
-- bereits in der Vergangenheit freigegebene Produkte ihren Stempel.
UPDATE raum_produkte rp SET
  freigegeben_am  = a.created_at,
  freigegeben_von = a.geaendert_von
FROM (
  SELECT DISTINCT ON (raum_produkt_id)
    raum_produkt_id, created_at, geaendert_von
  FROM freigabe_audit
  WHERE neuer_status = 'freigegeben'
  ORDER BY raum_produkt_id, created_at DESC
) a
WHERE rp.id = a.raum_produkt_id
  AND rp.freigabe_status = 'freigegeben'
  AND rp.freigegeben_am IS NULL;
