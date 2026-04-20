-- ============================================================
-- Migration 064 · Branding um Kunden-Portal-Felder erweitern
-- ============================================================
-- Neue Felder, damit Firmen das Kunden-Portal stärker branden können:
--   welcome_text      Begrüßungstext auf dem Portal-Dashboard
--   slogan            Einzeiler unter dem Logo (Login + Dashboard-Header)
--   button_text_color Textfarbe auf Primary-Buttons (wichtig bei hellem
--                     primary_color — weiße Schrift wird dann unlesbar)

ALTER TABLE branding
  ADD COLUMN IF NOT EXISTS welcome_text       text,
  ADD COLUMN IF NOT EXISTS slogan             text,
  ADD COLUMN IF NOT EXISTS button_text_color  text NOT NULL DEFAULT '#ffffff';

COMMENT ON COLUMN branding.welcome_text IS
  'Freier Begrüßungstext oberhalb der Projekte im Portal-Dashboard. Optional.';
COMMENT ON COLUMN branding.slogan IS
  'Kurze Tagline unter dem Firmennamen (Login + Dashboard-Header). Optional.';
COMMENT ON COLUMN branding.button_text_color IS
  'Textfarbe für Primary-Buttons im Portal. Standard weiß; bei sehr hellem primary_color auf dunkel umstellen.';
