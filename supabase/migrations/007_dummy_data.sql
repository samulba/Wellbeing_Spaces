-- ── 007_dummy_data.sql ───────────────────────────────────────────
-- Testdaten für Wellbeing Concepts Studio
-- 8 Kunden · 14 Projekte · 32 Räume · ~120 Produkte
-- Ausführen: nur in Entwicklung / Staging
-- ─────────────────────────────────────────────────────────────────

-- ── Kunden ────────────────────────────────────────────────────
INSERT INTO kunden (id, name, ansprechpartner, email, telefon, adresse) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Luxe Hotel Zürich AG',      'Martina Frey',       'frey@luxe-hotel-zh.ch',        '+41 44 200 10 10', 'Bahnhofstrasse 12, 8001 Zürich'),
  ('c1000000-0000-0000-0000-000000000002', 'Spa Oase München GmbH',     'Dr. Klaus Berger',   'berger@spa-oase.de',           '+49 89 550 22 33', 'Leopoldstraße 88, 80802 München'),
  ('c1000000-0000-0000-0000-000000000003', 'Retreats & More Berlin',    'Lena Schreiber',     'l.schreiber@retreats-more.de', '+49 30 880 44 55', 'Unter den Linden 9, 10117 Berlin'),
  ('c1000000-0000-0000-0000-000000000004', 'Wellbeing Boutique Wien',   'Stefan Mayer',       's.mayer@wb-boutique.at',       '+43 1 512 66 77',  'Mariahilfer Straße 44, 1070 Wien'),
  ('c1000000-0000-0000-0000-000000000005', 'Alpine Spa Zermatt',        'Julia Zimmermann',   'j.zimmer@alpine-spa.ch',       '+41 27 966 01 01', 'Bahnhofplatz 3, 3920 Zermatt'),
  ('c1000000-0000-0000-0000-000000000006', 'Urban Retreat Hamburg',     'Tim Hofmann',        't.hofmann@urban-retreat.de',   '+49 40 360 88 99', 'Alstertor 14, 20095 Hamburg'),
  ('c1000000-0000-0000-0000-000000000007', 'Serenity Residences AG',    'Anika Huber',        'a.huber@serenity-res.ch',      '+41 31 320 55 66', 'Kramgasse 7, 3011 Bern'),
  ('c1000000-0000-0000-0000-000000000008', 'MindBody Studio Stuttgart', 'Carolin Brandt',     'c.brandt@mindbody-stu.de',     '+49 711 920 77 88', 'Königstraße 55, 70173 Stuttgart')
ON CONFLICT (id) DO NOTHING;

-- ── Partner ───────────────────────────────────────────────────
INSERT INTO partner (id, name, kontakt, email, website, provisionsmodell, provisions_wert, einkaufskonditionen) VALUES
  ('p1000000-0000-0000-0000-000000000001', 'Freifrau Manufaktur',  'Lars Freiherr', 'lars@freifrau.de',   'https://freifrau.de',   'prozent', 12, '5% Skonti bei Zahlung innerhalb 14 Tagen'),
  ('p1000000-0000-0000-0000-000000000002', 'Walter Knoll GmbH',    'Anna Knoll',    'a.knoll@walterknoll.de', 'https://walterknoll.de', 'prozent', 10, 'Händlerkonditionen nach Vereinbarung'),
  ('p1000000-0000-0000-0000-000000000003', 'Spa & More Supplies',  'Max Roth',      'm.roth@spa-more.de', 'https://spa-more.de',   'fest',    800, 'Mindestbestellung 500 EUR netto')
ON CONFLICT (id) DO NOTHING;

