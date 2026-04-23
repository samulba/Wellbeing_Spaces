-- ============================================================
-- Migration 082 · Freigabe-Audit-Log
--
-- Protokolliert jede Statusänderung eines Raum-Produkts im
-- Freigabe-Kontext — beschrieben von Portal, Token, Admin-UI und
-- System (Auto-Invalidierung bei Produkt-Änderung nach bereits
-- erfolgter Freigabe).
--
-- Dient als nachvollziehbarer Audit-Trail für Admin-UI (Drawer
-- pro Token) und erfüllt Compliance-Anforderungen bei Kunden, die
-- „wer hat wann was freigegeben" nachweisen müssen.
-- ============================================================

CREATE TABLE IF NOT EXISTS freigabe_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  token_id UUID REFERENCES freigabe_tokens(id) ON DELETE SET NULL,
  raum_produkt_id UUID REFERENCES raum_produkte(id) ON DELETE CASCADE,
  alter_status TEXT,
  neuer_status TEXT NOT NULL,
  kommentar TEXT,
  geaendert_von TEXT NOT NULL,
  kanal TEXT NOT NULL CHECK (kanal IN ('portal','token','admin','system')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_freigabe_audit_org_token
  ON freigabe_audit (organisation_id, token_id);

CREATE INDEX IF NOT EXISTS idx_freigabe_audit_org_rp
  ON freigabe_audit (organisation_id, raum_produkt_id);

CREATE INDEX IF NOT EXISTS idx_freigabe_audit_created
  ON freigabe_audit (organisation_id, created_at DESC);

-- RLS org-scoped. Portal/Token-Flows laufen über createAdminClient
-- (bypass RLS), deshalb brauchen wir keine anon-Policy.
ALTER TABLE freigabe_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "freigabe_audit_org_access" ON freigabe_audit;

CREATE POLICY "freigabe_audit_org_access" ON freigabe_audit
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());

COMMENT ON TABLE freigabe_audit IS
  'Audit-Log aller Freigabe-Statusänderungen. Beschrieben von Portal, Token, Admin und System (Auto-Invalidierung).';
COMMENT ON COLUMN freigabe_audit.kanal IS
  'portal = Kunde im Kundenportal; token = öffentlicher Freigabe-Link; admin = Admin-UI; system = Auto-Invalidierung bei Produkt-Änderung.';
COMMENT ON COLUMN freigabe_audit.geaendert_von IS
  'Freitext-Name: bei Portal Email/Name, bei Token der im Abschluss eingegebene Name, bei Admin der User-Name, bei System "system".';
