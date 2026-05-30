import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

// Muss dynamisch sein — sonst werden die Raum-Produkte und Timeline-Events
// zwischen Sync-Aufrufen gecacht und Änderungen sind erst nach Hard-Refresh sichtbar.
export const dynamic = 'force-dynamic'
export const revalidate = 0
import { getMwstSatz, getKategorien } from '@/app/actions/einstellungen'
import { getRaumProdukte } from '@/app/actions/raum-produkte'
import { produktGruppenAbrufen } from '@/app/actions/produkt-gruppen'
import { raumEventsAbrufen } from '@/app/actions/timeline'
import FilterBar from '@/components/FilterBar'
import SortableProduktTabelle from '@/components/SortableProduktTabelle'
import { Timeline } from '@/components/Timeline'
import type { Partner, RaumProduktMitDetails } from '@/lib/supabase/types'
import ProduktHinzufuegenModal from '@/components/ProduktHinzufuegenModal'
import RaumEventButton from '@/components/RaumEventButton'
import TimelineSyncButton from '@/components/TimelineSyncButton'
import RaumZusatzkostenBlock from '@/components/RaumZusatzkostenBlock'
import { getRaumZusatzkosten } from '@/app/actions/raum-zusatzkosten'

async function getPartner(): Promise<Pick<Partner, 'id' | 'name'>[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('partner')
    .select('id, name')
    .is('deleted_at', null)
    .order('name')
  return data ?? []
}

const r2 = (n: number) => Math.round(n * 100) / 100
const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)

// ── Datenabruf ────────────────────────────────────────────────
type RaumMitProjekt = {
  id: string; name: string; beschreibung: string | null
  projekt_id: string; reihenfolge: number
  deleted_at: string | null; created_at: string; updated_at: string
  projekte: { id: string; name: string; kunden: { id: string; name: string } | null } | null
}

async function getRaum(raumId: string, projektId: string): Promise<RaumMitProjekt | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('raeume')
    .select('*, projekte(id, name, kunden(id, name))')
    .eq('id', raumId).eq('projekt_id', projektId).is('deleted_at', null).single()
  return data as RaumMitProjekt | null
}

// ── Filter ─────────────────────────────────────────────────────
type SearchParams = { kategorie?: string; status?: string; partner_id?: string }

function filtern(
  eintraege: RaumProduktMitDetails[],
  sp: SearchParams
): RaumProduktMitDetails[] {
  let result = eintraege
  if (sp.kategorie)  result = result.filter((e) => e.produkte.kategorie === sp.kategorie)
  if (sp.status)     result = result.filter((e) => (e.freigabe_status ?? 'ausstehend') === sp.status)
  if (sp.partner_id) result = result.filter((e) => e.produkte.partner_id === sp.partner_id)
  return result
}

