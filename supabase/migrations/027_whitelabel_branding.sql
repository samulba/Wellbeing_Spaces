-- Migration 027: Whitelabel / Custom Branding
-- Einzelne Branding-Konfiguration pro Installation (Single-Tenant)

CREATE TABLE IF NOT EXISTS branding (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  firmenname        text        NOT NULL DEFAULT 'Wellbeing Spaces',
  logo_url          text,
  favicon_url       text,
  primary_color     text        NOT NULL DEFAULT '#445c49',
  secondary_color   text        NOT NULL DEFAULT '#94c1a4',
  accent_color      text        NOT NULL DEFAULT '#f6ede2',
  background_color  text        NOT NULL DEFAULT '#f6ede2',
  text_color        text        NOT NULL DEFAULT '#1a2e1e',
  font_family       text        NOT NULL DEFAULT 'Inter',
  email             text,
  telefon           text,
  website           text,
  adresse           text,
  impressum_text    text,
  datenschutz_url   text,
  show_powered_by   boolean     NOT NULL DEFAULT true,
  custom_css        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_branding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER branding_updated_at
  BEFORE UPDATE ON branding
  FOR EACH ROW EXECUTE FUNCTION update_branding_updated_at();

-- Standard-Datensatz einfügen (genau einen Eintrag)
INSERT INTO branding (firmenname)
VALUES ('Wellbeing Spaces')
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authentifizierte Nutzer können Branding lesen"
  ON branding FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authentifizierte Nutzer können Branding aktualisieren"
  ON branding FOR UPDATE TO authenticated USING (true);