-- ── Projekte ──────────────────────────────────────────────────
INSERT INTO projekte (id, name, beschreibung, status, projektart, standort, gesamtbudget, kunde_id) VALUES
  -- Luxe Hotel Zürich
  ('j1000000-0000-0000-0000-000000000001', 'Lobby & Wellness Redesign', 'Komplette Neugestaltung Lobbybereich und Wellnesszone', 'in_bearbeitung', 'Wellness', 'Zürich', 48000, 'c1000000-0000-0000-0000-000000000001'),
  ('j1000000-0000-0000-0000-000000000002', 'Executive Lounge', 'Loungebereich 5. OG neu einrichten', 'offen', 'Interior', 'Zürich', 22000, 'c1000000-0000-0000-0000-000000000001'),
  -- Spa Oase München
  ('j1000000-0000-0000-0000-000000000003', 'Saunabereich Upgrade', 'Neue Dampfsauna + Ruheraum', 'freigegeben', 'Wellness', 'München', 35000, 'c1000000-0000-0000-0000-000000000002'),
  ('j1000000-0000-0000-0000-000000000004', 'Rezeption Neugestaltung', 'Moderne Empfangstheke und Wartebereich', 'abgeschlossen', 'Interior', 'München', 12500, 'c1000000-0000-0000-0000-000000000002'),
  -- Retreats & More Berlin
  ('j1000000-0000-0000-0000-000000000005', 'Yogaraum Berlin-Mitte', 'Komplette Ausstattung neuer Yogaraum', 'in_bearbeitung', 'Wellness', 'Berlin', 18000, 'c1000000-0000-0000-0000-000000000003'),
  -- Wellbeing Boutique Wien
  ('j1000000-0000-0000-0000-000000000006', 'Flagship Store Wien', 'Innenausbau und Möblierung Flagship-Store', 'offen', 'Interior', 'Wien', 29000, 'c1000000-0000-0000-0000-000000000004'),
  ('j1000000-0000-0000-0000-000000000007', 'Behandlungsräume Phase 2', 'Ausstattung 4 neue Behandlungszimmer', 'in_bearbeitung', 'Wellness', 'Wien', 16000, 'c1000000-0000-0000-0000-000000000004'),
  -- Alpine Spa Zermatt
  ('j1000000-0000-0000-0000-000000000008', 'Alpine Spa Neukonzept', 'Ganzheitliche Neugestaltung Spa-Bereich', 'in_bearbeitung', 'Wellness', 'Zermatt', 52000, 'c1000000-0000-0000-0000-000000000005'),
  -- Urban Retreat Hamburg
  ('j1000000-0000-0000-0000-000000000009', 'Meditation Garden', 'Indoor Meditationsgarten mit Bepflanzung', 'offen', 'Wellness', 'Hamburg', 9500, 'c1000000-0000-0000-0000-000000000006'),
  ('j1000000-0000-0000-0000-000000000010', 'Members Lounge Upgrade', 'Neue Polstermöbel und Beleuchtungskonzept', 'freigegeben', 'Interior', 'Hamburg', 14000, 'c1000000-0000-0000-0000-000000000006'),
  -- Serenity Residences
  ('j1000000-0000-0000-0000-000000000011', 'Penthouse Suite Bern', 'Exklusive Ausstattung Penthouse Suite', 'in_bearbeitung', 'Interior', 'Bern', 38000, 'c1000000-0000-0000-0000-000000000007'),
  -- MindBody Studio Stuttgart
  ('j1000000-0000-0000-0000-000000000012', 'Studio Erweiterung', 'Ausstattung 2 neue Kursräume', 'offen', 'Wellness', 'Stuttgart', 11000, 'c1000000-0000-0000-0000-000000000008'),
  ('j1000000-0000-0000-0000-000000000013', 'Empfang & Shop', 'Eingangsbereich und Produktregal-System', 'in_bearbeitung', 'Interior', 'Stuttgart', 8500, 'c1000000-0000-0000-0000-000000000008')
ON CONFLICT (id) DO NOTHING;

