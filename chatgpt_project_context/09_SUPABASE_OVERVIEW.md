# Supabase Übersicht

## Nutzung

Supabase wird als vollständiges Backend genutzt: Datenbank, Auth und Storage.

- **Projekt-Region**: Frankfurt (`eu-central-1`) – DSGVO-relevant
- **Datenbank**: PostgreSQL
- **Auth**: Supabase Auth (Email/Password)
- **Storage**: Supabase Storage (Logo-Buckets)
- **Edge Functions**: Nicht genutzt

## Client-Varianten

Das Projekt nutzt **drei** verschiedene Supabase-Clients – die Unterscheidung ist kritisch:

### `src/lib/supabase/client.ts` – Browser-Client
```typescript
createBrowserClient(URL, ANON_KEY)
```
- Für Client Components (`'use client'`)
- Unterliegt RLS
- Aktuell wenig direkt genutzt (Mutationen laufen über Server Actions)

### `src/lib/supabase/server.ts` – Server-Client
```typescript
createServerClient(URL, ANON_KEY, { cookies })
```
- Für Server Components und Server Actions
- Liest Session aus Cookies → Auth-Kontext des eingeloggten Nutzers
- Unterliegt RLS (der Nutzer muss authentifiziert sein)

### `src/lib/supabase/admin.ts` – Admin-Client (**kritisch**)
```typescript
createClient(URL, SERVICE_ROLE_KEY)
```
- Umgeht RLS **vollständig**
- Nur für serverseitige Admin-Operationen (z. B. Einstellungen schreiben)
- Darf **niemals** im Browser oder in Client Components verwendet werden
- Aktuell genutzt in: `src/app/actions/einstellungen.ts`

## Middleware

`src/middleware.ts` läuft bei jedem Request (außer statische Assets und `/freigabe`-Routen):

- Prüft Session mit `supabase.auth.getUser()` (nicht `getSession()` – validiert gegen Supabase-Server)
- Leitet unauthentifizierte Nutzer auf `/login` um, wenn sie `/dashboard` aufrufen
- Leitet bereits eingeloggte Nutzer von `/login` auf `/dashboard` um

## Auth-Flow

1. Nutzer gibt Email/Password auf `/login` ein
2. `supabase.auth.signInWithPassword()` (im Client oder Server Action)
3. Supabase setzt Session-Cookie
4. Middleware liest Cookie bei jedem Request
5. Auth-Callback-Route: `/api/auth/callback/route.ts` – verarbeitet OAuth-Redirects (PKCE-Flow)

## Storage

Supabase Storage Buckets (aus Migration 016):
- Für Kunden-Logos und Partner-Logos
- Upload über `src/app/actions/logo-upload.ts`
- Bucket-Namen: **Unklar / prüfen** (aus Migrations-Datei 016 ableitbar)

## RLS (Row Level Security)

| Tabelle | RLS Status | Erkennbar aus |
|---------|-----------|---------------|
| `einstellungen` | Aktiv | Migrations 005, 006, 010 |
| Weitere Tabellen | Unklar – vermutlich aktiv | Standard Supabase-Setup |

Policies (aus Migrations erkennbar für `einstellungen`):
- SELECT: `auth.role() = 'authenticated'`
- ALL (INSERT/UPDATE/DELETE): `auth.role() = 'authenticated'` + `WITH CHECK`

Die `einstellungen`-Actions nutzen den Admin-Client (RLS-Bypass), um Schreib-Probleme zu umgehen.

## Wichtige Supabase-bezogene Dateien

| Datei | Zweck |
|-------|-------|
| `src/lib/supabase/types.ts` | Alle TypeScript-Interfaces (manuell gepflegt, nicht auto-generiert) |
| `src/lib/supabase/server.ts` | Server-seitiger Client (mit Cookie-Auth) |
| `src/lib/supabase/admin.ts` | Admin-Client (RLS-Bypass) |
| `src/lib/supabase/client.ts` | Browser-Client |
| `src/middleware.ts` | Auth-Guard |
| `supabase/migrations/*.sql` | Schema-Management (19 Migrations) |
| `src/app/api/auth/callback/route.ts` | OAuth/PKCE Callback |
