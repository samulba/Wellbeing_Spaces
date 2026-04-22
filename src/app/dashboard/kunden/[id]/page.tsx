import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { portalBenutzerAbrufen } from '@/app/actions/portal'
import { getKommunikation } from '@/app/actions/kommunikation'
import { meineRolleAbrufen } from '@/app/actions/team'
import { kundeStats, kundeProjekteMitStats } from '@/app/actions/kunden'
import { kundeEventsAbrufen } from '@/app/actions/timeline'
import { istAdmin } from '@/lib/permissions'
import KundeLoeschenModal from '@/components/KundeLoeschenModal'
import NotizBlock, { type Notiz } from '@/components/NotizBlock'
import LogoUpload from '@/components/LogoUpload'
import KundenPortalSection from '@/components/KundenPortalSection'
import KommunikationBlock from '@/components/KommunikationBlock'
import KundeStatsBand from '@/components/KundeStatsBand'
import KundeProjektliste from '@/components/KundeProjektliste'
import KundeTimelineBlock from '@/components/KundeTimelineBlock'

async function getKunde(id: string) {
  const supabase = await createClient()
  // Auch archivierte Kunden laden, damit der Breadcrumb-Link von einem
  // archivierten Projekt nicht in 404 läuft. Banner oben zeigt den Status.
  const { data } = await supabase.from('kunden').select('*').eq('id', id).single()
  return data
}

async function getNotizen(kundeId: string): Promise<Notiz[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('notizen')
    .select('id, inhalt, erstellt_von, erstellt_am, bearbeitet_am')
    .eq('typ', 'kunde')
    .eq('referenz_id', kundeId)
    .is('deleted_at', null)
    .order('erstellt_am', { ascending: false })
  return (data ?? []) as Notiz[]
}

export default async function KundeDetailPage({ params }: { params: { id: string } }) {
  const kunde = await getKunde(params.id)
  if (!kunde) notFound()

  const istArchiviert = kunde.deleted_at != null
  const [projekteMitStats, notizen, portalUser, kommunikation, rolle, stats, kundeEvents] = await Promise.all([
    kundeProjekteMitStats(params.id, istArchiviert),
    getNotizen(params.id),
    portalBenutzerAbrufen(params.id),
    getKommunikation(params.id),
    meineRolleAbrufen(),
    kundeStats(params.id),
    kundeEventsAbrufen(params.id),
  ])

  const darfLoeschen = istAdmin(rolle)

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 animate-fadeIn">
      {/* Archiviert-Banner */}
      {istArchiviert && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-900">Dieser Kunde ist archiviert</p>
            <p className="text-xs text-amber-700">
              Archiviert am {new Date(kunde.deleted_at!).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              {' · '}Projekte werden inklusive archivierter angezeigt
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <LogoUpload typ="kunde" entityId={kunde.id} initialLogoUrl={kunde.logo_url} name={kunde.name} />
          <div>
            <Link href="/dashboard/kunden" className="text-xs text-gray-400 hover:text-wellbeing-green transition-colors mb-0.5 inline-block">
              ← Kunden
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">{kunde.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/kunden/${kunde.id}/bearbeiten`}
            className="px-4 py-2 text-xs font-medium text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:scale-[1.02] rounded-lg transition-all duration-200"
          >
            Bearbeiten
          </Link>
          {darfLoeschen && (
            <KundeLoeschenModal kundeId={kunde.id} kundeName={kunde.name} />
          )}
        </div>
      </div>

      {/* KPI-Band: Projekte / Angebote / Verträge / Letzter Kontakt */}
      <div className="mb-6">
        <KundeStatsBand stats={stats} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stammdaten + Sidebar */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Kontaktdaten</h2>
            <dl className="space-y-3">
              <InfoZeile label="Ansprechpartner" wert={kunde.ansprechpartner} />
              <InfoZeile label="E-Mail" wert={kunde.email} link={kunde.email ? `mailto:${kunde.email}` : undefined} />
              <InfoZeile label="Telefon" wert={kunde.telefon} link={kunde.telefon ? `tel:${kunde.telefon}` : undefined} />
              <InfoZeile label="Adresse" wert={kunde.adresse} />
            </dl>
          </div>
          {kunde.notizen && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Interne Notizen (alt)</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{kunde.notizen}</p>
            </div>
          )}
          <NotizBlock typ="kunde" referenzId={kunde.id} initialNotizen={notizen} />
          <KundenPortalSection
            kundeId={kunde.id}
            kundeName={kunde.name}
            initialPortalUser={portalUser}
          />
        </div>

        {/* Rechte Spalte: Projekte + Kommunikation */}
        <div className="lg:col-span-2 space-y-6">
          {/* Projekte mit Mini-Stats */}
          <KundeProjektliste
            projekte={projekteMitStats}
            neuesProjektHref={`/dashboard/projekte/neu?kunde=${kunde.id}`}
          />

          {/* Multi-Projekt-Timeline */}
          <KundeTimelineBlock
            events={kundeEvents}
            projekte={projekteMitStats.map((p) => ({ id: p.id, name: p.name }))}
          />

          {/* Kommunikationslog */}
          <KommunikationBlock kundeId={kunde.id} initialEintraege={kommunikation} />
        </div>
      </div>
    </div>
  )
}

function InfoZeile({ label, wert, link }: { label: string; wert: string | null; link?: string }) {
  if (!wert) return null
  return (
    <div>
      <dt className="text-xs text-gray-500 mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-700 select-text">
        {link ? <a href={link} className="hover:text-wellbeing-green transition-colors select-text">{wert}</a> : wert}
      </dd>
    </div>
  )
}