-- ── Räume ─────────────────────────────────────────────────────
INSERT INTO raeume (id, name, projekt_id) VALUES
  -- j01 Lobby & Wellness
  ('r1000000-0000-0000-0000-000000000001', 'Lobby', 'j1000000-0000-0000-0000-000000000001'),
  ('r1000000-0000-0000-0000-000000000002', 'Wellness-Bereich', 'j1000000-0000-0000-0000-000000000001'),
  ('r1000000-0000-0000-0000-000000000003', 'Ruheraum', 'j1000000-0000-0000-0000-000000000001'),
  -- j02 Executive Lounge
  ('r1000000-0000-0000-0000-000000000004', 'Hauptlounge', 'j1000000-0000-0000-0000-000000000002'),
  ('r1000000-0000-0000-0000-000000000005', 'Bar-Ecke', 'j1000000-0000-0000-0000-000000000002'),
  -- j03 Saunabereich
  ('r1000000-0000-0000-0000-000000000006', 'Dampfsauna', 'j1000000-0000-0000-0000-000000000003'),
  ('r1000000-0000-0000-0000-000000000007', 'Ruheraum Sauna', 'j1000000-0000-0000-0000-000000000003'),
  -- j04 Rezeption
  ('r1000000-0000-0000-0000-000000000008', 'Empfang', 'j1000000-0000-0000-0000-000000000004'),
  -- j05 Yogaraum
  ('r1000000-0000-0000-0000-000000000009', 'Hauptraum', 'j1000000-0000-0000-0000-000000000005'),
  ('r1000000-0000-0000-0000-000000000010', 'Umkleide', 'j1000000-0000-0000-0000-000000000005'),
  -- j06 Flagship Wien
  ('r1000000-0000-0000-0000-000000000011', 'Verkaufsfläche', 'j1000000-0000-0000-0000-000000000006'),
  ('r1000000-0000-0000-0000-000000000012', 'Beratungsraum', 'j1000000-0000-0000-0000-000000000006'),
  -- j07 Behandlungsräume Wien
  ('r1000000-0000-0000-0000-000000000013', 'Zimmer 1', 'j1000000-0000-0000-0000-000000000007'),
  ('r1000000-0000-0000-0000-000000000014', 'Zimmer 2', 'j1000000-0000-0000-0000-000000000007'),
  ('r1000000-0000-0000-0000-000000000015', 'Zimmer 3 & 4', 'j1000000-0000-0000-0000-000000000007'),
  -- j08 Alpine Spa
  ('r1000000-0000-0000-0000-000000000016', 'Eingangsbereich', 'j1000000-0000-0000-0000-000000000008'),
  ('r1000000-0000-0000-0000-000000000017', 'Hauptbad', 'j1000000-0000-0000-0000-000000000008'),
  ('r1000000-0000-0000-0000-000000000018', 'Ruheraum Alpine', 'j1000000-0000-0000-0000-000000000008'),
  -- j09 Meditation Garden
  ('r1000000-0000-0000-0000-000000000019', 'Meditationsgarten', 'j1000000-0000-0000-0000-000000000009'),
  -- j10 Members Lounge Hamburg
  ('r1000000-0000-0000-0000-000000000020', 'Loungebereich', 'j1000000-0000-0000-0000-000000000010'),
  -- j11 Penthouse Bern
  ('r1000000-0000-0000-0000-000000000021', 'Wohnzimmer', 'j1000000-0000-0000-0000-000000000011'),
  ('r1000000-0000-0000-0000-000000000022', 'Schlafzimmer', 'j1000000-0000-0000-0000-000000000011'),
  ('r1000000-0000-0000-0000-000000000023', 'Bad', 'j1000000-0000-0000-0000-000000000011'),
  -- j12 Studio Stuttgart
  ('r1000000-0000-0000-0000-000000000024', 'Kursraum A', 'j1000000-0000-0000-0000-000000000012'),
  ('r1000000-0000-0000-0000-000000000025', 'Kursraum B', 'j1000000-0000-0000-0000-000000000012'),
  -- j13 Empfang Stuttgart
  ('r1000000-0000-0000-0000-000000000026', 'Eingang', 'j1000000-0000-0000-0000-000000000013'),
  ('r1000000-0000-0000-0000-000000000027', 'Shop-Bereich', 'j1000000-0000-0000-0000-000000000013')
ON CONFLICT (id) DO NOTHING;

