-- ============================================================
-- Migration 060 · Storage-Limits für Logo-Buckets auf 50 MB
-- ============================================================
-- Migration 059 hatte auf 10 MB erhöht — reicht nicht für hochauflösende
-- Profil-/Logo-Bilder (z.B. große PNG-Logos mit Transparenz).
-- 50 MB ist großzügig genug und verhindert weitere Uploads.

UPDATE storage.buckets
SET
  file_size_limit    = 52428800,  -- 50 MB
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif','image/svg+xml']
WHERE id IN ('kunden-logos', 'partner-logos');
