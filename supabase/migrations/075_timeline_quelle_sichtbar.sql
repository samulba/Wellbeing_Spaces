-- ============================================================
-- Migration 075 · Timeline: Auto-Sync-Quelle + Kunden-Sichtbarkeit
--
-- Ermöglicht, dass Timeline-Events automatisch aus anderen Aktionen
-- synchronisiert werden (Liefertermin, Bestellstatus, Deadline,
-- Angebots-/Vertrags-Status). Jedes Auto-Event ist via quelle+quelle_id
-- eindeutig an seinen Ursprung gebunden — Unique-Index verhindert
-- Doppel. Manuelle Events haben quelle='manuell' und bleiben
-- unberührt.
--
-- kunde_sichtbar steuert, ob ein Event im Kundenportal angezeigt wird.
-- Default true, Auto-Events aus Bestellstatus/Angebot werden vom
-- Sync-Helper auf false gesetzt.
-- ============================================================

ALTER TABLE timeline_events
  ADD COLUMN IF NOT EXISTS quelle TEXT NOT NULL DEFAULT 'manuell'
    CHECK (quelle IN ('manuell','produkt','bestellstatus','deadline','angebot','vertrag')),
  ADD COLUMN IF NOT EXISTS quelle_id UUID,
  ADD COLUMN IF NOT EXISTS kunde_sichtbar BOOLEAN NOT NULL DEFAULT true;

-- Unique-Constraint für Auto-Events pro Org + Quelle + Quell-ID.
-- Partial-Index → manuelle Events (quelle='manuell') sind unbegrenzt.
CREATE UNIQUE INDEX IF NOT EXISTS idx_timeline_auto_unique
  ON timeline_events (organisation_id, quelle, quelle_id)
  WHERE quelle <> 'manuell' AND quelle_id IS NOT NULL;

COMMENT ON COLUMN timeline_events.quelle IS
  'Quelle des Events: manuell oder auto-synchronisiert aus Produkt/Bestellstatus/Deadline/Angebot/Vertrag.';
COMMENT ON COLUMN timeline_events.quelle_id IS
  'ID der Quell-Entität (produkte.id / projekte.id / angebote.id / vertraege.id) — bei quelle=manuell NULL.';
COMMENT ON COLUMN timeline_events.kunde_sichtbar IS
  'Steuert Portal-Sichtbarkeit. Default true; Auto-Events aus Bestellstatus/Angebot sind false.';
