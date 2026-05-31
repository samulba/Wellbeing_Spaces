'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState, useCallback, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Upload, Loader2, X, Zap, Check, ChevronLeft, ChevronRight,
  Package, AlertCircle, ChevronDown, Image as ImageIcon, Sparkles,
} from 'lucide-react'
import type { ProduktActionState } from '@/app/actions/produkte'
import type { Partner, ProduktMitDetails } from '@/lib/supabase/types'
import NotizBlock, { type Notiz } from '@/components/NotizBlock'
import type { ScraperErgebnis } from '@/app/api/scrape-product/route'

// ── Konstanten ────────────────────────────────────────────────
const MWST_DEFAULT = 0.19
const EINHEITEN    = ['Stk', 'Paar', 'm', 'm²', 'Lfd. m', 'Set', 'Pauschal']
const LIEFERZEIT_VORSCHLAEGE = [
  'Sofort verfügbar', '1-2 Wochen', '3-4 Wochen',
  '6-8 Wochen', '8-12 Wochen', 'Auf Anfrage',
]
const VERFUEGBARKEIT_OPTIONEN = [
  { wert: '',               label: '— nicht gesetzt —' },
  { wert: 'standard',       label: 'Standardmäßig lieferbar' },
  { wert: 'lieferzeit_4_6', label: 'Lieferbar in 4–6 Wochen' },
  { wert: 'saisonal',       label: 'Saisonal verfügbar' },
  { wert: 'auf_anfrage',    label: 'Auf Anfrage' },
]

// ── Hilfsfunktionen ───────────────────────────────────────────
const r2  = (n: number) => Math.round(n * 100) / 100
const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)

// ── Typen ─────────────────────────────────────────────────────
type ProduktErweitert = ProduktMitDetails & {
  lieferzeit?:     string | null
  breite_cm?:      number | null
  tiefe_cm?:       number | null
  hoehe_cm?:       number | null
  material?:       string | null
  farbe?:          string | null
  artikelnummer?:  string | null
  verfuegbarkeit?: string | null
  tags?:           string[] | null
  bilder_urls?:    string[] | null
  hinweis_extern?: string | null
  hinweis_extern_sichtbar?: boolean
}

interface Props {
  aktion:         (prevState: ProduktActionState, formData: FormData) => Promise<ProduktActionState>
  partner:        Pick<Partner, 'id' | 'name'>[]
  kategorienListe: { name: string }[]
  initialData?:   ProduktErweitert
  abbrechen:      string
  mwst?:          number
  notizen?:       Notiz[]
  produktId?:     string
}

// ── AutoFill Modal ────────────────────────────────────────────
type AutoFillFeld = {
  key:    keyof ScraperErgebnis
  label:  string
  wert:   string | null
}

