'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Library, MapPinned, Search, ExternalLink } from 'lucide-react'

const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)

// ── Datentypen vom Server ────────────────────────────────────
export type SortimentEintrag = {
  id:             string
  name:           string
  artikelnummer:  string | null
  bild_url:       string | null
  einheit:        string
  verkaufspreis:  number | null
  raumCount:      number               // in wie vielen Räumen verbaut
  mengeGesamt:    number               // Summe Stk. über alle Räume
  bestellt:       number               // Anzahl Einsätze mit bestellstatus !== 'ausstehend'
  geliefert:      number               // davon bereits geliefert/rechnung
}

export type EinsatzEintrag = {
  raumProduktId:  string
  produktId:      string
  produktName:    string
  artikelnummer:  string | null
  bild_url:       string | null
  projektId:      string
  projektName:    string
  raumId:         string
  raumName:       string
  einheit:        string
  menge:          number
  preisEffektiv:  number                // override ?? bibliotheks-vp, in netto pro Einheit
  bestellstatus:  'ausstehend' | 'bestellt' | 'geliefert' | 'rechnung_erhalten'
  freigabeStatus: 'ausstehend' | 'freigegeben' | 'abgelehnt' | 'ueberarbeitung'
}

const BESTELL_BADGE: Record<string, { label: string; cls: string }> = {
  ausstehend:        { label: 'Ausstehend',     cls: 'bg-gray-100 text-gray-500' },
  bestellt:          { label: 'Bestellt',       cls: 'bg-amber-50 text-amber-700' },
  geliefert:         { label: 'Geliefert',      cls: 'bg-emerald-50 text-emerald-700' },
  rechnung_erhalten: { label: 'Rechnung da',    cls: 'bg-blue-50 text-blue-700' },
}

const FREIGABE_BADGE: Record<string, { label: string; cls: string }> = {
  ausstehend:     { label: 'Ausstehend',     cls: 'bg-gray-100 text-gray-500' },
  freigegeben:    { label: 'Freigegeben',    cls: 'bg-emerald-50 text-emerald-700' },
  abgelehnt:      { label: 'Abgelehnt',      cls: 'bg-red-50 text-red-600' },
  ueberarbeitung: { label: 'Überarbeitung',  cls: 'bg-amber-50 text-amber-700' },
}

