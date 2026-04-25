-- ============================================================
-- Migration 089 · Onboarding-Empfänger-Etikett
--
-- Bei Neukunden-Onboardings gibt es noch keinen verknüpften Kunden
-- (das ist ja gerade der Sinn). Damit der Admin in der Übersicht
-- trotzdem sieht, für wen ein Link versendet wurde, hinterlegen wir
-- optional ein Etikett + Empfänger-E-Mail beim Erstellen.
--
-- Nicht zu verwechseln mit kunde_name/kunde_email: das sind die
-- Daten, die der Kunde im Formular einträgt. Empfänger-Felder sind
-- rein für die interne Übersicht / Mail-Versand.
-- ============================================================

ALTER TABLE onboarding_anfragen
  ADD COLUMN IF NOT EXISTS empfaenger_label TEXT,
  ADD COLUMN IF NOT EXISTS empfaenger_email TEXT;