// ── Seite ─────────────────────────────────────────────────────
export default async function RaumDetailPage({
  params,
  searchParams,
}: {
  params: { id: string; raumId: string }
  searchParams: SearchParams
}) {
  const [raum, alleEintraege, MWST, timelineEvents, kategorienDB, partnerListe, zusatzkosten, produktGruppen] = await Promise.all([
    getRaum(params.raumId, params.id),
    getRaumProdukte(params.raumId),
    getMwstSatz(),
    raumEventsAbrufen(params.raumId),
    getKategorien('produktkategorie'),
    getPartner(),
    getRaumZusatzkosten(params.raumId),
    produktGruppenAbrufen(params.raumId),
  ])

  if (!raum) notFound()

  const eintraege = filtern(alleEintraege, searchParams)
  const projekt   = raum.projekte
  const kunde     = projekt?.kunden

  // Kategorien-Optionen für Filter: nur die, die in diesem Raum wirklich verwendet werden,
  // angereichert mit dem firmenweit hinterlegten Icon.
  const verwendeteKategorien = new Set(
    alleEintraege.map((e) => e.produkte.kategorie).filter(Boolean) as string[]
  )
  const kategorienFuerFilter = kategorienDB
    .filter((k) => verwendeteKategorien.has(k.name))
    .map((k) => ({ name: k.name, icon: k.icon }))
  // Fallback: falls ein Produkt eine Kategorie hat, die (noch) nicht in der Firmen-Tabelle ist
  Array.from(verwendeteKategorien).forEach((name) => {
    if (!kategorienFuerFilter.some((k) => k.name === name)) {
      kategorienFuerFilter.push({ name, icon: 'Package' })
    }
  })
  kategorienFuerFilter.sort((a, b) => a.name.localeCompare(b.name, 'de'))

  // Partner-Optionen: nur Partner, deren Produkte tatsächlich im Raum liegen
  const verwendetePartnerIds = new Set(
    alleEintraege.map((e) => e.produkte.partner_id).filter(Boolean) as string[]
  )
  const partnerFuerFilter = partnerListe
    .filter((p) => verwendetePartnerIds.has(p.id))
    .map((p) => ({ id: p.id, name: p.name }))

  // Effektiver VP pro Eintrag
  const effVP = (e: RaumProduktMitDetails) => e.verkaufspreis_override ?? e.produkte.verkaufspreis ?? 0

  // Summen (auf gefilterten Einträgen)
  const sumEpGesamt       = eintraege.reduce((s, e) => s + (e.produkte.einkaufspreis ?? 0) * e.menge, 0)
  const sumVpNettoGesamt  = eintraege.reduce((s, e) => s + effVP(e) * e.menge, 0)
  const sumVpBruttoGesamt = r2(sumVpNettoGesamt * (1 + MWST))
  const sumProvisionGesamt = eintraege.reduce(
    (s, e) => s + r2(effVP(e) * ((e.produkte.provision_prozent ?? 0) / 100) * e.menge), 0
  )

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 animate-fadeIn">
      {/* Breadcrumb + Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
            {kunde && (
              <>
                <Link href={`/dashboard/kunden/${kunde.id}`} className="hover:text-wellbeing-green transition-colors">{kunde.name}</Link>
                <span>›</span>
              </>
            )}
            <Link href={`/dashboard/projekte/${params.id}`} className="hover:text-wellbeing-green transition-colors">
              {projekt?.name ?? 'Projekt'}
            </Link>
            <span>›</span>
            <span className="text-gray-600">{raum.name}</span>
          </nav>
          <h1 className="text-xl font-semibold text-gray-900">{raum.name}</h1>
          {raum.beschreibung && (
            <p className="text-sm text-gray-500 mt-0.5">{raum.beschreibung}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ProduktHinzufuegenModal raumId={params.raumId} projektId={params.id} />
        </div>
      </div>

      {/* Raum-Timeline */}
      <div className="mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap shrink-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Timeline</p>
                {timelineEvents.length > 0 && (
                  <span className="text-[10px] text-gray-400 tabular-nums">
                    {timelineEvents.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <TimelineSyncButton raumId={params.raumId} projektId={params.id} />
                <RaumEventButton projektId={params.id} raumId={params.raumId} />
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <Timeline events={timelineEvents} maxHoehe="460px" />
            </div>
            <div className="mt-2 shrink-0">
              <Link
                href={`/dashboard/projekte/${params.id}/timeline?raum=${params.raumId}`}
                className="text-xs text-wellbeing-green hover:underline"
              >
                Zur Projekt-Timeline →
              </Link>
            </div>
          </div>
      </div>

      {/* Filter Bar */}
      {alleEintraege.length > 0 && (
        <div className="mb-4">
          <Suspense fallback={null}>
            <FilterBar kategorien={kategorienFuerFilter} partner={partnerFuerFilter} />
          </Suspense>
        </div>
      )}

      {/* Leerzustand — oeffnet das ProduktHinzufuegenModal mit Bibliothek/Neu-Auswahl */}
      {alleEintraege.length === 0 && (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-gray-500 text-sm mb-4">Noch keine Produkte in diesem Raum.</p>
          <div className="inline-flex">
            <ProduktHinzufuegenModal raumId={params.raumId} projektId={params.id} />
          </div>
        </div>
      )}

      {/* Keine Treffer nach Filter */}
      {alleEintraege.length > 0 && eintraege.length === 0 && (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-sm text-gray-400">Kein Produkt entspricht den gewählten Filtern.</p>
        </div>
      )}

      {/* Produkttabelle */}
      {eintraege.length > 0 && (
        <>
          {/* Anzahl-Hinweis bei aktiven Filtern */}
          {(searchParams.kategorie || searchParams.status || searchParams.partner_id) && (
            <p className="text-xs text-gray-400 mb-2">
              {eintraege.length} von {alleEintraege.length} Produkten
            </p>
          )}

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-4">
            <SortableProduktTabelle
              eintraege={eintraege}
              mwst={MWST}
              projektId={params.id}
              raumId={params.raumId}
              produktGruppen={produktGruppen}
            />

            {/* Summenzeile */}
            <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-2 justify-end">
                <SummeZelle label="EP gesamt"        wert={eur(r2(sumEpGesamt))}         intern />
                <SummeZelle label="Provision gesamt" wert={eur(r2(sumProvisionGesamt))}  intern />
                <SummeZelle label="VP netto gesamt"  wert={eur(r2(sumVpNettoGesamt))} />
                <SummeZelle label="VP brutto gesamt" wert={eur(sumVpBruttoGesamt)}        hervorheben />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Zusatzkosten (Lieferung, Handwerker, Montage, ...) */}
      <div className="mt-6">
        <RaumZusatzkostenBlock
          raumId={params.raumId}
          projektId={params.id}
          mwstSatz={MWST}
          initial={zusatzkosten}
        />
      </div>
    </div>
  )
}

// ── Sub-Komponenten ───────────────────────────────────────────
function SummeZelle({ label, wert, intern, hervorheben }: { label: string; wert: string; intern?: boolean; hervorheben?: boolean }) {
  return (
    <div className="text-right">
      <p className={`text-xs mb-0.5 ${intern ? 'text-red-400/60' : 'text-gray-500'}`}>{label}</p>
      <p className={`text-sm font-mono font-semibold ${hervorheben ? 'text-wellbeing-green' : intern ? 'text-red-500/70' : 'text-gray-700'}`}>
        {wert}
      </p>
    </div>
  )
}
