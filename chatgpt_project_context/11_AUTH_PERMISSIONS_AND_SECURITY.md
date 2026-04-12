# Auth, Permissions & Security

## Login / Session-Flow

1. Nutzer besucht `/login`
2. Gibt Email + Password ein (Supabase Auth, Email/Password)
3. Bei Erfolg: Supabase setzt HttpOnly-Session-Cookie
4. `src/middleware.ts` prüft jeden Request (außer statische Assets, `/freigabe`, Marketing-Seiten) via `supabase.auth.getUser()`
5. Kein gültiger User → Redirect auf `/login`
6. Bereits eingeloggt + `/login` aufgerufen → Redirect auf `/dashboard`

OAuth/Magic-Link Callback wird in `/api/auth/callback/route.ts` verarbeitet (PKCE-Code-Exchange). Ob Magic Links oder OAuth-Provider aktiv sind: **Unklar / prüfen im Supabase Dashboard**.

## Rollen / Permissions

Aktuell gibt es erkennbar **eine einzige Admin-Rolle**. Kein Rollen-System mit mehreren Zugriffsebenen im App-Code sichtbar.

| Nutzertyp | Zugang | Wie gesichert |
|-----------|--------|---------------|
| **Admin (eingeloggt)** | Volles Dashboard, alle Felder | Middleware + RLS `auth.role() = 'authenticated'` |
| **Kunde (Token)** | Nur `/freigabe/[token]` | Token-Validierung (kein Auth-Cookie benötigt) |
| **Anonym** | Marketing-Seiten, Login | Middleware lässt diese durch |

**`team.ts` Action**: Datei existiert, aber ob ein Team-/Multi-User-Konzept aktiv ist: **Unklar / prüfen**.

## Middleware / Route Guards

`src/middleware.ts` – matcher deckt alle Routen ab außer:
- `_next/static`, `_next/image` (statische Assets)
- `favicon.ico`
- `freigabe` (öffentliche Kundenansicht)
- Bild-Dateien (`.svg`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`)

Dashboard-Layout (`src/app/dashboard/layout.tsx`) hat **zusätzlichen Auth-Check**:
```typescript
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')
```
Doppelter Schutz: Middleware + Layout-Guard.

## Freigabe-Ansicht (Kunde)

`/freigabe/[token]` ist **öffentlich** (kein Auth erforderlich). Zugang über einmaligen Token in der URL. Sicherheitsaspekte:

- Token in `freigabe_tokens`-Tabelle gespeichert mit `aktiv`-Flag und optionalem `gueltig_bis`-Datum
- Nur `aktiv = true` und nicht abgelaufene Tokens erlauben Zugang
- Interne Felder (`einkaufspreis`, `marge_prozent`, `provision_prozent`, `notizen_intern`) werden im TypeScript-Typsystem via `FreigabeProdukt` explizit ausgeschlossen

## Server/Client Exposure Risks

| Risiko | Status |
|--------|--------|
| Admin-Client im Browser | Nicht möglich – `admin.ts` hat keine `'use client'`-Nutzung |
| Interne Felder im Freigabe-Link | Durch `FreigabeProdukt`-Typ verhindert – aber nur wenn Queries korrekt gefiltert werden |
| `SUPABASE_SERVICE_ROLE_KEY` client-seitig | `NEXT_PUBLIC_`-Prefix fehlt → nicht im Browser (korrekt) |
| RLS für alle Tabellen aktiv | Für `einstellungen` bestätigt. Andere Tabellen: **Unklar / prüfen** |

## Security-Fragezeichen

1. **RLS-Coverage**: Nur `einstellungen`-RLS-Policies sind aus Migrations klar dokumentiert. Ob alle anderen Tabellen (`kunden`, `projekte`, `produkte` etc.) RLS haben: **Unklar / prüfen**
2. **PIN-Schutz auf Freigabe-Link**: Einstellung `freigabe_pin_schutz` existiert, ob sie in `/freigabe/[token]/page.tsx` tatsächlich enforced wird: **Unklar / prüfen**
3. **Security Headers**: `next.config.mjs` definiert keine CSP, HSTS, X-Frame-Options etc. Ob Vercel Defaults ausreichen: **Unklar / prüfen**
4. **Token-Entropie**: Wie der Freigabe-Token generiert wird (zufällig genug?): aus `src/app/actions/freigabe-token.ts` ableitbar, aber nicht analysiert
5. **Kein CSRF-Schutz explizit**: Next.js Server Actions haben eingebauten CSRF-Schutz via Origin-Header-Prüfung – sollte passen, aber nicht explizit konfiguriert
