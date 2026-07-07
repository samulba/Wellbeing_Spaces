# Security-Audit — Wellbeing Spaces

**Datum:** 2026-07-07 · **Scope:** Nur-lesende Sicherheitsanalyse (RLS, API-Routes & Server Actions, Service-Role-Key, `NEXT_PUBLIC_`-Env, IDOR). Keine Code-Änderungen.

> **Wichtige Einschränkung — bitte lesen.** Dieser Audit basiert auf den **Migrations-Dateien** in `supabase/migrations/` und dem App-Code, nicht auf der **Live-Datenbank**. RLS-Policies können in Supabase manuell (außerhalb der Migrationen) geändert worden sein. **Alle RLS-Funde müssen gegen die echte DB verifiziert werden**, z. B.:
> ```sql
> SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
> FROM pg_policies ORDER BY tablename, policyname;
> ```
> Prüfe insbesondere, ob pro Tabelle **mehr als eine** Policy existiert (permissive Policies werden mit ODER verknüpft → die schwächste gewinnt).

---

## Zusammenfassung

| Prio | Fund | Kern |
|------|------|------|
| 🔴 KRITISCH | C1 | Onboarding-Tabellen für **anonyme** Nutzer voll les-/schreibbar (`FOR ALL TO anon USING(true)`) — Kunden-PII aller Orgs abgreifbar, ohne Login |
| 🔴 KRITISCH | C2 | Mandanten-Trennung auf 7 Kern-Tabellen **ausgehebelt**: alte `USING(true)`-Policies überleben Migration 036 (Namens-Mismatch) |
| 🟠 MITTEL | M1 | SSRF in `scrape-link` (schwach) und `scrape-product` (DNS-Rebind/Redirect) |
| 🟠 MITTEL | M2 | Moodboard-Passwort/Ablauf per Direkt-API umgehbar (RLS prüft nur `freigabe_aktiv`) |
| 🟠 MITTEL | M3 | Storage-Buckets `projekt-dateien` & `produktbilder` = **public** (weltweit per URL lesbar) |
| 🟠 MITTEL | M4 | Onboarding `organisation_id` FK zeigt auf `auth.users` + `OR ... IS NULL` → auch authentifiziert cross-org |
| 🟡 NIEDRIG | L1 | Middleware gated `/api/*` nicht auf der Hauptdomain |
| 🟡 NIEDRIG | L2 | Portal-Middleware prüft nur Cookie-**Präsenz**, nicht Gültigkeit |
| 🟡 NIEDRIG | L3 | Toter `/api/public/`-Ausnahmepfad in `istGeschuetzt` (Footgun) |
| 🟡 NIEDRIG | L4 | Service-Role-Key als HMAC-Secret wiederverwendet |
| 🟡 NIEDRIG | L5 | `demo_anfragen` / `dokument_aktivitaeten` anon-INSERT `WITH CHECK(true)` (Spam) |

**Sauber (explizit geprüft):** Punkt 3 (Service-Role-Key **nie** in Client-Komponenten) und Punkt 4 (`NEXT_PUBLIC_`) — siehe Abschnitt „Was in Ordnung ist".

---

## 🔴 KRITISCH

### C1 — Onboarding-Tabellen für anonyme Nutzer voll les-/schreibbar

**Ort:**
- `supabase/migrations/applied/054_onboarding_erweitert.sql:175-177` — `onboarding_inventar` `FOR ALL TO anon USING (true) WITH CHECK (true)`
- `055_onboarding_ergaenzungen.sql:66-67` — `onboarding_budget_verteilung` `FOR ALL TO anon USING (true) WITH CHECK (true)`
- `055_onboarding_ergaenzungen.sql:101-102` — `onboarding_entscheider` `FOR ALL TO anon USING (true) WITH CHECK (true)`
- `054:75-82` — `onboarding_anfragen`: anon-SELECT für alle Zeilen mit `status IN ('offen','in_bearbeitung')` + anon-UPDATE
- `054:139-145` — `onboarding_dateien`: anon-SELECT `USING(true)` + anon-INSERT `WITH CHECK(true)`
- `054:112-114` (`onboarding_vorlagen`), `055:38-39` (`onboarding_sektionen`), `055:144-145` (`onboarding_branding`), `055:181-182` (`onboarding_checkliste`) — jeweils anon-SELECT `USING(true)`

