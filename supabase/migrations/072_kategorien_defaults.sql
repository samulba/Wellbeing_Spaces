-- ============================================================
-- Migration 072 · Kategorien-Defaults korrigieren
--
-- Die ursprüngliche Seed-Logik (Mig. 019) hatte Projektart und Raumtyp
-- semantisch verwechselt. Ergebnis: „Hotel/Büro/Wellness" tauchten als
-- Raumtypen auf, während „Neubau/Renovation" unter Projektarten standen.
--
-- Neue Struktur:
--   - Projektart = Kontext des Kunden (Hotel, Büro, Privat, Praxis, …)
--   - Raumtyp    = einzelner Raum   (Küche, Bad, Wohnzimmer, …)
--
-- Diese Migration fügt die neuen korrekten Default-Kategorien für ALLE
-- bestehenden Organisationen ein. Bereits angelegte Kategorien der User
-- bleiben unberührt (ON CONFLICT DO NOTHING via UNIQUE-Index).
-- ============================================================

-- Projektarten (Kontext des Kunden / Gebäudetyp)
INSERT INTO kategorien (organisation_id, typ, name, icon, reihenfolge)
SELECT o.id, 'projektart', v.name, v.icon, v.reihenfolge
  FROM organisationen o
  CROSS JOIN (VALUES
    ('Privat',       'Home',        1),
    ('Gewerbe',      'Store',       2),
    ('Hotel',        'Hotel',       3),
    ('Büro',         'Building',    4),
    ('Praxis',       'Heart',       5),
    ('Gastronomie',  'Utensils',    6),
    ('Wellness',     'Waves',       7),
    ('Einzelhandel', 'ShoppingBag', 8)
  ) AS v(name, icon, reihenfolge)
ON CONFLICT (organisation_id, typ, name) DO NOTHING;

-- Raumtypen (einzelne Räume)
INSERT INTO kategorien (organisation_id, typ, name, icon, reihenfolge)
SELECT o.id, 'raumtyp', v.name, v.icon, v.reihenfolge
  FROM organisationen o
  CROSS JOIN (VALUES
    ('Wohnzimmer',        'Sofa',      1),
    ('Esszimmer',         'Utensils',  2),
    ('Küche',             'ChefHat',   3),
    ('Schlafzimmer',      'BedDouble', 4),
    ('Kinderzimmer',      'Bed',       5),
    ('Bad',               'Bath',      6),
    ('WC',                'Droplet',   7),
    ('Flur',              'DoorOpen',  8),
    ('Büro',              'Monitor',   9),
    ('Empfang',           'Star',     10),
    ('Besprechungsraum',  'Grid',     11),
    ('Lager',             'Archive',  12),
    ('Balkon / Terrasse', 'Palmtree', 13)
  ) AS v(name, icon, reihenfolge)
ON CONFLICT (organisation_id, typ, name) DO NOTHING;
