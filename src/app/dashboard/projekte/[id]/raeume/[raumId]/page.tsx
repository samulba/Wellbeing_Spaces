import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getMwstSatz } from '@/app/actions/einstellungen'
import { getRaumProdukte } from '@/app/actions/raum-produkte'
import { raumEventsAbrufen } from '@/app/actions/timeline'
import FilterBar from '@/components/FilterBar'
import SortableProduktTabelle from '@/components/SortableProduktTabelle'
import { Timeline } from '@/components/Timeline'
import type { RaumProduktMitDetails } from '@/lib/supabase/types'
import { LayoutDashboard } from 'lucide-react'
import GrundrissVorschau from '@/components/raumplaner/GrundrissVorschau'

const r2 = (n: number) => Math.round(n * 100) / 100
const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)

// ── Datenabruf ────────────────────────────────────────────────
type RaumMitProjekt = {
  id: string; name: string; beschreibung: string | null
  projekt_id: string; reihenfolge: number
  deleted_at: string | null; created_at: string; updated_at: string
  grundriss_json: Record<string, unknown> | null
  breite_m: number | null; laenge_m: number | null; hoehe_m: number | null
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

// ── Filter + Sort ─────────────────────────────────────────────
type SearchParams = { kategorie?: string; status?: string; sort?: string }

function filterUndSortieren(
  eintraege: RaumProduktMitDetails[],
  sp: SearchParams
): RaumProduktMitDetails[] {
  let result = [...eintraege]

  if (sp.kategorie) result = result.filter((e) => e.produkte.kategorie === sp.kategorie)
  if (sp.status)    result = result.filter((e) => (e.produkte.produktstatus?.status ?? 'ausstehend') === sp.status)

  const effVP = (e: RaumProduktMitDetails) => e.verkaufspreis_override ?? e.produkte.verkaufspreis ?? 0

  switch (sp.sort) {
    case 'name_asc':   result.sort((a, b) => a.produkte.name.localeCompare(b.produkte.name, 'de')); break
    case 'name_desc':  result.sort((a, b) => b.produkte.name.localeCompare(a.produkte.name, 'de')); break
    case 'preis_asc':  result.sort((a, b) => effVP(a) - effVP(b)); break
    case 'preis_desc': result.sort((a, b) => effVP(b) - effVP(a)); break
    case 'status':     result.sort((a, b) =>
      (a.produkte.produktstatus?.status ?? '').localeCompare(b.produkte.produktstatus?.status ?? '')
    ); break
  }
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
  const [raum, alleEintraege, MWST, timelineEvents] = await Promise.all([
    getRaum(params.raumId, params.id),
    getRaumProdukte(params.raumId),
    getMwstSatz(),
    raumEventsAbrufen(params.raumId),
  ])

  if (!raum) notFound()

  const eintraege = filterUndSortieren(alleEintraege, searchParams)
  const projekt   = raum.projekte
  const kunde     = projekt?.kunden

  // Unique Kategorien für FilterBar
  const kategorien = Array.from(
    new Set(alleEintraege.map((e) => e.produkte.kategorie).filter(Boolean) as string[])
  ).sort()

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
          <Link
            href={`/dashboard/projekte/${params.id}/raeume/${params.raumId}/produkte/neu`}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-wellbeing-green hover:bg-wellbeing-green-dark hover:scale-[1.02] active:scale-[0.98] text-white text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap"
          >
            + Produkt hinzufügen
          </Link>
        </div>
      </div>

      {/* Grundriss-Vorschau */}
      <div className="mb-6">
        {raum.grundriss_json ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-800">Grundriss</p>
                {(raum.breite_m || raum.laenge_m) && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {raum.breite_m ?? '?'} m × {raum.laenge_m ?? '?'} m
                    {raum.hoehe_m ? ` · H ${raum.hoehe_m} m` : ''}
                  </p>
                )}
              </div>
              <Link
                href={`/dashboard/projekte/${params.id}/raeume/${params.raumId}/planer`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-wellbeing-green hover:bg-wellbeing-green-dark text-white text-xs font-medium rounded-lg transition-colors"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Im Raumplaner bearbeiten
              </Link>
            </div>
            <div className="p-4 bg-gray-50 flex justify-center">
              <GrundrissVorschau
                grundrissJson={JSON.stringify(raum.grundriss_json)}
                breiteM={raum.breite_m}
                laengeM={raum.laenge_m}
                vorschauBreite={500}
                className="shadow-sm"
              />
            </div>
          </div>
        ) : (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Noch kein Grundriss erstellt</p>
                <p className="text-xs text-gray-400 mt-0.5">Plane den Raum mit dem interaktiven Raumplaner</p>
              </div>
            </div>
            <Link
              href={`/dashboard/projekte/${params.id}/raeume/${params.raumId}/planer`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium rounded-lg transition-colors whitespace-nowrap border border-gray-700"
            >
              <LayoutDashboard className="w-4 h-4" />
              Raumplaner öffnen
            </Link>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      {alleEintraege.length > 0 && (
        <div className="mb-4">
          <Suspense fallback={null}>
            <FilterBar kategorien={kategorien} />
          </Suspense>
        </div>
      )}

      {/* Leerzustand */}
      {alleEintraege.length === 0 && (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-gray-500 text-sm">Noch keine Produkte in diesem Raum.</p>
          <Link
            href={`/dashboard/projekte/${params.id}/raeume/${params.raumId}/produkte/neu`}
            className="inline-block mt-3 text-sm text-wellbeing-green underline underline-offset-2"
          >
            Erstes Produkt hinzufügen
          </Link>
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
          {(searchParams.kategorie || searchParams.status || searchParams.sort) && (
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
            />

            {/* Summenzeile */}
            <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-8 justify-end min-w-[960px] overflow-x-auto">
                <SummeZelle label="EP gesamt"        wert={eur(r2(sumEpGesamt))}         intern />
                <SummeZelle label="Provision gesamt" wert={eur(r2(sumProvisionGesamt))}  intern />
                <SummeZelle label="VP netto gesamt"  wert={eur(r2(sumVpNettoGesamt))} />
                <SummeZelle label="VP brutto gesamt" wert={eur(sumVpBruttoGesamt)}        hervorheben />
              </div>
            </div>
          </div>

          <p className="text-xs text-red-400/60 text-right">
            <span className="inline-block w-2 h-2 rounded-full bg-red-300/60 mr-1" />
            Rot markierte Spalten sind interne Felder und werden Kunden nie angezeigt
          </p>
        </>
      )}

      {/* Raum-Timeline */}
      <div className="mt-6 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Raum-Timeline</p>
          <Link
            href={`/dashboard/projekte/${params.id}/timeline`}
            className="text-xs text-wellbeing-green hover:underline"
          >
            Zur Projekt-Timeline →
          </Link>
        </div>
        <Timeline events={timelineEvents} />
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