**Problem:** Der `anon`-Key ist öffentlich (steckt via `NEXT_PUBLIC_SUPABASE_ANON_KEY` im Browser-Bundle). Mit diesem Key kann **jeder** direkt gegen PostgREST gehen — ohne die App, ohne Login, ohne Token:
```
GET  https://<proj>.supabase.co/rest/v1/onboarding_anfragen?status=eq.offen   → alle offenen Onboardings ALLER Orgs
GET  .../rest/v1/onboarding_inventar   → Inventarlisten inkl. Foto-URLs, org-übergreifend
DELETE/PATCH .../onboarding_budget_verteilung   → fremde Daten löschen/manipulieren
```
`onboarding_anfragen` enthält Kunden-PII (Name, E-Mail, Telefon, alle Antworten, `auto_save`-JSONB). Die `FOR ALL TO anon`-Policies erlauben zusätzlich **Schreiben und Löschen**. Das ist ein org-übergreifendes Datenleck **und** eine destruktive Lücke — der schwerste Fund, weil kein Konto nötig ist.

**Fix-Vorschlag:** Die App besitzt bereits Admin-Client-Server-Actions für diese Flows (`onboarding-erweitert.ts`: `onboardingAutoSave`, `inventarItem*`, `prioritaetenSetzen`, `getAnfrageByToken` …), die per `.eq('token', token)` scopen. Damit sind die `anon`-Policies überflüssig:
1. Alle `... TO anon`-Policies auf `onboarding_*` **droppen**; Kunden-Flows laufen über die vorhandenen Admin-Client-Actions (Token = Capability).
2. Falls direkter anon-Zugriff gewünscht bleibt: eng auf die eigene Anfrage scopen (z. B. Policy, die `anfrage_id` gegen einen per-Request-Token/gehashtes Secret bindet) statt `USING(true)`.
3. Kein `FOR ALL TO anon` für Kundendaten — höchstens gezieltes INSERT/UPDATE der eigenen Zeile, nie SELECT über die ganze Tabelle.

---

### C2 — Mandanten-Trennung auf 7 Kern-Tabellen ausgehebelt (Policy-Namens-Mismatch)

**Ort (überlebende permissive Policies):**
- `008_dateien_und_storage.sql:19-26` — `dateien_select` / `dateien_insert` / `dateien_update` `USING(true)`
- `015_notizen.sql:19-22` — `notizen_authenticated_all` `FOR ALL USING(true) WITH CHECK(true)`
- `020_einstellungen_rls_final.sql:11-21` — `einstellungen_select` / `einstellungen_write` `USING(true)`
- `027_whitelabel_branding.sql:48-52` — `"Authentifizierte Nutzer können Branding lesen"` / `"...aktualisieren"` `USING(true)`
- `028_kunden_konfigurator.sql:52-56` — `"Auth kann sessions lesen/schreiben"` / `"Auth kann auswahl lesen/schreiben"` `USING(true)`
- `029_projekt_timeline.sql:60-61` — `"Auth kann events lesen/schreiben"` `FOR ALL USING(true)`
- Gegenprobe: `036_multi_tenancy.sql:108-274` (die `DROP POLICY`/`CREATE POLICY`-Blöcke)

**Problem:** Migration 036 sollte alle Tabellen org-scopen. Ihre `DROP POLICY IF EXISTS` treffen aber nur die Namen `"Admin: voller Zugriff"` und `"<tabelle>_all_authenticated"`. Die oben genannten Tabellen wurden in den Migrationen **008/015/020/027/028/029 mit anderen Policy-Namen** angelegt. `DROP POLICY IF EXISTS` löscht nur exakt benannte Policies → die alten `USING(true)`-Policies **bleiben bestehen**. PostgreSQL verknüpft permissive Policies mit **ODER**, also gilt effektiv `true OR (organisation_id = get_user_org_id())` = **`true`**. Die org-scoped Policy aus 036 ist damit wirkungslos.

**Auswirkung:** Jeder authentifizierte Nutzer **irgendeiner** Org kann per Direkt-PostgREST-Aufruf (anon-Key + eigenes JWT) alle Zeilen dieser Tabellen **aller** Mandanten lesen/schreiben — die `.eq('organisation_id', …)`-Filter der App werden dabei umgangen. Besonders sensibel: `notizen` (interne Notizen zu Kunden/Projekten/Partnern) und `dateien` (Projekt-Datei-Metadaten). `einstellungen`/`branding`/`timeline_events`/`konfigurator_*` betreffen Konfiguration bzw. Kunden-Tokens.

