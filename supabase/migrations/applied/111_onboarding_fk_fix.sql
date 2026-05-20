-- ============================================================
-- Migration 111 · Onboarding-Tabellen: organisation_id FK fixen
--
-- Migrationen 054 und 055 haben die organisation_id-Spalte falsch
-- referenziert: `REFERENCES auth.users(id)` statt
-- `REFERENCES organisationen(id)`. Das fuehrt beim INSERT mit echter
-- Org-UUID zu einem Foreign-Key-Verletzungsfehler — Upload + andere
-- Operationen sind dadurch komplett gebrochen.
--
-- Diese Migration:
--   1) Droppt JEDEN bestehenden FK auf der Spalte organisation_id
--      (egal wohin er zeigt — auth.users, organisationen, anything),
--   2) Legt den FK frisch auf organisationen(id) an.
--
-- Wichtig: Frueher wurde `information_schema.constraint_column_usage`
-- benutzt — das sieht aber FKs auf andere Schemata (z.B. `auth.users`)
-- NICHT. Daher wurde der kaputte Constraint nie gedroppt, der Name
-- blieb belegt, das spaetere ADD scheiterte mit 42710.
-- Loesung: pg_catalog statt information_schema.
--
-- Datenwerte werden NICHT angefasst — der Spalten-Inhalt bleibt
-- bestehen, nur die Constraint-Definition aendert sich.
-- ============================================================

DO $$
DECLARE
  tabelle TEXT;
  con_record RECORD;
  ref_table TEXT;
  has_correct_fk BOOLEAN;
  tabellen TEXT[] := ARRAY[
    'onboarding_anfragen',
    'onboarding_vorlagen',
    'onboarding_dateien',
    'onboarding_inventar',
    'onboarding_prioritaeten',
    'onboarding_sektionen',
    'onboarding_budget_verteilung',
    'onboarding_entscheider',
    'onboarding_branding',
    'onboarding_checkliste'
  ];
BEGIN
  FOREACH tabelle IN ARRAY tabellen LOOP
    -- Tabelle existiert pruefen — manche Migrationen koennen ausstehen
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = tabelle AND c.relkind = 'r'
    ) THEN
      CONTINUE;
    END IF;

    has_correct_fk := FALSE;

    -- Alle FK-Constraints durchgehen, die genau die Spalte
    -- organisation_id referenzieren. pg_constraint sieht ALLE Schemata
    -- (auch auth), daher zuverlaessig.
    FOR con_record IN
      SELECT
        con.conname AS constraint_name,
        cl_ref.relname AS ref_table_name,
        ns_ref.nspname AS ref_schema_name
      FROM pg_catalog.pg_constraint con
      JOIN pg_catalog.pg_class cl       ON cl.oid = con.conrelid
      JOIN pg_catalog.pg_namespace ns   ON ns.oid = cl.relnamespace
      JOIN pg_catalog.pg_attribute att  ON att.attrelid = cl.oid AND att.attnum = ANY (con.conkey)
      JOIN pg_catalog.pg_class cl_ref   ON cl_ref.oid = con.confrelid
      JOIN pg_catalog.pg_namespace ns_ref ON ns_ref.oid = cl_ref.relnamespace
      WHERE con.contype = 'f'
        AND ns.nspname = 'public'
        AND cl.relname = tabelle
        AND att.attname = 'organisation_id'
        AND array_length(con.conkey, 1) = 1  -- single-column FK
    LOOP
      IF con_record.ref_table_name = 'organisationen' AND con_record.ref_schema_name = 'public' THEN
        -- bereits korrekt — behalten
        has_correct_fk := TRUE;
      ELSE
        -- kaputt (z.B. auth.users) — droppen
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', tabelle, con_record.constraint_name);
      END IF;
    END LOOP;

    -- Falls noch kein korrekter FK existiert: anlegen
    IF NOT has_correct_fk THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (organisation_id) REFERENCES organisationen(id) ON DELETE CASCADE',
        tabelle,
        tabelle || '_organisation_id_fkey'
      );
    END IF;
  END LOOP;
END $$;
