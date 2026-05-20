-- ============================================================
-- Migration 109 · Onboarding-Polish 2
--
-- 1. geschaetzte_minuten INTEGER auf onboarding_vorlagen — wird im
--    Kundenformular oben angezeigt ("Dauert ca. 10 Minuten"),
--    damit der Kunde vorher weiss, was ihn erwartet.
-- ============================================================

ALTER TABLE onboarding_vorlagen
  ADD COLUMN IF NOT EXISTS geschaetzte_minuten INTEGER;
