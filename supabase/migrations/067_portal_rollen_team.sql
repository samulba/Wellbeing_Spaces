-- ============================================================
-- Migration 067 · Portal: Mehrere Teammitglieder pro Kunde + Rollen
-- ============================================================
-- Heute: UNIQUE(kunde_id) erlaubt nur EINEN Portal-Nutzer pro Kunde.
-- Künftig soll der Inhaber weitere Mitarbeiter in das Portal einladen können.
--
-- Änderungen
--   • UNIQUE(kunde_id) auflösen
--   • rolle text (inhaber | mitarbeiter | gast) + CHECK
--   • eingeladen_von UUID (self-fk auf client_users) — optional für Audit
--   • Bestehende Einträge bekommen rolle = 'inhaber'
--   • Indizes für schnelles Team-Loading pro Kunde
--
-- E-Mail bleibt UNIQUE (globale Kundenportal-Identität, ein User kann nicht
-- gleichzeitig in zwei Kunden-Portalen mit derselben Mail sein).

-- 1) rolle-Feld anlegen
ALTER TABLE client_users
  ADD COLUMN IF NOT EXISTS rolle          text  NOT NULL DEFAULT 'mitarbeiter',
  ADD COLUMN IF NOT EXISTS eingeladen_von uuid  REFERENCES client_users(id) ON DELETE SET NULL;

-- Bestehende Datensätze sind automatisch Inhaber (der vom Designer eingeladene User)
UPDATE client_users SET rolle = 'inhaber' WHERE rolle = 'mitarbeiter';

-- CHECK-Constraint separat (macht ADD COLUMN IF NOT EXISTS zuverlässig)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'client_users_rolle_check'
  ) THEN
    ALTER TABLE client_users
      ADD CONSTRAINT client_users_rolle_check
      CHECK (rolle IN ('inhaber', 'mitarbeiter', 'gast'));
  END IF;
END $$;

-- 2) UNIQUE(kunde_id) auflösen — mehrere Nutzer pro Kunde erlaubt
DO $$
DECLARE
  v_conname text;
BEGIN
  SELECT conname INTO v_conname
  FROM pg_constraint c
  JOIN pg_class      t ON t.oid = c.conrelid
  WHERE t.relname = 'client_users'
    AND c.contype = 'u'
    AND pg_get_constraintdef(c.oid) ILIKE '%UNIQUE (kunde_id)%';
  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE client_users DROP CONSTRAINT %I', v_conname);
  END IF;
END $$;

-- 3) Index für Team-Loading
CREATE INDEX IF NOT EXISTS idx_client_users_kunde_id
  ON client_users(kunde_id)
  WHERE aktiv = true;

COMMENT ON COLUMN client_users.rolle IS
  'Portal-Rolle: inhaber (kann einladen + alles verwalten) | mitarbeiter (freigeben, kommentieren) | gast (read-only)';
COMMENT ON COLUMN client_users.eingeladen_von IS
  'Client-User, der diesen Nutzer eingeladen hat (für Audit/Attribution).';