**Fix-Vorschlag:** Neue Migration, die die stale Policies **beim echten Namen** droppt und nur die org-scoped Policy behält:
```sql
DROP POLICY IF EXISTS "dateien_select" ON dateien;
DROP POLICY IF EXISTS "dateien_insert" ON dateien;
DROP POLICY IF EXISTS "dateien_update" ON dateien;
DROP POLICY IF EXISTS "notizen_authenticated_all" ON notizen;
DROP POLICY IF EXISTS "einstellungen_select" ON einstellungen;
DROP POLICY IF EXISTS "einstellungen_write" ON einstellungen;
DROP POLICY IF EXISTS "Authentifizierte Nutzer können Branding lesen" ON branding;
DROP POLICY IF EXISTS "Authentifizierte Nutzer können Branding aktualisieren" ON branding;
DROP POLICY IF EXISTS "Auth kann sessions lesen/schreiben" ON konfigurator_sessions;
DROP POLICY IF EXISTS "Auth kann auswahl lesen/schreiben" ON konfigurator_auswahl;
DROP POLICY IF EXISTS "Auth kann events lesen/schreiben" ON timeline_events;
```
Dann **fehlende org-scoped Policies ergänzen** (036 hat für `dateien` und `notizen` gar keine erstellt — nur die Spalte hinzugefügt) und sicherstellen, dass `organisation_id` bei diesen Tabellen befüllt ist. Abschließend mit `pg_policies` verifizieren, dass pro Tabelle **nur** die org-scoped Policy übrig ist.

---

## 🟠 MITTEL

### M1 — SSRF in den Scraper-Routen

**Ort:** `src/app/api/scrape-link/route.ts:15-29` (+ `redirect: 'follow'` Zeile 67); `src/app/api/scrape-product/route.ts:86-110`

**Problem:** Beide Routen holen eine vom Nutzer gelieferte URL serverseitig und **geben den Inhalt zurück** (les-/exfiltrierbares SSRF). Auth-gated → „nur" jeder eingeloggte Nutzer, aber Impact = interne Dienste/Cloud-Metadata lesen.
- `scrape-link` ist schwach: nur exakt `127.0.0.1` und `169.254.169.254` geblockt (kein `/8`- bzw. `/16`-Präfix → `127.0.0.2`, `169.254.170.2` durch), **kein IPv6** (`http://[::1]/` durch).
- `scrape-product` ist robuster (blockt `127.`/`169.254.`/private Bereiche + IPv6 `::1`/`fe80::`/`fc00::`), aber:
- Beide prüfen nur den **Hostnamen-String**, lösen **kein DNS auf** → DNS-Rebinding (öffentlicher Name → interne IP) umgeht die Prüfung.
- Beide **folgen Redirects** ohne den Ziel-Hop erneut zu validieren (302 → `http://169.254.169.254/…`).

**Fix-Vorschlag:** Gemeinsamen, robusten Validator nutzen; Host per DNS auflösen und **jede** resolved IP gegen die Blocklisten prüfen; `redirect: 'manual'` + jeden Hop neu validieren; idealerweise Egress-Proxy/Allowlist. IPv4-in-IPv6-Hex-Form (`[::ffff:7f00:1]`) mitabdecken.

---

### M2 — Moodboard-Passwort/Ablauf per Direkt-API umgehbar

**Ort:** `096_moodboards.sql:54-56` (anon-SELECT `USING (freigabe_aktiv = true)`); `098_moodboard_freigabe_security.sql:16-19` (Kommentar bestätigt: Passwort/Ablauf werden nur in der Server-Action geprüft)

**Problem:** Passwort (`freigabe_passwort_hash`) und Ablauf (`freigabe_ablauf`) werden ausschließlich in `getMoodboardOeffentlich` geprüft — **nicht** in RLS. Über die Direkt-API liest anon jedes freigegebene Board inkl. `canvas_json`, ohne Passwort/Ablauf:
```
GET .../rest/v1/moodboards?freigabe_aktiv=eq.true   → alle aktiven Boards aller Orgs, Passwortschutz ignoriert
```

