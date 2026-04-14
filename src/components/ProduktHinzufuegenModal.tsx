'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, X, ChevronRight, BookOpen, PlusCircle,
  Search, ChevronDown, Package,
} from 'lucide-react'
import { bibliothekProdukteAbrufen, type BibliothekProdukt } from '@/app/actions/produkte'
import { produktZuRaumHinzufuegen } from '@/app/actions/raum-produkte'

interface Props {
  raumId: string
  projektId: string
}

type View = 'idle' | 'choice' | 'library'

export default function ProduktHinzufuegenModal({ raumId, projektId }: Props) {
  const router = useRouter()
  const [view, setView]               = useState<View>('idle')
  const [produkte, setProdukte]       = useState<BibliothekProdukt[]>([])
  const [loading, setLoading]         = useState(false)
  const [search, setSearch]           = useState('')
  const [kategorie, setKategorie]     = useState('')
  const [toast, setToast]             = useState<{ msg: string; err?: boolean } | null>(null)
  const [adding, setAdding]           = useState<string | null>(null) // produktId being added
  const [isPending, startTransition]  = useTransition()

  function showToast(msg: string, err = false) {
    setToast({ msg, err })
    setTimeout(() => setToast(null), 3000)
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
    loadLibrary()
  }

  function close() {
    setView('idle')
    setSearch('')
    setKategorie('')
  }

  async function handleAdd(produktId: string) {
    if (adding) return
    setAdding(produktId)
    startTransition(async () => {
      const result = await produktZuRaumHinzufuegen(produktId, raumId, 1, null, projektId)
      setAdding(null)
      if (result.fehler) {
        showToast(result.fehler, true)
      } else {
        showToast('Produkt hinzugefügt')
        router.refresh()
      }
    })
  }

  // Filtered products
  const gefiltert = produkte.filter((p) => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.artikelnummer ?? '').toLowerCase().includes(search.toLowerCase())
    const matchKat = !kategorie || p.kategorie_id === kategorie
    return matchSearch && matchKat
  })

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
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Produkt hinzufügen</h3>
              <button onClick={close} className="text-gray-400 hover:text-gray-600 transition-colors">
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
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[82vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Aus Bibliothek wählen</h3>
              <button onClick={close} className="text-gray-400 hover:text-gray-600 transition-colors">
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
                    const isAdding = adding === p.id || (isPending && adding === p.id)
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleAdd(p.id)}
                        disabled={!!adding}
                        className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:border-wellbeing-green hover:bg-wellbeing-green/5 transition-all text-left disabled:opacity-60 group"
                      >
                        {/* Bild */}
                        <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                          {p.bild_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.bild_url} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-6 h-6 text-gray-300" />
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

                        {/* Add-Icon */}
                        {isAdding ? (
                          <div className="w-6 h-6 rounded-full border-2 border-wellbeing-green border-t-transparent animate-spin shrink-0" />
                        ) : (
                          <Plus className="w-5 h-5 text-wellbeing-green shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex items-center justify-between">
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
          </div>
        </div>
      )}
    </>
  )
}
