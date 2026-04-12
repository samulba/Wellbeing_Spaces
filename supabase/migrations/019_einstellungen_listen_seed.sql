-- Sicherstellen dass alle Listen-Schlüssel in der einstellungen-Tabelle existieren
-- (ON CONFLICT DO NOTHING – überschreibt keine vorhandenen Werte)
INSERT INTO einstellungen (schluessel, wert) VALUES
  ('produktkategorien', 'Möbel,Leuchten,Textilien,Accessoires,Pflanzen,Sonstiges'),
  ('raumtypen',         'Büro,Studio,Wellness,Hotel,Privat,Wohnung,Sonstiges'),
  ('projektarten',      'Neubau,Renovation,Konzept,Beratung,Sonstiges')
ON CONFLICT (schluessel) DO NOTHING;