function AutoFillModal({
  data,
  onUebernehmen,
  onAbbrechen,
}: {
  data:           ScraperErgebnis
  onUebernehmen:  (ausgewaehlt: Set<keyof ScraperErgebnis>, ausgewaehlteBilder: string[]) => void
  onAbbrechen:    () => void
}) {
  const felder: AutoFillFeld[] = [
    { key: 'title',        label: 'Bezeichnung',    wert: data.title },
    { key: 'description',  label: 'Beschreibung',   wert: data.description ? data.description.slice(0, 120) + (data.description.length > 120 ? '…' : '') : null },
    { key: 'price',        label: 'Preis (brutto)',  wert: data.price != null ? eur(data.price) : null },
    { key: 'artikelnummer',label: 'Artikelnummer',  wert: data.artikelnummer },
    { key: 'material',     label: 'Material',       wert: data.material },
    { key: 'farbe',        label: 'Farbe',          wert: data.farbe },
    { key: 'lieferzeit',   label: 'Lieferzeit',     wert: data.lieferzeit },
  ]
  const masseWert = [
    data.breite_cm != null ? `B ${data.breite_cm}` : null,
    data.tiefe_cm  != null ? `T ${data.tiefe_cm}`  : null,
    data.hoehe_cm  != null ? `H ${data.hoehe_cm}`  : null,
  ].filter(Boolean).join(' × ')

  const gefunden = felder.filter((f) => f.wert)
  const nichtGefunden = felder.filter((f) => !f.wert).map((f) => f.label)
  const hatMasse = masseWert !== ''
  const hatBilder = data.images.length > 0

  const [ausgewaehlt, setAusgewaehlt] = useState<Set<keyof ScraperErgebnis>>(() => {
    const s = new Set<keyof ScraperErgebnis>()
    gefunden.forEach((f) => s.add(f.key))
    if (hatMasse) s.add('breite_cm')
    return s
  })

  // Per Default die ersten 5 Bilder ausgewählt (Limit der Bibliothek)
  const [bildAuswahl, setBildAuswahl] = useState<Set<string>>(
    () => new Set(data.images.slice(0, 5)),
  )

  function toggle(key: keyof ScraperErgebnis) {
    setAusgewaehlt((prev) => {
      const next = new Set(prev)
      if (next.has(key)) { next.delete(key) } else { next.add(key) }
      return next
    })
  }

  function toggleBild(url: string) {
    setBildAuswahl((prev) => {
      const next = new Set(prev)
      if (next.has(url)) next.delete(url)
      else if (next.size < 5) next.add(url)
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-wellbeing-cream flex items-center justify-center shrink-0">
              <Zap className="w-3.5 h-3.5 text-wellbeing-green" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-semibold text-gray-900 text-sm">Gefundene Produktdaten</h3>
                {data.ai_used && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded-full" title="Ausgelesen via Claude AI">
                    <Sparkles className="w-2.5 h-2.5" /> AI
                  </span>
                )}
              </div>
              {(data.quelle_domain || !data.quelle_domain) && (
                <p className="text-[11px] text-gray-400 truncate">
                  {data.quelle_domain ? `Quelle: ${data.quelle_domain}` : 'Quelle: Screenshot'}
                  {data.partner_match && (
                    <span className="ml-2 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      → Partner: {data.partner_match.name}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
          <button type="button" onClick={onAbbrechen}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">

          {/* Bilder-Grid */}
          {hatBilder && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                  Bilder ({bildAuswahl.size}/{Math.min(5, data.images.length)} gewählt)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBildAuswahl(new Set(data.images.slice(0, 5)))}
                    className="text-[11px] text-wellbeing-green hover:text-wellbeing-green-dark"
                  >
                    Alle (max. 5)
                  </button>
                  <span className="text-gray-300">·</span>
                  <button
                    type="button"
                    onClick={() => setBildAuswahl(new Set())}
                    className="text-[11px] text-gray-400 hover:text-gray-600"
                  >
                    Keine
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {data.images.map((u) => {
                  const aktiv = bildAuswahl.has(u)
                  return (
                    <button
                      key={u}
                      type="button"
                      onClick={() => toggleBild(u)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        aktiv
                          ? 'border-wellbeing-green shadow-sm'
                          : 'border-gray-200 opacity-50 hover:opacity-80'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u} alt="" className="w-full h-full object-cover" />
                      {aktiv && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-wellbeing-green rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">
                Maximum 5 Bilder werden übernommen.
              </p>
            </div>
          )}

          {/* Felder */}
          <div className="space-y-2">
            {gefunden.map((f) => (
              <label key={f.key} className="flex items-start gap-2.5 cursor-pointer group">
                <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                  ausgewaehlt.has(f.key)
                    ? 'bg-wellbeing-green border-wellbeing-green'
                    : 'border-gray-300 group-hover:border-wellbeing-green-light'
                }`}
                  onClick={() => toggle(f.key)}
                >
                  {ausgewaehlt.has(f.key) && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide block">{f.label}</span>
                  <span className="text-xs text-gray-800 leading-snug line-clamp-2">{f.wert}</span>
                </div>
              </label>
            ))}

            {/* Maße */}
            {hatMasse && (
              <label className="flex items-start gap-2.5 cursor-pointer group">
                <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                  ausgewaehlt.has('breite_cm')
                    ? 'bg-wellbeing-green border-wellbeing-green'
                    : 'border-gray-300 group-hover:border-wellbeing-green-light'
                }`}
                  onClick={() => {
                    const keys: Array<keyof ScraperErgebnis> = ['breite_cm', 'tiefe_cm', 'hoehe_cm']
                    setAusgewaehlt((prev) => {
                      const next = new Set(prev)
                      if (next.has('breite_cm')) keys.forEach((k) => next.delete(k))
                      else keys.forEach((k) => next.add(k))
                      return next
                    })
                  }}
                >
                  {ausgewaehlt.has('breite_cm') && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <div>
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide block">Maße (cm)</span>
                  <span className="text-xs text-gray-800">{masseWert} cm</span>
                </div>
              </label>
            )}
          </div>

          {/* Nicht gefunden */}
          {nichtGefunden.length > 0 && (
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3 text-gray-300 shrink-0" />
              <span className="text-[10px] text-gray-400">
                Nicht gefunden: {nichtGefunden.join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100 shrink-0">
          <button type="button" onClick={onAbbrechen}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Abbrechen
          </button>
          <button
            type="button"
            onClick={() => onUebernehmen(ausgewaehlt, Array.from(bildAuswahl))}
            className="px-4 py-2 bg-wellbeing-green hover:bg-wellbeing-green-dark text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Ausgewählte übernehmen
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Screenshot-Upload Modal ───────────────────────────────────
function ScreenshotUploadModal({
  onClose,
  onErgebnis,
}: {
  onClose:    () => void
  onErgebnis: (data: ScraperErgebnis) => void
}) {
  const [datei, setDatei]         = useState<File | null>(null)
  const [vorschau, setVorschau]   = useState<string | null>(null)
  const [drag, setDrag]           = useState(false)
  const [laedt, setLaedt]         = useState(false)
  const [fehler, setFehler]       = useState<string | null>(null)
  const fileInputRef              = useRef<HTMLInputElement>(null)

  const ERLAUBT = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
  const MAX_MB  = 5

  function setzeDatei(f: File | null) {
    setFehler(null)
    if (!f) { setDatei(null); setVorschau(null); return }
    if (!ERLAUBT.includes(f.type)) {
      setFehler('PNG, JPG, WebP oder GIF erforderlich.')
      return
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setFehler(`Bild zu groß (${(f.size / 1024 / 1024).toFixed(1)} MB). Max. ${MAX_MB} MB.`)
      return
    }
    setDatei(f)
    const reader = new FileReader()
    reader.onload = () => setVorschau(reader.result as string)
    reader.readAsDataURL(f)
  }

  async function analysieren() {
    if (!datei) return
    setLaedt(true)
    setFehler(null)
    try {
      const fd = new FormData()
      fd.append('image', datei)
      const res = await fetch('/api/scrape-product-image', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        setFehler(data.error ?? 'Analyse fehlgeschlagen.')
        return
      }
      onErgebnis(data as ScraperErgebnis)
    } catch {
      setFehler('Verbindung fehlgeschlagen. Bitte erneut versuchen.')
    } finally {
      setLaedt(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-wellbeing-cream flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-wellbeing-green" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Aus Screenshot ausfüllen</h3>
              <p className="text-[11px] text-gray-400">Claude Sonnet liest die sichtbaren Daten aus dem Bild</p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept={ERLAUBT.join(',')}
            className="hidden"
            onChange={(e) => setzeDatei(e.target.files?.[0] ?? null)}
          />

          {!datei ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDrag(false)
                const f = e.dataTransfer.files?.[0]
                if (f) setzeDatei(f)
              }}
              className={`w-full flex flex-col items-center justify-center gap-2 px-4 py-10 border-2 border-dashed rounded-xl transition-colors ${
                drag
                  ? 'border-wellbeing-green bg-wellbeing-cream/50'
                  : 'border-gray-200 hover:border-wellbeing-green-light hover:bg-gray-50'
              }`}
            >
              <ImageIcon className="w-8 h-8 text-gray-300" />
              <p className="text-sm font-medium text-gray-700">Screenshot hierher ziehen oder klicken</p>
              <p className="text-[11px] text-gray-400">PNG / JPG / WebP / GIF · max. {MAX_MB} MB</p>
            </button>
          ) : (
            <div className="space-y-2">
              <div className="relative bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                {vorschau && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={vorschau} alt="Vorschau" className="w-full max-h-72 object-contain" />
                )}
                <button
                  type="button"
                  onClick={() => setzeDatei(null)}
                  className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-white/90 hover:bg-white shadow text-gray-600"
                  aria-label="Bild entfernen"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-gray-500 truncate">
                {datei.name} · {(datei.size / 1024).toFixed(0)} KB
              </p>
            </div>
          )}

          {fehler && (
            <p className="text-xs text-red-600 flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3 shrink-0" /> {fehler}
            </p>
          )}

          <p className="text-[11px] text-gray-400 leading-relaxed">
            Tipp: Funktioniert besonders gut, wenn der Screenshot Produktname, Preis und Maße sichtbar enthält.
            Ideal für Seiten hinter Login, mit Cloudflare, oder JS-only-Shops.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button type="button" onClick={onClose} disabled={laedt}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50">
            Abbrechen
          </button>
          <button
            type="button"
            onClick={analysieren}
            disabled={!datei || laedt}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 rounded-lg"
          >
            {laedt
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analysiert…</>
              : <><Sparkles className="w-3.5 h-3.5" /> Analysieren</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tags-Input ────────────────────────────────────────────────
function TagsInput({ value, onChange }: { value: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('')

  function add(raw: string) {
    const tag = raw.trim().replace(/,+$/, '')
    if (tag && !value.includes(tag)) onChange([...value, tag])
    setInput('')
  }

  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i))
  }

  return (
    <div className={`${inp} flex flex-wrap gap-1.5 py-1.5 min-h-[36px] cursor-text`}
      onClick={(e) => (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus()}>
      {value.map((tag, i) => (
        <span key={tag}
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-wellbeing-cream text-wellbeing-green-dark text-[11px] font-medium rounded-full">
          {tag}
          <button type="button" onClick={() => remove(i)}
            className="text-wellbeing-green/50 hover:text-red-500 transition-colors">
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input) }
          if (e.key === 'Backspace' && !input && value.length > 0) remove(value.length - 1)
        }}
        onBlur={() => { if (input) add(input) }}
        placeholder={value.length === 0 ? 'Tag eingeben, Enter drücken…' : ''}
        className="flex-1 min-w-[120px] text-xs outline-none bg-transparent text-gray-900 placeholder:text-gray-400"
      />
    </div>
  )
}

// ── Bilder-Grid ───────────────────────────────────────────────
function BilderGrid({
  urls,
  onChange,
  uploading,
  onUpload,
  onFilesDropped,
}: {
  urls:      string[]
  onChange:  (urls: string[]) => void
  uploading: boolean
  onUpload:  () => void
  onFilesDropped: (files: File[]) => void
}) {
  const dragIdx = useRef<number | null>(null)
  const [dragActive, setDragActive] = useState(false)

  function remove(i: number) { onChange(urls.filter((_, idx) => idx !== i)) }
  function move(from: number, to: number) {
    const next = [...urls]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
  }

  const cells = [...urls]
  const showUpload = cells.length < 5

  return (
    <div
      className={`grid grid-cols-3 gap-2 rounded-xl transition-colors ${dragActive ? 'ring-2 ring-wellbeing-green/40 ring-offset-2' : ''}`}
      onDragOver={(e) => {
        // Nur OS-Datei-Drops (nicht das interne Umsortieren der Bilder)
        if (dragIdx.current === null && Array.from(e.dataTransfer.types).includes('Files')) {
          e.preventDefault()
          setDragActive(true)
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragActive(false)
      }}
      onDrop={(e) => {
        if (dragIdx.current === null && e.dataTransfer.files?.length) {
          e.preventDefault()
          onFilesDropped(Array.from(e.dataTransfer.files))
        }
        setDragActive(false)
      }}
    >
      {cells.map((url, i) => (
        <div
          key={url}
          draggable
          onDragStart={() => { dragIdx.current = i }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragIdx.current !== null && dragIdx.current !== i) move(dragIdx.current, i)
            dragIdx.current = null
          }}
          className="relative aspect-square group rounded-xl overflow-hidden border border-gray-200 bg-gray-50 cursor-grab active:cursor-grabbing"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="w-full h-full object-cover" />

          {/* Hauptbild-Label */}
          {i === 0 && (
            <span className="absolute bottom-0 left-0 right-0 text-center text-[9px] bg-wellbeing-green/80 text-white py-0.5 font-medium">
              Hauptbild
            </span>
          )}

          {/* Overlay-Buttons */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/10">
            <button type="button" onClick={() => remove(i)}
              className="absolute top-1 right-1 w-5 h-5 bg-white rounded-full shadow text-gray-600 hover:text-red-500 flex items-center justify-center transition-colors">
              <X className="w-3 h-3" />
            </button>
            {i > 0 && (
              <button type="button" onClick={() => move(i, i - 1)}
                className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow text-gray-600 hover:text-wellbeing-green flex items-center justify-center transition-colors">
                <ChevronLeft className="w-3 h-3" />
              </button>
            )}
            {i < cells.length - 1 && (
              <button type="button" onClick={() => move(i, i + 1)}
                className="absolute bottom-5 right-1 w-5 h-5 bg-white rounded-full shadow text-gray-600 hover:text-wellbeing-green flex items-center justify-center transition-colors">
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      ))}

      {showUpload && (
        <button
          type="button"
          onClick={onUpload}
          disabled={uploading}
          className={`aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all disabled:opacity-50 ${
            dragActive
              ? 'border-wellbeing-green bg-wellbeing-cream/40'
              : 'border-gray-200 hover:border-wellbeing-green-light hover:bg-wellbeing-cream/20'
          }`}
        >
          {uploading
            ? <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
            : <>
                <Upload className={`w-5 h-5 ${dragActive ? 'text-wellbeing-green' : 'text-gray-300'}`} />
                <span className={`text-[10px] mt-1 text-center px-1 ${dragActive ? 'text-wellbeing-green font-medium' : 'text-gray-400'}`}>
                  {dragActive ? 'Hier ablegen' : cells.length === 0 ? 'Bild hinzufügen' : `${cells.length}/5`}
                </span>
              </>
          }
        </button>
      )}
    </div>
  )
}

// ── Speichern-Button ──────────────────────────────────────────
function SpeichernButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending || disabled}
      className="px-5 py-2 bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5">
      {pending
        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Speichern…</>
        : 'Speichern'}
    </button>
  )
}

// ── Hauptkomponente ───────────────────────────────────────────
export default function ProduktFormular({
  aktion, partner, kategorienListe, initialData, abbrechen, mwst = MWST_DEFAULT, notizen, produktId,
}: Props) {
  const [state, formAction] = useFormState(aktion, null)

  // Preis
  const [ep,        setEp]        = useState(initialData?.einkaufspreis ?? 0)
  const [marge,     setMarge]     = useState(initialData?.marge_prozent ?? 0)
  const [vpNetto,   setVpNetto]   = useState(initialData?.verkaufspreis ?? 0)
  const [provision, setProvision] = useState(initialData?.provision_prozent ?? 0)
  const menge = initialData?.menge ?? 1  // Menge bleibt als Konstante (kein UI-Feld mehr)

  // Kalkulation kollabierbar
  const [kalkulationOffen, setKalkulationOffen] = useState(false)

  // Text-Felder
  const [produktName,    setProduktName]    = useState(initialData?.name          ?? '')
  const [beschreibung,   setBeschreibung]   = useState(initialData?.beschreibung  ?? '')
  const [kategorie,      setKategorie]      = useState(initialData?.kategorie     ?? '')
  const [lieferzeit,     setLieferzeit]     = useState((initialData as ProduktErweitert)?.lieferzeit ?? '')
  const [material,       setMaterial]       = useState((initialData as ProduktErweitert)?.material   ?? '')
  const [farbe,          setFarbe]          = useState((initialData as ProduktErweitert)?.farbe      ?? '')
  const [artikelnummer,  setArtikelnummer]  = useState((initialData as ProduktErweitert)?.artikelnummer ?? '')
  const [verfuegbarkeit, setVerfuegbarkeit] = useState((initialData as ProduktErweitert)?.verfuegbarkeit ?? '')
  const [partnerId,      setPartnerId]      = useState<string>(initialData?.partner_id ?? '')

  // Vermerk/Hinweis (Migration 058)
  const [hinweisExtern, setHinweisExtern] = useState((initialData as ProduktErweitert)?.hinweis_extern ?? '')
  const [hinweisSichtbar, setHinweisSichtbar] = useState((initialData as ProduktErweitert)?.hinweis_extern_sichtbar ?? false)

  // Maße
  const [breiteCm, setBreiteCm] = useState<string>((initialData as ProduktErweitert)?.breite_cm?.toString() ?? '')
  const [tiefeCm,  setTiefeCm]  = useState<string>((initialData as ProduktErweitert)?.tiefe_cm?.toString()  ?? '')
  const [hoeheCm,  setHoeheCm]  = useState<string>((initialData as ProduktErweitert)?.hoehe_cm?.toString()  ?? '')

  // Tags
  const [tags, setTags] = useState<string[]>((initialData as ProduktErweitert)?.tags ?? [])

  // Bilder
  const initialBilder = (() => {
    const arr = (initialData as ProduktErweitert)?.bilder_urls
    if (arr && arr.length > 0) return arr
    if (initialData?.bild_url) return [initialData.bild_url]
    return []
  })()
  const [bilderUrls,    setBilderUrls]    = useState<string[]>(initialBilder)
  const [bildUploading, setBildUploading] = useState(false)
  const [bildFehler,    setBildFehler]    = useState<string | null>(null)
  const bildInputRef = useRef<HTMLInputElement>(null)

  // Auto-Fill
  const [scrapingLoading, setScrapingLoading] = useState(false)
  const [scrapingFehler,  setScrapingFehler]  = useState<string | null>(null)
  const [scraperModal,    setScraperModal]     = useState<ScraperErgebnis | null>(null)
  const [screenshotModalOffen, setScreenshotModalOffen] = useState(false)
  const urlInputRef = useRef<HTMLInputElement>(null)

  type UrlHistEntry = { url: string; host: string }
  const URL_HIST_KEY = 'wbs-scrape-url-history'
  const [urlHistory, setUrlHistory] = useState<UrlHistEntry[]>([])
  useEffect(() => {
    try {
      const raw = localStorage.getItem(URL_HIST_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as UrlHistEntry[]
        if (Array.isArray(parsed)) setUrlHistory(parsed.slice(0, 10))
      }
    } catch { /* ignore */ }
  }, [])
  const merkeUrl = useCallback((u: string) => {
    try {
      const host = new URL(u).hostname.replace(/^www\./, '')
      setUrlHistory((prev) => {
        const next = [{ url: u, host }, ...prev.filter((e) => e.url !== u)].slice(0, 10)
        localStorage.setItem(URL_HIST_KEY, JSON.stringify(next))
        return next
      })
    } catch { /* ignore */ }
  }, [])

  // ── Preis-Logik ───────────────────────────────────────────
  const vpBrutto     = r2(vpNetto * (1 + mwst))
  const provisionEur = r2(vpNetto * (provision / 100))

  const handleEpChange = useCallback((val: number) => {
    setEp(val); setVpNetto(r2(val * (1 + marge / 100)))
  }, [marge])

  const handleMargeChange = useCallback((val: number) => {
    setMarge(val); setVpNetto(r2(ep * (1 + val / 100)))
  }, [ep])

  const handleVpNettoChange = useCallback((val: number) => {
    setVpNetto(val)
    if (ep > 0) setMarge(r2(((val - ep) / ep) * 100))
  }, [ep])

  const handleVpBruttoChange = useCallback((val: number) => {
    const netto = r2(val / (1 + mwst))
    setVpNetto(netto)
    if (ep > 0) setMarge(r2(((netto - ep) / ep) * 100))
  }, [ep, mwst])

  // ── Bild-Upload ───────────────────────────────────────────
  // Zentrale Funktion — wird vom Datei-Dialog UND von Drag&Drop genutzt.
  // Unterstützt mehrere Dateien gleichzeitig (bis zum 5-Bilder-Limit).
  const MAX_BILD_MB = 10
  const uploadFiles = useCallback(async (files: File[]) => {
    const bilder = files.filter((f) => f.type.startsWith('image/'))
    if (bilder.length === 0) {
      setBildFehler('Bitte nur Bilddateien (JPG, PNG, WebP) ablegen.')
      setTimeout(() => setBildFehler(null), 4000)
      return
    }
    const zuGross = bilder.find((f) => f.size > MAX_BILD_MB * 1024 * 1024)
    if (zuGross) {
      setBildFehler(`„${zuGross.name}" ist zu groß (max. ${MAX_BILD_MB} MB).`)
      setTimeout(() => setBildFehler(null), 5000)
      return
    }
    const frei = 5 - bilderUrls.length
    if (frei <= 0) {
      setBildFehler('Maximal 5 Bilder pro Produkt.')
      setTimeout(() => setBildFehler(null), 4000)
      return
    }
    setBildFehler(null)
    setBildUploading(true)
    const supabase = createClient()
    const neueUrls: string[] = []
    for (const file of bilder.slice(0, frei)) {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const pfad = `produkte/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { data, error } = await supabase.storage
        .from('produktbilder')
        .upload(pfad, file, { contentType: file.type, upsert: false })
      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage.from('produktbilder').getPublicUrl(data.path)
        neueUrls.push(publicUrl)
      }
    }
    if (neueUrls.length > 0) setBilderUrls((prev) => [...prev, ...neueUrls].slice(0, 5))
    setBildUploading(false)
    if (bildInputRef.current) bildInputRef.current.value = ''
  }, [bilderUrls])

  const handleBildUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    uploadFiles(Array.from(e.target.files ?? []))
  }, [uploadFiles])

  // ── Auto-Fill ─────────────────────────────────────────────
  const handleUrlScrape = useCallback(async (urlOverride?: string) => {
    const url = (urlOverride ?? urlInputRef.current?.value)?.trim()
    if (!url || !url.startsWith('http')) return
    if (urlInputRef.current && urlOverride) urlInputRef.current.value = urlOverride
    setScrapingLoading(true)
    setScrapingFehler(null)
    try {
      const res  = await fetch(`/api/scrape-product?url=${encodeURIComponent(url)}`)
      const data: ScraperErgebnis = await res.json()
      if ((data as { error?: string }).error) throw new Error((data as { error?: string }).error)

      // Prüfe ob überhaupt sinnvolle Daten vorhanden
      const hatDaten = data.title || (data.images && data.images.length > 0) || data.description || data.price
      if (!hatDaten) {
        setScrapingFehler('Keine Produktdaten gefunden. Bitte manuell eingeben.')
        return
      }
      merkeUrl(url)
      setScraperModal(data)
    } catch {
      setScrapingFehler('Automatisches Auslesen fehlgeschlagen. Bitte manuell eingeben.')
    } finally {
      setScrapingLoading(false)
    }
  }, [merkeUrl])

  const handleUebernehmen = useCallback((ausgewaehlt: Set<keyof ScraperErgebnis>, ausgewaehlteBilder: string[]) => {
    if (!scraperModal) return
    if (ausgewaehlt.has('title')        && scraperModal.title)        setProduktName(scraperModal.title)
    if (ausgewaehlt.has('description')  && scraperModal.description)  setBeschreibung(scraperModal.description)
    if (ausgewaehlt.has('artikelnummer')&& scraperModal.artikelnummer) setArtikelnummer(scraperModal.artikelnummer)
    if (ausgewaehlt.has('material')     && scraperModal.material)      setMaterial(scraperModal.material)
    if (ausgewaehlt.has('farbe')        && scraperModal.farbe)         setFarbe(scraperModal.farbe)
    if (ausgewaehlt.has('lieferzeit')   && scraperModal.lieferzeit)    setLieferzeit(scraperModal.lieferzeit)
    if (ausgewaehlteBilder.length > 0) {
      setBilderUrls((prev) => {
        const merged = [...prev]
        for (const u of ausgewaehlteBilder) {
          if (!merged.includes(u)) merged.push(u)
        }
        return merged.slice(0, 5)
      })
    }
    if (ausgewaehlt.has('breite_cm')    && scraperModal.breite_cm)     setBreiteCm(String(scraperModal.breite_cm))
    if (ausgewaehlt.has('tiefe_cm')     && scraperModal.tiefe_cm)      setTiefeCm(String(scraperModal.tiefe_cm))
    if (ausgewaehlt.has('hoehe_cm')     && scraperModal.hoehe_cm)      setHoeheCm(String(scraperModal.hoehe_cm))
    // Preis: scraped price ist brutto → zurückrechnen auf netto
    if (ausgewaehlt.has('price') && scraperModal.price) {
      const nettoAusGescraped = r2(scraperModal.price / (1 + mwst))
      setVpNetto(nettoAusGescraped)
      if (ep > 0) setMarge(r2(((nettoAusGescraped - ep) / ep) * 100))
    }
    // Auto-Partner aus Domain-Match
    if (scraperModal.partner_match) setPartnerId(scraperModal.partner_match.id)
    setScraperModal(null)
  }, [scraperModal, ep, mwst])

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Auto-Fill Modal */}
      {scraperModal && (
        <AutoFillModal
          data={scraperModal}
          onUebernehmen={handleUebernehmen}
          onAbbrechen={() => setScraperModal(null)}
        />
      )}

      {/* Screenshot-Upload Modal */}
      {screenshotModalOffen && (
        <ScreenshotUploadModal
          onClose={() => setScreenshotModalOffen(false)}
          onErgebnis={(data) => {
            setScreenshotModalOffen(false)
            setScraperModal(data)
          }}
        />
      )}

      <form action={formAction} className="flex flex-col h-full">
        {/* Hidden Felder */}
        <input type="hidden" name="einkaufspreis"    value={ep || ''} />
        <input type="hidden" name="marge_prozent"    value={marge || ''} />
        <input type="hidden" name="verkaufspreis"    value={vpNetto || ''} />
        <input type="hidden" name="provision_prozent" value={provision || ''} />
        <input type="hidden" name="menge"            value={menge} />
        <input type="hidden" name="bild_url"         value={bilderUrls[0] ?? ''} />
        <input type="hidden" name="bilder_urls_json" value={JSON.stringify(bilderUrls)} />
        <input type="hidden" name="tags_json"        value={JSON.stringify(tags)} />
        <input type="hidden" name="name"             value={produktName} />
        <input type="hidden" name="beschreibung"     value={beschreibung} />
        <input type="hidden" name="kategorie"        value={kategorie} />
        <input type="hidden" name="lieferzeit"       value={lieferzeit} />
        <input type="hidden" name="material"         value={material} />
        <input type="hidden" name="farbe"            value={farbe} />
        <input type="hidden" name="artikelnummer"    value={artikelnummer} />
        <input type="hidden" name="verfuegbarkeit"   value={verfuegbarkeit} />
        <input type="hidden" name="hinweis_extern"   value={hinweisExtern} />
        {hinweisSichtbar && <input type="hidden" name="hinweis_extern_sichtbar" value="on" />}
        <input type="hidden" name="breite_cm"        value={breiteCm} />
        <input type="hidden" name="tiefe_cm"         value={tiefeCm} />
        <input type="hidden" name="hoehe_cm"         value={hoeheCm} />

        {/* Fehler */}
        {state?.fehler && (
          <div className="mx-5 mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 shrink-0">
            {state.fehler}
          </div>
        )}

        {/* ── 2-Spalten-Layout ── */}
        <div className="flex-1 grid grid-cols-[3fr_2fr] min-h-0 overflow-hidden">

          {/* ── Linke Spalte: Produktinfos ── */}
          <div className="overflow-y-auto px-5 py-4 border-r border-gray-100 space-y-4">

            {/* URL + Auto-Fill */}
            <div>
              <label className={lbl}>
                Produktlink
                <span className="ml-1.5 text-gray-400 font-normal normal-case text-[10px]">Name & Daten automatisch ausfüllen</span>
              </label>
              <div className="flex gap-2">
                <input
                  ref={urlInputRef}
                  name="produkt_url"
                  type="url"
                  defaultValue={initialData?.produkt_url ?? ''}
                  className={inp}
                  placeholder="https://…"
                />
                <button type="button" onClick={() => handleUrlScrape()} disabled={scrapingLoading}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-wellbeing-cream border border-wellbeing-green-light text-wellbeing-green rounded-lg hover:bg-wellbeing-cream/80 transition-colors disabled:opacity-50 whitespace-nowrap font-medium">
                  {scrapingLoading
                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Lädt…</>
                    : <><Zap className="w-3 h-3" /> Auto-Fill</>}
                </button>
                <button
                  type="button"
                  onClick={() => setScreenshotModalOffen(true)}
                  disabled={scrapingLoading}
                  title="Falls die Website blockiert: lade einen Screenshot der Produktseite hoch"
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-gray-200 text-gray-600 hover:border-wellbeing-green-light hover:text-wellbeing-green rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap font-medium"
                >
                  <ImageIcon className="w-3 h-3" /> Screenshot
                </button>
              </div>
              {scrapingFehler && (
                <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {scrapingFehler}
                </p>
              )}
              {urlHistory.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Zuletzt:</span>
                  {urlHistory.slice(0, 5).map((e) => (
                    <button
                      key={e.url}
                      type="button"
                      onClick={() => handleUrlScrape(e.url)}
                      disabled={scrapingLoading}
                      title={e.url}
                      className="text-[11px] px-2 py-0.5 bg-gray-100 hover:bg-wellbeing-cream hover:text-wellbeing-green-dark text-gray-600 rounded-full transition-colors disabled:opacity-50"
                    >
                      {e.host}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bezeichnung */}
            <div>
              <label className={lbl}>Bezeichnung <span className="text-red-400">*</span></label>
              <input
                type="text" required
                value={produktName}
                onChange={(e) => setProduktName(e.target.value)}
                className={inp}
                placeholder="z. B. Eames Lounge Chair"
              />
            </div>

            {/* Kundenpreis (VK Brutto) */}
            <div className="bg-wellbeing-cream/40 border border-wellbeing-green/20 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-wellbeing-green-dark mb-1">
                    Verkaufspreis für Kunde (brutto inkl. {Math.round(mwst * 100)}% MwSt.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={vpBrutto > 0 ? vpBrutto : ''}
                    onChange={(e) => handleVpBruttoChange(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-lg font-bold bg-white border border-wellbeing-green/20 rounded-lg text-wellbeing-green-dark placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/30 font-mono"
                    placeholder="0,00"
                  />
                </div>
                {vpNetto > 0 && (
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-gray-400 mb-0.5">Netto</p>
                    <p className="text-sm font-mono font-semibold text-gray-600">{eur(vpNetto)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Partner + Kategorie */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Partner / Lieferant</label>
                <select
                  name="partner_id"
                  value={partnerId}
                  onChange={(e) => setPartnerId(e.target.value)}
                  className={inp}
                >
                  <option value="">Kein Partner</option>
                  {partner.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Kategorie</label>
                <select
                  value={kategorie}
                  onChange={(e) => setKategorie(e.target.value)}
                  className={inp}
                >
                  <option value="">— wählen —</option>
                  {kategorienListe.map((k) => <option key={k.name} value={k.name}>{k.name}</option>)}
                </select>
              </div>
            </div>

            {/* Einheit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Einheit</label>
                <select name="einheit" defaultValue={initialData?.einheit ?? 'Stk'} className={inp}>
                  {EINHEITEN.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Verfügbarkeit</label>
                <select
                  value={verfuegbarkeit}
                  onChange={(e) => setVerfuegbarkeit(e.target.value)}
                  className={inp}
                >
                  {VERFUEGBARKEIT_OPTIONEN.map((o) => (
                    <option key={o.wert} value={o.wert}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Maße */}
            <div>
              <label className={lbl}>Maße (cm) <span className="text-gray-400 font-normal normal-case text-[10px]">Breite × Tiefe × Höhe</span></label>
              <div className="grid grid-cols-3 gap-2">
                <input type="number" min="0" step="0.1" value={breiteCm}
                  onChange={(e) => setBreiteCm(e.target.value)}
                  className={inp} placeholder="B" />
                <input type="number" min="0" step="0.1" value={tiefeCm}
                  onChange={(e) => setTiefeCm(e.target.value)}
                  className={inp} placeholder="T" />
                <input type="number" min="0" step="0.1" value={hoeheCm}
                  onChange={(e) => setHoeheCm(e.target.value)}
                  className={inp} placeholder="H" />
              </div>
            </div>

            {/* Material + Farbe */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Material</label>
                <input type="text" value={material} onChange={(e) => setMaterial(e.target.value)}
                  className={inp} placeholder="z. B. Echtleder, Nussbaum" />
              </div>
              <div>
                <label className={lbl}>Farbe</label>
                <input type="text" value={farbe} onChange={(e) => setFarbe(e.target.value)}
                  className={inp} placeholder="z. B. Schwarz / Walnuss" />
              </div>
            </div>

            {/* Lieferzeit + Artikelnummer */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Lieferzeit</label>
                <input
                  type="text"
                  list="lieferzeit-optionen"
                  value={lieferzeit}
                  onChange={(e) => setLieferzeit(e.target.value)}
                  className={inp}
                  placeholder="z. B. 3-4 Wochen"
                />
                <datalist id="lieferzeit-optionen">
                  {LIEFERZEIT_VORSCHLAEGE.map((l) => <option key={l} value={l} />)}
                </datalist>
              </div>
              <div>
                <label className={lbl}>Artikelnummer / SKU</label>
                <input type="text" value={artikelnummer}
                  onChange={(e) => setArtikelnummer(e.target.value)}
                  className={inp} placeholder="z. B. LCW-001" />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className={lbl}>Tags <span className="text-gray-400 font-normal normal-case text-[10px]">Enter oder Komma zum Hinzufügen</span></label>
              <TagsInput value={tags} onChange={setTags} />
            </div>

            {/* Beschreibung */}
            <div>
              <label className={lbl}>Beschreibung <span className="text-gray-400 font-normal normal-case text-[10px]">für Kunden sichtbar</span></label>
              <textarea
                value={beschreibung}
                onChange={(e) => setBeschreibung(e.target.value)}
                rows={3}
                className={`${inp} resize-none`}
                placeholder="Kurzbeschreibung für die Kundenansicht…"
              />
            </div>

            {/* ── Interne Kalkulation (kollabierbar) ── */}
            <div className="border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setKalkulationOffen((v) => !v)}
                className="flex items-center gap-2 text-[11px] font-semibold text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors group"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${kalkulationOffen ? 'rotate-180' : ''}`} />
                Interne Kalkulation
                <span className="text-[10px] text-red-500 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full normal-case tracking-normal">Nur intern</span>
                {ep > 0 && !kalkulationOffen && (
                  <span className="text-[10px] text-gray-400 font-normal tracking-normal normal-case">
                    EK {eur(ep)} · Marge {marge.toFixed(1)}%{provision > 0 ? ` · Prov. ${provision}%` : ''}
                  </span>
                )}
              </button>

              {kalkulationOffen && (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>EK netto (€)</label>
                      <input type="number" min="0" step="0.01"
                        value={ep || ''}
                        onChange={(e) => handleEpChange(parseFloat(e.target.value) || 0)}
                        className={`${inpPreis} font-mono`} placeholder="0,00" />
                    </div>
                    <div>
                      <label className={lbl}>Marge (%)</label>
                      <input type="number" step="0.1"
                        value={marge || ''}
                        onChange={(e) => handleMargeChange(parseFloat(e.target.value) || 0)}
                        className={`${inpPreis} font-mono`} placeholder="0,0" />
                    </div>
                    <div>
                      <label className={lbl}>VP netto (€)</label>
                      <input type="number" min="0" step="0.01"
                        value={vpNetto || ''}
                        onChange={(e) => handleVpNettoChange(parseFloat(e.target.value) || 0)}
                        className={`${inpPreis} font-mono font-semibold text-wellbeing-green-dark`}
                        placeholder="0,00" />
                    </div>
                    <div>
                      <label className={lbl}>Provision (%)</label>
                      <input type="number" min="0" step="0.1"
                        value={provision || ''}
                        onChange={(e) => setProvision(parseFloat(e.target.value) || 0)}
                        className={`${inpPreis} font-mono`} placeholder="0,0" />
                    </div>
                  </div>

                  {(vpNetto > 0 || ep > 0) && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <KalkulationsZeile label="EK netto" wert={ep > 0 ? eur(ep) : '–'} />
                        <KalkulationsZeile label="VP netto" wert={vpNetto > 0 ? eur(vpNetto) : '–'} hervorheben />
                        <KalkulationsZeile label="VP brutto" wert={vpNetto > 0 ? eur(vpBrutto) : '–'} hervorheben />
                        <KalkulationsZeile label="Provision" wert={provision > 0 && vpNetto > 0 ? eur(provisionEur) : '–'} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Rechte Spalte: Bilder + Notizen ── */}
          <div className="overflow-y-auto px-5 py-4 space-y-5">

            {/* Bilder */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={lbl}>Produktbilder</span>
                <span className="text-[10px] text-gray-400">{bilderUrls.length}/5 · Drag zum Sortieren</span>
              </div>

              {bilderUrls.length === 0 && (
                <div className="mb-2 flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Package className="w-4 h-4 text-gray-300 shrink-0" />
                  <span className="text-xs text-gray-400">Noch kein Bild — lade eines hoch oder nutze Auto-Fill</span>
                </div>
              )}

              <BilderGrid
                urls={bilderUrls}
                onChange={setBilderUrls}
                uploading={bildUploading}
                onUpload={() => bildInputRef.current?.click()}
                onFilesDropped={uploadFiles}
              />
              <input
                ref={bildInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleBildUpload}
                className="hidden"
              />
              <p className="text-[11px] text-gray-400 mt-1.5">
                Bilder per Drag &amp; Drop vom Finder/Explorer ablegen oder klicken — bis zu 5 (JPG, PNG, WebP).
              </p>
              {bildFehler && (
                <p className="text-[11px] text-red-600 mt-1">{bildFehler}</p>
              )}
            </div>

            {/* Vermerk / Hinweis (Migration 058) */}
            <div className="border-t border-gray-100 pt-4">
              <label className={lbl}>
                Vermerk / Hinweis
                <span className="ml-2 text-[10px] text-gray-400 font-normal normal-case tracking-normal">
                  erscheint überall, wo dieses Produkt angezeigt wird
                </span>
              </label>
              <textarea
                value={hinweisExtern}
                onChange={(e) => setHinweisExtern(e.target.value)}
                placeholder={'z.B. "Preis kann sich ändern", "Aktion bis 30.06.", "Vor Bestellung anrufen"…'}
                rows={2}
                className={`${inp} resize-none`}
              />
              <label className="mt-2 flex items-start gap-2 text-xs text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hinweisSichtbar}
                  onChange={(e) => setHinweisSichtbar(e.target.checked)}
                  className="mt-0.5 accent-wellbeing-green"
                />
                <span>
                  <span className="font-medium">Auch für Kunden sichtbar</span>
                  <span className="block text-[11px] text-gray-400">
                    {hinweisSichtbar
                      ? 'Erscheint in Freigabe-Link, Konfigurator und Portal.'
                      : 'Bleibt intern (Team-Ansichten, PDF-Export).'}
                  </span>
                </span>
              </label>
            </div>

            {/* Notizen */}
            {produktId && (
              <div className="border-t border-gray-100 pt-4">
                <NotizBlock
                  typ="produkt"
                  referenzId={produktId}
                  initialNotizen={notizen ?? []}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Footer-Aktionen ── */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <a href={abbrechen}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Abbrechen
          </a>
          <SpeichernButton disabled={bildUploading} />
        </div>
      </form>
    </div>
  )
}

// ── Sub-Komponenten ───────────────────────────────────────────
function KalkulationsZeile({ label, wert, hervorheben }: { label: string; wert: string; hervorheben?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
      <p className={`text-xs font-mono font-semibold ${hervorheben ? 'text-wellbeing-green' : 'text-gray-700'}`}>{wert}</p>
    </div>
  )
}

// ── Tailwind-Klassen ──────────────────────────────────────────
const lbl      = 'block text-xs font-medium text-gray-600 mb-1'
const inp      = 'w-full px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition'
const inpPreis = 'w-full px-3 py-1.5 text-sm bg-wellbeing-cream/40 border border-wellbeing-cream rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/30 focus:border-wellbeing-green-light transition'
