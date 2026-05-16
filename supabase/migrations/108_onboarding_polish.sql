-- ============================================================
-- Migration 108 · Onboarding-Komplettueberarbeitung
--
-- 1. titel TEXT auf onboarding_anfragen — persistenter Anzeige-
--    Titel, beim Erstellen aus Kundennamen vorbelegt, durch Submit
--    NIE ueberschrieben (verhindert Bug: Name verschwindet nach
--    Einreichung).
-- 2. vorlage_snapshot JSONB auf onboarding_anfragen — Snapshot der
--    Vorlage zum Erstell-Zeitpunkt; spaetere Vorlage-Aenderungen
--    beeinflussen bestehende Anfragen nicht (Versionierung).
-- 3. Backfill: titel aus kunde_name/empfaenger_label uebernehmen.
-- 4. Storage-Bucket onboarding-uploads (private, 50 MB) mit
--    Token-basierter Anon-Insert-Policy (Kunden laden Dateien ueber
--    den oeffentlichen Onboarding-Link hoch, ohne Auth).
-- 5. upload_max_dateien als Frage-Konfig (gespeichert in vorlage.fragen JSONB,
--    daher kein Schema-Change — nur Type-Anpassung im Code).
-- ============================================================

-- ── 1) titel-Spalte ────────────────────────────────────────────
ALTER TABLE onboarding_anfragen
  ADD COLUMN IF NOT EXISTS titel TEXT;

-- ── 2) vorlage_snapshot-Spalte ─────────────────────────────────
ALTER TABLE onboarding_anfragen
  ADD COLUMN IF NOT EXISTS vorlage_snapshot JSONB;

-- ── 3) Backfill: titel aus kunde_name/empfaenger_label ableiten ──
UPDATE onboarding_anfragen
SET titel = COALESCE(NULLIF(kunde_name, ''), NULLIF(empfaenger_label, ''), 'Onboarding-Link')
WHERE titel IS NULL;

-- ── 4) Storage-Bucket fuer Kunden-Uploads ─────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit)
  VALUES ('onboarding-uploads', 'onboarding-uploads', false, 52428800)  -- 50 MB
  ON CONFLICT (id) DO NOTHING;

-- Anon INSERT — Kunden duerfen ueber gueltigen Token hochladen.
-- Pfad-Convention: <anfrage_id>/<random>-<filename>
-- Die Subquery prueft, dass der erste Pfad-Segment eine ID einer
-- nicht-abgelaufenen, nicht-abgelehnten Anfrage ist.
DROP POLICY IF EXISTS "onboarding_uploads_anon_insert" ON storage.objects;
CREATE POLICY "onboarding_uploads_anon_insert" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'onboarding-uploads'
    AND EXISTS (
      SELECT 1 FROM onboarding_anfragen a
      WHERE a.id::text = (storage.foldername(name))[1]
        AND a.status IN ('offen', 'in_bearbeitung')
        AND (a.gueltig_bis IS NULL OR a.gueltig_bis > now())
    )
  );

-- Anon SELECT — Kunden duerfen ihre eigenen Uploads sehen (Preview),
-- gleicher Status-Filter.
DROP POLICY IF EXISTS "onboarding_uploads_anon_select" ON storage.objects;
CREATE POLICY "onboarding_uploads_anon_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'onboarding-uploads'
    AND EXISTS (
      SELECT 1 FROM onboarding_anfragen a
      WHERE a.id::text = (storage.foldername(name))[1]
        AND a.status IN ('offen', 'in_bearbeitung')
    )
  );

-- Authenticated SELECT — Org-User sehen Uploads ihrer Org-Anfragen
-- (auch nach Abschluss).
DROP POLICY IF EXISTS "onboarding_uploads_org_select" ON storage.objects;
CREATE POLICY "onboarding_uploads_org_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'onboarding-uploads'
    AND EXISTS (
      SELECT 1 FROM onboarding_anfragen a
      WHERE a.id::text = (storage.foldername(name))[1]
        AND a.organisation_id = get_user_org_id()
    )
  );

-- Authenticated DELETE — nur Org-User (Admin) duerfen loeschen.
DROP POLICY IF EXISTS "onboarding_uploads_org_delete" ON storage.objects;
CREATE POLICY "onboarding_uploads_org_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'onboarding-uploads'
    AND EXISTS (
      SELECT 1 FROM onboarding_anfragen a
      WHERE a.id::text = (storage.foldername(name))[1]
        AND a.organisation_id = get_user_org_id()
    )
  );