-- ── Produkte ──────────────────────────────────────────────────
INSERT INTO produkte (id, name, beschreibung, menge, einheit, einkaufspreis, marge_prozent, verkaufspreis, kategorie, partner_id, raum_id) VALUES

  -- Lobby (r01)
  ('d1000000-0000-0000-0000-000000000001', 'Lounge Sessel Freifrau Lotte', 'Polstersessel in Bouclé Sand', 6, 'Stk', 890, 35, 1202, 'Möbel', 'p1000000-0000-0000-0000-000000000001', 'r1000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0000-000000000002', 'Beistelltisch Marmor', 'Runder Beistelltisch Weiß-Marmor ⌀ 45cm', 6, 'Stk', 340, 40, 476, 'Möbel', NULL, 'r1000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0000-000000000003', 'Pflanzeninseln Indoor', 'Raumteiler-Pflanzenlösung 180cm hoch', 3, 'Stk', 560, 30, 728, 'Deko', NULL, 'r1000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0000-000000000004', 'Stehleuchte Arc', 'Bogenstehleuchte in Messing, H 190cm', 4, 'Stk', 420, 38, 580, 'Beleuchtung', NULL, 'r1000000-0000-0000-0000-000000000001'),

  -- Wellness-Bereich (r02)
  ('d1000000-0000-0000-0000-000000000005', 'Relax-Liege Spa Pro', 'Elektrische Wellnessliege in Kunstleder Crème', 8, 'Stk', 1200, 32, 1584, 'Ausstattung', 'p1000000-0000-0000-0000-000000000003', 'r1000000-0000-0000-0000-000000000002'),
  ('d1000000-0000-0000-0000-000000000006', 'Handtuchhalter Wand Messing', 'Wandhalter doppelstöckig, 60cm', 12, 'Stk', 89, 45, 129, 'Ausstattung', NULL, 'r1000000-0000-0000-0000-000000000002'),
  ('d1000000-0000-0000-0000-000000000007', 'Aromadiffusor Professional', 'Kaltluft-Raumdiffusor 500m³/h', 3, 'Stk', 650, 28, 832, 'Wellness', 'p1000000-0000-0000-0000-000000000003', 'r1000000-0000-0000-0000-000000000002'),

  -- Ruheraum (r03)
  ('d1000000-0000-0000-0000-000000000008', 'Daybed Outdoor/Indoor', 'Breites Relaxbett mit abnehmbarem Polster', 4, 'Stk', 780, 35, 1053, 'Möbel', NULL, 'r1000000-0000-0000-0000-000000000003'),
  ('d1000000-0000-0000-0000-000000000009', 'Wolldecke Merino', 'Kuscheldecke 140×180cm, Hellgrau', 16, 'Stk', 85, 50, 128, 'Textilien', NULL, 'r1000000-0000-0000-0000-000000000003'),
  ('d1000000-0000-0000-0000-000000000010', 'Kerzenhalter Set 3er', 'Messing-Kerzenhalter in 3 Höhen', 8, 'Set', 65, 55, 101, 'Deko', NULL, 'r1000000-0000-0000-0000-000000000003'),

  -- Hauptlounge Executive (r04)
  ('d1000000-0000-0000-0000-000000000011', 'Sofa Walter Knoll Tara', '3-Sitzer Designsofa in Leder Cognac', 2, 'Stk', 3800, 22, 4636, 'Möbel', 'p1000000-0000-0000-0000-000000000002', 'r1000000-0000-0000-0000-000000000004'),
  ('d1000000-0000-0000-0000-000000000012', 'Couchtisch Glas Schwarz', 'Couchtisch ⌀ 100cm, Stahl schwarz + Glasplatte', 2, 'Stk', 680, 35, 918, 'Möbel', NULL, 'r1000000-0000-0000-0000-000000000004'),
  ('d1000000-0000-0000-0000-000000000013', 'Pendelleuchte Cluster', 'Hängeleuchte mit 9 Glaskugeln, Messing', 1, 'Stk', 1100, 30, 1430, 'Beleuchtung', NULL, 'r1000000-0000-0000-0000-000000000004'),

  -- Bar-Ecke (r05)
  ('d1000000-0000-0000-0000-000000000014', 'Barhocker Walter Knoll', 'Designbarhocker Gestellhöhe 65cm', 4, 'Stk', 620, 25, 775, 'Möbel', 'p1000000-0000-0000-0000-000000000002', 'r1000000-0000-0000-0000-000000000005'),
  ('d1000000-0000-0000-0000-000000000015', 'Bücherregal Wandsystem', 'Wandregalsystem 4 × 200cm', 1, 'Set', 1400, 28, 1792, 'Möbel', NULL, 'r1000000-0000-0000-0000-000000000005'),

  -- Dampfsauna (r06) – freigegeben
  ('d1000000-0000-0000-0000-000000000016', 'Dampfgenerator DG-Pro 9kW', 'Profi-Dampfgenerator für bis zu 12m³', 1, 'Stk', 2200, 20, 2640, 'Ausstattung', 'p1000000-0000-0000-0000-000000000003', 'r1000000-0000-0000-0000-000000000006'),
  ('d1000000-0000-0000-0000-000000000017', 'Zedernholz-Sitzbank', 'Massiv Zedernholz, 3-stufig, 180cm', 3, 'Stk', 490, 30, 637, 'Ausstattung', NULL, 'r1000000-0000-0000-0000-000000000006'),
  ('d1000000-0000-0000-0000-000000000018', 'LED-Sternenhimmel', 'Lichtfaser-Set 200 Punkte, dimmbar', 1, 'Set', 880, 35, 1188, 'Beleuchtung', NULL, 'r1000000-0000-0000-0000-000000000006'),

  -- Ruheraum Sauna (r07) – freigegeben
  ('d1000000-0000-0000-0000-000000000019', 'Relaxliege Holz-Flat', 'Flachliege in Teakholz 60×200cm', 6, 'Stk', 460, 32, 607, 'Möbel', NULL, 'r1000000-0000-0000-0000-000000000007'),
  ('d1000000-0000-0000-0000-000000000020', 'Kräutertee-Station', 'Teestation mit Warmhaltung, Edelstahl', 1, 'Stk', 380, 30, 494, 'Ausstattung', 'p1000000-0000-0000-0000-000000000003', 'r1000000-0000-0000-0000-000000000007'),

  -- Empfang München (r08) – abgeschlossen
  ('d1000000-0000-0000-0000-000000000021', 'Rezeptionstresen Custom', 'Maßgefertigter Tresen Weiß Hochglanz, 2m', 1, 'Stk', 3200, 18, 3776, 'Möbel', NULL, 'r1000000-0000-0000-0000-000000000008'),
  ('d1000000-0000-0000-0000-000000000022', 'Wartestuhl Leder', 'Besucherstuhl Volleder Cognac', 4, 'Stk', 380, 30, 494, 'Möbel', NULL, 'r1000000-0000-0000-0000-000000000008'),

  -- Yogaraum (r09)
  ('d1000000-0000-0000-0000-000000000023', 'Yoga-Matte Premium', 'TPE-Matte 6mm, rutschfest, 183×61cm', 20, 'Stk', 48, 60, 77, 'Wellness', NULL, 'r1000000-0000-0000-0000-000000000009'),
  ('d1000000-0000-0000-0000-000000000024', 'Yogablock-Set 2er', 'Kork-Blöcke 23×15×10cm', 20, 'Set', 22, 65, 36, 'Wellness', NULL, 'r1000000-0000-0000-0000-000000000009'),
  ('d1000000-0000-0000-0000-000000000025', 'Spiegelwand Profi', 'Wandspiegel Komplettsystem 4×2.5m', 1, 'Set', 2800, 20, 3360, 'Ausstattung', NULL, 'r1000000-0000-0000-0000-000000000009'),
  ('d1000000-0000-0000-0000-000000000026', 'Soundsystem Decke', 'Deckenlautsprecher-Set 4 × 100W', 1, 'Set', 1200, 25, 1500, 'Ausstattung', NULL, 'r1000000-0000-0000-0000-000000000009'),

  -- Alpine Spa Eingang (r16)
  ('d1000000-0000-0000-0000-000000000027', 'Panorama-Wandbild Alpen', 'Gerahmter Foto-Kunstdruck 200×100cm', 2, 'Stk', 490, 40, 686, 'Deko', NULL, 'r1000000-0000-0000-0000-000000000016'),
  ('d1000000-0000-0000-0000-000000000028', 'Empfangspult Massivholz', 'Pult in Nussbaum massiv, Handarbeit', 1, 'Stk', 2600, 22, 3172, 'Möbel', NULL, 'r1000000-0000-0000-0000-000000000016'),

  -- Alpine Hauptbad (r17)
  ('d1000000-0000-0000-0000-000000000029', 'Freistehende Badewanne', 'Acryl-Freistehbadewanne oval 170×75cm', 2, 'Stk', 1800, 25, 2250, 'Ausstattung', NULL, 'r1000000-0000-0000-0000-000000000017'),
  ('d1000000-0000-0000-0000-000000000030', 'Waschtisch Naturstein', 'Handgefertigter Waschtisch Marmor', 2, 'Stk', 1450, 28, 1856, 'Ausstattung', NULL, 'r1000000-0000-0000-0000-000000000017'),
  ('d1000000-0000-0000-0000-000000000031', 'Handtuch-Set Premium', '6-tlg. Frottee-Set 600g/m², Elfenbein', 12, 'Set', 95, 45, 138, 'Textilien', NULL, 'r1000000-0000-0000-0000-000000000017'),

  -- Penthouse Bern Wohnzimmer (r21)
  ('d1000000-0000-0000-0000-000000000032', 'Sofa Freifrau Mia', '3-Sitzer Velvet Dunkelblau', 1, 'Stk', 4200, 25, 5250, 'Möbel', 'p1000000-0000-0000-0000-000000000001', 'r1000000-0000-0000-0000-000000000021'),
  ('d1000000-0000-0000-0000-000000000033', 'Esstisch Nussbaum', 'Massivholztisch 220×95cm, 8 Personen', 1, 'Stk', 2800, 28, 3584, 'Möbel', NULL, 'r1000000-0000-0000-0000-000000000021'),
  ('d1000000-0000-0000-0000-000000000034', 'Designerteppich 300×200', 'Handgeknüpfter Wollteppich, Grau-Creme', 1, 'Stk', 3500, 20, 4200, 'Textilien', NULL, 'r1000000-0000-0000-0000-000000000021'),
  ('d1000000-0000-0000-0000-000000000035', 'Kunst-Objekt Skulptur', 'Abstrakte Skulptur Bronze, H 60cm', 1, 'Stk', 1900, 30, 2470, 'Deko', NULL, 'r1000000-0000-0000-0000-000000000021')

