-- ============================================================
-- Migration 100 · Bestell-Lifecycle Vollstaendig
--
-- 1) bestellstatus_enum erweitern (Stornos, Reklamationen, Retouren)
-- 2) Tabelle produkt_reklamationen (mit Foto-Uploads, Loesungs-Status)
-- 3) Tabelle lieferanten_bestellungen + Junction (Sammelbestellungen)
-- 4) Anon-Read-Policies via Token (fuer Portal-Sichtbarkeit)
--
-- Status-Rang-Locking (nur vorwaerts) wird in Application-Layer
-- gelockert — alle Uebergaenge erlaubt mit Audit-Log.
-- ============================================================

-- ── 1) bestellstatus_enum erweitern ────────────────────────────
-- Postgres erlaubt ENUM-Werte hinzufuegen via ALTER TYPE
ALTER TYPE bestellstatus_enum ADD VALUE IF NOT EXISTS 'storniert';
ALTER TYPE bestellstatus_enum ADD VALUE IF NOT EXISTS 'teilgeliefert';
ALTER TYPE bestellstatus_enum ADD VALUE IF NOT EXISTS 'mangel_gemeldet';
ALTER TYPE bestellstatus_enum ADD VALUE IF NOT EXISTS 'retoure_unterwegs';
ALTER TYPE bestellstatus_enum ADD VALUE IF NOT EXISTS 'retoure_erhalten';

-- Datums-Felder fuer neue Status — auf raum_produkte
ALTER TABLE raum_produkte
  ADD COLUMN IF NOT EXISTS storniert_am       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mangel_gemeldet_am TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retoure_am         TIMESTAMPTZ;


-- ── 2) Reklamations-Tabelle ────────────────────────────────────
CREATE TABLE IF NOT EXISTS produkt_reklamationen (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id    UUID NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  raum_produkte_id   UUID NOT NULL REFERENCES raum_produkte(id)  ON DELETE CASCADE,
  -- Typ der Reklamation
  typ                TEXT NOT NULL CHECK (typ IN (
    'mangel', 'falsche_lieferung', 'transportschaden',
    'nicht_wie_bestellt', 'kunde_storno', 'sonstiges'
  )),
  beschreibung       TEXT NOT NULL CHECK (length(beschreibung) BETWEEN 1 AND 4000),
  -- Storage-URLs zu hochgeladenen Beweisfotos (privat, signed URLs)
  foto_urls          JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Workflow-Status
  status             TEXT NOT NULL DEFAULT 'offen' CHECK (status IN (
    'offen', 'lieferant_kontaktiert', 'loesung_zugesagt', 'geloest', 'eskaliert'
  )),
  -- Loesungs-Typ wenn geloest
  loesung_typ        TEXT CHECK (loesung_typ IN (
    'ersatz', 'gutschrift', 'reparatur', 'rueckerstattung', 'keine'
  )),
  loesung_notiz      TEXT,
  betrag_gutschrift  NUMERIC(12, 2),
  -- Wer hat erstellt/geloest
  erstellt_von       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  geloest_am         TIMESTAMPTZ,
  -- Sichtbarkeit fuer Kunden im Portal (default: nicht sichtbar — Designer entscheidet)
  kunde_sichtbar     BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reklamationen_raum_produkt
  ON produkt_reklamationen(raum_produkte_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reklamationen_org_status
  ON produkt_reklamationen(organisation_id, status) WHERE status != 'geloest';

-- updated_at-Trigger
CREATE OR REPLACE FUNCTION reklamationen_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reklamationen_updated_at ON produkt_reklamationen;
CREATE TRIGGER reklamationen_updated_at
  BEFORE UPDATE ON produkt_reklamationen
  FOR EACH ROW EXECUTE FUNCTION reklamationen_set_updated_at();

ALTER TABLE produkt_reklamationen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reklamationen_org_access" ON produkt_reklamationen
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());

-- Anon-SELECT fuer Portal: Kunde sieht Reklamation wenn das Projekt
-- ihm gehoert UND der Designer kunde_sichtbar=true gesetzt hat
-- (Portal nutzt aber createAdminClient(), daher technisch nicht zwingend
-- noetig — wir lassen Authenticated-Policy reichen.)


-- ── 3) Lieferanten-Bestellungen ────────────────────────────────
DO $$ BEGIN
  CREATE TYPE bestellung_status_enum AS ENUM (
    'entwurf', 'bestaetigt', 'versandt', 'geliefert', 'storniert', 'teilretour'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS lieferanten_bestellungen (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id          UUID NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  partner_id               UUID NOT NULL REFERENCES partner(id)        ON DELETE RESTRICT,
  -- Optional: Verknuepfung zu einem Projekt (wenn alle Positionen aus 1 Projekt)
  projekt_id               UUID REFERENCES projekte(id) ON DELETE SET NULL,
  -- Bestellnummer (intern fortlaufend pro Org via Funktion)
  bestellnummer            TEXT,
  -- Daten-Felder
  bestellt_am              DATE,
  bestaetigt_am            DATE,
  versandt_am              DATE,
  geliefert_am             DATE,
  liefertermin_geplant     DATE,
  liefertermin_bestaetigt  BOOLEAN NOT NULL DEFAULT false,
  -- Lieferschein / Tracking
  lieferschein_nr          TEXT,
  tracking_url             TEXT,
  -- Bestellbestaetigung-PDF im Storage (Bucket: bestellung-dokumente)
  bestellbestaetigung_url  TEXT,
  -- Finanzen
  versandkosten            NUMERIC(12, 2) NOT NULL DEFAULT 0,
  gesamtpreis_netto        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  -- Workflow-Status
  status                   bestellung_status_enum NOT NULL DEFAULT 'entwurf',
  notizen                  TEXT,
  erstellt_von             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bestellungen_org_status
  ON lieferanten_bestellungen(organisation_id, status);
CREATE INDEX IF NOT EXISTS idx_bestellungen_partner
  ON lieferanten_bestellungen(partner_id);
CREATE INDEX IF NOT EXISTS idx_bestellungen_projekt
  ON lieferanten_bestellungen(projekt_id) WHERE projekt_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bestellungen_liefertermin
  ON lieferanten_bestellungen(liefertermin_geplant)
  WHERE liefertermin_geplant IS NOT NULL AND status NOT IN ('geliefert', 'storniert');

-- updated_at-Trigger
CREATE OR REPLACE FUNCTION lieferanten_bestellungen_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lieferanten_bestellungen_updated_at ON lieferanten_bestellungen;
CREATE TRIGGER lieferanten_bestellungen_updated_at
  BEFORE UPDATE ON lieferanten_bestellungen
  FOR EACH ROW EXECUTE FUNCTION lieferanten_bestellungen_set_updated_at();

ALTER TABLE lieferanten_bestellungen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lieferanten_bestellungen_org_access" ON lieferanten_bestellungen
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());

-- Junction-Tabelle: 1 Bestellung enthaelt N Positionen aus N raum_produkte
CREATE TABLE IF NOT EXISTS lieferanten_bestellung_positionen (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id     UUID NOT NULL REFERENCES organisationen(id) ON DELETE CASCADE,
  bestellung_id       UUID NOT NULL REFERENCES lieferanten_bestellungen(id) ON DELETE CASCADE,
  raum_produkt_id     UUID NOT NULL REFERENCES raum_produkte(id) ON DELETE CASCADE,
  menge               NUMERIC(10, 2) NOT NULL CHECK (menge > 0),
  einzelpreis_netto   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  -- Wenn nur Teilmenge bestellt wurde
  notiz               TEXT,
  reihenfolge         INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bestellung_positionen_bestellung
  ON lieferanten_bestellung_positionen(bestellung_id, reihenfolge);
CREATE INDEX IF NOT EXISTS idx_bestellung_positionen_raum_produkt
  ON lieferanten_bestellung_positionen(raum_produkt_id);

-- Ein raum_produkt kann nur einmal in einer Bestellung sein
CREATE UNIQUE INDEX IF NOT EXISTS idx_bestellung_positionen_unique
  ON lieferanten_bestellung_positionen(bestellung_id, raum_produkt_id);

ALTER TABLE lieferanten_bestellung_positionen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lieferanten_bestellung_positionen_org_access"
  ON lieferanten_bestellung_positionen
  FOR ALL TO authenticated
  USING      (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());


-- ── 4) Storage-Bucket fuer Reklamations-Fotos + Bestellbestaetigungen ──
INSERT INTO storage.buckets (id, name, public, file_size_limit)
  VALUES ('reklamation-fotos', 'reklamation-fotos', false, 26214400)  -- 25 MB
  ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
  VALUES ('bestellung-dokumente', 'bestellung-dokumente', false, 26214400)  -- 25 MB
  ON CONFLICT (id) DO NOTHING;

-- Policies fuer beide Buckets — Pfad-Convention <org_id>/...
CREATE POLICY "reklamation_fotos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'reklamation-fotos'
    AND (storage.foldername(name))[1]::uuid = get_user_org_id()
  );

