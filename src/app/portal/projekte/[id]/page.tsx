import { redirect, notFound } from 'next/navigation'
import { portalProjektAbrufen } from '@/app/actions/portal'
import { brandingFuerToken }    from '@/app/actions/branding'
import { getPortalSession }     from '@/lib/portal-auth'
import PortalShell from '@/components/portal/PortalShell'
import PortalProjektClient from './PortalProjektClient'
import Link from 'next/link'
import { ChevronLeft, MapPin, Package, Clock } from 'lucide-react'

interface Props { params: { id: string } }

export default async function PortalProjektPage({ params }: Props) {
  const [daten, branding, session] = await Promise.all([
    portalProjektAbrufen(params.id).catch(() => null),
    brandingFuerToken(),
    getPortalSession(),
  ])

  if (!daten || !session) redirect('/portal/login')
  if (!daten.projekt) notFound()

  const { projekt, raeume, dokumente, nachrichten, events, moodboards, bestellStatusMap, reklamationen } = daten
  const prim     = branding?.primary_color  ?? '#445c49'
  const gradFrom = branding?.accent_gradient_from ?? null
  const gradTo   = branding?.accent_gradient_to ?? null

  // Stats fürs Hero
  const alleProdukte = raeume.flatMap((r) => r.produkte)
  const gesamt       = alleProdukte.length
  const freigegeben  = alleProdukte.filter((p) => p.freigabe_status === 'freigegeben').length
  const ausstehend   = alleProdukte.filter((p) => !p.freigabe_status || p.freigabe_status === 'ausstehend').length
  const pct          = gesamt > 0 ? Math.round((freigegeben / gesamt) * 100) : 0

  return (
    <PortalShell active="dashboard" session={session} branding={branding}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">

        {/* Breadcrumb */}
        <Link
          href="/portal/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-white border border-black/[0.06] text-gray-500 hover:text-gray-800 hover:border-black/[0.12] mb-5 transition"
        >
          <ChevronLeft className="w-3 h-3" /> Zurück zur Übersicht
        </Link>

        {/* Hero-Band — Gradient mit Stats */}
        <section
          className="relative overflow-hidden rounded-3xl mb-6 md:mb-8"
          style={{
            background: `linear-gradient(135deg, ${gradFrom ?? prim} 0%, ${gradTo ?? prim} 100%)`,
          }}
        >
          {/* Dekorative Orbs */}
          <div aria-hidden className="absolute -top-20 -right-16 w-80 h-80 rounded-full bg-white/15 blur-3xl" />
          <div aria-hidden className="absolute -bottom-16 -left-10 w-52 h-52 rounded-full bg-white/10 blur-2xl" />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />

          <div className="relative p-6 md:p-8 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
            {/* Titel-Bereich */}
            <div className="text-white min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70 mb-2">
                Projekt
              </p>
              <h1
                className="font-bold leading-[1.05] tracking-tight break-words"
                style={{ fontSize: 'clamp(22px, 3.8vw, 38px)' }}
              >
                {projekt.name}
              </h1>
              {projekt.standort && (
                <p className="text-[13px] text-white/80 mt-2 inline-flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" />
                  {projekt.standort}
                </p>
              )}
            </div>

            {/* Progress-Ring rechts */}
            {gesamt > 0 && (
              <div className="flex items-center gap-4 shrink-0">
                <div className="relative w-16 h-16 shrink-0">
                  <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
                    <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.18)" strokeWidth="4.5" fill="none" />
                    <circle
                      cx="32" cy="32" r="28"
                      stroke="#fff"
                      strokeWidth="4.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${(pct / 100) * (2 * Math.PI * 28)} ${2 * Math.PI * 28}`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[15px] font-bold text-white tabular-nums leading-none">{pct}%</span>
                  </div>
                </div>
                <div className="flex flex-col gap-0.5 text-white">
                  <div className="flex items-center gap-1.5">
                    <Package className="w-3 h-3 text-white/70" />
                    <span className="text-xs tabular-nums"><strong>{gesamt}</strong> Produkt{gesamt !== 1 ? 'e' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-white/70" />
                    <span className="text-xs tabular-nums"><strong>{ausstehend}</strong> ausstehend</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <PortalProjektClient
          projektId={projekt.id}
          projektName={projekt.name}
          prim={prim}
          raeume={raeume}
          dokumente={dokumente}
          nachrichten={nachrichten}
          events={events}
          moodboards={moodboards}
          bestellStatusMap={bestellStatusMap}
          reklamationen={reklamationen}
          preiseAnzeigen={session.preiseAnzeigen}
          vorname={session.vorname}
        />
      </div>
    </PortalShell>
  )
}
