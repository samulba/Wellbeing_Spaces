-- Migration 032: Icon-Spalte für Räume
ALTER TABLE raeume ADD COLUMN IF NOT EXISTS icon text DEFAULT NULL;
