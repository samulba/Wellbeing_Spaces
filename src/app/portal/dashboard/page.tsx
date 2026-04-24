import { redirect } from 'next/navigation'
import { portalDashboardDaten } from '@/app/actions/portal'
import { brandingFuerToken }    from '@/app/actions/branding'
import { getPortalSession }     from '@/lib/portal-auth'
import Link from 'next/link'
import {
  FolderOpen, Clock, MessageSquare, ArrowUpRight,
  ArrowRight, Users, Settings, Sparkles, Activity,
} from 'lucide-react'
import PortalShell from '@/components/portal/PortalShell'
import PortalWelcomeModal from '@/components/portal/PortalWelcomeModal'

export default async function PortalDashboardPage() {
  const [daten, branding, session] = await Promise.all([
    portalDashboardDaten().catch(() => null),
    brandingFuerToken(),
    getPortalSession(),
  ])

  if (!daten || !session) redirect('/portal/login')

  const { projekte, aktivitaeten, ungelesenNachrichten } = daten
  const firma        = branding?.firmenname     ?? 'Wellbeing Spaces'
  const prim         = branding?.primary_color  ?? '#445c49'
  const welcomeText  = branding?.welcome_text ?? null
  const heroImage    = branding?.hero_image_url ?? null
  const gradFrom     = branding?.accent_gradient_from ?? null
  const gradTo       = branding?.accent_gradient_to ?? null
  const footerText   = branding?.footer_text ?? null
  const supportEmail = branding?.support_email ?? null

  const offeneFreigaben = projekte.reduce((s, p) => s + p.stats.ausstehend, 0)
  const topProjekt = [...projekte].sort((a, b) => b.stats.ausstehend - a.stats.ausstehend)[0]
  const nachrichtenLinkProjekt = projekte[0]?.id ?? null

  const heute = new Date().toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <PortalShell active="dashboard" session={session} branding={branding}>
      <PortalWelcomeModal firma={firma} primColor={prim} welcomeText={welcomeText} />
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">

        {/* ── Bento-Grid: Hero + Side-Rail ─────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5 mb-5 md:mb-6">

          {/* Hero — kompakt */}
          <section
            className="lg:col-span-8 relative overflow-hidden rounded-3xl border border-black/[0.05] min-h-[220px] md:min-h-[260px] flex flex-col justify-end p-6 md:p-8"
            style={{
              background: heroImage
                ? undefined
                : `linear-gradient(135deg, ${gradFrom ?? prim} 0%, ${gradTo ?? prim} 100%)`,
              backgroundImage: heroImage ? `url(${heroImage})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* Overlay für Lesbarkeit */}
            {heroImage && (
              <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${prim}ee 0%, ${prim}aa 60%, transparent 100%)` }} />
            )}
            {/* Dekorative Orbs */}
            {!heroImage && (
              <>
                <div aria-hidden className="absolute -top-32 -right-28 w-[420px] h-[420px] rounded-full bg-white/15 blur-3xl" />
                <div aria-hidden className="absolute -bottom-24 -left-14 w-[260px] h-[260px] rounded-full bg-white/10 blur-2xl" />
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-[0.04]"
                  style={{
                    backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                  }}
                />
              </>
            )}

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-semibold mb-3 bg-white/20 backdrop-blur-md text-white border border-white/20">
                <Sparkles className="w-3 h-3" />
                {heute}
              </div>
              <h1
                className="font-bold text-white leading-[1.05] tracking-tight mb-2"
                style={{ fontSize: 'clamp(26px, 4vw, 44px)' }}
              >
                Hi {session.vorname}.
              </h1>
              <p className="text-[14px] md:text-[15px] text-white/85 leading-relaxed max-w-lg">
                {welcomeText ?? `Dein Überblick bei ${firma} — Projekte, Freigaben und Nachrichten.`}
              </p>
            </div>
          </section>

          {/* Side-Rail: Stats vertikal */}
          <aside className="lg:col-span-4 flex flex-col gap-3 md:gap-4">
            <StatCard
              Icon={FolderOpen}
              label="Projekte"
              wert={projekte.length}
              tone="neutral"
              prim={prim}
              href={projekte[0] ? `/portal/projekte/${projekte[0].id}` : undefined}
            />
            <StatCard
              Icon={Clock}
              label="Offene Freigaben"
              wert={offeneFreigaben}
              tone="brand"
              highlight={offeneFreigaben > 0}
              prim={prim}
              href={topProjekt ? `/portal/projekte/${topProjekt.id}` : undefined}
              sub={offeneFreigaben > 0 ? `bei „${topProjekt?.name ?? ''}"` : 'Alles freigegeben'}
            />
            <StatCard
              Icon={MessageSquare}
              label="Neue Nachrichten"
              wert={ungelesenNachrichten}
              tone="blue"
              highlight={ungelesenNachrichten > 0}
              prim={prim}
              href={nachrichtenLinkProjekt ? `/portal/projekte/${nachrichtenLinkProjekt}?tab=nachrichten` : undefined}
              sub={ungelesenNachrichten > 0 ? 'Jetzt lesen' : 'Alles gelesen'}
            />
          </aside>
        </div>

        {/* ── CTA: Offene Freigaben (nur wenn vorhanden) ──────── */}
        {offeneFreigaben > 0 && topProjekt && (
          <Link
            href={`/portal/projekte/${topProjekt.id}`}
            className="group relative block mb-5 md:mb-6 overflow-hidden rounded-3xl p-6 md:p-7 text-white transition-transform hover:-translate-y-0.5"
            style={{ background: `linear-gradient(135deg, ${prim} 0%, ${prim}dd 100%)` }}
          >
            <div aria-hidden className="absolute -right-10 -top-10 w-52 h-52 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[17px] font-bold">{offeneFreigaben} Produkt{offeneFreigaben !== 1 ? 'e' : ''} warten auf dich</p>
                  <p className="text-sm text-white/80 mt-0.5">Starte bei &bdquo;{topProjekt.name}&ldquo;</p>
                </div>
              </div>
              <div className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-sm font-semibold shrink-0 transition-colors group-hover:bg-white/95" style={{ color: prim }}>
                Jetzt freigeben <ArrowRight className="w-4 h-4" />
              </div>
              <ArrowRight className="sm:hidden w-5 h-5 text-white shrink-0" />
            </div>
          </Link>
        )}

        {/* ── Projekte-Grid + Activity ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-5 mb-5 md:mb-6">

          {/* Projekte-Grid */}
          <section className="lg:col-span-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-50">Meine Projekte</h2>
              <span className="text-[11px] opacity-50">{projekte.length} gesamt</span>
            </div>
            {projekte.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed border-black/[0.08] p-12 text-center">
                <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Noch keine Projekte angelegt.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {projekte.map((p, idx) => {
                  const pct = p.stats.gesamt > 0 ? Math.round((p.stats.freigegeben / p.stats.gesamt) * 100) : 0
                  return (
                    <ProjektCard
                      key={p.id}
                      id={p.id}
                      name={p.name}
                      gesamt={p.stats.gesamt}
                      freigegeben={p.stats.freigegeben}
                      ausstehend={p.stats.ausstehend}
                      pct={pct}
                      prim={prim}
                      accentIdx={idx}
                    />
                  )
                })}
              </div>
            )}
          </section>

          {/* Activity als Timeline */}
          <aside className="lg:col-span-4">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-50">Aktivität</h2>
              <Activity className="w-3 h-3 opacity-40" />
            </div>
            {aktivitaeten.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed border-black/[0.08] p-8 text-center">
                <p className="text-xs text-gray-400">Noch keine Aktivitäten.</p>
              </div>
            ) : (
              <div className="relative pl-5">
                {/* Timeline-Linie */}
                <div aria-hidden className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-black/[0.12] via-black/[0.08] to-transparent" />
                <div className="space-y-4">
                  {aktivitaeten.slice(0, 6).map((a) => (
                    <div key={a.id} className="relative">
                      <span
                        aria-hidden
                        className="absolute -left-5 top-1.5 w-3 h-3 rounded-full border-2 border-white"
                        style={{ background: prim, boxShadow: `0 0 0 3px rgba(var(--brand-primary-rgb), 0.15)` }}
                      />
                      <div className="rounded-xl bg-white border border-black/[0.05] px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                        <p className="text-[13px] text-gray-700 leading-snug">{a.titel}</p>
                        <p className="text-[10px] opacity-50 mt-1">
                          {new Date(a.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* Quick-Actions */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          {session.rolle === 'inhaber' && (
            <QuickCard
              href="/portal/team"
              Icon={Users}
              title="Team verwalten"
              desc="Mitarbeiter einladen & Rollen setzen"
              prim={prim}
            />
          )}
          <QuickCard
            href="/portal/einstellungen"
            Icon={Settings}
            title="Einstellungen"
            desc="Profil, Passwort & Zugangsdaten"
            prim={prim}
            fullWidth={session.rolle !== 'inhaber'}
          />
        </section>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-black/[0.06] text-center space-y-2">
          {footerText && <p className="text-xs opacity-60 whitespace-pre-line">{footerText}</p>}
          {supportEmail && (
            <p className="text-xs opacity-50">
              Fragen? Schreib uns an{' '}
              <a href={`mailto:${supportEmail}`} className="underline hover:opacity-80">{supportEmail}</a>
            </p>
          )}
          {branding?.show_powered_by !== false && (
            <p className="text-[10px] opacity-40">Kunden-Portal · powered by Wellbeing Spaces</p>
          )}
        </footer>
      </div>
    </PortalShell>
  )
}

// ── StatCard (vertikal, kompakt) ─────────────────────────────
function StatCard({
  Icon, label, wert, tone, prim, href, highlight = false, sub,
}: {
  Icon: typeof FolderOpen
  label: string
  wert: number
  tone: 'brand' | 'blue' | 'neutral'
  prim: string
  href?: string
  highlight?: boolean
  sub?: string
}) {
  const isBrand = tone === 'brand'
  const isBlue  = tone === 'blue'

  const bgGlow = highlight
    ? isBlue  ? 'linear-gradient(135deg, rgba(59,130,246,0.10) 0%, rgba(59,130,246,0.02) 100%)'
    : isBrand ? `linear-gradient(135deg, rgba(var(--brand-primary-rgb),0.10) 0%, rgba(var(--brand-primary-rgb),0.02) 100%)`
    : '#fff'
    : '#fff'

  const border = highlight
    ? isBlue  ? 'rgba(59,130,246,0.22)'
    : isBrand ? 'rgba(var(--brand-primary-rgb),0.25)'
    : 'rgba(0,0,0,0.05)'
    : 'rgba(0,0,0,0.05)'

  const iconColor = highlight
    ? isBlue  ? '#3b82f6'
    : isBrand ? prim
    : undefined
    : undefined

  const valueColor = highlight
    ? isBlue  ? '#2563eb'
    : isBrand ? prim
    : undefined
    : undefined

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: highlight
                ? isBlue  ? 'rgba(59,130,246,0.12)'
                : isBrand ? 'rgba(var(--brand-primary-rgb),0.12)'
                : 'rgba(0,0,0,0.05)'
                : 'rgba(0,0,0,0.04)',
            }}
          >
            <Icon className="w-4 h-4" style={{ color: iconColor }} />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider opacity-70">{label}</span>
        </div>
        {href && wert > 0 && (
          <ArrowUpRight className="w-4 h-4 opacity-30 group-hover:opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        )}
      </div>
      <p className="mt-3 text-[28px] font-bold tabular-nums leading-none" style={{ color: valueColor }}>
        {wert}
      </p>
      {sub && <p className="mt-1.5 text-[11px] opacity-60 truncate">{sub}</p>}
    </>
  )

  const cls = 'relative block rounded-3xl px-5 py-5 border transition-all group'
  const interactive = href && wert > 0 ? 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer' : ''

  if (href && wert > 0) {
    return (
      <Link href={href} className={`${cls} ${interactive}`} style={{ background: bgGlow, borderColor: border }}>
        {content}
      </Link>
    )
  }
  return (
    <div className={cls} style={{ background: bgGlow, borderColor: border }}>
      {content}
    </div>
  )
}

// ── ProjektCard ───────────────────────────────────────────────
const ACCENT_COLORS = ['#94c1a4', '#cba178', '#93c5fd', '#fca5a5', '#fde68a', '#c4b5fd', '#6ee7b7']

function ProjektCard({
  id, name, gesamt, freigegeben, ausstehend, pct, prim, accentIdx,
}: {
  id: string
  name: string
  gesamt: number
  freigegeben: number
  ausstehend: number
  pct: number
  prim: string
  accentIdx: number
}) {
  const accent = ACCENT_COLORS[accentIdx % ACCENT_COLORS.length]

  return (
    <Link
      href={`/portal/projekte/${id}`}
      className="group relative block rounded-3xl bg-white border border-black/[0.05] overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-black/[0.06]"
    >
      {/* Color-Block Kopf */}
      <div className="relative h-16 overflow-hidden" style={{ background: `linear-gradient(135deg, ${accent} 0%, ${prim} 100%)` }}>
        <div aria-hidden className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/20 blur-xl" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        {/* Progress-Ring rechts oben */}
        {gesamt > 0 && (
          <div className="absolute top-2.5 right-3">
            <div className="relative w-10 h-10">
              <svg viewBox="0 0 40 40" className="w-10 h-10 -rotate-90">
                <circle cx="20" cy="20" r="16" stroke="rgba(255,255,255,0.25)" strokeWidth="3" fill="none" />
                <circle cx="20" cy="20" r="16" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round"
                  strokeDasharray={`${(pct / 100) * (2 * Math.PI * 16)} ${2 * Math.PI * 16}`} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white tabular-nums">
                {pct}%
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        <p className="text-[16px] font-bold text-gray-900 truncate mb-1 group-hover:opacity-85 transition-opacity">
          {name}
        </p>
        <p className="text-xs opacity-60">
          {gesamt === 0
            ? 'Noch keine Produkte'
            : `${freigegeben} von ${gesamt} freigegeben`}
        </p>
        {ausstehend > 0 && (
          <div
            className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={{ background: `rgba(var(--brand-primary-rgb),0.1)`, color: prim }}
          >
            <Clock className="w-3 h-3" />
            {ausstehend} ausstehend
          </div>
        )}
      </div>
    </Link>
  )
}

// ── QuickCard ────────────────────────────────────────────────
function QuickCard({
  href, Icon, title, desc, prim, fullWidth = false,
}: {
  href: string
  Icon: typeof Users
  title: string
  desc: string
  prim: string
  fullWidth?: boolean
}) {
  return (
    <Link
      href={href}
      className={`group relative overflow-hidden rounded-3xl bg-white border border-black/[0.05] p-5 transition-all hover:-translate-y-0.5 hover:shadow-md ${fullWidth ? 'sm:col-span-2' : ''}`}
    >
      <div aria-hidden
        className="absolute -right-10 -top-10 w-36 h-36 rounded-full opacity-0 group-hover:opacity-100 transition-opacity blur-2xl"
        style={{ background: `rgba(var(--brand-primary-rgb),0.12)` }}
      />
      <div className="relative">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: `rgba(var(--brand-primary-rgb),0.08)` }}
        >
          <Icon className="w-5 h-5" style={{ color: prim }} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <p className="text-xs opacity-60 mt-0.5">{desc}</p>
          </div>
          <ArrowRight className="w-4 h-4 opacity-30 group-hover:opacity-70 group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>
      </div>
    </Link>
  )
}
