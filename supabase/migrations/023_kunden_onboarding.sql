-- 023: Kunden-Onboarding-Anfragen
-- Öffentliches Formular, das Innenarchitekten per Link an neue Kunden schicken können.

CREATE TABLE IF NOT EXISTS onboarding_anfragen (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  token             text        UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  status            text        NOT NULL DEFAULT 'offen'
                                CHECK (status IN ('offen', 'abgeschlossen', 'abgelehnt')),
  -- Kundendaten (vom Kunden ausgefüllt)
  kunde_name        text,
  kunde_email       text,
  kunde_telefon     text,
  -- Projektdaten
  projekt_name      text,
  projekt_adresse   text,
  raumtypen         text[],
  budget_min        integer,
  budget_max        integer,
  stil_praeferenzen text,
  zeitrahmen        text,
  notizen           text,
  -- Timestamps
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Updated-at-Trigger (eigene Funktion um Konflikte zu vermeiden)
CREATE OR REPLACE FUNCTION update_onboarding_anfragen_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_onboarding_updated_at
  BEFORE UPDATE ON onboarding_anfragen
  FOR EACH ROW EXECUTE FUNCTION update_onboarding_anfragen_updated_at();

-- RLS
ALTER TABLE onboarding_anfragen ENABLE ROW LEVEL SECURITY;

-- Eingeloggte Nutzer haben vollen Zugriff (Dashboard)
CREATE POLICY "authenticated_full_access" ON onboarding_anfragen
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
