'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, Loader2, X } from 'lucide-react'
import type { ProduktActionState } from '@/app/actions/produkte'
import type { Partner, ProduktMitDetails } from '@/lib/supabase/types'

// ── Konstanten ────────────────────────────────────────────────
const MWST = 0.19
const EINHEITEN = ['Stk', 'Paar', 'm', 'm²', 'Lfd. m', 'Set', 'Pauschal']
const KATEGORIEN = [
  'Beleuchtung', 'Möbel', 'Textilien', 'Dekoration',
  'Pflanzen', 'Kunst', 'Technik', 'Sanitär', 'Sonstige',
]
const STATUS_OPTIONEN = [
  { wert: 'ausstehend',    label: 'Ausstehend' },
  { wert: 'freigegeben',   label: 'Freigegeben' },
  { wert: 'abgelehnt',     label: 'Abgelehnt' },
  { wert: 'ueberarbeitung', label: 'Überarbeitung' },
]

// ── Hilfsfunktionen ───────────────────────────────────────────
const r2 = (n: number) => Math.round(n * 100) / 100
const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)

function SpeichernButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus()
  const isDisabled = pending || disabled
  return (
    <button
      type="submit"
      disabled={isDisabled}
      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
    >
      {pending ? 'Wird gespeichert…' : 'Speichern'}
    </button>
  )
}

// ── Typen ─────────────────────────────────────────────────────
interface Props {
  aktion: (prevState: ProduktActionState, formData: FormData) => Promise<ProduktActionState>
  partner: Pick<Partner, 'id' | 'name'>[]
  initialData?: ProduktMitDetails
  abbrechen: string
}