// ── Komponente ───────────────────────────────────────────────
export default function PartnerProdukteTab({
  partnerId,
  sortiment,
  einsatz,
}: {
  partnerId: string
  sortiment: SortimentEintrag[]
  einsatz:   EinsatzEintrag[]
}) {
  const [view, setView]   = useState<'sortiment' | 'einsatz'>('sortiment')
  const [suche, setSuche] = useState('')
  const [filterProjekt, setFilterProjekt] = useState<string>('')
  const [filterBestell, setFilterBestell] = useState<string>('')

  // Projekte für Filter-Dropdown
  const projekteFuerFilter = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of einsatz) map.set(e.projektId, e.projektName)
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [einsatz])

  const sortimentGefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase()
    if (!q) return sortiment
    return sortiment.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.artikelnummer ?? '').toLowerCase().includes(q),
    )
  }, [sortiment, suche])

  const einsatzGefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase()
    return einsatz.filter((e) => {
      if (filterProjekt && e.projektId !== filterProjekt) return false
      if (filterBestell && e.bestellstatus !== filterBestell) return false
      if (q) {
        const matchProdukt = e.produktName.toLowerCase().includes(q) || (e.artikelnummer ?? '').toLowerCase().includes(q)
        const matchOrt     = e.projektName.toLowerCase().includes(q) || e.raumName.toLowerCase().includes(q)
        if (!matchProdukt && !matchOrt) return false
      }
      return true
    })
  }, [einsatz, suche, filterProjekt, filterBestell])

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header: Sub-Tab-Toggle + Aktionen */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setView('sortiment')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              view === 'sortiment' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Library className="w-3.5 h-3.5" />
            Sortiment <span className="text-gray-400 font-normal ml-0.5">({sortiment.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setView('einsatz')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              view === 'einsatz' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <MapPinned className="w-3.5 h-3.5" />
            Einsatz <span className="text-gray-400 font-normal ml-0.5">({einsatz.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Suche */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
              placeholder={view === 'sortiment' ? 'Produkt suchen…' : 'Produkt, Projekt, Raum…'}
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-wellbeing-green focus:ring-2 focus:ring-wellbeing-green/20 transition-all w-52"
            />
          </div>

          {view === 'einsatz' && (
            <>
              <select
                value={filterProjekt}
                onChange={(e) => setFilterProjekt(e.target.value)}
                className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-wellbeing-green"
              >
                <option value="">Alle Projekte</option>
                {projekteFuerFilter.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <select
                value={filterBestell}
                onChange={(e) => setFilterBestell(e.target.value)}
                className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-wellbeing-green"
              >
                <option value="">Alle Bestell-Stati</option>
                <option value="ausstehend">Ausstehend</option>
                <option value="bestellt">Bestellt</option>
                <option value="geliefert">Geliefert</option>
                <option value="rechnung_erhalten">Rechnung da</option>
              </select>
            </>
          )}

          <Link
            href={`/dashboard/produkte/bibliothek/neu?partner_id=${partnerId}`}
            className="text-xs px-3 py-1.5 bg-wellbeing-green hover:bg-wellbeing-green-dark text-white font-medium rounded-lg transition-colors"
          >
            + Produkt
          </Link>
        </div>
      </div>

      {/* Inhalt */}
      {view === 'sortiment' ? (
        <SortimentListe eintraege={sortimentGefiltert} />
      ) : (
        <EinsatzListe eintraege={einsatzGefiltert} />
      )}
    </div>
  )
}

// ── Sortiment-Liste ─────────────────────────────────────────
function SortimentListe({ eintraege }: { eintraege: SortimentEintrag[] }) {
  if (eintraege.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-sm text-gray-400">Keine Produkte gefunden.</p>
      </div>
    )
  }
  return (
    <div className="divide-y divide-gray-100">
      {eintraege.map((p) => (
        <div key={p.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
          {/* Bild */}
          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
            {p.bild_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.bild_url} alt={p.name} className="w-full h-full object-cover" />
            ) : (
              <Library className="w-5 h-5 text-gray-300" />
            )}
          </div>
          {/* Name + Art-Nr */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
              {p.artikelnummer && (
                <span className="text-[11px] text-gray-400 font-mono shrink-0">{p.artikelnummer}</span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {p.raumCount > 0 ? (
                <>
                  In <span className="font-semibold text-gray-700">{p.raumCount}</span> {p.raumCount === 1 ? 'Raum' : 'Räumen'}
                  {' · '}
                  <span className="font-semibold text-gray-700">{p.mengeGesamt}</span> {p.einheit}
                  {p.bestellt > 0 && (
                    <>
                      {' · '}
                      <span className="text-amber-700">{p.bestellt} bestellt</span>
                      {p.geliefert > 0 && <span className="text-emerald-700"> ({p.geliefert} geliefert)</span>}
                    </>
                  )}
                </>
              ) : (
                <span className="text-gray-400 italic">Noch nicht in Räumen verbaut</span>
              )}
            </p>
          </div>
          {/* Preis */}
          <div className="text-right shrink-0 hidden sm:block">
            <p className="text-xs text-gray-400">VP netto</p>
            <p className="text-sm font-mono text-gray-700">{p.verkaufspreis != null ? eur(p.verkaufspreis) : '–'}</p>
          </div>
          {/* Aktionen */}
          <Link
            href={`/dashboard/produkte/${p.id}/bearbeiten`}
            className="text-xs text-gray-500 hover:text-wellbeing-green flex items-center gap-1 shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Öffnen</span>
          </Link>
        </div>
      ))}
    </div>
  )
}

// ── Einsatz-Liste ───────────────────────────────────────────
function EinsatzListe({ eintraege }: { eintraege: EinsatzEintrag[] }) {
  if (eintraege.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-sm text-gray-400">Kein Einsatz dieses Partners in den aktuellen Filtern.</p>
      </div>
    )
  }
  const summe = eintraege.reduce((s, e) => s + e.preisEffektiv * e.menge, 0)
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className={th + ' text-left'}>Produkt</th>
              <th className={th + ' text-left'}>Projekt → Raum</th>
              <th className={th}>Menge</th>
              <th className={th}>VP netto</th>
              <th className={th}>Bestellung</th>
              <th className={th}>Freigabe</th>
            </tr>
          </thead>
          <tbody>
            {eintraege.map((e, i) => {
              const bs = BESTELL_BADGE[e.bestellstatus] ?? BESTELL_BADGE.ausstehend
              const fs = FREIGABE_BADGE[e.freigabeStatus] ?? FREIGABE_BADGE.ausstehend
              return (
                <tr
                  key={e.raumProduktId}
                  className={`hover:bg-gray-50 transition-colors ${i < eintraege.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                        {e.bild_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={e.bild_url} alt={e.produktName} className="w-full h-full object-cover" />
                        ) : (
                          <Library className="w-3.5 h-3.5 text-gray-300" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{e.produktName}</p>
                        {e.artikelnummer && (
                          <p className="text-[11px] text-gray-400 font-mono">{e.artikelnummer}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 align-middle">
                    <Link
                      href={`/dashboard/projekte/${e.projektId}`}
                      className="hover:text-wellbeing-green transition-colors"
                    >
                      {e.projektName}
                    </Link>
                    <span className="text-gray-400"> › </span>
                    <Link
                      href={`/dashboard/projekte/${e.projektId}/raeume/${e.raumId}`}
                      className="hover:text-wellbeing-green transition-colors"
                    >
                      {e.raumName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600 align-middle">
                    {e.menge} {e.einheit}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-gray-700 align-middle">
                    {eur(e.preisEffektiv)}
                  </td>
                  <td className="px-4 py-3 text-center align-middle">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${bs.cls}`}>
                      {bs.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center align-middle">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${fs.cls}`}>
                      {fs.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50/60 text-xs text-gray-500">
        <span>Summe (effektive VP × Menge):</span>
        <span className="font-mono font-semibold text-wellbeing-green">{eur(summe)}</span>
      </div>
    </>
  )
}

const th = 'px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-widest'