**Fix-Vorschlag:** Anon-SELECT strikt auf Token-Gleichheit + Ablauf scopen (`freigabe_token = <token> AND (freigabe_ablauf IS NULL OR freigabe_ablauf > now())`); bcrypt-Passwort bleibt in der Action, aber die RLS darf kein „alle aktiven Boards lesbar" erlauben. Alternativ nur über die Server-Action ausliefern und die Tabelle nicht anon-lesbar machen.

---

### M3 — Öffentliche Storage-Buckets für Projektdateien

**Ort:** `008_dateien_und_storage.sql:29-35` (`projekt-dateien`, `produktbilder` → `public: true`), `:41-42` (SELECT-Policy ohne Rollen-Einschränkung)

**Problem:** `projekt-dateien` ist ein **öffentlicher** Bucket → jede Datei ist per `…/storage/v1/object/public/projekt-dateien/<pfad>` **ohne Auth** abrufbar, org-übergreifend. Projektdokumente (Verträge, Grundrisse, private Unterlagen) sind damit weltweit lesbar, sobald jemand die URL kennt/errät. `produktbilder` ist weniger kritisch. Positiv: alle neueren Buckets (`chat-attachments`, `reklamation-fotos`, `bestellung-dokumente`, `moodboard-bilder`, `client-dokumente`, `onboarding-uploads`, `aufgaben-anhaenge`, `partner-vertraege`) sind **privat** und nutzen Signed URLs.

**Fix-Vorschlag:** `projekt-dateien` auf `public: false` umstellen und über Signed URLs ausliefern (Muster wie bei den anderen Buckets); Storage-SELECT-Policy org-scopen (Pfad-Convention `<org_id>/…` wie bei `moodboard-bilder`/`reklamation-fotos`). Nur echte öffentliche Assets public lassen.

---

### M4 — Onboarding `organisation_id` FK falsch + `OR organisation_id IS NULL`

**Ort:** `054:40`, `054:88`, `055:19/49/85/…` (`organisation_id uuid REFERENCES auth.users(id)`); authenticated-Policies mit `USING (organisation_id = get_user_org_id() OR organisation_id IS NULL)` (z. B. `054:59`, `054:108`, `055:35/63/98/…`)

**Problem:** Die Spalte referenziert `auth.users(id)` statt `organisationen(id)`. Eine echte Org-ID lässt sich damit nicht speichern (verletzt die auth.users-FK) → die Zeilen bleiben faktisch `organisation_id IS NULL`. Die Policies erlauben per `OR organisation_id IS NULL` **jedem authentifizierten Nutzer jeder Org** Lesen/Schreiben dieser NULL-Zeilen — verstärkt C1 auf der authentifizierten Seite.

**Fix-Vorschlag:** FK auf `organisationen(id)` korrigieren, `organisation_id` per Action zuverlässig setzen/backfillen, den `OR ... IS NULL`-Zweig aus den Policies entfernen.

---

## 🟡 NIEDRIG

### L1 — Middleware gated `/api/*` nicht auf der Hauptdomain
`src/middleware.ts:91-117`: Der `typ === 'main'`-Zweig endet mit `return response`, ohne `istGeschuetzt()` aufzurufen. Auf `wellbeing-spaces.de`/`www.` läuft für `/api/*` keine Middleware-Auth. Nur Defense-in-Depth — jeder Handler prüft `getUser()` selbst — aber inkonsistent. **Fix:** `/api/*` in allen Host-Typen gaten.

### L2 — Portal-Middleware prüft nur Cookie-Präsenz
`src/middleware.ts:75-80`: redirectet nur, wenn `portal_session` fehlt; Gültigkeit wird erst in `getPortalSession()` (Seite/Action) geprüft. Solide, solange **jede** Portalseite/-action `getPortalSession()` aufruft (aktuell der Fall). **Fix (Härtung):** zusätzlich im Portal-Layout/Guard validieren, nicht nur auf Seiten-Ebene verlassen.

### L3 — Toter `/api/public/`-Ausnahmepfad
`src/middleware.ts:22`: `istGeschuetzt` nimmt `/api/public/*` von der Auth aus. Kein solches Verzeichnis existiert — aber eine künftige Route dort wäre **standardmäßig ungeschützt**. **Fix:** Ausnahme entfernen oder dokumentieren.

### L4 — Service-Role-Key als HMAC-Secret wiederverwendet
`src/lib/freigabe-pin-cookie.ts:18`: Der Freigabe-PIN-Cookie wird mit `SUPABASE_SERVICE_ROLE_KEY` signiert. Funktioniert & ist serverseitig, koppelt aber zwei Secrets. **Fix:** dediziertes `FREIGABE_COOKIE_SECRET`.

