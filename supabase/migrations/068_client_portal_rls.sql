-- ============================================================
-- Migration 068 · Row Level Security für Client-Portal-Tabellen
--
-- Schließt kritische Multi-Tenancy-Lücke: Tabellen aus Mig. 030
-- (client_users/_nachrichten/_dokumente/_aktivitaeten/_benachrichtigungen)
-- hatten KEINE RLS-Policies. Seit Mig. 036 existiert organisation_id,
-- aber die Policies wurden damals nur für die Kern-Tabellen gesetzt.
--
-- Designer/Admin (auth.users): Zugriff nur auf eigene Org via get_user_org_id().
-- Portal-Kunden-Flows laufen über createAdminClient (bypasses RLS) — bleibt
-- funktional, weil Admin-Client weiterhin alle Zeilen sieht.
-- ============================================================


-- ─── client_users ───────────────────────────────────────────
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_users_all_authenticated" ON client_users;
DROP POLICY IF EXISTS "client_users_org_access"        ON client_users;

CREATE POLICY "client_users_org_access" ON client_users
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());


-- ─── client_nachrichten ─────────────────────────────────────
ALTER TABLE client_nachrichten ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_nachrichten_all_authenticated" ON client_nachrichten;
DROP POLICY IF EXISTS "client_nachrichten_org_access"        ON client_nachrichten;

CREATE POLICY "client_nachrichten_org_access" ON client_nachrichten
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());


-- ─── client_dokumente ───────────────────────────────────────
ALTER TABLE client_dokumente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_dokumente_all_authenticated" ON client_dokumente;
DROP POLICY IF EXISTS "client_dokumente_org_access"        ON client_dokumente;

CREATE POLICY "client_dokumente_org_access" ON client_dokumente
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());


-- ─── client_aktivitaeten ────────────────────────────────────
ALTER TABLE client_aktivitaeten ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_aktivitaeten_all_authenticated" ON client_aktivitaeten;
DROP POLICY IF EXISTS "client_aktivitaeten_org_access"        ON client_aktivitaeten;

CREATE POLICY "client_aktivitaeten_org_access" ON client_aktivitaeten
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());


-- ─── client_benachrichtigungen ──────────────────────────────
ALTER TABLE client_benachrichtigungen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_benachrichtigungen_all_authenticated" ON client_benachrichtigungen;
DROP POLICY IF EXISTS "client_benachrichtigungen_org_access"        ON client_benachrichtigungen;

CREATE POLICY "client_benachrichtigungen_org_access" ON client_benachrichtigungen
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());


-- ============================================================
-- Index auf organisation_id für Performance (Listen-Queries)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_client_users_org_id
  ON client_users(organisation_id) WHERE organisation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_client_nachrichten_org_id
  ON client_nachrichten(organisation_id) WHERE organisation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_client_dokumente_org_id
  ON client_dokumente(organisation_id) WHERE organisation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_client_aktivitaeten_org_id
  ON client_aktivitaeten(organisation_id) WHERE organisation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_client_benachrichtigungen_org_id
  ON client_benachrichtigungen(organisation_id) WHERE organisation_id IS NOT NULL;
