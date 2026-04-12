-- Migration 029: Projekt-Timeline / Gantt-Chart

CREATE TABLE IF NOT EXISTS timeline_events (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  projekt_id       uuid        NOT NULL REFERENCES projekte(id) ON DELETE CASCADE,
  titel            text        NOT NULL,
  beschreibung     text,
  typ              text        NOT NULL DEFAULT 'termin'
                               CHECK (typ IN ('meilenstein','lieferung','termin','phase')),
  start_datum      date        NOT NULL,
  end_datum        date,
  status           text        NOT NULL DEFAULT 'geplant'
                               CHECK (status IN ('geplant','in_arbeit','abgeschlossen','verspaetet')),
  farbe            text,
  abhaengig_von    uuid[]      DEFAULT '{}',
  verantwortlich   text,
  erinnerung_tage  integer,
  reihenfolge      integer     NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Liefertermin auf Produkte
ALTER TABLE produkte
  ADD COLUMN IF NOT EXISTS liefertermin            date,
  ADD COLUMN IF NOT EXISTS liefertermin_bestaetigt boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS timeline_events_projekt_idx ON timeline_events (projekt_id);
CREATE INDEX IF NOT EXISTS timeline_events_datum_idx   ON timeline_events (start_datum);

-- updated_at Trigger
CREATE OR REPLACE FUNCTION update_timeline_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER timeline_events_updated_at
  BEFORE UPDATE ON timeline_events
  FOR EACH ROW EXECUTE FUNCTION update_timeline_updated_at();

-- Initialisiere reihenfolge-Sequenz
CREATE OR REPLACE FUNCTION init_timeline_reihenfolge()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reihenfolge = 0 THEN
    SELECT COALESCE(MAX(reihenfolge), 0) + 1 INTO NEW.reihenfolge
    FROM timeline_events WHERE projekt_id = NEW.projekt_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER timeline_events_reihenfolge
  BEFORE INSERT ON timeline_events
  FOR EACH ROW EXECUTE FUNCTION init_timeline_reihenfolge();

-- RLS
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth kann events lesen/schreiben"
  ON timeline_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
