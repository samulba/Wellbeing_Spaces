-- ── 008_dateien_und_storage.sql ───────────────────────────────
-- Projekt-Dateianhänge + Supabase Storage Buckets
-- ──────────────────────────────────────────────────────────────

-- Dateien-Tabelle
CREATE TABLE IF NOT EXISTS dateien (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  projekt_id   UUID NOT NULL REFERENCES projekte(id) ON DELETE CASCADE,
  datei_name   TEXT NOT NULL,
  datei_url    TEXT NOT NULL,
  datei_typ    TEXT NOT NULL,
  dateigroesse INTEGER NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL,
  deleted_at   TIMESTAMPTZ
);

ALTER TABLE dateien ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dateien_select" ON dateien
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "dateien_insert" ON dateien
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "dateien_update" ON dateien
  FOR UPDATE TO authenticated USING (true);

-- Storage Buckets
INSERT INTO storage.buckets (id, name, public)
  VALUES ('projekt-dateien', 'projekt-dateien', true)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('produktbilder', 'produktbilder', true)
  ON CONFLICT (id) DO NOTHING;

-- Storage RLS – projekt-dateien
CREATE POLICY "pjd_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'projekt-dateien');

CREATE POLICY "pjd_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'projekt-dateien');

CREATE POLICY "pjd_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'projekt-dateien');

-- Storage RLS – produktbilder
CREATE POLICY "pb_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'produktbilder');

CREATE POLICY "pb_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'produktbilder');

CREATE POLICY "pb_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'produktbilder');
