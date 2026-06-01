-- Migration 119 — Freigabe: Mehrfachauswahl + Wunsch-Menge + Block-Notiz
--
-- Der Kunde bekommt im Freigabe-Link mehr Entscheidungsfreiheit:
--   1) In Auswahl-Blöcken darf er jetzt MEHRERE Produkte wählen (z. B. zwei
--      Kissen), nicht nur genau eines.
--   2) Er kann pro Produkt eine eigene Wunsch-Menge angeben (separat von der
--      vom Studio geplanten Menge — eure Kalkulation bleibt unangetastet).
--   3) Er kann pro Auswahl-Block eine Sammelnotiz hinterlassen.
--
-- Alles additiv + fail-safe: Code funktioniert auch ohne diese Migration
-- (dann eben ohne Mehrfach-Favoriten / Wunsch-Menge / Block-Notiz).

-- ── 1) Mehrfachauswahl ─────────────────────────────────────────
-- Bisher erzwang ein partieller Unique-Index „genau 1 kunde_favorit pro Block".
-- Für Mehrfachauswahl wird dieser entfernt. Die App räumt bei Einzel-Logik
-- weiterhin selbst auf (clear-before-set); admin_favorit (= genau EINE
-- Empfehlung pro Block) bleibt unverändert bestehen.
DROP INDEX IF EXISTS idx_rp_kunde_favorit_one_per_gruppe;

-- ── 2) Wunsch-Menge des Kunden ─────────────────────────────────
-- NULL = Kunde hat die Menge nicht geändert (es gilt die geplante raum_produkte.menge).
ALTER TABLE raum_produkte
  ADD COLUMN IF NOT EXISTS kunde_menge INTEGER
  CHECK (kunde_menge IS NULL OR kunde_menge >= 1);

-- ── 3) Sammelnotiz des Kunden pro Auswahl-Block ────────────────
ALTER TABLE produkt_gruppen
  ADD COLUMN IF NOT EXISTS kunde_notiz TEXT;
