-- ─────────────────────────────────────────────────────────────
-- 030 · Client-Portal
-- Kunden-Login, Nachrichten, Dokumente, Aktivitäten, Benachrichtigungen
-- ─────────────────────────────────────────────────────────────

-- Portal-Nutzer (separate von Supabase Auth / Team)
CREATE TABLE IF NOT EXISTS client_users (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kunde_id            uuid NOT NULL UNIQUE REFERENCES kunden(id) ON DELETE CASCADE,
  email               text NOT NULL UNIQUE,
  password_hash       text,
  vorname             text NOT NULL DEFAULT '',
  nachname            text NOT NULL DEFAULT '',
  telefon             text,
  avatar_url          text,
  letzter_login       timestamptz,
  email_verifiziert   boolean NOT NULL DEFAULT false,
  aktiv               boolean NOT NULL DEFAULT true,
  preise_anzeigen     boolean NOT NULL DEFAULT true,
  einladungs_token    text UNIQUE,
  token_gueltig_bis   timestamptz,
  session_token       text UNIQUE,
  session_expires_at  timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Nachrichten zwischen Kunde ↔ Team
CREATE TABLE IF NOT EXISTS client_nachrichten (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projekt_id        uuid NOT NULL REFERENCES projekte(id) ON DELETE CASCADE,
  client_user_id    uuid REFERENCES client_users(id) ON DELETE SET NULL,
  team_user_id      uuid,
  von_kunde         boolean NOT NULL DEFAULT false,
  nachricht         text NOT NULL,
  gelesen           boolean NOT NULL DEFAULT false,
  gelesen_am        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Dokumente die dem Kunden freigegeben werden
CREATE TABLE IF NOT EXISTS client_dokumente (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projekt_id            uuid NOT NULL REFERENCES projekte(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  typ                   text NOT NULL DEFAULT 'sonstiges'
    CHECK (typ IN ('angebot','rechnung','vertrag','sonstiges')),
  datei_url             text NOT NULL,
  groesse_bytes         integer,
  hochgeladen_von       uuid,
  sichtbar_fuer_kunde   boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- Aktivitäts-Feed für den Kunden
CREATE TABLE IF NOT EXISTS client_aktivitaeten (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projekt_id    uuid NOT NULL REFERENCES projekte(id) ON DELETE CASCADE,
  kunde_id      uuid REFERENCES kunden(id) ON DELETE CASCADE,
  typ           text NOT NULL,
  titel         text NOT NULL,
  beschreibung  text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- In-App Benachrichtigungen
CREATE TABLE IF NOT EXISTS client_benachrichtigungen (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id    uuid NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
  typ               text NOT NULL,
  titel             text NOT NULL,
  link              text,
  gelesen           boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Storage Bucket für Kunden-Dokumente (privat)
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-dokumente', 'client-dokumente', false)
ON CONFLICT DO NOTHING;
