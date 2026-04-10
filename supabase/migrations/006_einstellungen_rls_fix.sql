-- RLS-Fix: bestehende Policies entfernen und neu anlegen
DROP POLICY IF EXISTS "Einstellungen lesen"    ON einstellungen;
DROP POLICY IF EXISTS "Einstellungen schreiben" ON einstellungen;

ALTER TABLE einstellungen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins können einstellungen lesen"
  ON einstellungen FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins können einstellungen schreiben"
  ON einstellungen FOR ALL
  USING (auth.role() = 'authenticated');

-- Neue Standardwerte (werden nur gesetzt, wenn noch nicht vorhanden)
INSERT INTO einstellungen (schluessel, wert) VALUES
  ('standardwaehrung',    'EUR'),
  ('sprache',             'Deutsch'),
  ('zeitzone',            'Europe/Berlin'),
  ('datumsformat',        'DD.MM.YYYY'),
  ('budget_warnschwelle', '80'),
  ('raumtypen',           'Büro,Studio,Wellness,Hotel,Privat,Wohnung,Sonstiges'),
  ('projektarten',        'Neubau,Renovation,Konzept,Beratung,Sonstiges'),
  ('freigabe_ablaufzeit', '30'),
  ('freigabe_pin_schutz', 'false')
ON CONFLICT (schluessel) DO NOTHING;
