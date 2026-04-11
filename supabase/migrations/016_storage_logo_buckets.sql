-- Migration 016: Storage Buckets für Kunden- und Partner-Logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('kunden-logos',  'kunden-logos',  true, 2097152, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('partner-logos', 'partner-logos', true, 2097152, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Kunden-Logos: öffentlich lesen, Auth für write
CREATE POLICY "kunden-logos public read"   ON storage.objects FOR SELECT TO public      USING (bucket_id = 'kunden-logos');
CREATE POLICY "kunden-logos auth upload"   ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'kunden-logos');
CREATE POLICY "kunden-logos auth update"   ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'kunden-logos');
CREATE POLICY "kunden-logos auth delete"   ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'kunden-logos');

-- Partner-Logos: öffentlich lesen, Auth für write
CREATE POLICY "partner-logos public read"  ON storage.objects FOR SELECT TO public      USING (bucket_id = 'partner-logos');
CREATE POLICY "partner-logos auth upload"  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'partner-logos');
CREATE POLICY "partner-logos auth update"  ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'partner-logos');
CREATE POLICY "partner-logos auth delete"  ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'partner-logos');
