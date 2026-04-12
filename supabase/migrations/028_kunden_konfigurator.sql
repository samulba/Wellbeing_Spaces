-- Migration 028: Kunden-Konfigurator
-- Erlaubt Kunden, Produkte selbst auszuwählen/abzulehnen mit Live-Budget

CREATE TABLE IF NOT EXISTS konfigurator_sessions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  projekt_id        uuid        NOT NULL REFERENCES projekte(id) ON DELETE CASCADE,
  token             text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status            text        NOT NULL DEFAULT 'aktiv' CHECK (status IN ('aktiv','abgeschlossen','abgelaufen')),
  kunde_notizen     text,
  budget_limit      integer,
  show_prices       boolean     NOT NULL DEFAULT true,
  allow_alternatives boolean    NOT NULL DEFAULT true,
  expires_at        timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS konfigurator_auswahl (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       uuid        NOT NULL REFERENCES konfigurator_sessions(id) ON DELETE CASCADE,
  produkt_id       uuid        NOT NULL REFERENCES produkte(id) ON DELETE CASCADE,
  status           text        NOT NULL DEFAULT 'unentschieden'
                               CHECK (status IN ('ausgewaehlt','abgelehnt','alternative_gewuenscht','unentschieden')),
  kunde_kommentar  text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, produkt_id)
);

CREATE INDEX IF NOT EXISTS konfigurator_sessions_projekt_idx ON konfigurator_sessions (projekt_id);
CREATE INDEX IF NOT EXISTS konfigurator_auswahl_session_idx  ON konfigurator_auswahl  (session_id);

-- updated_at Trigger
CREATE OR REPLACE FUNCTION update_konfigurator_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER konfigurator_sessions_updated_at
  BEFORE UPDATE ON konfigurator_sessions
  FOR EACH ROW EXECUTE FUNCTION update_konfigurator_updated_at();

CREATE TRIGGER konfigurator_auswahl_updated_at
  BEFORE UPDATE ON konfigurator_auswahl
  FOR EACH ROW EXECUTE FUNCTION update_konfigurator_updated_at();

-- RLS
ALTER TABLE konfigurator_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE konfigurator_auswahl  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth kann sessions lesen/schreiben"
  ON konfigurator_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Auth kann auswahl lesen/schreiben"
  ON konfigurator_auswahl FOR ALL TO authenticated USING (true) WITH CHECK (true);
