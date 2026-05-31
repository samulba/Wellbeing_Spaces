'use client'

import { useId, useState, useTransition, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { X, Search, Package, Check, Plus, Star } from 'lucide-react'
import { useModal } from '@/lib/hooks/useModal'
import { bibliothekProdukteAbrufen, type BibliothekProdukt } from '@/app/actions/produkte'
import { alternativenHinzufuegen, bibliotheksProdukteAlsAlternative } from '@/app/actions/produkt-gruppen'
import type { RaumProduktMitDetails } from '@/lib/supabase/types'

const eur = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)

interface Props {
  haupt: RaumProduktMitDetails
  eintraege: RaumProduktMitDetails[]
  raumId: string
  projektId: string
  onClose: () => void
}

type Tab = 'raum' | 'bibliothek'

export default function AlternativeModal({ haupt, eintraege, raumId, projektId, onClose }: Props) {
  const router = useRouter()
  const ref = useModal(true, onClose)
  const titleId = useId()
  const [tab, setTab] = useState<Tab>('raum')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [fehler, setFehler] = useState<string | null>(null)

  const [biblio, setBiblio] = useState<BibliothekProdukt[]>([])
  const [biblioLoading, setBiblioLoading] = useState(false)
  const loadBiblio = useCallback(async () => {
    setBiblioLoading(true)
    try { setBiblio(await bibliothekProdukteAbrufen()) } finally { setBiblioLoading(false) }
  }, [])
  useEffect(() => { if (tab === 'bibliothek' && biblio.length === 0) loadBiblio() }, [tab, biblio.length, loadBiblio])

  function switchTab(t: Tab) { setTab(t); setSelected(new Set()); setSearch('') }
  function toggle(id: string) {
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  // Kandidaten aus dem Raum: nicht das Hauptprodukt, nicht bereits in dessen Gruppe
  const hauptGruppe = haupt.produkt_gruppe_id ?? null
  const raumGefiltert = eintraege.filter((e) =>
    e.id !== haupt.id &&
    !(hauptGruppe && e.produkt_gruppe_id === hauptGruppe) &&
    (!search || e.produkte.name.toLowerCase().includes(search.toLowerCase())),
  )
  const biblioGefiltert = biblio.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.artikelnummer ?? '').toLowerCase().includes(search.toLowerCase()),
  )
  const leer = tab === 'raum' ? raumGefiltert.length === 0 : biblioGefiltert.length === 0

  function hinzufuegen() {
    if (selected.size === 0 || isPending) return
    const ids = Array.from(selected)
    startTransition(async () => {
      const res = tab === 'raum'
        ? await alternativenHinzufuegen(haupt.id, ids, raumId, projektId)
        : await bibliotheksProdukteAlsAlternative(haupt.id, ids, raumId, projektId)
      if (res?.fehler) { setFehler(res.fehler); setTimeout(() => setFehler(null), 5000); return }
      onClose()
      router.refresh()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 id={titleId} className="text-base font-semibold text-gray-900">Alternativen hinzufügen</h3>
              <p className="text-xs text-gray-500 mt-1 inline-flex items-center gap-1 min-w-0">
                zu <Star className="w-3 h-3 fill-wellbeing-green text-wellbeing-green shrink-0" />
                <span className="font-medium text-gray-700 truncate">{haupt.produkte.name}</span>
              </p>
            </div>
            <button onClick={onClose} aria-label="Schließen" className="text-gray-400 hover:text-gray-600 shrink-0"><X className="w-5 h-5" /></button>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
            Dieses Produkt wird automatisch eure ⭐-Empfehlung; die hinzugefügten Produkte werden Alternativen.
          </p>
          <div className="flex gap-1 mt-3">
            {([['raum', 'Im Raum'], ['bibliothek', 'Aus Bibliothek']] as [Tab, string][]).map(([t, label]) => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${tab === t ? 'bg-wellbeing-green text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Suche */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              placeholder="Produkt suchen…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green/30 focus:border-wellbeing-green"
            />
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'bibliothek' && biblioLoading ? (
            <div className="flex items-center justify-center py-16"><div className="w-8 h-8 rounded-full border-2 border-wellbeing-green border-t-transparent animate-spin" /></div>
          ) : leer ? (
            <div className="text-center py-16">
              <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">{tab === 'raum' ? 'Keine weiteren Produkte in diesem Raum.' : 'Keine Produkte gefunden.'}</p>
              {tab === 'raum' && <p className="text-xs text-gray-300 mt-1">Tipp: über &bdquo;Aus Bibliothek&ldquo; ein neues Produkt als Alternative hinzufügen.</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {tab === 'raum'
                ? raumGefiltert.map((e) => (
                    <KandidatKarte
                      key={e.id}
                      sel={selected.has(e.id)}
                      onToggle={() => toggle(e.id)}
                      name={e.produkte.name}
                      bild={e.produkte.bild_url}
                      kategorie={e.produkte.kategorie}
                      preis={e.verkaufspreis_override ?? e.produkte.verkaufspreis}
                    />
                  ))
                : biblioGefiltert.map((p) => (
                    <KandidatKarte
                      key={p.id}
                      sel={selected.has(p.id)}
                      onToggle={() => toggle(p.id)}
                      name={p.name}
                      bild={p.bild_url}
                      kategorie={p.kategorie?.name ?? null}
                      preis={p.verkaufspreis}
                      artikelnummer={p.artikelnummer}
                    />
                  ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex items-center justify-between gap-3">
          <span className="text-xs text-gray-400 shrink-0">{selected.size > 0 ? `${selected.size} ausgewählt` : 'Nichts ausgewählt'}</span>
          <div className="flex items-center gap-3 min-w-0">
            {fehler && <span className="text-xs text-red-600 truncate">{fehler}</span>}
            <button
              onClick={hinzufuegen}
              disabled={selected.size === 0 || isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-wellbeing-green hover:bg-wellbeing-green-dark text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-colors shrink-0"
            >
              {isPending
                ? <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Hinzufügen…</>
                : <><Plus className="w-4 h-4" />Als Alternative hinzufügen</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function KandidatKarte({ sel, onToggle, name, bild, kategorie, preis, artikelnummer }: {
  sel: boolean
  onToggle: () => void
  name: string
  bild: string | null
  kategorie: string | null
  preis: number | null
  artikelnummer?: string | null
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-3 p-3 border rounded-xl text-left transition-all ${sel ? 'border-wellbeing-green bg-wellbeing-green/8 ring-1 ring-wellbeing-green/30' : 'border-gray-200 hover:border-wellbeing-green/50 hover:bg-gray-50'}`}
    >
      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${sel ? 'border-wellbeing-green bg-wellbeing-green' : 'border-gray-300'}`}>
        {sel && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </div>
      <div className="w-11 h-11 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
        {bild ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bild} alt={name} className="w-full h-full object-cover" />
        ) : (
          <Package className="w-5 h-5 text-gray-300" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {kategorie && <span className="text-[11px] px-1.5 py-0.5 bg-gray-100 rounded-full text-gray-600">{kategorie}</span>}
          {preis != null && <span className="text-[11px] text-gray-500 font-medium">{eur(preis)}</span>}
          {artikelnummer && <span className="text-[11px] text-gray-400">Art. {artikelnummer}</span>}
        </div>
      </div>
    </button>
  )
}
