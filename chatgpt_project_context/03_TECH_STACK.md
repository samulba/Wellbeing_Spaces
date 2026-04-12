# Tech Stack

## Framework

| Technologie | Version | Rolle |
|-------------|---------|-------|
| **Next.js** | 14.2.35 | Full-Stack Framework (App Router) |
| **React** | 18.x | UI-Rendering |

Next.js App Router wird konsequent genutzt: Server Components für Datenabruf, Client Components für Interaktivität, Server Actions für alle Mutationen.

## Sprache

- **TypeScript** 5.x, `strict: true`, `moduleResolution: bundler`
- Alle Dateien `.ts` / `.tsx`
- Typen zentralisiert in `src/lib/supabase/types.ts`

## UI / Styling

| Technologie | Zweck |
|-------------|-------|
| **Tailwind CSS** 3.4.x | Utility-first Styling – ausschließlich, kein inline CSS |
| **Lucide React** 1.8.x | Icon-Bibliothek (60+ Icons genutzt) |
| **Recharts** 3.8.x | Charts: BarChart, PieChart/Donut, AreaChart |
| **Syne Font** | Sidebar-Schrift (über Next.js Font-Optimierung) |

Design-Richtlinien: Indigo `#6366F1` als Akzentfarbe, Sidebar `bg-[#0F1117]`, Desktop-first.

## State Management

Kein globaler State-Manager. State-Ansätze nach Kontext:

| Ansatz | Wo |
|--------|----|
| `useState` / `useReducer` | Lokaler UI-State in Client Components |
| `useFormState` (react-dom) | Server Action Ergebnis­handling in Forms |
| `useTransition` | Optimistisches UI bei Drag & Drop |
| `revalidatePath` (Next.js) | Cache-Invalidierung nach Server Actions |

## Backend / BaaS

**Supabase** (Frankfurt, Region `eu-central-1`):
- PostgreSQL-Datenbank
- Auth (Email/Password via Supabase Auth)
- Storage (Logo-Uploads, Storage Buckets)
- Row Level Security (RLS) für Datenzugriffs­kontrolle
- Kein Edge Functions Einsatz erkennbar

## Datenbank

PostgreSQL via Supabase. Schema-Management über manuelle SQL-Migrations in `/supabase/migrations/` (19 Migrations, nummeriert `001`–`019`).

## Auth

Supabase Auth mit Email/Password. Session-Verwaltung über Cookies (`@supabase/ssr`). Middleware validiert Sessions bei jedem Request gegen den Supabase-Server (`getUser()`, nicht `getSession()`).

## Hosting / Deployment

| Service | Details |
|---------|---------|
| **Vercel** | Hosting, Auto-Deploy bei Push auf `main` |
| **Region** | `fra1` (Frankfurt) – aligned mit Supabase Frankfurt |
| **Build** | `npm run build` (Next.js Standard-Build) |

## Build / Lint / Test

| Tool | Zweck | Config |
|------|-------|--------|
| **Next.js Build** | TypeScript-Check + Bundle | `next.config.mjs` |
| **ESLint** 8.x | Linting | `.eslintrc.json` (`next/core-web-vitals` + `next/typescript`) |
| **PostCSS** | Tailwind-Verarbeitung | `postcss.config.mjs` |
| **Tests** | **Nicht konfiguriert** | – |

## Wichtige Libraries

| Library | Version | Zweck |
|---------|---------|-------|
| `@supabase/ssr` | 0.10.2 | Supabase-Client für Server Components / Actions |
| `@supabase/supabase-js` | 2.103.0 | Supabase Admin-Client |
| `@dnd-kit/core` | 6.3.1 | Drag & Drop Kern |
| `@dnd-kit/sortable` | 10.0.0 | Sortierbare Listen (Räume, Produkte) |
| `@dnd-kit/utilities` | 3.2.2 | CSS Transform Utilities für DnD |
| `jspdf` | 4.2.1 | PDF-Generierung (client-seitig) |
| `jspdf-autotable` | 5.0.7 | Tabellen in PDFs |
| `cheerio` | 1.2.0 | HTML-Parsing für Web-Scraping |
| `lucide-react` | 1.8.0 | Icons |
| `recharts` | 3.8.1 | Charts / Visualisierungen |

## API / Server-Struktur

- **Server Actions**: `src/app/actions/*.ts` (13 Dateien) – alle Datenmutationen
- **API Routes**: `src/app/api/` (3 Routes) – CSV-Export, Auth-Callback, Web-Scraping
- **Kein separates Backend**: Alles in Next.js integriert
