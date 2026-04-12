# GitHub Workflow & CI/CD

## Branch-Struktur (erkennbar)

| Branch | Rolle |
|--------|-------|
| `main` | Produktions-Branch – Vercel deployed automatisch bei jedem Push |

Nur `main` ist erkennbar. Kein Hinweis auf Feature-Branches, `develop`, `staging` oder ähnliches in der Konfiguration.

## GitHub Actions

**Kein `.github/workflows/`-Ordner gefunden.** Es gibt keine CI/CD-Pipeline via GitHub Actions. Kein automatisches Linting, kein automatischer Build-Check, keine automatischen Tests vor dem Merge.

## Deploy-Logik

Deploy läuft ausschließlich über **Vercel**:

- Push auf `main` → Vercel erkennt den Push → startet Build (`npm run build`) → deployt automatisch
- Konfiguriert in `vercel.json`:

```json
{
  "framework": "nextjs",
  "regions": ["fra1"],
  "buildCommand": "npm run build",
  "installCommand": "npm install"
}
```

- Vercel Preview Deployments: Vermutlich aktiv für alle Branches/PRs (Vercel-Standard), aber nicht explizit konfiguriert
- Automatisches Deployment von `main` → Production ist der gesamte Release-Prozess

## Commit-Konventionen

Keine formelle Konvention (kein `commitlint`, kein `.commitlintrc`). Aus dem Git-Log der Session-Logs in CLAUDE.md erkennbar: Commits folgen einem `feat:` / `fix:` / `chore:` Muster (Conventional Commits-ähnlich), aber nicht erzwungen.

## Prüfschritte vor Deployment

Aktuell nur: Vercel führt `npm run build` aus. Wenn der Build fehlschlägt → kein Deployment. Kein separates Lint/Test/Typecheck als Gate.

## Empfohlene Verbesserungen (nicht implementiert)

- GitHub Actions Workflow für Lint + Build Check bei PRs
- Branch Protection auf `main`
- Separate Preview-Umgebung mit eigener Supabase-Instanz

*Diese Empfehlungen sind nicht Teil des aktuellen Setups – nur zur Orientierung für einen zweiten Assistenten.*
