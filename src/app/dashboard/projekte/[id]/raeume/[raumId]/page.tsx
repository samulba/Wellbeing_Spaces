import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getMwstSatz } from '@/app/actions/einstellungen'
import FilterBar from '@/components/FilterBar'
import SortableProduktTabelle from '@/components/SortableProduktTabelle'
import type { ProduktMitDetails } from '@/lib/supabase/types'

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

async function getProdukte(raumId: string): Promise<ProduktMitDetails[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('produkte')
    .select('*, partner(id, name), produktstatus(status, kommentar)')
    .eq('raum_id', raumId).is('deleted_at', null)
    .order('reihenfolge').order('created_at')
  return (data ?? []) as ProduktMitDetails[]
}

// ── Filter + Sort ─────────────────────────────────────────────
type SearchParams = { kategorie?: string; status?: string; sort?: string }

function filterUndSortieren(produkte: ProduktMitDetails[], sp: SearchParams): ProduktMitDetails[] {
  let result = [...produkte]

  if (sp.kategorie) result = result.filter((p) => p.kategorie === sp.kategorie)
  if (sp.status)    result = result.filter((p) => (p.produktstatus?.status ?? 'ausstehend') === sp.status)

  switch (sp.sort) {
    case 'name_asc':   result.sort((a, b) => a.name.localeCompare(b.name, 'de')); break
    case 'name_desc':  result.sort((a, b) => b.name.localeCompare(a.name, 'de')); break
    case 'preis_asc':  result.sort((a, b) => (a.verkaufspreis ?? 0) - (b.verkaufspreis ?? 0)); break
    case 'preis_desc': result.sort((a, b) => (b.verkaufspreis ?? 0) - (a.verkaufspreis ?? 0)); break
    case 'status':     result.sort((a, b) => (a.produktstatus?.status ?? '').localeCompare(b.produktstatus?.status ?? '')); break
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
  const [raum, alleProdukte, MWST] = await Promise.all([
    getRaum(params.raumId, params.id),
    getProdukte(params.raumId),
    getMwstSatz(),
  ])

  if (!raum) notFound()

  const produkte = filterUndSortieren(alleProdukte, searchParams)
  const projekt  = raum.projekte
  const kunde    = projekt?.kunden

  // Unique Kategorien für FilterBar
  const kategorien = Array.from(new Set(alleProdukte.map((p) => p.kategorie).filter(Boolean) as string[])).sort()

  // Summen (auf gefilterten Produkten)
  const sumEpGesamt       = produkte.reduce((s, p) => s + (p.einkaufspreis ?? 0) * p.menge, 0)
  const sumVpNettoGesamt  = produkte.reduce((s, p) => s + (p.verkaufspreis  ?? 0) * p.menge, 0)
  const sumVpBruttoGesamt = r2(sumVpNettoGesamt * (1 + MWST))
  const sumProvisionGesamt = produkte.reduce(
    (s, p) => s + r2((p.verkaufspreis ?? 0) * ((p.provision_prozent ?? 0) / 100) * p.menge), 0
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
        <Link
          href={`/dashboard/projekte/${params.id}/raeume/${params.raumId}/produkte/neu`}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-wellbeing-green hover:bg-wellbeing-green-dark hover:scale-[1.02] active:scale-[0.98] text-white text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap"
        >
          + Produkt hinzufügen
        </Link>
      </div>

      {/* Filter Bar */}
      {alleProdukte.length > 0 && (
        <div className="mb-4">
          <Suspense fallback={null}>
            <FilterBar kategorien={kategorien} />
          </Suspense>
        </div>
      )}

      {/* Leerzustand */}
      {alleProdukte.length === 0 && (
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
      {alleProdukte.length > 0 && produkte.length === 0 && (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-sm text-gray-400">Kein Produkt entspricht den gewählten Filtern.</p>
        </div>
      )}

      {/* Produkttabelle */}
      {produkte.length > 0 && (
        <>
          {/* Anzahl-Hinweis bei aktiven Filtern */}
          {(searchParams.kategorie || searchParams.status || searchParams.sort) && (
            <p className="text-xs text-gray-400 mb-2">
              {produkte.length} von {alleProdukte.length} Produkten
            </p>
          )}

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-4">
            <SortableProduktTabelle
              produkte={produkte}
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

