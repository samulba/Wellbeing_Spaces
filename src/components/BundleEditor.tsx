'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Boxes, ArrowLeft, Plus, Trash2, X, Search, Check, AlertCircle,
} from 'lucide-react'
import {
  bundleAnlegen, bundleAktualisieren,
  bundleKomponenteHinzufuegen, bundleKomponenteEntfernen, bundleKomponenteMengeAendern,
} from '@/app/actions/bundles'
import { berechneBundlePreis } from '@/lib/bundle-preis'
import type { BundleMitKomponenten, BundlePreisModus } from '@/lib/supabase/types'

interface BibliothekProdukt {
  id: string
  name: string
  bild_url: string | null
  verkaufspreis: number | null
  einheit?: string | null
}

const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)

interface KompZeile {
  id: string                    // bundle_komponenten.id
  komponente_produkt_id: string
  name: string
  verkaufspreis: number | null
  einheit: string | null
  menge: number
}

export default function BundleEditor({
  mode,
  bundle,
  bibliothek,
}: {
  mode: 'neu' | 'bearbeiten'
  bundle?: BundleMitKomponenten
  bibliothek: BibliothekProdukt[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  // ── Stammdaten ──────────────────────────────────────────────
  const [name, setName]               = useState(bundle?.name ?? '')
  const [beschreibung, setBeschreibung] = useState(bundle?.beschreibung ?? '')
  const [kategorie, setKategorie]     = useState(bundle?.kategorie ?? '')
  const [bildUrl, setBildUrl]         = useState(bundle?.bild_url ?? '')
  const [modus, setModus]             = useState<BundlePreisModus>(bundle?.bundle_preis_modus ?? 'summe')
  const [rabatt, setRabatt]           = useState<number>(bundle?.bundle_rabatt_prozent ?? 0)
  const [festpreis, setFestpreis]     = useState<number>(bundle?.bundle_festpreis ?? 0)

  // ── Komponenten (nur bearbeiten) ────────────────────────────
  const [komponenten, setKomponenten] = useState<KompZeile[]>(
    (bundle?.komponenten ?? []).map((k) => ({
      id: k.id,
      komponente_produkt_id: k.komponente_produkt_id,
      name: k.komponente?.name ?? 'Unbekannt',
      verkaufspreis: k.komponente?.verkaufspreis ?? null,
      einheit: k.komponente?.einheit ?? null,
      menge: k.menge,
    })),
  )

  // Bei Server-Refresh (neue bundle-Props) lokale Liste resynchronisieren
  useEffect(() => {
    if (!bundle) return
    setKomponenten(
      bundle.komponenten.map((k) => ({
        id: k.id,
        komponente_produkt_id: k.komponente_produkt_id,
        name: k.komponente?.name ?? 'Unbekannt',
        verkaufspreis: k.komponente?.verkaufspreis ?? null,
        einheit: k.komponente?.einheit ?? null,
        menge: k.menge,
      })),
    )
  }, [bundle])

  const [pickerOffen, setPickerOffen] = useState(false)
  const [toast, setToast] = useState<{ art: 'ok' | 'fehler'; text: string } | null>(null)
  const zeigeToast = (art: 'ok' | 'fehler', text: string) => {
    setToast({ art, text })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Live-Preis ──────────────────────────────────────────────
  const preis = useMemo(
    () => berechneBundlePreis(modus, rabatt, festpreis, komponenten),
    [modus, rabatt, festpreis, komponenten],
  )

  // ── Stammdaten speichern ────────────────────────────────────
  function speichern() {
    if (!name.trim()) { zeigeToast('fehler', 'Bitte einen Namen angeben.'); return }
    startTransition(async () => {
      const daten = {
        name, beschreibung, kategorie, bild_url: bildUrl,
        preisModus: modus, rabattProzent: rabatt, festpreis,
      }
      if (mode === 'neu') {
        const res = await bundleAnlegen(daten)
        if (res.fehler || !res.id) { zeigeToast('fehler', res.fehler ?? 'Fehler.'); return }
        router.push(`/dashboard/produkte/bundles/${res.id}/bearbeiten`)
      } else if (bundle) {
        const res = await bundleAktualisieren(bundle.id, daten)
        if (res.fehler) { zeigeToast('fehler', res.fehler); return }
        zeigeToast('ok', 'Gespeichert.')
        router.refresh()
      }
    })
  }

  // ── Komponenten-Aktionen (bearbeiten) ───────────────────────
  function komponenteHinzufuegen(p: BibliothekProdukt) {
    if (!bundle) return
    if (komponenten.some((k) => k.komponente_produkt_id === p.id)) {
      zeigeToast('fehler', 'Komponente ist bereits im Set.'); return
    }
    startTransition(async () => {
      const res = await bundleKomponenteHinzufuegen(bundle.id, p.id, 1)
      if (res.fehler) { zeigeToast('fehler', res.fehler); return }
      setKomponenten((prev) => [...prev, {
        id: `tmp-${p.id}`, komponente_produkt_id: p.id, name: p.name,
        verkaufspreis: p.verkaufspreis, einheit: p.einheit ?? null, menge: 1,
      }])
      router.refresh()
    })
  }

  function mengeAendern(k: KompZeile, menge: number) {
    if (!(menge > 0)) return
    setKomponenten((prev) => prev.map((x) => x.id === k.id ? { ...x, menge } : x))
    if (k.id.startsWith('tmp-')) return
    startTransition(async () => {
      const res = await bundleKomponenteMengeAendern(k.id, menge, bundle?.id)
      if (res.fehler) zeigeToast('fehler', res.fehler)
    })
  }

  function komponenteEntfernen(k: KompZeile) {
    setKomponenten((prev) => prev.filter((x) => x.id !== k.id))
    if (k.id.startsWith('tmp-')) return
    startTransition(async () => {
      const res = await bundleKomponenteEntfernen(k.id, bundle?.id)
      if (res.fehler) { zeigeToast('fehler', res.fehler); router.refresh() }
    })
  }

  const lbl = 'block text-xs font-medium text-gray-700 mb-1.5'
  const inp = 'w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition'

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => router.push('/dashboard/produkte')} className="text-gray-400 hover:text-wellbeing-green transition-colors" aria-label="Zurück">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-wellbeing-green flex items-center justify-center shrink-0">
              <Boxes className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {mode === 'neu' ? 'Neues Set / Bundle' : (name || 'Set bearbeiten')}
              </h1>
              <p className="text-xs text-gray-400">{mode === 'neu' ? 'Stammdaten anlegen, dann Komponenten hinzufügen' : 'Komponenten & Preis verwalten'}</p>
            </div>
          </div>
          <button
            onClick={speichern}
            disabled={pending}
            className="px-5 py-2.5 bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
          >
            {pending ? 'Speichern…' : mode === 'neu' ? 'Set anlegen' : 'Speichern'}
          </button>
        </div>
      </div>

      {toast && (
        <div className={`mx-6 mt-4 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm border ${toast.art === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {toast.art === 'ok' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.text}
        </div>
      )}

      <div className="px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-[1100px]">
        {/* Links: Stammdaten + Komponenten */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Stammdaten</h2>
            <div>
              <label htmlFor="b-name" className={lbl}>Name <span className="text-red-400">*</span></label>
              <input id="b-name" className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. LED-Strip Komplettset" />
            </div>
            <div>
              <label htmlFor="b-besch" className={lbl}>Beschreibung</label>
              <textarea id="b-besch" rows={2} className={inp} value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} placeholder="Was beinhaltet das Set?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="b-kat" className={lbl}>Kategorie</label>
                <input id="b-kat" className={inp} value={kategorie} onChange={(e) => setKategorie(e.target.value)} placeholder="z. B. Beleuchtung" />
              </div>
              <div>
                <label htmlFor="b-bild" className={lbl}>Bild-URL (optional)</label>
                <input id="b-bild" className={inp} value={bildUrl} onChange={(e) => setBildUrl(e.target.value)} placeholder="https://…" />
              </div>
            </div>
          </div>

          {/* Komponenten */}
          {mode === 'bearbeiten' ? (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  Komponenten <span className="text-gray-400 normal-case tracking-normal">({komponenten.length})</span>
                </h2>
                <button onClick={() => setPickerOffen(true)} className="inline-flex items-center gap-1.5 text-xs font-medium text-wellbeing-green hover:text-wellbeing-green-dark">
                  <Plus className="w-4 h-4" /> Komponente hinzufügen
                </button>
              </div>
              {komponenten.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">Noch keine Komponenten. Füge die Bestandteile des Sets hinzu.</p>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {komponenten.map((k) => {
                    const zeile = (k.verkaufspreis ?? 0) * k.menge
                    return (
                      <li key={k.id} className="flex items-center gap-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 truncate">{k.name}</p>
                          <p className="text-[11px] text-gray-400">{k.verkaufspreis != null ? `${eur(k.verkaufspreis)} / ${k.einheit || 'Stk'}` : 'kein Preis'}</p>
                        </div>
                        <input
                          type="number" min={1} step="any"
                          className="w-20 px-2 py-1.5 text-sm text-right border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20"
                          defaultValue={k.menge}
                          onBlur={(e) => { const v = parseFloat(e.target.value); if (v > 0 && v !== k.menge) mengeAendern(k, v) }}
                        />
                        <span className="w-24 text-right text-sm font-mono text-gray-700">{eur(zeile)}</span>
                        <button onClick={() => komponenteEntfernen(k)} className="text-gray-300 hover:text-red-500 transition-colors" aria-label="Entfernen">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          ) : (
            <div className="bg-wellbeing-cream/40 border border-wellbeing-green/20 rounded-xl p-4 text-sm text-wellbeing-green-dark">
              Komponenten fügst du direkt nach dem Anlegen hinzu.
            </div>
          )}
        </div>

        {/* Rechts: Preis */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Set-Preis</h2>
            <div className="inline-flex w-full rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
              {([['summe', 'Summe'], ['rabatt', 'Rabatt %'], ['festpreis', 'Festpreis']] as [BundlePreisModus, string][]).map(([id, label], i) => (
                <button key={id} onClick={() => setModus(id)}
                  className={`flex-1 px-2 py-2 transition-colors ${i > 0 ? 'border-l border-gray-200' : ''} ${modus === id ? 'bg-wellbeing-green text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                  {label}
                </button>
              ))}
            </div>
            {modus === 'rabatt' && (
              <div>
                <label htmlFor="b-rab" className={lbl}>Set-Rabatt (%)</label>
                <input id="b-rab" type="number" min={0} max={100} step="any" className={inp} value={rabatt} onChange={(e) => setRabatt(parseFloat(e.target.value) || 0)} />
              </div>
            )}
            {modus === 'festpreis' && (
              <div>
                <label htmlFor="b-fix" className={lbl}>Festpreis (€ netto)</label>
                <input id="b-fix" type="number" min={0} step="any" className={inp} value={festpreis} onChange={(e) => setFestpreis(parseFloat(e.target.value) || 0)} />
              </div>
            )}

            <div className="pt-3 border-t border-gray-100 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500"><span>Listenpreis</span><span className="font-mono">{eur(preis.listenpreis)}</span></div>
              {preis.rabattProzent > 0 && (
                <div className="flex justify-between text-emerald-600"><span>Set-Rabatt</span><span className="font-mono">−{Math.round(preis.rabattProzent * 10) / 10} %</span></div>
              )}
              <div className="flex justify-between text-gray-900 font-semibold text-base pt-1">
                <span>Set-Preis</span><span className="font-mono">{eur(preis.setPreis)}</span>
              </div>
              <p className="text-[11px] text-gray-400 pt-1">netto · zzgl. MwSt. Der Rabatt wird beim Hinzufügen in den Raum auf jede Komponente angewendet.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Komponenten-Picker */}
      {pickerOffen && bundle && (
        <KomponentenPicker
          bibliothek={bibliothek.filter((p) => p.id !== bundle.id && !komponenten.some((k) => k.komponente_produkt_id === p.id))}
          onClose={() => setPickerOffen(false)}
          onWaehlen={(p) => komponenteHinzufuegen(p)}
        />
      )}
    </div>
  )
}

// ── Picker-Modal ──────────────────────────────────────────────
function KomponentenPicker({
  bibliothek, onClose, onWaehlen,
}: {
  bibliothek: BibliothekProdukt[]
  onClose: () => void
  onWaehlen: (p: BibliothekProdukt) => void
}) {
  const [suche, setSuche] = useState('')
  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase()
    if (!q) return bibliothek
    return bibliothek.filter((p) => p.name.toLowerCase().includes(q))
  }, [suche, bibliothek])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }} role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Komponente hinzufügen</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Schließen"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 border-b border-gray-50">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input autoFocus value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Produkt suchen…" className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20" />
          </div>
        </div>
        <div className="overflow-y-auto p-2">
          {gefiltert.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Keine Produkte gefunden.</p>
          ) : gefiltert.map((p) => (
            <button key={p.id} onClick={() => { onWaehlen(p); onClose() }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-left transition-colors">
              <div className="w-9 h-9 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.bild_url && <img src={p.bild_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <span className="flex-1 min-w-0 text-sm text-gray-800 truncate">{p.name}</span>
              <span className="text-xs font-mono text-gray-500">{p.verkaufspreis != null ? eur(p.verkaufspreis) : '—'}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
