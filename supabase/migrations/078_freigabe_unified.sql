-- ============================================================
-- Migration 078 · Freigabe-System vereinheitlichen
--
-- Bringt zwei Schema-Änderungen unter einen Hut:
--
-- 1. raum_produkte bekommt die Freigabe-Felder. Bisher schrieb
--    der Token-Flow nach `produktstatus` (global pro produkt_id)
--    und der Portal-Flow nach `produkte.freigabe_status`. Beide
--    zielen auf verschiedene Tabellen; derselbe Artikel in Raum A
--    und Raum B teilt seinen Status zwingend. Ab jetzt ist
--    raum_produkte die Single Source of Truth.
--
-- 2. freigabe_tokens bekommt Scope (Projekt/Raum/Auswahl) und
--    Abschluss-Metadaten (abgeschlossen_am/durch/kommentar). Damit
--    können wir granulare Links ausstellen und einen echten
--    „Abschluss"-Moment erzwingen.
--
-- Backfill alter Daten findet in Migration 080 statt (wenn die
-- produktstatus-Tabelle deprecated wird).
-- ============================================================

-- ── TEIL 1: raum_produkte erweitern ────────────────────────────
ALTER TABLE raum_produkte
  ADD COLUMN IF NOT EXISTS freigabe_status TEXT NOT NULL DEFAULT 'ausstehend'
    CHECK (freigabe_status IN ('ausstehend','freigegeben','abgelehnt')),
  ADD COLUMN IF NOT EXISTS freigabe_kommentar TEXT,
  ADD COLUMN IF NOT EXISTS freigegeben_am TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_raum_produkte_freigabe_status
  ON raum_produkte (organisation_id, freigabe_status);

COMMENT ON COLUMN raum_produkte.freigabe_status IS
  'Freigabe-Status pro Raum-Produkt-Instanz: ausstehend | freigegeben | abgelehnt. Single Source of Truth ab Migration 078.';
COMMENT ON COLUMN raum_produkte.freigabe_kommentar IS
  'Kommentar des Kunden bei Ablehnung oder Freigabe mit Anmerkung.';
COMMENT ON COLUMN raum_produkte.freigegeben_am IS
  'Zeitpunkt der Freigabe; wird gesetzt wenn freigabe_status auf "freigegeben" wechselt.';

-- ── TEIL 2: freigabe_tokens erweitern ──────────────────────────
ALTER TABLE freigabe_tokens
  ADD COLUMN IF NOT EXISTS scope_typ TEXT NOT NULL DEFAULT 'projekt'
    CHECK (scope_typ IN ('projekt','raum','auswahl')),
  ADD COLUMN IF NOT EXISTS scope_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS abgeschlossen_am TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS abgeschlossen_durch TEXT,
  ADD COLUMN IF NOT EXISTS abgeschlossen_kommentar TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Duplikat-Schutz: nur EIN offener Projekt-Token pro Projekt+Org
-- (Raum/Auswahl-Tokens dürfen mehrfach existieren, weil sie
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
