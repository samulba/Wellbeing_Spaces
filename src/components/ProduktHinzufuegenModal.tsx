'use client'

import { useId, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, X, ChevronRight, BookOpen, PlusCircle,
  Search, ChevronDown, Package, Check, Boxes,
} from 'lucide-react'
import { bibliothekProdukteAbrufen, type BibliothekProdukt } from '@/app/actions/produkte'
import { produktZuRaumHinzufuegen } from '@/app/actions/raum-produkte'
import { getBundlesMitKomponenten, bundleZuRaumHinzufuegen } from '@/app/actions/bundles'
import type { BundleMitKomponenten } from '@/lib/supabase/types'
import { useModal } from '@/lib/hooks/useModal'

interface Props {
  raumId: string
  projektId: string
}

type View = 'idle' | 'choice' | 'library' | 'sets'

export default function ProduktHinzufuegenModal({ raumId, projektId }: Props) {
  const router = useRouter()
  const [view, setView]               = useState<View>('idle')
  const [produkte, setProdukte]       = useState<BibliothekProdukt[]>([])
  const [loading, setLoading]         = useState(false)
  const [search, setSearch]           = useState('')
  const [kategorie, setKategorie]     = useState('')
  const [toast, setToast]             = useState<{ msg: string; err?: boolean } | null>(null)
  const [selected, setSelected]       = useState<Set<string>>(new Set())
  const [adding, setAdding]           = useState(false)

  const [bundles, setBundles]         = useState<BundleMitKomponenten[]>([])
  const [setAnzahl, setSetAnzahl]     = useState<Record<string, number>>({})

  const choiceTitleId  = useId()
  const libraryTitleId = useId()
  const setsTitleId    = useId()
  const choiceRef  = useModal(view === 'choice',  () => setView('idle'))
  const libraryRef = useModal(view === 'library', () => setView('idle'))
  const setsRef    = useModal(view === 'sets',    () => setView('idle'))

  function showToast(msg: string, err = false) {
    setToast({ msg, err })
    setTimeout(() => setToast(null), 3500)
  }

  const loadLibrary = useCallback(async () => {
    setLoading(true)
    try {
      const data = await bibliothekProdukteAbrufen()
      setProdukte(data)
    } finally {
      setLoading(false)
    }
  }, [])

  function openChoice() { setView('choice') }

  function openLibrary() {
    setView('library')
    setSelected(new Set())
    loadLibrary()
  }

  const loadBundles = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getBundlesMitKomponenten()
      setBundles(data)
    } finally {
      setLoading(false)
    }
  }, [])

  function openSets() {
    setView('sets')
    loadBundles()
  }

  async function handleAddSet(bundleId: string) {
    if (adding) return
    setAdding(true)
    const anzahl = setAnzahl[bundleId] && setAnzahl[bundleId] > 0 ? setAnzahl[bundleId] : 1
    const res = await bundleZuRaumHinzufuegen(bundleId, raumId, anzahl, projektId)
    setAdding(false)
    if (res.fehler) { showToast(res.fehler, true); return }
    const teil = res.uebersprungen.length > 0
      ? ` · ${res.uebersprungen.length} bereits im Raum übersprungen`
      : ''
    showToast(`Set hinzugefügt: ${res.hinzugefuegt} Komponente${res.hinzugefuegt === 1 ? '' : 'n'}${teil}`)
    if (res.hinzugefuegt > 0) {
      close()
      router.refresh()
    }
  }

  function close() {
    setView('idle')
    setSearch('')
    setKategorie('')
    setSelected(new Set())
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === gefiltert.length && gefiltert.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(gefiltert.map((p) => p.id)))
    }
  }

  async function handleBatchAdd() {
    if (selected.size === 0 || adding) return
    setAdding(true)

    let erfolgreich = 0
    let duplikate = 0
    let fehler = 0

    for (const produktId of Array.from(selected)) {
      const result = await produktZuRaumHinzufuegen(produktId, raumId, 1, null, projektId)
      if (!result.fehler) {
        erfolgreich++
      } else if (result.fehler.includes('bereits')) {
        duplikate++
      } else {
        fehler++
      }
    }

    setAdding(false)

    if (fehler > 0) {
      showToast(`${fehler} Fehler beim Hinzufügen.`, true)
    } else if (duplikate > 0 && erfolgreich === 0) {
      showToast(`${duplikate} Produkt${duplikate > 1 ? 'e' : ''} bereits im Raum.`, true)
    } else if (duplikate > 0) {
      showToast(`${erfolgreich} hinzugefügt, ${duplikate} bereits vorhanden.`)
    } else {
      showToast(`${erfolgreich} Produkt${erfolgreich > 1 ? 'e' : ''} hinzugefügt`)
    }

    if (erfolgreich > 0) {
      close()
      router.refresh()
    }
  }

  // Filtered products
  const gefiltert = produkte.filter((p) => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.artikelnummer ?? '').toLowerCase().includes(search.toLowerCase())
    const matchKat = !kategorie || p.kategorie_id === kategorie
    return matchSearch && matchKat
  })

  const allSelected = gefiltert.length > 0 && selected.size === gefiltert.length

  // Unique categories from loaded products
  const kategorien = Array.from(
    new Map(
      produkte
        .filter((p) => p.kategorie)
        .map((p) => [p.kategorie!.id, p.kategorie!])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name, 'de'))

  const eur = (n: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)

  const isWorking = adding

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={openChoice}
        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-wellbeing-green hover:bg-wellbeing-green-dark hover:scale-[1.02] active:scale-[0.98] text-white text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap"
      >
        <Plus className="w-4 h-4" />
        Produkt hinzufügen
      </button>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${
          toast.err ? 'bg-red-500' : 'bg-wellbeing-green'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* ── Auswahl-Modal ────────────────────────────────────── */}
      {view === 'choice' && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={close}
        >
          <div
            ref={choiceRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={choiceTitleId}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <h3 id={choiceTitleId} className="text-base font-semibold text-gray-900">Produkt hinzufügen</h3>
              <button onClick={close} aria-label="Schließen" className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-3">
              {/* Option 1 — Bibliothek (primär) */}
              <button
                onClick={openLibrary}
                className="w-full flex items-center gap-4 p-4 border-2 border-wellbeing-green bg-wellbeing-green/5 rounded-xl hover:bg-wellbeing-green/10 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-lg bg-wellbeing-green flex items-center justify-center shrink-0">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-gray-900 block">Aus Bibliothek wählen</span>
                  <span className="text-sm text-gray-500">Bestehendes Produkt zum Raum hinzufügen</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
              </button>

              {/* Option 2 — Neu erstellen */}
              <button
                onClick={() => {
                  close()
                  router.push(`/dashboard/projekte/${projektId}/raeume/${raumId}/produkte/neu`)
                }}
                className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <PlusCircle className="w-6 h-6 text-gray-500" />
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-gray-900 block">Neues Produkt erstellen</span>
                  <span className="text-sm text-gray-500">Produkt anlegen und direkt zuweisen</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
              </button>

              {/* Option 3 — Set / Bundle */}
              <button
                onClick={openSets}
                className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <Boxes className="w-6 h-6 text-gray-500" />
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-gray-900 block">Set / Bundle hinzufügen</span>
                  <span className="text-sm text-gray-500">Komplettset – alle Komponenten auf einmal</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Set-Modal ─────────────────────────────────────────── */}
      {view === 'sets' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={close}>
          <div
            ref={setsRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={setsTitleId}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[82vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 id={setsTitleId} className="text-base font-semibold text-gray-900">Set / Bundle hinzufügen</h3>
              <button onClick={close} aria-label="Schließen" className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 rounded-full border-2 border-wellbeing-green border-t-transparent animate-spin" />
                </div>
              ) : bundles.length === 0 ? (
                <div className="text-center py-16">
                  <Boxes className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Noch keine Sets angelegt.</p>
                  <button
                    onClick={() => { close(); router.push('/dashboard/produkte/bundles/neu') }}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs text-wellbeing-green hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> Set anlegen
                  </button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {bundles.map((b) => (
                    <li key={b.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl">
                      <div className="w-11 h-11 rounded-lg bg-wellbeing-green/10 flex items-center justify-center shrink-0">
                        <Boxes className="w-5 h-5 text-wellbeing-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{b.name}</p>
                        <p className="text-xs text-gray-400">
                          {b.komponenten.length} Komponenten · {eur(b.set_preis_netto)} netto
                        </p>
                      </div>
                      <input
                        type="number" min={1} step={1}
                        value={setAnzahl[b.id] ?? 1}
                        onChange={(e) => setSetAnzahl((prev) => ({ ...prev, [b.id]: Math.max(1, parseInt(e.target.value) || 1) }))}
                        className="w-16 px-2 py-1.5 text-sm text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20"
                        aria-label="Anzahl Sets"
                      />
                      <button
                        onClick={() => handleAddSet(b.id)}
                        disabled={adding || b.komponenten.length === 0}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-wellbeing-green hover:bg-wellbeing-green-dark text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
                      >
                        <Plus className="w-3.5 h-3.5" /> Hinzufügen
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex items-center justify-between">
              <span className="text-xs text-gray-400">{bundles.length} Set{bundles.length === 1 ? '' : 's'}</span>
              <button
                onClick={() => { close(); router.push('/dashboard/produkte/bundles/neu') }}
                className="inline-flex items-center gap-1.5 text-xs text-wellbeing-green hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Neues Set anlegen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bibliotheks-Modal ─────────────────────────────────── */}
      {view === 'library' && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={close}
        >
          <div
            ref={libraryRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={libraryTitleId}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[82vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 id={libraryTitleId} className="text-base font-semibold text-gray-900">Aus Bibliothek wählen</h3>
              <button onClick={close} aria-label="Schließen" className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Suche + Filter */}
            <div className="px-4 py-3 border-b border-gray-100 flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Produkt oder Artikelnr. suchen…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green/30 focus:border-wellbeing-green transition-colors"
                />
              </div>
              {kategorien.length > 0 && (
                <div className="relative">
                  <select
                    value={kategorie}
                    onChange={(e) => setKategorie(e.target.value)}
                    className="appearance-none pl-3 pr-9 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-wellbeing-green/30 focus:border-wellbeing-green transition-colors"
                  >
                    <option value="">Alle Kategorien</option>
                    {kategorien.map((k) => (
                      <option key={k.id} value={k.id}>{k.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              )}
              {/* Alle auswählen */}
              {gefiltert.length > 0 && !loading && (
                <button
                  onClick={toggleAll}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                    allSelected
                      ? 'border-wellbeing-green bg-wellbeing-green/10 text-wellbeing-green'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {allSelected ? 'Alle abwählen' : 'Alle auswählen'}
                </button>
              )}
            </div>

            {/* Produktliste */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 rounded-full border-2 border-wellbeing-green border-t-transparent animate-spin" />
                </div>
              ) : gefiltert.length === 0 ? (
                <div className="text-center py-16">
                  <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">
                    {produkte.length === 0
                      ? 'Noch keine Produkte in der Bibliothek'
                      : 'Keine Produkte gefunden'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {gefiltert.map((p) => {
                    const isSelected = selected.has(p.id)
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggleSelect(p.id)}
                        disabled={isWorking}
                        className={`flex items-center gap-3 p-3 border rounded-xl transition-all text-left disabled:opacity-60 ${
                          isSelected
                            ? 'border-wellbeing-green bg-wellbeing-green/8 ring-1 ring-wellbeing-green/30'
                            : 'border-gray-200 hover:border-wellbeing-green/50 hover:bg-gray-50'
                        }`}
                      >
                        {/* Checkbox */}
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'border-wellbeing-green bg-wellbeing-green'
                            : 'border-gray-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        </div>

                        {/* Bild */}
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                          {p.bild_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.bild_url} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-5 h-5 text-gray-300" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                          {p.artikelnummer && (
                            <p className="text-xs text-gray-400 mt-0.5">Art. {p.artikelnummer}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {p.kategorie && (
                              <span className="text-[11px] px-1.5 py-0.5 bg-gray-100 rounded-full text-gray-600">
                                {p.kategorie.name}
                              </span>
                            )}
                            {p.verkaufspreis != null && (
                              <span className="text-[11px] text-gray-500 font-medium">
                                {eur(p.verkaufspreis)}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  {loading ? 'Lädt…' : `${gefiltert.length} von ${produkte.length} Produkten`}
                </span>
                <button
                  onClick={() => {
                    close()
                    router.push(`/dashboard/projekte/${projektId}/raeume/${raumId}/produkte/neu`)
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-wellbeing-green hover:underline"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Neues Produkt erstellen
                </button>
              </div>

              {/* Hinzufügen Button */}
              <button
                onClick={handleBatchAdd}
                disabled={selected.size === 0 || isWorking}
                className="inline-flex items-center gap-2 px-4 py-2 bg-wellbeing-green hover:bg-wellbeing-green-dark text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isWorking ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Hinzufügen…
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    {selected.size > 0 ? `${selected.size} hinzufügen` : 'Hinzufügen'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