### L5 — Anon-INSERT `WITH CHECK(true)`
`035_demo_anfragen.sql:17` und `053_angebote_vertraege_erweitert.sql:319-320` (`dokument_aktivitaeten`): anon darf beliebige Zeilen einfügen (Spam/Log-Pollution, nur INSERT, kein Read). **Fix:** Rate-Limit/Captcha bzw. minimal-scopen.

---

## Was in Ordnung ist (explizit geprüft)

- **Punkt 3 — Service-Role-Key clientseitig:** `createAdminClient` (`src/lib/supabase/admin.ts`) nutzt `SUPABASE_SERVICE_ROLE_KEY` **ohne** `NEXT_PUBLIC_`. Kein `'use client'`-Modul importiert `admin.ts` oder `freigabe-pin-cookie.ts`. Die Erwähnung von `createAdminClient` in `HandbuchClient.tsx:958` ist reiner Dokumentationstext im `<code>`-Tag, kein Import. ✅
- **Punkt 4 — `NEXT_PUBLIC_`-Env:** Nur `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL` — alle unkritisch/für Öffentlichkeit gedacht. Kein Secret mit `NEXT_PUBLIC_`-Präfix. `.env.example` hält den Service-Key ohne Präfix. ✅
- **API-Routes:** Alle 12 Routen prüfen `auth.getUser()` → 401 und scopen die Primär-Query mit `.eq('organisation_id', orgId)` (+ RLS). Interne-Preis-Ausgaben (`?ek=1`, intern-PDF, CSV-Export) sind hinter Auth+Org. ✅
- **Öffentliche Token-Flows:** `freigabe.ts` (Token-Validierung + Projekt-Ownership + Scope-Guard + Abschluss-/Ablauf-Sperre) und `signatur.ts` (Token + Ablauf + „bereits unterschrieben") sind sauber. ✅
- **Portal-IDOR:** Alle Kunden-Actions in `portal.ts` erzwingen `session.kundeId`-Ownership (`.eq('kunde_id', session.kundeId)` bzw. expliziter Vergleich vor Writes). ✅
- **Server-only-Kapselung:** `lieferung-kunde.ts` und `bestellungen-kunde.ts` nutzen `import 'server-only'` statt `'use server'` — bewusst kein Client-Endpunkt, gegen IDOR. ✅
- **Portal-Tabellen:** `client_*` (068), `moodboard_versionen`, Bestell-/Reklamations-Tabellen (100), `aufgaben` sind korrekt org-scoped (Drop-Namen passen dort). ✅
- **Token-Entropie:** freigabe_tokens `gen_random_bytes(32)` (256 Bit), konfigurator `gen_random_bytes(24)`, onboarding/moodboard `gen_random_uuid()` (UUIDv4, 122 Bit) — nicht erratbar. ✅

---

## Die 3 wichtigsten Fixes (empfohlene Reihenfolge)

1. **C1 — Anon-Policies auf den `onboarding_*`-Tabellen entfernen/ersetzen.** Höchste Priorität: unauthentifiziertes, org-übergreifendes Lesen **und** Schreiben/Löschen von Kunden-PII, allein mit dem öffentlichen anon-Key. Kunden-Flows über die vorhandenen Admin-Client-Actions laufen lassen; `FOR ALL TO anon USING(true)` und die breiten anon-SELECTs droppen.

2. **C2 — Stale `USING(true)`-Policies auf `dateien`, `notizen`, `einstellungen`, `branding`, `timeline_events`, `konfigurator_sessions`, `konfigurator_auswahl` droppen** (bei echtem Namen) und fehlende org-scoped Policies ergänzen. Danach per `pg_policies` verifizieren, dass pro Tabelle nur noch die org-scoped Policy existiert. Behebt die org-übergreifende Lücke für jeden authentifizierten Nutzer.

3. **M1 — SSRF in `scrape-link`/`scrape-product` härten:** gemeinsamer Validator, DNS-Auflösung + IP-Prüfung, `redirect: 'manual'` mit Re-Validierung jedes Hops.

> **Erinnerung:** Vor der Umsetzung C1/C2/M2/M3 gegen die **Live-DB** verifizieren (`pg_policies`, Bucket-`public`-Flags) — der Audit liest nur die Migrations-Dateien.
