-- Migration 017: Räume-Sortierung initialisieren
-- raeume.reihenfolge existiert bereits; wir setzen initiale Werte
-- basierend auf created_at, damit Drag & Drop einen sinnvollen Startpunkt hat.

UPDATE raeume
SET reihenfolge = sub.row_num
FROM (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY projekt_id ORDER BY created_at) - 1 AS row_num
  FROM raeume
  WHERE deleted_at IS NULL
) sub
WHERE raeume.id = sub.id
  AND raeume.reihenfolge = 0;
