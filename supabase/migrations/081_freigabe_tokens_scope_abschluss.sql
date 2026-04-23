-- ============================================================
-- Migration 081 · Freigabe-Tokens: Scope + Pflicht-Abschluss
--
-- Erweitert freigabe_tokens um drei neue Fähigkeiten:
--
-- 1. Granularer Geltungsbereich (scope_typ + scope_ids)
--    Projekt (default, ganzes Projekt) / Raum (nur ein Raum) /
--    Auswahl (kuratierte Liste einzelner raum_produkte).
--    Der Kunde sieht nur was im Scope liegt.
--
-- 2. Pflicht-Abschluss (abgeschlossen_am/_durch/_kommentar)
--    Nach allen Einzel-Entscheidungen muss der Kunde den Vorgang
--    bewusst abschließen (Name + optionaler Kommentar).
--    Danach ist der Token read-only — keine weiteren Änderungen.
--
-- 3. Zurückziehen (deleted_at)
--    Admin kann einen offenen Link soft-löschen; Kunde sieht
--    dann eine neutrale Fehlerseite statt Freigabe.
--
-- Zusätzlich: Partial-Unique-Index verhindert zwei gleichzeitige
-- offene Projekt-Scope-Tokens pro Projekt (Duplikat-Schutz).
-- ============================================================

ALTER TABLE freigabe_tokens
  ADD COLUMN IF NOT EXISTS scope_typ TEXT NOT NULL DEFAULT 'projekt'
    CHECK (scope_typ IN ('projekt','raum','auswahl')),
  ADD COLUMN IF NOT EXISTS scope_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS abgeschlossen_am TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS abgeschlossen_durch TEXT,
  ADD COLUMN IF NOT EXISTS abgeschlossen_kommentar TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Duplikat-Schutz: nur EIN offener Projekt-Token pro Projekt+Org
-- (Raum/Auswahl-Tokens dürfen parallel existieren, weil sie
--  nicht das ganze Projekt blockieren.)
CREATE UNIQUE INDEX IF NOT EXISTS idx_freigabe_tokens_one_open_projekt
  ON freigabe_tokens (organisation_id, projekt_id)
  WHERE scope_typ = 'projekt'
    AND abgeschlossen_am IS NULL
    AND deleted_at IS NULL
    AND aktiv = true;

CREATE INDEX IF NOT EXISTS idx_freigabe_tokens_projekt_open
  ON freigabe_tokens (organisation_id, projekt_id)
  WHERE abgeschlossen_am IS NULL AND deleted_at IS NULL;

COMMENT ON COLUMN freigabe_tokens.scope_typ IS
  'Token-Geltungsbereich: projekt (gesamtes Projekt), raum (nur 1 Raum), auswahl (kuratierte Raum-Produkt-Liste).';
COMMENT ON COLUMN freigabe_tokens.scope_ids IS
  'Bei scope_typ=raum: [raum_id]. Bei scope_typ=auswahl: [raum_produkte.id, ...]. Bei scope_typ=projekt: leer.';
COMMENT ON COLUMN freigabe_tokens.abgeschlossen_am IS
  'Zeitpunkt des Pflicht-Abschlusses durch den Kunden; NULL = Token noch offen.';
COMMENT ON COLUMN freigabe_tokens.abgeschlossen_durch IS
  'Name, den der Kunde im Abschluss-Modal eingegeben hat.';
COMMENT ON COLUMN freigabe_tokens.abgeschlossen_kommentar IS
  'Optionales Freitext-Feedback des Kunden beim Abschluss.';
COMMENT ON COLUMN freigabe_tokens.deleted_at IS
  'Soft-Delete: gesetzt wenn Admin den Token zurückzieht. Token ist nicht mehr aufrufbar.';
