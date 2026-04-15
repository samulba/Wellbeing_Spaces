-- ============================================================
-- Migration 055: Onboarding-Ergänzungen
-- ============================================================
-- Erstellt NUR was in Migration 054 noch fehlt:
--   1. onboarding_sektionen      (relationale Sektionen)
--   2. onboarding_budget_verteilung
--   3. onboarding_entscheider
--   4. onboarding_branding       (White-Label pro Org, kein firmen-Verweis)
--   5. onboarding_checkliste
--   6. Neue Spalten auf onboarding_anfragen (Zugangsinformationen, Vertrags-Basics)
-- ============================================================

-- ── 1. onboarding_sektionen ──────────────────────────────────
-- Relationale Alternative zur JSONB-sektionen auf onboarding_vorlagen.
-- Ermöglicht bedingte Sektionen + Icons + optional-Flag.

CREATE TABLE IF NOT EXISTS onboarding_sektionen (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  vorlage_id      uuid        NOT NULL REFERENCES onboarding_vorlagen(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  beschreibung    text,
  icon            text,
  reihenfolge     int         NOT NULL DEFAULT 0,
  ist_optional    boolean     NOT NULL DEFAULT false,
  -- Conditional Logic: { frage_id, operator, wert }
  bedingung       jsonb,
  erstellt_am     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE onboarding_sektionen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_sektionen_all" ON onboarding_sektionen
  FOR ALL TO authenticated
  USING  (organisation_id = get_user_org_id() OR organisation_id IS NULL)
  WITH CHECK (organisation_id = get_user_org_id());

CREATE POLICY "public_sektionen_select" ON onboarding_sektionen
  FOR SELECT TO anon USING (true);

CREATE INDEX IF NOT EXISTS idx_onboarding_sektionen_vorlage
  ON onboarding_sektionen(vorlage_id);


-- ── 2. onboarding_budget_verteilung ──────────────────────────

CREATE TABLE IF NOT EXISTS onboarding_budget_verteilung (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  anfrage_id      uuid        NOT NULL REFERENCES onboarding_anfragen(id) ON DELETE CASCADE,
  frage_id        text,                         -- Zuordnung zur Vorlage-Frage
  kategorie       text        NOT NULL,         -- 'moebel', 'beleuchtung', 'textilien', …
  prozent         int         CHECK (prozent >= 0 AND prozent <= 100),
  betrag          decimal(10,2),
  erstellt_am     timestamptz NOT NULL DEFAULT now(),
  aktualisiert_am timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE onboarding_budget_verteilung ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_budget_all" ON onboarding_budget_verteilung
  FOR ALL TO authenticated
  USING  (organisation_id = get_user_org_id() OR organisation_id IS NULL)
  WITH CHECK (organisation_id = get_user_org_id());

CREATE POLICY "public_budget_all" ON onboarding_budget_verteilung
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_onboarding_budget_anfrage
  ON onboarding_budget_verteilung(anfrage_id);

CREATE OR REPLACE FUNCTION update_onboarding_budget_verteilung_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.aktualisiert_am = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_budget_updated_at
  BEFORE UPDATE ON onboarding_budget_verteilung
  FOR EACH ROW EXECUTE FUNCTION update_onboarding_budget_verteilung_updated_at();


-- ── 3. onboarding_entscheider ─────────────────────────────────

CREATE TABLE IF NOT EXISTS onboarding_entscheider (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  anfrage_id      uuid        NOT NULL REFERENCES onboarding_anfragen(id) ON DELETE CASCADE,
  frage_id        text,
  bereich         text        NOT NULL,         -- 'farben', 'moebel', 'budget', 'stil', …
  entscheider     text        CHECK (entscheider IN ('person_a','person_b','beide','offen')),
  person_name     text,                         -- freier Name falls 'person_a'/'b' zu eng
  erstellt_am     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE onboarding_entscheider ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_entscheider_all" ON onboarding_entscheider
  FOR ALL TO authenticated
  USING  (organisation_id = get_user_org_id() OR organisation_id IS NULL)
  WITH CHECK (organisation_id = get_user_org_id());

CREATE POLICY "public_entscheider_all" ON onboarding_entscheider
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_onboarding_entscheider_anfrage
  ON onboarding_entscheider(anfrage_id);


-- ── 4. onboarding_branding ────────────────────────────────────
-- White-Label pro Organisation für Onboarding-Formulare.
-- Separates, erweitertes Branding (globale branding-Tabelle bleibt unverändert).
-- Hinweis: 'firma_id REFERENCES firmen' aus dem Ticket = hier organisation_id,
--          da das Projekt keine firmen-Tabelle hat (→ organisationen-Tabelle / get_user_org_id()).

CREATE TABLE IF NOT EXISTS onboarding_branding (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id      uuid        UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Visuals
  logo_url             text,
  favicon_url          text,
  primaerfarbe         text        NOT NULL DEFAULT '#445c49',
  sekundaerfarbe       text        NOT NULL DEFAULT '#94c1a4',
  akzentfarbe          text        NOT NULL DEFAULT '#cba178',
  hintergrundfarbe     text        NOT NULL DEFAULT '#ffffff',
  schriftart           text        NOT NULL DEFAULT 'Inter',
  custom_css           text,
  -- Texte
  willkommens_text     text,
  abschluss_text       text,
  footer_text          text,
  -- Custom Domain (für zukünftiges White-Label Hosting)
  custom_domain        text,
  erstellt_am          timestamptz NOT NULL DEFAULT now(),
  aktualisiert_am      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE onboarding_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_branding_all" ON onboarding_branding
  FOR ALL TO authenticated
  USING  (organisation_id = get_user_org_id() OR organisation_id IS NULL)
  WITH CHECK (organisation_id = get_user_org_id());

-- Öffentlich lesbar – Kunden-Formular braucht Branding-Infos
CREATE POLICY "public_branding_select" ON onboarding_branding
  FOR SELECT TO anon USING (true);

CREATE OR REPLACE FUNCTION update_onboarding_branding_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.aktualisiert_am = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_onboarding_branding_updated_at
  BEFORE UPDATE ON onboarding_branding
  FOR EACH ROW EXECUTE FUNCTION update_onboarding_branding_updated_at();


-- ── 5. onboarding_checkliste ──────────────────────────────────
-- Smart-Checkliste: auto-generierte + manuelle Punkte pro Anfrage.
-- erledigt_von → auth.users (kein profiles-Table im Projekt)

CREATE TABLE IF NOT EXISTS onboarding_checkliste (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  anfrage_id      uuid        NOT NULL REFERENCES onboarding_anfragen(id) ON DELETE CASCADE,
  titel           text        NOT NULL,
  beschreibung    text,
  ist_erledigt    boolean     NOT NULL DEFAULT false,
  ist_automatisch boolean     NOT NULL DEFAULT false,  -- true = vom System generiert
  erledigt_am     timestamptz,
  erledigt_von    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  reihenfolge     int         NOT NULL DEFAULT 0,
  erstellt_am     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE onboarding_checkliste ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_checkliste_all" ON onboarding_checkliste
  FOR ALL TO authenticated
  USING  (organisation_id = get_user_org_id() OR organisation_id IS NULL)
  WITH CHECK (organisation_id = get_user_org_id());

CREATE POLICY "public_checkliste_select" ON onboarding_checkliste
  FOR SELECT TO anon USING (true);

CREATE INDEX IF NOT EXISTS idx_onboarding_checkliste_anfrage
  ON onboarding_checkliste(anfrage_id);


-- ── 6. Neue Spalten auf onboarding_anfragen ───────────────────
-- Zugangsinformationen + Vertrags-Basics als JSONB
-- (strukturierte Felder ohne weitere Normalisierung – skaliert gut für variable Keys)

ALTER TABLE onboarding_anfragen
  ADD COLUMN IF NOT EXISTS zugangs_infos  jsonb,
  -- Erwartete Keys: schluessel_typ, schluessel_anzahl, parkplatz, aufzug, etage,
  --                 lieferzeiten_einschraenkung, sonstige_zugangsinfos
  ADD COLUMN IF NOT EXISTS vertrags_basis jsonb;
  -- Erwartete Keys: preismodell ('festpreis'|'aufwand'|'hybrid'),
  --                 anzahlung_prozent, anzahlung_betrag,
  --                 elektr_unterschrift_gewuenscht, sonstige_vertragsinfos


-- ── 7. Index auf onboarding_sektionen.reihenfolge ─────────────
CREATE INDEX IF NOT EXISTS idx_onboarding_sektionen_reihenfolge
  ON onboarding_sektionen(vorlage_id, reihenfolge);