// ── Komponente ────────────────────────────────────────────────
export default function ProduktFormular({ aktion, partner, initialData, abbrechen }: Props) {
  const [state, formAction] = useFormState(aktion, null)

  const [ep, setEp] = useState<number>(initialData?.einkaufspreis ?? 0)
  const [marge, setMarge] = useState<number>(initialData?.marge_prozent ?? 0)
  const [vpNetto, setVpNetto] = useState<number>(initialData?.verkaufspreis ?? 0)
  const [provision, setProvision] = useState<number>(initialData?.provision_prozent ?? 0)
  const [menge, setMenge] = useState<number>(initialData?.menge ?? 1)
  const [bildUrl, setBildUrl] = useState<string>(initialData?.bild_url ?? '')
  const [bildUploading, setBildUploading] = useState(false)
  const bildInputRef = useRef<HTMLInputElement>(null)

  const handleBildUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBildUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const pfad = `produkte/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const { data, error } = await supabase.storage
      .from('produktbilder')
      .upload(pfad, file, { contentType: file.type, upsert: false })
    if (!error && data) {
      const { data: { publicUrl } } = supabase.storage.from('produktbilder').getPublicUrl(data.path)
      setBildUrl(publicUrl)
    }
    setBildUploading(false)
    if (bildInputRef.current) bildInputRef.current.value = ''
  }, [])

  const vpBrutto    = r2(vpNetto * (1 + MWST))
  const provisionEur = r2(vpNetto * (provision / 100))
  const gesamtNetto  = r2(vpNetto * menge)
  const gesamtBrutto = r2(vpBrutto * menge)

  const handleEpChange = useCallback((val: number) => {
    setEp(val)
    setVpNetto(r2(val * (1 + marge / 100)))
  }, [marge])

  const handleMargeChange = useCallback((val: number) => {
    setMarge(val)
    setVpNetto(r2(ep * (1 + val / 100)))
  }, [ep])

  const handleVpNettoChange = useCallback((val: number) => {
    setVpNetto(val)
    if (ep > 0) setMarge(r2(((val - ep) / ep) * 100))
  }, [ep])

  return (
    <form action={formAction} className="space-y-7">
      {state?.fehler && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {state.fehler}
        </div>
      )}

      {/* ── Abschnitt 1: Produktinfo ── */}
      <Abschnitt titel="Produktinformation">
        {/* Name */}
        <div className="col-span-2">
          <label htmlFor="name" className={lbl}>
            Bezeichnung <span className="text-red-400">*</span>
          </label>
          <input
            id="name" name="name" type="text" required
            defaultValue={initialData?.name ?? ''}
            className={inp}
            placeholder="z. B. Stehleuchte Arc"
          />
        </div>

        {/* Partner */}
        <div>
          <label htmlFor="partner_id" className={lbl}>Partner / Lieferant</label>
          <select
            id="partner_id" name="partner_id"
            defaultValue={initialData?.partner_id ?? ''}
            className={inp}
          >
            <option value="">Kein Partner</option>
            {partner.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Kategorie */}
        <div>
          <label htmlFor="kategorie" className={lbl}>Kategorie</label>
          <select
            id="kategorie" name="kategorie"
            defaultValue={initialData?.kategorie ?? ''}
            className={inp}
          >
            <option value="">Bitte wählen…</option>
            {KATEGORIEN.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>

        {/* Menge + Einheit */}
        <div>
          <label htmlFor="menge" className={lbl}>Menge</label>
          <input
            id="menge" name="menge" type="number" min="0.01" step="0.01"
            value={menge}
            onChange={(e) => setMenge(parseFloat(e.target.value) || 1)}
            className={inp}
          />
        </div>
        <div>
          <label htmlFor="einheit" className={lbl}>Einheit</label>
          <select
            id="einheit" name="einheit"
            defaultValue={initialData?.einheit ?? 'Stk'}
            className={inp}
          >
            {EINHEITEN.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>

        {/* Produktlink */}
        <div className="col-span-2">
          <label htmlFor="produkt_url" className={lbl}>Produktlink (URL)</label>
          <input
            id="produkt_url" name="produkt_url" type="url"
            defaultValue={initialData?.produkt_url ?? ''}
            className={inp}
            placeholder="https://…"
          />
        </div>

        {/* Beschreibung */}
        <div className="col-span-2">
          <label htmlFor="beschreibung" className={lbl}>Beschreibung (für Kunden sichtbar)</label>
          <textarea
            id="beschreibung" name="beschreibung" rows={2}
            defaultValue={initialData?.beschreibung ?? ''}
            className={`${inp} resize-none`}
            placeholder="Kurzbeschreibung für die Kundenansicht…"
          />
        </div>
      </Abschnitt>

      {/* ── Abschnitt 2: Preiskalkulation (intern) ── */}
      <Abschnitt titel="Preiskalkulation" hinweis="Interne Felder – nicht für Kunden sichtbar">

        <input type="hidden" name="einkaufspreis"   value={ep || ''} />
        <input type="hidden" name="marge_prozent"   value={marge || ''} />
        <input type="hidden" name="verkaufspreis"   value={vpNetto || ''} />
        <input type="hidden" name="provision_prozent" value={provision || ''} />
        <input type="hidden" name="menge"           value={menge} />

        {/* EP netto */}
        <div>
          <label className={lbl}>Einkaufspreis netto (€)</label>
          <input
            type="number" min="0" step="0.01"
            value={ep || ''}
            onChange={(e) => handleEpChange(parseFloat(e.target.value) || 0)}
            className={`${inp} font-mono`}
            placeholder="0,00"
          />
        </div>

        {/* Marge % */}
        <div>
          <label className={lbl}>Marge (%)</label>
          <input
            type="number" step="0.1"
            value={marge || ''}
            onChange={(e) => handleMargeChange(parseFloat(e.target.value) || 0)}
            className={`${inp} font-mono`}
            placeholder="0,0"
          />
        </div>

        {/* VP netto */}
        <div>
          <label className={lbl}>Verkaufspreis netto (€)</label>
          <input
            type="number" min="0" step="0.01"
            value={vpNetto || ''}
            onChange={(e) => handleVpNettoChange(parseFloat(e.target.value) || 0)}
            className={`${inp} font-mono`}
            placeholder="0,00"
          />
        </div>

        {/* VP brutto (readonly) */}
        <div>
          <label className={lbl}>Verkaufspreis brutto (€) <span className="text-gray-400 normal-case font-normal">19% MwSt.</span></label>
          <input
            type="text"
            readOnly
            value={vpNetto > 0 ? eur(vpBrutto) : ''}
            className={`${inp} font-mono bg-gray-50 text-gray-500 cursor-default`}
            tabIndex={-1}
          />
        </div>

        {/* Provision % */}
        <div>
          <label className={lbl}>Provision (%)</label>
          <input
            type="number" min="0" step="0.1"
            value={provision || ''}
            onChange={(e) => setProvision(parseFloat(e.target.value) || 0)}
            className={`${inp} font-mono`}
            placeholder="0,0"
          />
        </div>

        {/* Provision € (readonly) */}
        <div>
          <label className={lbl}>Provision (€)</label>
          <input
            type="text"
            readOnly
            value={provision > 0 && vpNetto > 0 ? eur(provisionEur) : ''}
            className={`${inp} font-mono bg-gray-50 text-gray-500 cursor-default`}
            tabIndex={-1}
          />
        </div>

        {/* Zusammenfassung */}
        {(vpNetto > 0 || ep > 0) && (
          <div className="col-span-2 bg-gray-50 border border-gray-200 rounded-xl p-4 mt-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-3">
              Kalkulation bei {menge} {initialData?.einheit ?? 'Stk'}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KalkulationsZeile label="EP gesamt" wert={ep > 0 ? eur(r2(ep * menge)) : '–'} />
              <KalkulationsZeile label="VP netto gesamt" wert={vpNetto > 0 ? eur(gesamtNetto) : '–'} hervorheben />
              <KalkulationsZeile label="VP brutto gesamt" wert={vpNetto > 0 ? eur(gesamtBrutto) : '–'} hervorheben />
              <KalkulationsZeile label="Provision gesamt" wert={provision > 0 && vpNetto > 0 ? eur(r2(provisionEur * menge)) : '–'} />
            </div>
          </div>
        )}
      </Abschnitt>

      {/* ── Abschnitt 3: Status & Intern ── */}
      <Abschnitt titel="Status & interne Notizen">
        <div>
          <label htmlFor="status" className={lbl}>Status</label>
          <select
            id="status" name="status"
            defaultValue={initialData?.produktstatus?.status ?? 'ausstehend'}
            className={inp}
          >
            {STATUS_OPTIONEN.map((s) => (
              <option key={s.wert} value={s.wert}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Produktbild Upload */}
        <div>
          <label className={lbl}>Produktbild</label>
          <input type="hidden" name="bild_url" value={bildUrl} />

          {bildUrl && (
            <div className="relative w-20 h-20 mb-2 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bildUrl} alt="Vorschau" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setBildUrl('')}
                className="absolute top-0.5 right-0.5 w-5 h-5 bg-white rounded-full shadow text-gray-500 hover:text-red-500 flex items-center justify-center transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => bildInputRef.current?.click()}
            disabled={bildUploading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {bildUploading
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Wird hochgeladen…</>
              : <><Upload className="w-3.5 h-3.5 text-gray-400" /> {bildUrl ? 'Bild ersetzen' : 'Bild hochladen'}</>
            }
          </button>
          <input
            ref={bildInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleBildUpload}
            className="hidden"
          />
        </div>

        <div className="col-span-2">
          <label htmlFor="notizen_intern" className={lbl}>
            Interne Notizen <span className="text-red-400/60 normal-case font-normal">(nicht für Kunden sichtbar)</span>
          </label>
          <textarea
            id="notizen_intern" name="notizen_intern" rows={3}
            defaultValue={initialData?.notizen_intern ?? ''}
            className={`${inp} resize-none`}
            placeholder="Interne Anmerkungen, Lieferzeit, Alternativen…"
          />
        </div>
      </Abschnitt>

      {/* Aktionen */}
      <div className="flex items-center gap-3 pt-1">
        <SpeichernButton disabled={bildUploading} />
        <a href={abbrechen} className="px-5 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          Abbrechen
        </a>
      </div>
    </form>
  )
}

// ── Sub-Komponenten ───────────────────────────────────────────
function Abschnitt({
  titel, hinweis, children,
}: {
  titel: string
  hinweis?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-baseline gap-3 mb-4">
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-widest">{titel}</h3>
        {hinweis && (
          <span className="text-xs text-red-500 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full">
            {hinweis}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  )
}

function KalkulationsZeile({ label, wert, hervorheben }: { label: string; wert: string; hervorheben?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`text-sm font-mono font-medium ${hervorheben ? 'text-indigo-600' : 'text-gray-700'}`}>
        {wert}
      </p>
    </div>
  )
}

// ── Tailwind-Klassen ──────────────────────────────────────────
const lbl = 'block text-xs font-medium text-gray-700 mb-1.5'
const inp = 'w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition'
