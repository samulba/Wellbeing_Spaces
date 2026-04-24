-- ═══════════════════════════════════════════════════════════════
-- Migration 085: Storage-Bucket `org-logos` für Firmenlogos
-- ═══════════════════════════════════════════════════════════════
-- Jede Org bekommt einen Unterordner mit orgId als Name. Upload wird
-- serverseitig vor dem Storage-Call mit Admin-Check abgesichert
-- (firmenLogoHochladen), daher reicht hier authenticated für write.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('org-logos', 'org-logos', true, 52428800,
   ARRAY['image/jpeg','image/png','image/webp','image/gif','image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

-- Öffentlich lesen (Logos erscheinen in Mails, Freigabelinks, Portal)
CREATE POLICY "org-logos public read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'org-logos');

-- Upload/Update/Delete nur für eingeloggte User; Admin-Check passiert
-- in der Server-Action (firmenLogoHochladen).
CREATE POLICY "org-logos auth upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'org-logos');

CREATE POLICY "org-logos auth update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'org-logos');

CREATE POLICY "org-logos auth delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'org-logos');
