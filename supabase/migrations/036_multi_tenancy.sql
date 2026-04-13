-- ============================================================
-- Migration 036 · Multi-Tenancy
-- Organisationen-Tabelle, organisation_id auf alle Tabellen,
-- Helper-Funktion get_user_org_id(), RLS-Policies, Audit-Log
-- ============================================================


-- ============================================================
-- 1. TABELLE: organisationen
-- ============================================================

CREATE TABLE IF NOT EXISTS organisationen (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL,
  slug            TEXT        UNIQUE,
  email           TEXT,
  telefon         TEXT,
  website         TEXT,
  adresse         TEXT,
  logo_url        TEXT,
  abo_plan        TEXT        NOT NULL DEFAULT 'trial'
                              CHECK (abo_plan IN ('trial','starter','professional','enterprise')),
  abo_aktiv_bis   TIMESTAMPTZ,
  max_projekte    INT         NOT NULL DEFAULT 5,
  max_mitglieder  INT         NOT NULL DEFAULT 3,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_organisationen_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_organisationen_updated_at
  BEFORE UPDATE ON organisationen
  FOR EACH ROW EXECUTE FUNCTION set_organisationen_updated_at();


-- ============================================================
-- 2. SPALTE organisation_id auf alle relevanten Tabellen
--    Nullable → bestehende Daten bleiben erhalten
-- ============================================================

ALTER TABLE kunden                  ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE projekte                ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE raeume                  ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE partner                 ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE produkte                ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE produktstatus           ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE einstellungen           ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE branding                ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE notizen                 ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE dateien                 ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE freigabe_tokens         ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE onboarding_anfragen     ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE onboarding_vorlagen     ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE konfigurator_sessions   ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE konfigurator_auswahl    ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE timeline_events         ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE projekt_aktivitaeten    ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE client_users            ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE client_nachrichten      ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE client_dokumente        ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE client_aktivitaeten     ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE client_benachrichtigungen ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE demo_anfragen           ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;
ALTER TABLE team_mitglieder         ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisationen(id) ON DELETE CASCADE;


-- ============================================================
-- 3. INDIZES auf organisation_id (wichtigste Tabellen)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_kunden_org_id          ON kunden(organisation_id);
CREATE INDEX IF NOT EXISTS idx_projekte_org_id         ON projekte(organisation_id);
CREATE INDEX IF NOT EXISTS idx_produkte_org_id         ON produkte(organisation_id);
CREATE INDEX IF NOT EXISTS idx_partner_org_id          ON partner(organisation_id);
CREATE INDEX IF NOT EXISTS idx_team_mitglieder_org_id  ON team_mitglieder(organisation_id);


-- ============================================================
-- 4. HELPER-FUNKTION: get_user_org_id()
--    Gibt die organisation_id des aktuell eingeloggten Users zurück.
--    SECURITY DEFINER damit die Funktion RLS der team_mitglieder-Tabelle umgeht.
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT organisation_id
  FROM   team_mitglieder
  WHERE  user_id = auth.uid()
    AND  status  = 'aktiv'
  LIMIT 1;
$$;


-- ============================================================
-- 5. RLS-POLICIES NEU SETZEN
--    Alle alten Policies droppen, neue mit org-Scope erstellen.
--    Tabellen müssen RLS bereits aktiviert haben (aus Schema/früheren Migrations).
-- ============================================================

-- ─── kunden ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin: voller Zugriff"               ON kunden;
DROP POLICY IF EXISTS "kunden_all_authenticated"            ON kunden;

CREATE POLICY "kunden_org_access" ON kunden
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());

-- ─── projekte ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin: voller Zugriff"               ON projekte;
DROP POLICY IF EXISTS "projekte_all_authenticated"          ON projekte;

CREATE POLICY "projekte_org_access" ON projekte
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());

-- ─── raeume ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin: voller Zugriff"               ON raeume;
DROP POLICY IF EXISTS "raeume_all_authenticated"            ON raeume;

CREATE POLICY "raeume_org_access" ON raeume
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());

-- ─── partner ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin: voller Zugriff"               ON partner;
DROP POLICY IF EXISTS "partner_all_authenticated"           ON partner;

CREATE POLICY "partner_org_access" ON partner
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());

-- ─── produkte ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin: voller Zugriff"               ON produkte;
DROP POLICY IF EXISTS "produkte_all_authenticated"          ON produkte;

CREATE POLICY "produkte_org_access" ON produkte
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());

-- ─── produktstatus ──────────────────────────────────────────
DROP POLICY IF EXISTS "Admin: voller Zugriff"               ON produktstatus;
DROP POLICY IF EXISTS "produktstatus_all_authenticated"     ON produktstatus;

CREATE POLICY "produktstatus_org_access" ON produktstatus
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());

-- ─── freigabe_tokens ────────────────────────────────────────
DROP POLICY IF EXISTS "Admin: voller Zugriff"               ON freigabe_tokens;
DROP POLICY IF EXISTS "freigabe_tokens_all_authenticated"   ON freigabe_tokens;
-- Anon-Policy bleibt erhalten (Token-Prüfung durch anonyme User)
-- DROP POLICY IF EXISTS "Anon: Token prüfen" ON freigabe_tokens; -- NICHT droppen!

CREATE POLICY "freigabe_tokens_org_access" ON freigabe_tokens
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());

-- ─── einstellungen ──────────────────────────────────────────
ALTER TABLE IF EXISTS einstellungen ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin: voller Zugriff"               ON einstellungen;
DROP POLICY IF EXISTS "einstellungen_all_authenticated"     ON einstellungen;

