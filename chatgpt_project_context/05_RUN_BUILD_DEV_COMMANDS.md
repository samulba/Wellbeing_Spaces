# Run / Build / Dev Commands

Alle Befehle sind in `package.json` unter `"scripts"` definiert.

## Definierte Scripts

| Befehl | Command | Zweck |
|--------|---------|-------|
| **Dev-Server** | `npm run dev` | Startet Next.js Entwicklungsserver auf `localhost:3000` mit Hot Reload |
| **Build** | `npm run build` | Produktions-Build: TypeScript-Prüfung + Bundling + Static Analysis |
| **Start** | `npm run start` | Startet den produktiven Next.js-Server (nach `build`) |
| **Lint** | `npm run lint` | ESLint mit `next/core-web-vitals` + `next/typescript` Regeln |

## Fehlende Scripts (nicht konfiguriert)

| Was fehlt | Hinweis |
|-----------|---------|
| `typecheck` | Kein separates `tsc --noEmit`. TypeScript wird nur via `npm run build` geprüft |
| `test` | Kein Test-Runner eingerichtet (kein Jest, Vitest, Playwright, etc.) |
| `format` | Kein Prettier konfiguriert |
| `db:push` / `db:migrate` | Keine Supabase CLI Scripts. Migrations werden manuell im Supabase Studio SQL-Editor ausgeführt |

## Deployment-Kommandos

| Was | Wie |
|-----|-----|
| **Deploy** | Automatisch via Vercel bei Push auf `main` (kein manuelles Deploy-Kommando nötig) |
| **Vercel CLI** | Nicht installiert (kein `vercel` Skript in package.json) |

## Datenbank (Supabase)

Migrations werden **nicht** automatisch ausgeführt. Workflow:

1. SQL-Datei in `supabase/migrations/` anlegen (z. B. `019_*.sql`)
2. Inhalt manuell im **Supabase Studio → SQL Editor** ausführen

Es gibt kein `supabase db push` oder ähnliches Skript im Projekt.

## Lokale Entwicklung Setup (aus `.env.example`)

```bash
# 1. Dependencies installieren
npm install

# 2. Env-Datei anlegen
cp .env.example .env.local
# .env.local mit echten Supabase-Werten befüllen

# 3. Dev-Server starten
npm run dev
```

## Hinweise

- `npm run build` ist der einzige TypeScript-Validity-Check im Workflow
- ESLint läuft nicht automatisch vor dem Build (Vercel kann so konfiguriert werden, ist aber nicht in `vercel.json` gesetzt)
