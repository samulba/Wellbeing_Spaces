-- ============================================================
-- Migration 092 · Realtime fuer Onboarding-Anfragen
--
-- Damit der Admin live sieht wenn ein Kunde ein Onboarding-Formular
-- ausfuellt (oder mit dem Auto-Save den Fortschritt aktualisiert),
-- braucht die Tabelle `onboarding_anfragen` Realtime-Publication.
--
-- Realtime respektiert die bereits bestehenden Org-scoped RLS-Policies
-- automatisch — jeder Admin-Browser bekommt nur Events fuer seine
-- eigene Organisation.
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE onboarding_anfragen;