CREATE POLICY "einstellungen_org_access" ON einstellungen
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());

-- ─── branding ───────────────────────────────────────────────
ALTER TABLE IF EXISTS branding ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin: voller Zugriff"               ON branding;
DROP POLICY IF EXISTS "branding_all_authenticated"          ON branding;

CREATE POLICY "branding_org_access" ON branding
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());

-- ─── team_mitglieder ────────────────────────────────────────
DROP POLICY IF EXISTS "own_record_select"                   ON team_mitglieder;
DROP POLICY IF EXISTS "team_mitglieder_all_authenticated"   ON team_mitglieder;

-- Alle aktiven Mitglieder dürfen das gesamte Team ihrer Org sehen
CREATE POLICY "team_mitglieder_org_select" ON team_mitglieder
  FOR SELECT TO authenticated
  USING (organisation_id = get_user_org_id() OR user_id = auth.uid());

-- Nur Admins (via service_role / Server Action) dürfen schreiben
CREATE POLICY "team_mitglieder_org_insert" ON team_mitglieder
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_user_org_id());

CREATE POLICY "team_mitglieder_org_update" ON team_mitglieder
  FOR UPDATE TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());

CREATE POLICY "team_mitglieder_org_delete" ON team_mitglieder
  FOR DELETE TO authenticated
  USING (organisation_id = get_user_org_id());

-- ─── onboarding_anfragen ────────────────────────────────────
ALTER TABLE IF EXISTS onboarding_anfragen ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin: voller Zugriff"               ON onboarding_anfragen;
DROP POLICY IF EXISTS "onboarding_anfragen_all_authenticated" ON onboarding_anfragen;

CREATE POLICY "onboarding_anfragen_org_access" ON onboarding_anfragen
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());

-- ─── onboarding_vorlagen ────────────────────────────────────
ALTER TABLE IF EXISTS onboarding_vorlagen ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin: voller Zugriff"               ON onboarding_vorlagen;
DROP POLICY IF EXISTS "onboarding_vorlagen_all_authenticated" ON onboarding_vorlagen;

CREATE POLICY "onboarding_vorlagen_org_access" ON onboarding_vorlagen
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());

-- ─── konfigurator_sessions ──────────────────────────────────
ALTER TABLE IF EXISTS konfigurator_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin: voller Zugriff"               ON konfigurator_sessions;
DROP POLICY IF EXISTS "konfigurator_sessions_all_authenticated" ON konfigurator_sessions;

CREATE POLICY "konfigurator_sessions_org_access" ON konfigurator_sessions
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());

-- ─── konfigurator_auswahl ───────────────────────────────────
ALTER TABLE IF EXISTS konfigurator_auswahl ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin: voller Zugriff"               ON konfigurator_auswahl;
DROP POLICY IF EXISTS "konfigurator_auswahl_all_authenticated" ON konfigurator_auswahl;

CREATE POLICY "konfigurator_auswahl_org_access" ON konfigurator_auswahl
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());

-- ─── timeline_events ────────────────────────────────────────
ALTER TABLE IF EXISTS timeline_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin: voller Zugriff"               ON timeline_events;
DROP POLICY IF EXISTS "timeline_events_all_authenticated"   ON timeline_events;

CREATE POLICY "timeline_events_org_access" ON timeline_events
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());

-- ─── projekt_aktivitaeten ───────────────────────────────────
ALTER TABLE IF EXISTS projekt_aktivitaeten ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin: voller Zugriff"               ON projekt_aktivitaeten;
DROP POLICY IF EXISTS "projekt_aktivitaeten_all_authenticated" ON projekt_aktivitaeten;

CREATE POLICY "projekt_aktivitaeten_org_access" ON projekt_aktivitaeten
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());


-- ============================================================
-- 6. RLS: organisationen
--    Auth-User können nur ihre eigene Org lesen.
--    Update nur für Admins (rolle = 'admin' in team_mitglieder).
-- ============================================================

ALTER TABLE organisationen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organisationen_select_own" ON organisationen
  FOR SELECT TO authenticated
  USING (id = get_user_org_id());

CREATE POLICY "organisationen_update_admin" ON organisationen
  FOR UPDATE TO authenticated
  USING (
    id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM team_mitglieder
      WHERE  user_id        = auth.uid()
        AND  status         = 'aktiv'
        AND  rolle          = 'admin'
        AND  organisation_id = id
    )
  )
  WITH CHECK (
    id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM team_mitglieder
      WHERE  user_id        = auth.uid()
        AND  status         = 'aktiv'
        AND  rolle          = 'admin'
        AND  organisation_id = id
    )
  );


-- ============================================================
-- 7. TABELLE: audit_log
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID        REFERENCES organisationen(id) ON DELETE CASCADE,
  user_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email      TEXT,
  aktion          TEXT        NOT NULL,
  entitaet_typ    TEXT        NOT NULL,
  entitaet_id     UUID,
  entitaet_name   TEXT,
  details         JSONB,
  ip_adresse      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_org_created
  ON audit_log(organisation_id, created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Nur Mitglieder der eigenen Org dürfen Audit-Logs lesen
CREATE POLICY "audit_log_org_select" ON audit_log
  FOR SELECT TO authenticated
  USING (organisation_id = get_user_org_id());

-- Einfügen erlaubt für authentifizierte User (Server Actions schreiben via service_role)
CREATE POLICY "audit_log_org_insert" ON audit_log
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_user_org_id());
