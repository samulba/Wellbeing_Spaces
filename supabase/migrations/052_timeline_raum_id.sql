-- Migration 052: raum_id auf timeline_events
-- Fügt raum_id hinzu damit Timeline-Events einem Raum zugeordnet werden können.

ALTER TABLE timeline_events
  ADD COLUMN IF NOT EXISTS raum_id UUID REFERENCES raeume(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_timeline_events_raum_id ON timeline_events(raum_id);
