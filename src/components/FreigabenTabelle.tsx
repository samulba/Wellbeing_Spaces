'use client'

import { useState } from 'react'
import Link from 'next/link'

// ── Typen ─────────────────────────────────────────────────────
export type FreigabeEintrag = {
  id: string
  name: string
  kategorie: string | null
  menge: number
  einheit: string
  verkaufspreis: number | null
  raeume: {
    id: string
    name: string
    projekt_id: string
    projekte: {
      id: string
      name: string
      kunden: { id: string; name: string } | null
    } | null
  } | null
  produktstatus: { status: string; kommentar: string | null } | null
}

// ── Konstanten ────────────────────────────────────────────────
const statusBadge: Record<string, string> = {
  ausstehend:     'bg-gray-100 text-gray-500',
  freigegeben:    'bg-emerald-50 text-emerald-700',
  abgelehnt:      'bg-red-50 text-red-600',
  ueberarbeitung: 'bg-amber-50 text-amber-700',
}
const statusLabel: Record<string, string> = {
  ausstehend:     'Ausstehend',
  freigegeben:    'Freigegeben',
  abgelehnt:      'Abgelehnt',
  ueberarbeitung: 'Überarbeitung',
}

const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)

type Tab = 'offen' | 'freigegeben' | 'abgelehnt' | 'alle'

function matchTab(status: string, tab: Tab): boolean {
  if (tab === 'alle') return true
  if (tab === 'offen') return status === 'ausstehend' || status === 'ueberarbeitung'
  return status === tab
}

// ── Komponente ────────────────────────────────────────────────
export default function FreigabenTabelle({ eintraege }: { eintraege: FreigabeEintrag[] }) {
  const [tab, setTab] = useState<Tab>('offen')
  const [filterProjekt, setFilterProjekt] = useState('')
  const [filterKunde,   setFilterKunde]   = useState('')

  const offenCount = eintraege.filter((e) => {
    const s = e.produktstatus?.status ?? 'ausstehend'
    return s === 'ausstehend' || s === 'ueberarbeitung'
  }).length

  // Unique Projekte + Kunden für Filter
  const projekte = Array.from(
    new Map(
      eintraege
        .map((e) => e.raeume?.projekte)
        .filter(Boolean)
        .map((p) => [p!.id, p!.name])
    )
  ).sort((a, b) => a[1].localeCompare(b[1], 'de'))

  const kunden = Array.from(
    new Map(
      eintraege
        .map((e) => e.raeume?.projekte?.kunden)
        .filter(Boolean)
        .map((k) => [k!.id, k!.name])
    )
  ).sort((a, b) => a[1].localeCompare(b[1], 'de'))

  const gefiltert = eintraege.filter((e) => {
    const status = e.produktstatus?.status ?? 'ausstehend'
    if (!matchTab(status, tab)) return false
    if (filterProjekt && e.raeume?.projekte?.id !== filterProjekt) return false
    if (filterKunde   && e.raeume?.projekte?.kunden?.id !== filterKunde) return false
    return true
  })

  const tabs: { key: Tab; label: string }[] = [
    { key: 'offen',       label: 'Offen' },
    { key: 'freigegeben', label: 'Freigegeben' },
    { key: 'abgelehnt',   label: 'Abgelehnt' },
    { key: 'alle',        label: 'Alle' },
  ]

  return (
    <div>
      {/* Tabs */}
      <div className="flex items-center gap-0 mb-6 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
              tab === t.key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            {t.label}
            {t.key === 'offen' && offenCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-red-500 text-white rounded-full">
                {offenCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={filterProjekt}
          onChange={(e) => setFilterProjekt(e.target.value)}
          className={sel}
        >
          <option value="">Alle Projekte</option>
          {projekte.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <select
          value={filterKunde}
          onChange={(e) => setFilterKunde(e.target.value)}
          className={sel}
        >
          <option value="">Alle Kunden</option>
          {kunden.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        {(filterProjekt || filterKunde) && (
          <button
            onClick={() => { setFilterProjekt(''); setFilterKunde('') }}
            className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 hover:border-gray-300 px-2.5 py-1.5 rounded-lg transition-all hover:bg-gray-50"
          >
            ✕ Filter zurücksetzen
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">
          {gefiltert.length} {gefiltert.length === 1 ? 'Produkt' : 'Produkte'}
        </span>
      </div>

      {/* Tabelle */}
      {gefiltert.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-sm text-gray-400">
            {tab === 'offen' ? 'Keine offenen Freigaben.' : 'Keine Einträge in dieser Kategorie.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className={th + ' text-left'}>Produkt</th>
                  <th className={th + ' text-left'}>Raum</th>
                  <th className={th + ' text-left'}>Projekt</th>
                  <th className={th + ' text-left'}>Kunde</th>
                  <th className={th}>Menge</th>
                  <th className={th}>VP netto</th>
                  <th className={th}>Status</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {gefiltert.map((e, i) => {
                  const status    = e.produktstatus?.status ?? 'ausstehend'
                  const kommentar = e.produktstatus?.kommentar
                  const projekt   = e.raeume?.projekte
                  const kunde     = projekt?.kunden
                  return (
                    <tr
                      key={e.id}
                      className={`hover:bg-gray-50 transition-colors ${i < gefiltert.length - 1 ? 'border-b border-gray-100' : ''}`}
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-gray-900">{e.name}</div>
                        {kommentar && (
                          <div className="text-xs text-amber-600 mt-0.5 max-w-xs truncate" title={kommentar}>
                            Kommentar: {kommentar}
                          </div>
                        )}
                        {e.kategorie && (
                          <div className="text-xs text-gray-400 mt-0.5">{e.kategorie}</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">{e.raeume?.name ?? '–'}</td>
                      <td className="px-4 py-3.5">
                        {projekt ? (
                          <Link
                            href={`/dashboard/projekte/${projekt.id}`}
                            className="text-gray-700 hover:text-indigo-600 transition-colors"
                          >
                            {projekt.name}
                          </Link>
                        ) : '–'}
                      </td>
                      <td className="px-4 py-3.5">
                        {kunde ? (
                          <Link
                            href={`/dashboard/kunden/${kunde.id}`}
                            className="text-gray-700 hover:text-indigo-600 transition-colors"
                          >
                            {kunde.name}
                          </Link>
                        ) : '–'}
                      </td>
                      <td className="px-4 py-3.5 text-center text-gray-600">{e.menge} {e.einheit}</td>
                      <td className="px-4 py-3.5 text-center font-mono text-gray-700">
                        {e.verkaufspreis != null ? eur(e.verkaufspreis) : '–'}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusBadge[status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {statusLabel[status] ?? status}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        {e.raeume && projekt && (
                          <Link
                            href={`/dashboard/projekte/${projekt.id}/raeume/${e.raeume.id}`}
                            className="text-xs text-gray-400 hover:text-indigo-600 transition-colors whitespace-nowrap"
                          >
                            Öffnen →
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

const th  = 'px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-widest'
const sel = 'px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition cursor-pointer'
