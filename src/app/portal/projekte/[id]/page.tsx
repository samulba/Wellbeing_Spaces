import { redirect, notFound } from 'next/navigation'
import { portalProjektAbrufen } from '@/app/actions/portal'
import { brandingFuerToken }    from '@/app/actions/branding'
import { getPortalSession }     from '@/lib/portal-auth'
import PortalShell from '@/components/portal/PortalShell'
import PortalProjektClient from './PortalProjektClient'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

interface Props { params: { id: string } }

export default async function PortalProjektPage({ params }: Props) {
  const [daten, branding, session] = await Promise.all([
    portalProjektAbrufen(params.id).catch(() => null),
    brandingFuerToken(),
    getPortalSession(),
  ])

  if (!daten || !session) redirect('/portal/login')
  if (!daten.projekt) notFound()

  const { projekt, raeume, dokumente, nachrichten, events } = daten
  const prim = branding?.primary_color ?? '#445c49'

  return (
    <PortalShell active="dashboard" session={session} branding={branding}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Link
          href="/portal/dashboard"
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 mb-3 transition"
        >
          <ChevronLeft className="w-3 h-3" /> Meine Projekte
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl md:text-[30px] font-bold tracking-tight" style={{ color: 'var(--brand-text, #111827)' }}>
            {projekt.name}
          </h1>
          {projekt.standort && <p className="text-sm opacity-60 mt-0.5">{projekt.standort}</p>}
        </div>

        <PortalProjektClient
          projektId={projekt.id}
          projektName={projekt.name}
          prim={prim}
          raeume={raeume}
          dokumente={dokumente}
          nachrichten={nachrichten}
          events={events}
          preiseAnzeigen={session.preiseAnzeigen}
          vorname={session.vorname}
        />
      </div>
    </PortalShell>
  )
}