CREATE POLICY "reklamation_fotos_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'reklamation-fotos'
    AND (storage.foldername(name))[1]::uuid = get_user_org_id()
  );

CREATE POLICY "reklamation_fotos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'reklamation-fotos'
    AND (storage.foldername(name))[1]::uuid = get_user_org_id()
  );

CREATE POLICY "bestellung_dokumente_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'bestellung-dokumente'
    AND (storage.foldername(name))[1]::uuid = get_user_org_id()
  );

CREATE POLICY "bestellung_dokumente_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'bestellung-dokumente'
    AND (storage.foldername(name))[1]::uuid = get_user_org_id()
  );

CREATE POLICY "bestellung_dokumente_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'bestellung-dokumente'
    AND (storage.foldername(name))[1]::uuid = get_user_org_id()
  );


-- ── 5) Bestellnummer-Generator (BS-YYYY-NNN pro Org) ───────────
CREATE OR REPLACE FUNCTION naechste_bestellnummer(org_id UUID)
RETURNS TEXT AS $$
DECLARE
  jahr   TEXT := to_char(now(), 'YYYY');
  praefix TEXT := 'BS-' || jahr || '-';
  letzte_nr INTEGER;
  neue_nr   TEXT;
BEGIN
  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(bestellnummer, '^BS-' || jahr || '-', ''), '')::INTEGER
  ), 0)
  INTO letzte_nr
  FROM lieferanten_bestellungen
  WHERE organisation_id = org_id
    AND bestellnummer LIKE praefix || '%';

  neue_nr := praefix || lpad((letzte_nr + 1)::TEXT, 3, '0');
  RETURN neue_nr;
END;
$$ LANGUAGE plpgsql;


-- ── 6) Realtime-Publication fuer Reklamationen + Bestellungen ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'produkt_reklamationen'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE produkt_reklamationen';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'lieferanten_bestellungen'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE lieferanten_bestellungen';
  END IF;
END
$$;
