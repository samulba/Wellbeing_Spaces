import { redirect, notFound } from 'next/navigation'
import { portalProjektAbrufen, portalLogout } from '@/app/actions/portal'
import { brandingFuerToken }                  from '@/app/actions/branding'
import PortalProjektClient from './PortalProjektClient'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, LogOut, User } from 'lucide-react'

interface Props { params: { id: string } }

const STATUS_LABEL: Record<string, string> = {
  offen: 'Offen', in_bearbeitung: 'In Bearbeitung',
  freigegeben: 'Freigegeben', abgeschlossen: 'Abgeschlossen',
}

export default async function PortalProjektPage({ params }: Props) {
  const [daten, branding] = await Promise.all([
    portalProjektAbrufen(params.id).catch(() => null),
    brandingFuerToken(),
  ])

  if (!daten) redirect('/portal/login')
  if (!daten.projekt) notFound()

  const { session, projekt, raeume, dokumente, nachrichten, events } = daten
  const firma = branding?.firmenname    ?? 'Wellbeing Spaces'
  const prim  = branding?.primary_color ?? '#445c49'

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding?.logo_url ? (
              <Image src={branding.logo_url} alt={firma} width={80} height={28} className="h-7 w-auto object-contain" />
            ) : (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: prim }}>
                {firma[0]}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/portal/profil"
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition">
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:block">{session.vorname}</span>
            </Link>
            <form action={portalLogout}>
              <button type="submit" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb + Titel */}
        <div className="mb-6">
          <Link href="/portal/dashboard" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 mb-3 transition">
            <ChevronLeft className="w-3 h-3" /> Meine Projekte
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{projekt.name}</h1>
              {projekt.standort && <p className="text-sm text-gray-500 mt-0.5">{projekt.standort}</p>}
            </div>
            {projekt.status && (
              <span className="shrink-0 text-xs px-3 py-1.5 rounded-full font-medium bg-gray-100 text-gray-600">
                {STATUS_LABEL[projekt.status] ?? projekt.status}
              </span>
            )}
          </div>
        </div>

        {/* Client-Teil mit Tabs */}
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
      </main>
    </div>
  )
}
