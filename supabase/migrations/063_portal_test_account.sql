-- ============================================================
-- Migration 063 · Test-Account für Kunden-Portal
-- ============================================================
-- Legt einen Test-Kunden + aktiven Portal-Zugang an, damit man das
-- Portal als "Kunde" ausprobieren kann.
--
-- Login:   test-portal@wellbeing-spaces.de
-- Passwort: TestPortal2026!
--
-- Der bcrypt-Hash unten wurde mit bcryptjs rounds=10 erzeugt.
-- Ausführung ist idempotent (ON CONFLICT DO NOTHING bei Kunde,
-- Update bei client_users).

DO $$
DECLARE
  v_org_id    uuid;
  v_kunde_id  uuid;
BEGIN
  -- Erste Organisation nehmen (bei Single-Tenant sowieso die einzige)
  SELECT id INTO v_org_id FROM organisationen ORDER BY created_at LIMIT 1;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Keine Organisation gefunden. Bitte zuerst eine Org anlegen.';
  END IF;

  -- Test-Kunde anlegen (falls noch nicht vorhanden)
  INSERT INTO kunden (name, email, organisation_id, status)
  VALUES ('Test-Portal Kunde', 'test-portal@wellbeing-spaces.de', v_org_id, 'aktiv')
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_kunde_id
  FROM kunden
  WHERE email = 'test-portal@wellbeing-spaces.de'
  LIMIT 1;

  -- Portal-User anlegen/aktualisieren
  INSERT INTO client_users (
    kunde_id, email, password_hash, vorname, nachname,
    aktiv, email_verifiziert, preise_anzeigen
  ) VALUES (
    v_kunde_id,
    'test-portal@wellbeing-spaces.de',
    '$2b$10$8.wW/43/YoBWRXhU2q9oHOzlwMe3ed4PEIQ62Z0OF43l2dni3gZ7C',
    'Test',
    'Kunde',
    true, true, true
  )
  ON CONFLICT (kunde_id) DO UPDATE SET
    email             = EXCLUDED.email,
    password_hash     = EXCLUDED.password_hash,
    aktiv             = true,
    email_verifiziert = true,
    einladungs_token  = NULL,
    token_gueltig_bis = NULL,
    updated_at        = now();
END $$;
