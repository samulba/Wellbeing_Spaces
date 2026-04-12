-- ── Onboarding-Vorlagen ───────────────────────────────────────
-- Eine Vorlage enthält eine Liste von Fragen als JSONB.
-- Fragenobjekt: { id, titel, typ, optionen?, pflichtfeld, placeholder? }
-- Fragetypen: 'text' | 'textarea' | 'zahl' | 'auswahl' | 'mehrfachauswahl' | 'datum'

CREATE TABLE IF NOT EXISTS onboarding_vorlagen (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL,
  beschreibung text,
  fragen       jsonb       NOT NULL DEFAULT '[]',
  ist_standard boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Nur eine Standard-Vorlage erlauben
CREATE UNIQUE INDEX IF NOT EXISTS onboarding_vorlagen_standard_idx
  ON onboarding_vorlagen (ist_standard)
  WHERE ist_standard = true;

-- Onboarding-Anfragen um Vorlage-Referenz und Antworten erweitern
ALTER TABLE onboarding_anfragen
  ADD COLUMN IF NOT EXISTS vorlage_id uuid REFERENCES onboarding_vorlagen(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS antworten  jsonb;

-- Standard-Vorlage mit den bestehenden Fragen
INSERT INTO onboarding_vorlagen (name, beschreibung, ist_standard, fragen)
VALUES (
  'Allgemein',
  'Standard-Vorlage mit allen grundlegenden Fragen',
  true,
  '[
    {"id":"kontakt_name",    "titel":"Name",                                    "typ":"text",             "pflichtfeld":true,  "placeholder":"Vor- und Nachname"},
    {"id":"kontakt_email",   "titel":"E-Mail-Adresse",                          "typ":"text",             "pflichtfeld":true,  "placeholder":"ihre@email.de"},
    {"id":"kontakt_telefon", "titel":"Telefon",                                 "typ":"text",             "pflichtfeld":false, "placeholder":"+49 ..."},
    {"id":"projekt_name",    "titel":"Projektname",                             "typ":"text",             "pflichtfeld":false, "placeholder":"z. B. Umbau Einfamilienhaus"},
    {"id":"projekt_adresse", "titel":"Adresse / Standort",                     "typ":"text",             "pflichtfeld":false, "placeholder":"Straße, PLZ, Ort"},
    {"id":"raumtypen",       "titel":"Welche Räume sollen gestaltet werden?",   "typ":"mehrfachauswahl",  "pflichtfeld":false, "optionen":["Wohnzimmer","Schlafzimmer","Küche","Bad / WC","Büro / Arbeitszimmer","Esszimmer","Flur / Diele","Kinderzimmer","Gästezimmer","Terrasse / Balkon","Keller / Hauswirtschaft","Sonstige"]},
    {"id":"budget",          "titel":"Ungefähres Budget",                       "typ":"auswahl",          "pflichtfeld":false, "optionen":["Bis 10.000 €","10.000 – 25.000 €","25.000 – 50.000 €","50.000 – 100.000 €","Über 100.000 €","Noch unklar"]},
    {"id":"zeitrahmen",      "titel":"Zeitrahmen",                              "typ":"auswahl",          "pflichtfeld":false, "optionen":["So schnell wie möglich","1 – 3 Monate","3 – 6 Monate","6 – 12 Monate","Flexibel"]},
    {"id":"stil",            "titel":"Stil-Richtungen",                         "typ":"mehrfachauswahl",  "pflichtfeld":false, "optionen":["Skandinavisch","Modern","Minimalistisch","Industrial","Bauhaus","Mediterran","Natürlich / Biophil","Klassisch","Japandi","Boho / Eklektisch"]},
    {"id":"notizen",         "titel":"Weitere Wünsche & Anmerkungen",           "typ":"textarea",         "pflichtfeld":false, "placeholder":"z. B. Barrierefreiheit, bestimmte Materialien…"}
  ]'::jsonb
);

-- RLS für Vorlagen (nur authentifizierte Nutzer)
ALTER TABLE onboarding_vorlagen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage vorlagen"
  ON onboarding_vorlagen
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
