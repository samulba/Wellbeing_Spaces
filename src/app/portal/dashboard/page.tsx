import { redirect } from 'next/navigation'
import { portalDashboardDaten } from '@/app/actions/portal'
import { brandingFuerToken }    from '@/app/actions/branding'
import { portalLogout }         from '@/app/actions/portal'
import Link from 'next/link'
import Image from 'next/image'
import { FolderOpen, Clock, MessageSquare, CheckCircle2, ChevronRight, LogOut, User } from 'lucide-react'

export default async function PortalDashboardPage() {
  const [daten, branding] = await Promise.all([
    portalDashboardDaten().catch(() => null),
    brandingFuerToken(),
  ])

  if (!daten) redirect('/portal/login')

  const { session, projekte, aktivitaeten, ungelesenNachrichten } = daten
  const firma        = branding?.firmenname     ?? 'Wellbeing Spaces'
  const prim         = branding?.primary_color  ?? '#445c49'
  const welcomeText  = (branding as { welcome_text?: string | null })?.welcome_text ?? null
  const slogan       = (branding as { slogan?: string | null })?.slogan ?? null

  const offeneFreigaben = projekte.reduce((s, p) => s + p.stats.ausstehend, 0)

  return (
    <div className="min-h-screen">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-black/[0.06]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {branding?.logo_url ? (
              <Image src={branding.logo_url} alt={firma} width={120} height={36} className="h-9 w-auto object-contain" unoptimized />
            ) : (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: prim }}>
                {firma[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate leading-none">{firma}</p>
              {slogan && <p className="text-[10px] opacity-50 mt-0.5 truncate">{slogan}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/portal/profil"
              className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-black/[0.04] transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{session.vorname}</span>
            </Link>
            <form action={portalLogout}>
              <button
                type="submit"
                className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-red-500 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Abmelden</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        {/* Hero */}
        <section className="relative mb-10 rounded-3xl overflow-hidden border border-black/[0.06] bg-white p-8 shadow-sm">
          <div
            aria-hidden
            className="absolute -top-16 -right-16 w-80 h-80 rounded-full opacity-30 blur-[90px]"
            style={{ background: `radial-gradient(circle, rgba(var(--brand-primary-rgb), 0.4), transparent 70%)` }}
          />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-50 mb-2">Dein Portal</p>
            <h1 className="text-3xl md:text-[38px] font-bold leading-tight tracking-tight" style={{ color: 'var(--brand-text, #111827)' }}>
              Willkommen, {session.vorname}.
            </h1>
            <p className="mt-3 text-[15px] opacity-70 leading-relaxed max-w-xl">
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

        {/* Hinweis offene Freigaben */}
        {offeneFreigaben > 0 && (
          <div
            className="mb-8 p-4 rounded-2xl border flex items-center gap-3"
            style={{ background: `rgba(var(--brand-primary-rgb), 0.06)`, borderColor: `rgba(var(--brand-primary-rgb), 0.25)` }}
          >
            <Clock className="w-5 h-5 shrink-0" style={{ color: prim }} />
            <p className="text-sm" style={{ color: prim }}>
              <strong>{offeneFreigaben} Produkt{offeneFreigaben !== 1 ? 'e' : ''}</strong> warten auf deine Freigabe.
            </p>
          </div>
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

        {branding?.show_powered_by !== false && (
          <p className="text-center text-[10px] opacity-40 mt-12">
            Kunden-Portal · powered by Wellbeing Spaces
          </p>
        )}
      </main>
    </div>
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
