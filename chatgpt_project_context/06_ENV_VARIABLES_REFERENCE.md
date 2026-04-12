# Umgebungsvariablen – Referenz

**WICHTIG: Dieser Abschnitt enthält ausschließlich Namen und Zwecke. Niemals echte Werte.**

## Übersicht

Das Projekt verwendet genau **3 Umgebungsvariablen** (aus `.env.example` und Code-Analyse).

---

## Variablen im Detail

### `NEXT_PUBLIC_SUPABASE_URL`

| Eigenschaft | Wert |
|-------------|------|
| **Zweck** | URL des Supabase-Projekts (Format: `https://xxxx.supabase.co`) |
| **Kritisch** | Ja – ohne diese Variable startet die App nicht |
| **Client-seitig** | Ja (`NEXT_PUBLIC_`-Prefix → im Browser sichtbar) |
| **Wo verwendet** | `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/admin.ts`, `src/middleware.ts` |
| **Umgebungen** | Local, Preview, Production |

---

### `NEXT_PUBLIC_SUPABASE_ANON_KEY`

| Eigenschaft | Wert |
|-------------|------|
| **Zweck** | Öffentlicher Supabase API-Key (Anon/Publishable Key). Steuert RLS-geschützte Zugriffe für authentifizierte Nutzer |
| **Kritisch** | Ja – ohne diese Variable startet die App nicht |
| **Client-seitig** | Ja (`NEXT_PUBLIC_`-Prefix → im Browser sichtbar, aber durch RLS abgesichert) |
| **Wo verwendet** | `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/middleware.ts` |
| **Umgebungen** | Local, Preview, Production |

---

### `SUPABASE_SERVICE_ROLE_KEY`

| Eigenschaft | Wert |
|-------------|------|
| **Zweck** | Supabase Service-Role-Key – umgeht RLS vollständig. Für Admin-Operationen (z. B. Einstellungen schreiben) |
| **Kritisch** | Ja – wenn fehlend, schlagen Admin-Operationen (Einstellungen) fehl |
| **Client-seitig** | **NEIN** – darf niemals im Browser landen. Nur serverseitig (`src/lib/supabase/admin.ts`) |
| **Wo verwendet** | `src/lib/supabase/admin.ts` → genutzt in `src/app/actions/einstellungen.ts` |
| **Umgebungen** | Local, Production (nicht in Preview falls unterschiedliche DBs) |

---

## Herkunft

Alle drei Werte kommen aus dem **Supabase Dashboard**:
`supabase.com/dashboard → [Projekt] → Project Settings → API`

---

## Sicherheitshinweise

- `SUPABASE_SERVICE_ROLE_KEY` **niemals** in Client Components, `NEXT_PUBLIC_`-Variablen oder öffentlichen Repos exponieren
- `.env.local` sollte in `.gitignore` eingetragen sein (Standard bei Next.js)
- Für Vercel: Variablen über `vercel env add` oder Vercel Dashboard setzen, nicht in `vercel.json` hardcoden
