import { redirect } from 'next/navigation'
import { portalDashboardDaten } from '@/app/actions/portal'
import { brandingFuerToken }    from '@/app/actions/branding'
import { getPortalSession }     from '@/lib/portal-auth'
import Link from 'next/link'
import {
  FolderOpen, Clock, MessageSquare, CheckCircle2, ChevronRight,
  ArrowRight, Users, Settings, Sparkles,
} from 'lucide-react'
import PortalShell from '@/components/portal/PortalShell'

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

  // Projekt mit ungelesenen Nachrichten finden (für Nachrichten-Kachel-Link)
  const nachrichtenLinkProjekt = projekte[0]?.id ?? null

  return (
    <PortalShell active="dashboard" session={session} branding={branding}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-10">

        {/* Hero — großzügig, mit Mesh-Gradient */}
        <section
          className={`relative mb-8 lg:mb-12 brand-radius-lg overflow-hidden border border-black/[0.06] shadow-sm ${heroImage ? 'brand-hero-surface' : 'bg-white'}`}
        >
          {!heroImage && (
            <>
              <div
                aria-hidden
                className="absolute -top-32 -right-20 w-[480px] h-[480px] rounded-full opacity-40 blur-[100px]"
                style={{
                  background: (gradFrom && gradTo)
                    ? `linear-gradient(135deg, ${gradFrom}, ${gradTo})`
                    : `radial-gradient(circle, rgba(var(--brand-primary-rgb), 0.5), transparent 70%)`,
                }}
              />
              <div
                aria-hidden
                className="absolute -bottom-24 -left-12 w-[340px] h-[340px] rounded-full opacity-25 blur-[80px]"
                style={{ background: `radial-gradient(circle, rgba(var(--brand-primary-rgb), 0.35), transparent 70%)` }}
              />
              <div
                aria-hidden
                className="absolute inset-0 opacity-[0.02]"
                style={{
                  backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                  backgroundSize: '32px 32px',
                  color: 'var(--brand-text, #111)',
                }}
              />
            </>
          )}
          <div className="relative p-8 md:p-12 lg:p-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold mb-5"
              style={{
                background: heroImage ? 'rgba(255,255,255,0.18)' : 'rgba(var(--brand-primary-rgb), 0.1)',
                color: heroImage ? '#fff' : prim,
              }}
            >
              <Sparkles className="w-3 h-3" />
              Dein Portal
            </div>
            <h1
              className="font-bold leading-[1.05] tracking-tight"
              style={{
                color: heroImage ? '#fff' : 'var(--brand-text, #111827)',
                fontSize: 'clamp(32px, 5vw, 56px)',
              }}
            >
              Willkommen, {session.vorname}.
            </h1>
            <p className={`mt-4 text-[16px] md:text-[17px] leading-relaxed max-w-2xl ${heroImage ? 'text-white/85' : 'opacity-70'}`}>
              {welcomeText ?? `Hier findest du alle deine Projekte mit ${firma} auf einen Blick – Fortschritt, offene Freigaben und Nachrichten.`}
            </p>
          </div>
        </section>

        {/* Stats — klickbar, farbig hinterlegt, desktop breiter */}
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 mb-10">
          <StatKachel
            Icon={FolderOpen}
            label="Projekte"
            wert={projekte.length}
            href={projekte[0] ? `/portal/projekte/${projekte[0].id}` : undefined}
            tone="neutral"
            prim={prim}
          />
          <StatKachel
            Icon={Clock}
            label="Offene Freigaben"
            wert={offeneFreigaben}
            highlight={offeneFreigaben > 0}
            href={topProjekt ? `/portal/projekte/${topProjekt.id}` : undefined}
            tone="brand"
            prim={prim}
          />
          <StatKachel
            Icon={MessageSquare}
            label="Neue Nachrichten"
            wert={ungelesenNachrichten}
            highlight={ungelesenNachrichten > 0}
            href={nachrichtenLinkProjekt ? `/portal/projekte/${nachrichtenLinkProjekt}?tab=nachrichten` : undefined}
            tone="blue"
            prim={prim}
            className="col-span-2 sm:col-span-1"
          />
        </section>

        {/* Priority-CTA: offene Freigaben */}
        {offeneFreigaben > 0 && topProjekt && (
          <Link
            href={`/portal/projekte/${topProjekt.id}`}
            className="group mb-8 p-5 sm:p-6 brand-radius flex items-center justify-between gap-4 border transition-all hover:-translate-y-0.5 hover:shadow-lg"
            style={{
              background: `rgba(var(--brand-primary-rgb), 0.06)`,
              borderColor: `rgba(var(--brand-primary-rgb), 0.22)`,
            }}
          >
            <div className="flex items-center gap-4 min-w-0">
              <div
                className="w-11 h-11 brand-radius-sm flex items-center justify-center shrink-0"
                style={{ background: prim, color: 'var(--brand-button-text, #fff)' }}
              >
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold" style={{ color: prim }}>
                  {offeneFreigaben} Produkt{offeneFreigaben !== 1 ? 'e' : ''} warten auf dich
                </p>
                <p className="text-xs opacity-70 mt-0.5 truncate">
                  Starte bei &bdquo;{topProjekt.name}&ldquo;
                </p>
              </div>
            </div>
            <div
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 brand-radius-sm text-sm font-semibold shrink-0 group-hover:brightness-95 transition"
              style={{ background: prim, color: 'var(--brand-button-text, #fff)' }}
            >
              Jetzt freigeben <ArrowRight className="w-4 h-4" />
            </div>
            <ArrowRight className="sm:hidden w-5 h-5 shrink-0" style={{ color: prim }} />
          </Link>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Projekte — mehr Tiefe, bessere Meta-Info */}
          <section className="lg:col-span-2">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] opacity-50 mb-4">Meine Projekte</h2>
            {projekte.length === 0 ? (
              <div className="bg-white border border-black/[0.06] rounded-2xl p-10 text-center">
                <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Noch keine Projekte angelegt.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {projekte.map((p) => {
                  const pct = p.stats.gesamt > 0
                    ? Math.round((p.stats.freigegeben / p.stats.gesamt) * 100) : 0
                  return (
                    <Link
                      key={p.id}
                      href={`/portal/projekte/${p.id}`}
                      className="relative block bg-white border border-black/[0.06] rounded-2xl p-5 md:p-6 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5 hover:border-black/[0.12] transition-all group overflow-hidden"
                    >
                      {/* Accent-Strich links */}
                      <span
                        aria-hidden
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl transition-opacity opacity-0 group-hover:opacity-100"
                        style={{ background: prim }}
                      />
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-start gap-4 min-w-0">
                          {/* Mini-Progress-Ring */}
                          {p.stats.gesamt > 0 ? (
                            <ProgressRing pct={pct} color={prim} />
                          ) : (
                            <div
                              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                              style={{ background: `rgba(var(--brand-primary-rgb), 0.08)` }}
                            >
                              <FolderOpen className="w-5 h-5" style={{ color: prim }} />
                            </div>
                          )}
                          <div className="min-w-0 pt-1">
                            <p className="text-[16px] font-semibold text-gray-900 truncate group-hover:opacity-85 transition-opacity">
                              {p.name}
                            </p>
                            {p.stats.gesamt > 0 ? (
                              <p className="text-xs opacity-60 mt-1">
                                {p.stats.gesamt} {p.stats.gesamt === 1 ? 'Produkt' : 'Produkte'}
                                {' · '}
                                <span className="font-semibold" style={{ color: prim }}>
                                  {pct}% freigegeben
                                </span>
                              </p>
                            ) : (
                              <p className="text-xs opacity-50 mt-1">Noch keine Produkte</p>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mt-2 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
                      </div>

                      {p.stats.ausstehend > 0 && (
                        <div
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                          style={{ background: `rgba(var(--brand-primary-rgb), 0.08)`, color: prim }}
                        >
                          <Clock className="w-3 h-3" />
                          {p.stats.ausstehend} Freigabe{p.stats.ausstehend !== 1 ? 'n' : ''} ausstehend
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </section>

          {/* Aktivitäts-Feed */}
          <aside>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] opacity-50 mb-4">Letzte Aktivitäten</h2>
            {aktivitaeten.length === 0 ? (
              <div className="bg-white border border-black/[0.06] rounded-2xl p-6 text-center">
                <p className="text-xs text-gray-400">Noch keine Aktivitäten.</p>
              </div>
            ) : (
              <div className="bg-white border border-black/[0.06] rounded-2xl divide-y divide-black/[0.05]">
                {aktivitaeten.map((a) => (
                  <div key={a.id} className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: prim }} />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-700 leading-snug">{a.titel}</p>
                        <p className="text-[10px] opacity-50 mt-0.5">
                          {new Date(a.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>

        {/* Quick-Actions */}
        <section className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {session.rolle === 'inhaber' && (
            <Link
              href="/portal/team"
              className="p-5 bg-white border border-black/[0.06] brand-radius hover:border-black/[0.15] hover:shadow-sm transition-all group"
            >
              <div
                className="w-10 h-10 brand-radius-sm flex items-center justify-center mb-3"
                style={{ background: `rgba(var(--brand-primary-rgb), 0.08)` }}
              >
                <Users className="w-4 h-4" style={{ color: prim }} />
              </div>
              <p className="text-sm font-semibold text-gray-900">Team verwalten</p>
              <p className="text-xs opacity-60 mt-0.5">Mitarbeiter einladen & Rollen setzen</p>
            </Link>
          )}
          <Link
            href="/portal/einstellungen"
            className={`p-5 bg-white border border-black/[0.06] brand-radius hover:border-black/[0.15] hover:shadow-sm transition-all group ${session.rolle !== 'inhaber' ? 'sm:col-span-2' : ''}`}
          >
            <div
              className="w-10 h-10 brand-radius-sm flex items-center justify-center mb-3"
              style={{ background: `rgba(var(--brand-primary-rgb), 0.08)` }}
            >
              <Settings className="w-4 h-4" style={{ color: prim }} />
            </div>
            <p className="text-sm font-semibold text-gray-900">Einstellungen</p>
            <p className="text-xs opacity-60 mt-0.5">Profil, Passwort & Zugangsdaten</p>
          </Link>
        </section>

        {/* Footer */}
        <footer className="mt-14 pt-8 border-t border-black/[0.06] text-center space-y-2">
          {footerText && (
            <p className="text-xs opacity-60 whitespace-pre-line">{footerText}</p>
          )}
          {supportEmail && (
            <p className="text-xs opacity-50">
              Fragen? Schreib uns an{' '}
              <a href={`mailto:${supportEmail}`} className="underline hover:opacity-80">
                {supportEmail}
              </a>
            </p>
          )}
          {branding?.show_powered_by !== false && (
            <p className="text-[10px] opacity-40">
              Kunden-Portal · powered by Wellbeing Spaces
            </p>
          )}
        </footer>
      </div>
    </PortalShell>
  )
}

function ProgressRing({ pct, color }: { pct: number; color: string }) {
  const R = 18
  const C = 2 * Math.PI * R
  const dash = (Math.min(pct, 100) / 100) * C
  return (
    <div className="relative w-12 h-12 shrink-0">
      <svg viewBox="0 0 48 48" className="w-12 h-12 -rotate-90">
        <circle cx="24" cy="24" r={R} stroke="currentColor" strokeWidth="4" fill="none" className="text-black/[0.06]" />
        <circle cx="24" cy="24" r={R} stroke={color} strokeWidth="4" fill="none" strokeLinecap="round"
          strokeDasharray={`${dash} ${C}`} className="transition-all" />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums"
        style={{ color }}
      >
        {pct}%
      </span>
    </div>
  )
}

function StatKachel({
  Icon, label, wert, highlight, tone, prim, href, className = '',
}: {
  Icon: typeof FolderOpen
  label: string
  wert: number
  highlight?: boolean
  tone?: 'blue' | 'brand' | 'neutral'
  prim?: string
  href?: string
  className?: string
}) {
  const isBlue  = tone === 'blue'
  const isBrand = tone === 'brand'

  // Farbschema abhängig vom Tone + highlight
  const bg = highlight
    ? isBlue  ? 'rgba(59, 130, 246, 0.06)'
    : isBrand ? 'rgba(var(--brand-primary-rgb), 0.06)'
    : 'rgba(var(--brand-primary-rgb), 0.04)'
    : '#fff'
  const border = highlight
    ? isBlue  ? 'rgba(59, 130, 246, 0.22)'
    : isBrand ? 'rgba(var(--brand-primary-rgb), 0.25)'
    : 'rgba(0,0,0,0.06)'
    : 'rgba(0,0,0,0.06)'
  const iconColor = highlight
    ? isBlue  ? '#3b82f6'
    : isBrand ? prim
    : 'currentColor'
    : undefined
  const valueColor = highlight
    ? isBlue  ? '#2563eb'
    : isBrand ? prim
    : undefined
    : undefined

  const content = (
    <>
      <div className="flex items-center gap-2 mb-2 opacity-70">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{
            background: highlight
              ? isBlue  ? 'rgba(59, 130, 246, 0.12)'
              : isBrand ? `rgba(var(--brand-primary-rgb), 0.12)`
              : 'rgba(0,0,0,0.05)'
              : 'rgba(0,0,0,0.04)',
          }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: iconColor }} />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-3xl font-bold tabular-nums" style={{ color: valueColor }}>
        {wert}
      </p>
    </>
  )

  const baseCls = `relative rounded-2xl px-5 py-5 border transition-all ${className}`
  const interactive = href && wert > 0
    ? 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer'
    : ''

  if (href && wert > 0) {
    return (
      <Link href={href} className={`${baseCls} ${interactive} block`} style={{ background: bg, borderColor: border }}>
        {content}
      </Link>
    )
  }
  return (
    <div className={baseCls} style={{ background: bg, borderColor: border }}>
      {content}
    </div>
  )
}
