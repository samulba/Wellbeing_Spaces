-- Migration 051: Elektro/Technik-Möbelsymbole
-- Erstellt: 2026-04-14
-- Koordinaten: 0–100 × 0–100 (wie alle anderen Symbole)

INSERT INTO moebel_symbole (name, svg_path, breite_cm, tiefe_cm, farbe, ist_system) VALUES

-- Steckdosen & Schalter
('Steckdose',
 'M50,50 m-42,0 a42,42 0 1,1 84,0 a42,42 0 1,1 -84,0 M35,60 L35,90 M65,60 L65,90',
 10, 10, '#3b82f6', true),

('Doppelsteckdose',
 'M25,50 m-20,0 a20,20 0 1,1 40,0 a20,20 0 1,1 -40,0 M15,65 L15,90 M35,65 L35,90 M75,50 m-20,0 a20,20 0 1,1 40,0 a20,20 0 1,1 -40,0 M65,65 L65,90 M85,65 L85,90',
 15, 10, '#3b82f6', true),

('Lichtschalter',
 'M10,10 L90,10 L90,90 L10,90 Z M50,20 L50,80 M20,50 L80,50',
 8, 8, '#f59e0b', true),

-- Leuchten
('Deckenlampe',
 'M50,50 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0 M50,50 m-18,0 a18,18 0 1,1 36,0 a18,18 0 1,1 -36,0 M50,5 L50,32 M50,68 L50,95 M5,50 L32,50 M68,50 L95,50',
 30, 30, '#fbbf24', true),

('Wandlampe',
 'M5,50 L25,50 M25,10 L25,90 L90,90 L90,10 Z M57,50 m-25,0 a25,25 0 1,1 50,0 a25,25 0 1,1 -50,0',
 20, 12, '#fbbf24', true),

('Einbauleuchte',
 'M50,50 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0 M50,50 m-20,0 a20,20 0 1,1 40,0 a20,20 0 1,1 -40,0 M50,50 m-8,0 a8,8 0 1,1 16,0 a8,8 0 1,1 -16,0',
 12, 12, '#fbbf24', true),

-- Anschlüsse
('TV-Anschluss',
 'M5,15 L95,15 L95,85 L5,85 Z M25,50 L75,50 M40,25 L40,75 M60,25 L60,75',
 10, 10, '#6b7280', true),

('Netzwerk/LAN',
 'M50,5 L50,30 M20,30 L80,30 M20,30 L20,60 M50,30 L50,60 M80,30 L80,60 M8,60 L32,60 L32,90 L8,90 Z M38,60 L62,60 L62,90 L38,90 Z M68,60 L92,60 L92,90 L68,90 Z',
 10, 10, '#6b7280', true),

-- Sicherheit & Komfort
('Rauchmelder',
 'M50,50 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0 M50,50 m-18,0 a18,18 0 1,1 36,0 a18,18 0 1,1 -36,0 M50,5 L50,15 M5,50 L15,50 M95,50 L85,50 M50,95 L50,85',
 15, 15, '#ef4444', true),

('Thermostat',
 'M10,5 L90,5 L90,95 L10,95 Z M20,25 L80,25 M20,45 L80,45 M20,65 L60,65 M50,75 A12,12,0,1,0,50.01,75',
 12, 12, '#10b981', true);