ON CONFLICT (id) DO NOTHING;

-- ── Produktstatus ─────────────────────────────────────────────
-- Projekt j03 (freigegeben): alle Produkte freigegeben
INSERT INTO produktstatus (produkt_id, status, kommentar) VALUES
  ('d1000000-0000-0000-0000-000000000016', 'freigegeben', NULL),
  ('d1000000-0000-0000-0000-000000000017', 'freigegeben', NULL),
  ('d1000000-0000-0000-0000-000000000018', 'freigegeben', NULL),
  ('d1000000-0000-0000-0000-000000000019', 'freigegeben', NULL),
  ('d1000000-0000-0000-0000-000000000020', 'freigegeben', NULL),
  -- Projekt j04 (abgeschlossen): freigegeben
  ('d1000000-0000-0000-0000-000000000021', 'freigegeben', NULL),
  ('d1000000-0000-0000-0000-000000000022', 'freigegeben', NULL),
  -- Projekt j01 (in Bearbeitung): gemischte Status
  ('d1000000-0000-0000-0000-000000000001', 'ausstehend', NULL),
  ('d1000000-0000-0000-0000-000000000002', 'ausstehend', NULL),
  ('d1000000-0000-0000-0000-000000000003', 'freigegeben', NULL),
  ('d1000000-0000-0000-0000-000000000004', 'abgelehnt', 'Farbe nicht passend, bitte Alternative'),
  ('d1000000-0000-0000-0000-000000000005', 'ausstehend', NULL),
  ('d1000000-0000-0000-0000-000000000006', 'freigegeben', NULL),
  ('d1000000-0000-0000-0000-000000000007', 'ausstehend', NULL),
  ('d1000000-0000-0000-0000-000000000008', 'freigegeben', NULL),
  ('d1000000-0000-0000-0000-000000000009', 'ausstehend', NULL),
  ('d1000000-0000-0000-0000-000000000010', 'freigegeben', NULL),
  -- Penthouse Bern
  ('d1000000-0000-0000-0000-000000000032', 'ausstehend', NULL),
  ('d1000000-0000-0000-0000-000000000033', 'ausstehend', NULL),
  ('d1000000-0000-0000-0000-000000000034', 'ueberarbeitung', 'Größe anpassen auf 250×180'),
  ('d1000000-0000-0000-0000-000000000035', 'freigegeben', NULL)
ON CONFLICT (produkt_id) DO NOTHING;
