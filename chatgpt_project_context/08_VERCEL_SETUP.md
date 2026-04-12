# Vercel Setup

## Wird Vercel verwendet?

Ja. Vercel ist das primäre Hosting- und Deployment-System des Projekts.

## Vercel-Konfiguration im Repo

`vercel.json` im Root:

```json
{
  "framework": "nextjs",
  "regions": ["fra1"],
  "buildCommand": "npm run build",
  "installCommand": "npm install"
}
```

| Einstellung | Wert | Bedeutung |
|-------------|------|-----------|
| `framework` | `nextjs` | Vercel erkennt Next.js und optimiert dafür |
| `regions` | `["fra1"]` | Frankfurt – aligned mit Supabase Frankfurt (niedrige Latenz) |
| `buildCommand` | `npm run build` | Standard Next.js Build |
| `installCommand` | `npm install` | Standard npm Install |

## Deploy-Logik

- **Automatisches Deployment**: Push auf `main` → Vercel deployt automatisch
- **Preview Deployments**: Vercel erstellt für jeden Branch/PR automatisch eine Preview-URL (Vercel-Standard, nicht explizit deaktiviert)
- **Production**: Entspricht dem `main`-Branch

## Umgebungsvariablen auf Vercel

Müssen manuell im **Vercel Dashboard → Project → Settings → Environment Variables** gesetzt werden:

- `NEXT_PUBLIC_SUPABASE_URL` → All Environments
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → All Environments
- `SUPABASE_SERVICE_ROLE_KEY` → Production + Preview (nicht Client-seitig!)

## Erkennbare Besonderheiten / potenzielle Stolperstellen

| Thema | Hinweis |
|-------|---------|
| **Image Domains** | `next.config.mjs` ist leer – wenn Supabase Storage Bilder von `*.supabase.co` geladen werden, könnte `next/image` mit `remotePatterns` konfiguriert werden müssen. Aktuell werden Bilder per `<img>` Tag geladen (nicht `next/image`), daher kein akutes Problem |
| **Region-Alignment** | `fra1` bei Vercel + Supabase Frankfurt = optimal für Latenz |
| **Server Actions** | Next.js 14 Server Actions werden von Vercel nativ unterstützt – keine extra Konfiguration nötig |
| **Kein `output: standalone`** | Nicht konfiguriert – kein Docker-Deployment geplant |
| **Keine Headers/CSP** | `next.config.mjs` definiert keine Security Headers – **Unklar / prüfen** ob Vercel-Defaults ausreichen |

## Vercel CLI

Vercel CLI ist **nicht** im Projekt installiert. Kein `vercel` Binary in `package.json`. Deploy läuft rein über Git-Integration.
