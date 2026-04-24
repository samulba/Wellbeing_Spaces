-- ═══════════════════════════════════════════════════════════════
-- Migration 084: organisationen um Firmen-Stammdaten erweitern
-- ═══════════════════════════════════════════════════════════════
-- Neue Felder:
--   Rechtsform + Handelsregister-Identität (für Impressum, Rechnungen)
--   Bank-Daten (für Rechnungs-Footer)
--   Eigene Rechtstexte (Impressum, Datenschutz-URL, Standard-AGB)
--   Standard-Zahlungsziel + Standard-Angebotsgültigkeit
-- ═══════════════════════════════════════════════════════════════

-- ── Rechtsform + Register ─────────────────────────────────────
ALTER TABLE organisationen
  ADD COLUMN IF NOT EXISTS rechtsform          TEXT,                 -- "GmbH", "GbR", "Einzelunternehmen", "UG (haftungsbeschränkt)", "AG", "e.K."
  ADD COLUMN IF NOT EXISTS handelsregister_nr  TEXT,                 -- z. B. "HRB 123456"
  ADD COLUMN IF NOT EXISTS registergericht     TEXT,                 -- z. B. "Amtsgericht München"
  ADD COLUMN IF NOT EXISTS geschaeftsfuehrer   TEXT,                 -- Komma-getrennte Liste
  ADD COLUMN IF NOT EXISTS ust_id              TEXT,                 -- Umsatzsteuer-IdNr. "DE123456789"
  ADD COLUMN IF NOT EXISTS steuernummer        TEXT;                 -- "123/456/78901"

-- ── Bank ──────────────────────────────────────────────────────
ALTER TABLE organisationen
  ADD COLUMN IF NOT EXISTS bank_name           TEXT,
  ADD COLUMN IF NOT EXISTS bank_iban           TEXT,
  ADD COLUMN IF NOT EXISTS bank_bic            TEXT;

-- ── Eigene Rechtstexte ────────────────────────────────────────
ALTER TABLE organisationen
  ADD COLUMN IF NOT EXISTS impressum_text      TEXT,                 -- Rich-Text (HTML), wird im Kunden-Portal angezeigt
  ADD COLUMN IF NOT EXISTS datenschutz_url     TEXT,                 -- Externe URL
  ADD COLUMN IF NOT EXISTS standard_agb_text   TEXT;                 -- Default-AGB für neue Angebote/Verträge

-- ── Operative Defaults ────────────────────────────────────────
ALTER TABLE organisationen
  ADD COLUMN IF NOT EXISTS standard_zahlungsziel_tage        INTEGER DEFAULT 14 CHECK (standard_zahlungsziel_tage >= 0 AND standard_zahlungsziel_tage <= 365),
  ADD COLUMN IF NOT EXISTS standard_angebot_gueltigkeit_tage INTEGER DEFAULT 30 CHECK (standard_angebot_gueltigkeit_tage >= 0 AND standard_angebot_gueltigkeit_tage <= 365);

-- ── Kommentare ────────────────────────────────────────────────
COMMENT ON COLUMN organisationen.rechtsform         IS 'Rechtsform: GmbH, GbR, Einzelunternehmen, UG, AG, e.K.';
COMMENT ON COLUMN organisationen.handelsregister_nr IS 'Handelsregisternummer mit Präfix (HRB/HRA)';
COMMENT ON COLUMN organisationen.ust_id             IS 'Umsatzsteuer-Identifikationsnummer (Pflicht auf Rechnungen)';
COMMENT ON COLUMN organisationen.bank_iban          IS 'IBAN für Rechnungs-Footer';
COMMENT ON COLUMN organisationen.impressum_text     IS 'Eigener Impressum-Text (HTML) für Kunden-Portal';
COMMENT ON COLUMN organisationen.standard_agb_text  IS 'Standard-AGB-Text, default für neue Angebote/Verträge';
