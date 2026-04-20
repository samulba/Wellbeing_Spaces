import { redirect } from 'next/navigation'
import { portalDashboardDaten } from '@/app/actions/portal'
import { brandingFuerToken }    from '@/app/actions/branding'
import { getPortalSession }     from '@/lib/portal-auth'
import Link from 'next/link'
import { FolderOpen, Clock, MessageSquare, CheckCircle2, ChevronRight, ArrowRight, Users, Settings } from 'lucide-react'
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

  // Projekt mit den meisten offenen Freigaben für CTA-Button
  const topProjekt = [...projekte].sort((a, b) => b.stats.ausstehend - a.stats.ausstehend)[0]

  return (
    <PortalShell active="dashboard" session={session} branding={branding}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 md:py-10">

        {/* Hero */}
        <section
          className={`relative mb-10 brand-radius-lg overflow-hidden border border-black/[0.06] shadow-sm ${heroImage ? 'brand-hero-surface' : 'bg-white'}`}
        >
          {heroImage ? null : (
            <div
              aria-hidden
              className="absolute -top-16 -right-16 w-80 h-80 rounded-full opacity-30 blur-[90px]"
              style={{
                background: (gradFrom && gradTo)
                  ? `linear-gradient(135deg, ${gradFrom}, ${gradTo})`
                  : `radial-gradient(circle, rgba(var(--brand-primary-rgb), 0.4), transparent 70%)`,
              }}
            />
          )}
          <div className="relative p-8">
            <p className={`text-xs font-semibold uppercase tracking-[0.2em] mb-2 ${heroImage ? 'opacity-80 text-white/90' : 'opacity-50'}`}>
              Dein Portal
            </p>
            <h1
              className="text-3xl md:text-[38px] font-bold leading-tight tracking-tight"
              style={{ color: heroImage ? '#fff' : 'var(--brand-text, #111827)' }}
            >
              Willkommen, {session.vorname}.
            </h1>
            <p className={`mt-3 text-[15px] leading-relaxed max-w-xl ${heroImage ? 'text-white/85' : 'opacity-70'}`}>
              {welcomeText ?? `Hier findest du alle deine Projekte mit ${firma} auf einen Blick – Fortschritt, offene Freigaben und Nachrichten.`}
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
          <StatKachel Icon={FolderOpen} label="Projekte" wert={projekte.length} />
          <StatKachel
            Icon={Clock}
            label="Offene Freigaben"
            wert={offeneFreigaben}
            highlight={offeneFreigaben > 0}
            prim={prim}
          />
          <StatKachel
            Icon={MessageSquare}
            label="Neue Nachrichten"
            wert={ungelesenNachrichten}
            highlight={ungelesenNachrichten > 0}
            tone="blue"
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Projekte */}
          <section className="lg:col-span-2">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] opacity-50 mb-3">Meine Projekte</h2>
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
                      className="relative block bg-white border border-black/[0.06] rounded-2xl p-5 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5 hover:border-black/[0.12] transition-all group"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold text-gray-900 truncate group-hover:opacity-80 transition-opacity">
                            {p.name}
                          </p>
                          {p.stats.gesamt > 0 ? (
                            <p className="text-xs opacity-60 mt-0.5">
                              {p.stats.gesamt} {p.stats.gesamt === 1 ? 'Produkt' : 'Produkte'}
                              {' · '}
                              {pct}% freigegeben
                            </p>
                          ) : (
                            <p className="text-xs opacity-50 mt-0.5">Noch keine Produkte</p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 group-hover:text-gray-500 transition-colors" />
                      </div>

                      {p.stats.gesamt > 0 && (
                        <div className="h-1.5 bg-black/[0.06] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: prim }}
                          />
                        </div>
                      )}
                      {p.stats.ausstehend > 0 && (
                        <p className="text-xs mt-2 font-medium" style={{ color: prim }}>
                          {p.stats.ausstehend} Freigabe{p.stats.ausstehend !== 1 ? 'n' : ''} ausstehend
                        </p>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </section>

          {/* Aktivitäts-Feed */}
          <aside>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] opacity-50 mb-3">Letzte Aktivitäten</h2>
            {aktivitaeten.length === 0 ? (
              <div className="bg-white border border-black/[0.06] rounded-2xl p-6 text-center">
                <p className="text-xs text-gray-400">Noch keine Aktivitäten.</p>
              </div>
            ) : (
              <div className="bg-white border border-black/[0.06] rounded-2xl divide-y divide-black/[0.05]">
                {aktivitaeten.map((a) => (
                  <div key={a.id} className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-gray-300 shrink-0 mt-0.5" />
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
        <section className="mt-10 grid grid-cols-2 gap-3">
          {session.rolle === 'inhaber' && (
            <Link
              href="/portal/team"
              className="p-4 bg-white border border-black/[0.06] brand-radius hover:border-black/[0.15] hover:shadow-sm transition-all group"
            >
              <Users className="w-5 h-5 mb-2 opacity-60 group-hover:opacity-100 transition-opacity" style={{ color: prim }} />
              <p className="text-sm font-semibold text-gray-900">Team verwalten</p>
              <p className="text-xs opacity-60 mt-0.5">Mitarbeiter einladen & Rollen setzen</p>
            </Link>
          )}
          <Link
            href="/portal/einstellungen"
            className={`p-4 bg-white border border-black/[0.06] brand-radius hover:border-black/[0.15] hover:shadow-sm transition-all group ${session.rolle !== 'inhaber' ? 'col-span-2' : ''}`}
          >
            <Settings className="w-5 h-5 mb-2 opacity-60 group-hover:opacity-100 transition-opacity" style={{ color: prim }} />
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

function StatKachel({
  Icon, label, wert, highlight, tone, prim, className = '',
}: {
  Icon: typeof FolderOpen
  label: string
  wert: number
  highlight?: boolean
  tone?: 'blue'
  prim?: string
  className?: string
}) {
  const isBlue = tone === 'blue'
  return (
    <div
      className={`relative bg-white border rounded-2xl px-5 py-4 transition-colors ${
        highlight
          ? isBlue ? 'border-blue-200' : 'border-black/[0.06]'
          : 'border-black/[0.06]'
      } ${className}`}
      style={highlight && !isBlue && prim
        ? { borderColor: `rgba(var(--brand-primary-rgb), 0.3)`, background: `rgba(var(--brand-primary-rgb), 0.03)` }
        : undefined}
    >
      <div className="flex items-center gap-2 mb-1.5 opacity-60">
        <Icon className={`w-3.5 h-3.5 ${highlight ? (isBlue ? 'text-blue-500' : '') : ''}`}
          style={highlight && !isBlue ? { color: prim } : undefined} />
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p
        className={`text-2xl font-bold tabular-nums ${highlight && isBlue ? 'text-blue-600' : ''}`}
        style={highlight && !isBlue ? { color: prim } : undefined}
      >
        {wert}
      </p>
    </div>
  )
}
