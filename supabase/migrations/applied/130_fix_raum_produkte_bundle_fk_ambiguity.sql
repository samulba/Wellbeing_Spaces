-- ============================================================
-- Migration 130 · NOTFALL-FIX: PostgREST-Embed-Ambiguität
--                 raum_produkte → produkte
--
-- URSACHE: Migration 128 fügte raum_produkte.bundle_id mit einem
-- Fremdschlüssel → produkte(id) hinzu. Damit hatte raum_produkte
-- ZWEI Fremdschlüssel auf produkte:
--    1) produkt_id  → produkte(id)   (Migration 038, Original)
--    2) bundle_id   → produkte(id)   (Migration 128, neu)
--
-- PostgREST kann eingebettete Selects wie
--    raum_produkte.select('*, produkte(*)')
-- dann nicht mehr eindeutig auflösen (Fehler PGRST201) → ALLE
-- Produkt-Joins lieferten leer → Produkte "verschwanden" aus
-- Räumen, Projekten, Freigaben und Bestellungen.
--
-- >>> KEIN DATENVERLUST <<< — die raum_produkte-Zeilen sind alle da,
-- sie konnten nur nicht mehr mit produkte verbunden werden.
--
-- FIX: Den bundle_id-Fremdschlüssel entfernen. Die Spalte bundle_id
-- und ihr Index BLEIBEN erhalten — der Bundle-/Set-Code nutzt sie nur
-- als reinen Gruppierungsschlüssel (UUID) und braucht den FK nicht.
-- Damit hat raum_produkte wieder nur EINEN FK auf produkte und alle
-- Embeds funktionieren sofort wieder.
--
-- Idempotent & robust: entfernt den FK unabhängig vom konkreten
-- Constraint-Namen.
-- ============================================================

DO $$
DECLARE
  c text;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class     rel ON rel.oid = con.conrelid
    JOIN pg_attribute att ON att.attrelid = con.conrelid
                          AND att.attnum  = ANY (con.conkey)
    WHERE rel.relname = 'raum_produkte'
      AND con.contype = 'f'          -- foreign key
      AND att.attname = 'bundle_id'
  LOOP
    EXECUTE format('ALTER TABLE raum_produkte DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

-- Spalte + Index bleiben bestehen (reiner Gruppierungsschlüssel):
--   raum_produkte.bundle_id            (UUID, nullable)
--   idx_raum_produkte_bundle           (WHERE bundle_id IS NOT NULL)
