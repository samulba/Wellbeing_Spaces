'use client'

import { useState, useTransition } from 'react'
import { Check, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react'
import { onboardingAbsenden } from '@/app/actions/onboarding'
import type { OnboardingVorlage, OnboardingFrage } from '@/lib/supabase/types'

// ── Konstanten (Standard-Vorlage) ─────────────────────────────
const RAUMTYPEN = [
  'Wohnzimmer', 'Schlafzimmer', 'Küche', 'Bad / WC', 'Büro / Arbeitszimmer',
  'Esszimmer', 'Flur / Diele', 'Kinderzimmer', 'Gästezimmer',
  'Terrasse / Balkon', 'Keller / Hauswirtschaft', 'Sonstige',
]

const BUDGET_OPTIONEN = [
  { label: 'Bis 10.000 €',       min: null,   max: 10000  },
  { label: '10.000 – 25.000 €',  min: 10000,  max: 25000  },
  { label: '25.000 – 50.000 €',  min: 25000,  max: 50000  },
  { label: '50.000 – 100.000 €', min: 50000,  max: 100000 },
  { label: 'Über 100.000 €',     min: 100000, max: null   },
  { label: 'Noch unklar',        min: null,   max: null   },
]

const ZEITRAHMEN_OPTIONEN = [
  'So schnell wie möglich', '1 – 3 Monate', '3 – 6 Monate', '6 – 12 Monate', 'Flexibel',
]

const STIL_OPTIONEN = [
  'Skandinavisch', 'Modern', 'Minimalistisch', 'Industrial', 'Bauhaus',
  'Mediterran', 'Natürlich / Biophil', 'Klassisch', 'Japandi', 'Boho / Eklektisch',
]

// ── Typen (Standard-Form) ─────────────────────────────────────
interface Daten {
  kunde_name: string
  kunde_email: string
  kunde_telefon: string
  projekt_name: string
  projekt_adresse: string
  raumtypen: string[]
  budget_min: number | null
  budget_max: number | null
  zeitrahmen: string
  stilTags: string[]
  notizen: string
}

type Fehler = Partial<Record<'kunde_name' | 'kunde_email', string>>

const INITIAL: Daten = {
  kunde_name: '', kunde_email: '', kunde_telefon: '',
  projekt_name: '', projekt_adresse: '', raumtypen: [],
  budget_min: null, budget_max: null, zeitrahmen: '',
  stilTags: [], notizen: '',
}

const SCHRITTE = ['Kontakt', 'Ihr Projekt', 'Budget', 'Stil & Wünsche']
const TOTAL = SCHRITTE.length

// ── Haupt-Komponente ──────────────────────────────────────────
export default function OnboardingFormular({
  token,
  vorlage,
}: {
  token: string
  vorlage: OnboardingVorlage | null
}) {
  // Custom-Vorlage (nicht Standard) → dynamisches Formular
  if (vorlage && !vorlage.ist_standard) {
    return <DynamischesFormular token={token} vorlage={vorlage} />
  }

  // Standard (4-Schritt) Formular
  return <StandardFormular token={token} />
}

// ── Standard-Formular (4 Schritte) ───────────────────────────
function StandardFormular({ token }: { token: string }) {
  const [schritt, setSchritt]         = useState(1)
  const [daten, setDaten]             = useState<Daten>(INITIAL)
  const [fehler, setFehler]           = useState<Fehler>({})
  const [erfolg, setErfolg]           = useState(false)
  const [fehlerMsg, setFehlerMsg]     = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()

  function setField<K extends keyof Daten>(key: K, value: Daten[K]) {
    setDaten((d) => ({ ...d, [key]: value }))
    setFehler((e) => ({ ...e, [key]: undefined }))
  }

  function toggleRaumtyp(rt: string) {
    setDaten((d) => ({
      ...d,
      raumtypen: d.raumtypen.includes(rt)
        ? d.raumtypen.filter((r) => r !== rt)
        : [...d.raumtypen, rt],
    }))
  }

  function toggleStil(s: string) {
    setDaten((d) => ({
      ...d,
      stilTags: d.stilTags.includes(s)
        ? d.stilTags.filter((t) => t !== s)
        : [...d.stilTags, s],
    }))
  }

  function setBudget(min: number | null, max: number | null) {
    setDaten((d) => ({ ...d, budget_min: min, budget_max: max }))
  }

  function validiereSchritt1(): boolean {
    const e: Fehler = {}
    if (!daten.kunde_name.trim()) e.kunde_name = 'Name ist erforderlich.'
    if (!daten.kunde_email.trim()) {
      e.kunde_email = 'E-Mail ist erforderlich.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(daten.kunde_email)) {
      e.kunde_email = 'Bitte eine gültige E-Mail-Adresse eingeben.'
    }
    setFehler(e)
    return Object.keys(e).length === 0
  }

  function weiter() {
    if (schritt === 1 && !validiereSchritt1()) return
    if (schritt < TOTAL) setSchritt((s) => s + 1)
  }

  function zurueck() {
    if (schritt > 1) setSchritt((s) => s - 1)
  }

  function absenden() {
    if (!validiereSchritt1()) { setSchritt(1); return }
    setFehlerMsg(null)
    startTransition(async () => {
      const result = await onboardingAbsenden(token, {
        kunde_name:        daten.kunde_name,
        kunde_email:       daten.kunde_email,
        kunde_telefon:     daten.kunde_telefon || null,
        projekt_name:      daten.projekt_name  || null,
        projekt_adresse:   daten.projekt_adresse || null,
        raumtypen:         daten.raumtypen.length > 0 ? daten.raumtypen : null,
        budget_min:        daten.budget_min,
        budget_max:        daten.budget_max,
        zeitrahmen:        daten.zeitrahmen || null,
        stil_praeferenzen: daten.stilTags.length > 0 ? daten.stilTags.join(', ') : null,
        notizen:           daten.notizen || null,
      })
      if (result.erfolg) {
        setErfolg(true)
      } else {
        setFehlerMsg(result.fehler ?? 'Ein Fehler ist aufgetreten.')
      }
    })
  }

  if (erfolg) return <ErfolgScreen />

  return (
    <div className="min-h-screen bg-[#f6ede2] flex flex-col">

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
            <rect x="0" y="0" width="10" height="10" rx="2" fill="#445c49" opacity="0.30" />
            <rect x="4" y="4" width="10" height="10" rx="2" fill="#445c49" opacity="0.55" />
            <rect x="8" y="8" width="10" height="10" rx="2" fill="#445c49" />
          </svg>
          <div>
            <p className="text-[11px] text-gray-400 leading-none">Projekt-Anfrage</p>
            <p className="text-sm font-semibold text-[#2d3e31] font-syne leading-tight">Wellbeing Spaces</p>
          </div>
        </div>
      </header>

      {/* ── Fortschrittsanzeige ────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center">
            {SCHRITTE.map((label, i) => {
              const nr = i + 1
              const aktiv = nr === schritt
              const fertig = nr < schritt
              return (
                <div key={nr} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      fertig ? 'bg-wellbeing-green text-white'
                      : aktiv ? 'bg-wellbeing-green text-white ring-4 ring-wellbeing-green/20'
                      : 'bg-gray-100 text-gray-400'
                    }`}>
                      {fertig ? <Check className="w-4 h-4" /> : nr}
                    </div>
                    <span className={`text-[10px] font-medium hidden sm:block whitespace-nowrap ${
                      aktiv ? 'text-wellbeing-green' : 'text-gray-400'
                    }`}>
                      {label}
                    </span>
                  </div>
                  {nr < TOTAL && (
                    <div className={`flex-1 h-0.5 mb-3 sm:mb-4 mx-2 rounded-full transition-all ${
                      nr < schritt ? 'bg-wellbeing-green' : 'bg-gray-100'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Formular-Inhalt ────────────────────────────────── */}
      <div className="flex-1 px-4 py-6">
        <div className="max-w-xl mx-auto space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {schritt === 1 && (
              <SchrittKontakt daten={daten} fehler={fehler} onChange={setField} />
            )}
            {schritt === 2 && (
              <SchrittProjekt daten={daten} onChange={setField} toggleRaumtyp={toggleRaumtyp} />
            )}
            {schritt === 3 && (
              <SchrittBudget daten={daten} setBudget={setBudget} onChange={setField} />
            )}
            {schritt === 4 && (
              <SchrittStil daten={daten} toggleStil={toggleStil} onChange={setField} />
            )}
          </div>

          {fehlerMsg && (
            <p className="text-sm text-red-600 text-center bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {fehlerMsg}
            </p>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-3">
            {schritt > 1 ? (
              <button
                onClick={zurueck}
                disabled={isPending}
                className="flex items-center gap-1.5 px-5 py-3 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
                Zurück
              </button>
            ) : (
              <div />
            )}
            <div className="flex-1" />
            {schritt < TOTAL ? (
              <button
                onClick={weiter}
                className="flex items-center gap-1.5 px-6 py-3 text-sm font-semibold text-white bg-wellbeing-green hover:bg-wellbeing-green-dark rounded-xl transition-colors"
              >
                Weiter
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={absenden}
                disabled={isPending}
                className="flex items-center gap-1.5 px-6 py-3 text-sm font-semibold text-white bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 rounded-xl transition-colors"
              >
                {isPending ? 'Wird gesendet…' : (
                  <>Anfrage absenden <Check className="w-4 h-4" /></>
                )}
              </button>
            )}
          </div>

          <p className="text-xs text-center text-gray-400">
            Schritt {schritt} von {TOTAL}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Dynamisches Formular (custom Vorlage) ─────────────────────
function DynamischesFormular({ token, vorlage }: { token: string; vorlage: OnboardingVorlage }) {
  const [antworten, setAntworten]     = useState<Record<string, unknown>>({})
  const [erfolg, setErfolg]           = useState(false)
  const [fehlerMsg, setFehlerMsg]     = useState<string | null>(null)
  const [feldFehler, setFeldFehler]   = useState<Record<string, string>>({})
  const [isPending, startTransition]  = useTransition()

  function setAntwort(id: string, value: unknown) {
    setAntworten((a) => ({ ...a, [id]: value }))
    setFeldFehler((e) => { const copy = { ...e }; delete copy[id]; return copy })
  }

  function toggleOption(id: string, opt: string, mehrfach: boolean) {
    if (mehrfach) {
      const current = (antworten[id] as string[]) ?? []
      const next = current.includes(opt)
        ? current.filter((s) => s !== opt)
        : [...current, opt]
      setAntwort(id, next)
    } else {
      setAntwort(id, antworten[id] === opt ? '' : opt)
    }
  }

  function validieren(): boolean {
    const e: Record<string, string> = {}
    for (const f of vorlage.fragen) {
      if (!f.pflichtfeld) continue
      const val = antworten[f.id]
      const leer =
        val === undefined ||
        val === null ||
        val === '' ||
        (Array.isArray(val) && val.length === 0)
      if (leer) e[f.id] = 'Dieses Feld ist erforderlich.'
    }
    setFeldFehler(e)
    return Object.keys(e).length === 0
  }

  function absenden() {
    if (!validieren()) return
    setFehlerMsg(null)
    startTransition(async () => {
      // Versuche Standard-Felder aus bekannten IDs zu extrahieren
      const get = (id: string) => (antworten[id] as string | undefined) ?? null
      const result = await onboardingAbsenden(token, {
        kunde_name:        get('kontakt_name'),
        kunde_email:       get('kontakt_email'),
        kunde_telefon:     get('kontakt_telefon'),
        projekt_name:      get('projekt_name'),
        projekt_adresse:   get('projekt_adresse'),
        raumtypen:         (antworten['raumtypen'] as string[] | null) ?? null,
        zeitrahmen:        get('zeitrahmen'),
        stil_praeferenzen: Array.isArray(antworten['stil'])
          ? (antworten['stil'] as string[]).join(', ')
          : get('stil'),
        notizen:           get('notizen'),
        antworten,
      })
      if (result.erfolg) {
        setErfolg(true)
      } else {
        setFehlerMsg(result.fehler ?? 'Ein Fehler ist aufgetreten.')
      }
    })
  }

  if (erfolg) return <ErfolgScreen />

  return (
    <div className="min-h-screen bg-[#f6ede2] flex flex-col">
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
            <rect x="0" y="0" width="10" height="10" rx="2" fill="#445c49" opacity="0.30" />
            <rect x="4" y="4" width="10" height="10" rx="2" fill="#445c49" opacity="0.55" />
            <rect x="8" y="8" width="10" height="10" rx="2" fill="#445c49" />
          </svg>
          <div>
            <p className="text-[11px] text-gray-400 leading-none">Projekt-Anfrage · {vorlage.name}</p>
            <p className="text-sm font-semibold text-[#2d3e31] font-syne leading-tight">Wellbeing Spaces</p>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-6">
        <div className="max-w-xl mx-auto space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <div className="mb-1">
              <h2 className="text-lg font-semibold text-gray-900">{vorlage.name}</h2>
              {vorlage.beschreibung && (
                <p className="text-sm text-gray-500 mt-0.5">{vorlage.beschreibung}</p>
              )}
            </div>

            {vorlage.fragen.map((frage) => (
              <DynamischesFeld
                key={frage.id}
                frage={frage}
                wert={antworten[frage.id]}
                fehler={feldFehler[frage.id]}
                onChange={(v) => setAntwort(frage.id, v)}
                onToggle={(opt) => toggleOption(frage.id, opt, frage.typ === 'mehrfachauswahl')}
              />
            ))}
          </div>

          {fehlerMsg && (
            <p className="text-sm text-red-600 text-center bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {fehlerMsg}
            </p>
          )}

          <button
            onClick={absenden}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-white bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 rounded-xl transition-colors"
          >
            {isPending ? 'Wird gesendet…' : (
              <>Anfrage absenden <Check className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Dynamisches Einzelfeld ────────────────────────────────────
function DynamischesFeld({
  frage,
  wert,
  fehler,
  onChange,
  onToggle,
}: {
  frage: OnboardingFrage
  wert: unknown
  fehler?: string
  onChange: (v: unknown) => void
  onToggle: (opt: string) => void
}) {
  const label = frage.titel + (frage.pflichtfeld ? ' *' : '')

  if (frage.typ === 'text' || frage.typ === 'datum') {
    return (
      <FormFeld label={label} fehler={fehler}>
        <input
          type={frage.typ === 'datum' ? 'date' : 'text'}
          placeholder={frage.placeholder ?? ''}
          value={(wert as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls(!!fehler)}
        />
      </FormFeld>
    )
  }

  if (frage.typ === 'zahl') {
    return (
      <FormFeld label={label} fehler={fehler}>
        <input
          type="number"
          placeholder={frage.placeholder ?? ''}
          value={(wert as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls(!!fehler)}
        />
      </FormFeld>
    )
  }

  if (frage.typ === 'textarea') {
    return (
      <FormFeld label={label} fehler={fehler}>
        <textarea
          rows={4}
          placeholder={frage.placeholder ?? ''}
          value={(wert as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-4 py-3 text-sm border rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 transition bg-gray-50 resize-none ${
            fehler
              ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
              : 'border-gray-200 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light'
          }`}
        />
      </FormFeld>
    )
  }

  if (frage.typ === 'auswahl' || frage.typ === 'mehrfachauswahl') {
    const mehrfach = frage.typ === 'mehrfachauswahl'
    const ausgewaehlt = mehrfach
      ? ((wert as string[]) ?? [])
      : wert as string | undefined

    return (
      <FormFeld label={label} fehler={fehler}>
        <div className="flex flex-wrap gap-2">
          {(frage.optionen ?? []).map((opt) => {
            const aktiv = mehrfach
              ? (ausgewaehlt as string[]).includes(opt)
              : ausgewaehlt === opt
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onToggle(opt)}
                className={`px-4 py-2 text-sm rounded-full border font-medium transition-all ${
                  aktiv
                    ? 'bg-wellbeing-green/10 border-wellbeing-green text-wellbeing-green-dark'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                {aktiv && '✓ '}{opt}
              </button>
            )
          })}
        </div>
      </FormFeld>
    )
  }

  return null
}

// ── Schritt 1: Kontaktdaten ───────────────────────────────────
function SchrittKontakt({
  daten, fehler, onChange,
}: {
  daten: Daten
  fehler: Fehler
  onChange: <K extends keyof Daten>(key: K, value: Daten[K]) => void
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Wie können wir Sie erreichen?</h2>
      <p className="text-sm text-gray-500 mb-6">Ihre Kontaktdaten für die erste Abstimmung.</p>

      <div className="space-y-4">
        <FormFeld label="Name *" fehler={fehler.kunde_name}>
          <input
            type="text"
            autoFocus
            autoComplete="name"
            placeholder="Vor- und Nachname"
            value={daten.kunde_name}
            onChange={(e) => onChange('kunde_name', e.target.value)}
            className={inputCls(!!fehler.kunde_name)}
          />
        </FormFeld>

        <FormFeld label="E-Mail-Adresse *" fehler={fehler.kunde_email}>
          <input
            type="email"
            autoComplete="email"
            placeholder="ihre@email.de"
            value={daten.kunde_email}
            onChange={(e) => onChange('kunde_email', e.target.value)}
            className={inputCls(!!fehler.kunde_email)}
          />
        </FormFeld>

        <FormFeld label="Telefon (optional)">
          <input
            type="tel"
            autoComplete="tel"
            placeholder="+49 ..."
            value={daten.kunde_telefon}
            onChange={(e) => onChange('kunde_telefon', e.target.value)}
            className={inputCls(false)}
          />
        </FormFeld>
      </div>
    </div>
  )
}

// ── Schritt 2: Projekt-Infos ──────────────────────────────────
function SchrittProjekt({
  daten, onChange, toggleRaumtyp,
}: {
  daten: Daten
  onChange: <K extends keyof Daten>(key: K, value: Daten[K]) => void
  toggleRaumtyp: (rt: string) => void
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Erzählen Sie uns von Ihrem Projekt</h2>
      <p className="text-sm text-gray-500 mb-6">Alle Felder sind optional.</p>

      <div className="space-y-5">
        <FormFeld label="Projektname">
          <input
            type="text"
            placeholder="z. B. Umbau Einfamilienhaus"
            value={daten.projekt_name}
            onChange={(e) => onChange('projekt_name', e.target.value)}
            className={inputCls(false)}
          />
        </FormFeld>

        <FormFeld label="Adresse / Standort">
          <input
            type="text"
            placeholder="Straße, PLZ, Ort"
            value={daten.projekt_adresse}
            onChange={(e) => onChange('projekt_adresse', e.target.value)}
            className={inputCls(false)}
          />
        </FormFeld>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Welche Räume sollen gestaltet werden?
          </label>
          <div className="grid grid-cols-2 gap-2">
            {RAUMTYPEN.map((rt) => {
              const aktiv = daten.raumtypen.includes(rt)
              return (
                <button
                  key={rt}
                  type="button"
                  onClick={() => toggleRaumtyp(rt)}
                  className={`px-3 py-2.5 text-sm rounded-xl border text-left transition-all ${
                    aktiv
                      ? 'bg-wellbeing-green/10 border-wellbeing-green text-wellbeing-green-dark font-medium'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {aktiv && <span className="mr-1.5">✓</span>}
                  {rt}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Schritt 3: Budget & Zeitrahmen ────────────────────────────
function SchrittBudget({
  daten, setBudget, onChange,
}: {
  daten: Daten
  setBudget: (min: number | null, max: number | null) => void
  onChange: <K extends keyof Daten>(key: K, value: Daten[K]) => void
}) {
  const aktiveBudget = BUDGET_OPTIONEN.find(
    (o) => o.min === daten.budget_min && o.max === daten.budget_max
  )

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Budget & Zeitrahmen</h2>
      <p className="text-sm text-gray-500 mb-6">Hilft uns, das Beste für Sie zu planen.</p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Ungefähres Budget</label>
          <div className="grid grid-cols-2 gap-2">
            {BUDGET_OPTIONEN.map((opt) => {
              const aktiv = aktiveBudget === opt
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setBudget(opt.min, opt.max)}
                  className={`px-3 py-3 text-sm rounded-xl border text-center font-medium transition-all ${
                    aktiv
                      ? 'bg-wellbeing-green text-white border-wellbeing-green shadow-sm'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Zeitrahmen</label>
          <div className="flex flex-wrap gap-2">
            {ZEITRAHMEN_OPTIONEN.map((opt) => {
              const aktiv = daten.zeitrahmen === opt
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onChange('zeitrahmen', aktiv ? '' : opt)}
                  className={`px-4 py-2.5 text-sm rounded-full border font-medium transition-all ${
                    aktiv
                      ? 'bg-wellbeing-green text-white border-wellbeing-green'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Schritt 4: Stil & Wünsche ─────────────────────────────────
function SchrittStil({
  daten, toggleStil, onChange,
}: {
  daten: Daten
  toggleStil: (s: string) => void
  onChange: <K extends keyof Daten>(key: K, value: Daten[K]) => void
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Stil & Wünsche</h2>
      <p className="text-sm text-gray-500 mb-6">Was spricht Sie an? (Mehrfachauswahl möglich)</p>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Stil-Richtungen</label>
          <div className="flex flex-wrap gap-2">
            {STIL_OPTIONEN.map((stil) => {
              const aktiv = daten.stilTags.includes(stil)
              return (
                <button
                  key={stil}
                  type="button"
                  onClick={() => toggleStil(stil)}
                  className={`px-4 py-2 text-sm rounded-full border font-medium transition-all ${
                    aktiv
                      ? 'bg-wellbeing-green/10 border-wellbeing-green text-wellbeing-green-dark'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {aktiv && '✓ '}{stil}
                </button>
              )
            })}
          </div>
        </div>

        <FormFeld label="Weitere Wünsche & Anmerkungen (optional)">
          <textarea
            rows={4}
            placeholder="z. B. Barrierefreiheit, bestimmte Materialien, besondere Anforderungen…"
            value={daten.notizen}
            onChange={(e) => onChange('notizen', e.target.value)}
            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition resize-none bg-gray-50"
          />
        </FormFeld>
      </div>
    </div>
  )
}

// ── Erfolgsscreen ─────────────────────────────────────────────
function ErfolgScreen() {
  return (
    <div className="min-h-screen bg-[#f6ede2] flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        <svg width="22" height="22" viewBox="0 0 18 18" fill="none" className="mx-auto mb-8">
          <rect x="0" y="0" width="10" height="10" rx="2" fill="#445c49" opacity="0.30" />
          <rect x="4" y="4" width="10" height="10" rx="2" fill="#445c49" opacity="0.55" />
          <rect x="8" y="8" width="10" height="10" rx="2" fill="#445c49" />
        </svg>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-10">
          <div className="w-16 h-16 bg-wellbeing-green/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-wellbeing-green" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Anfrage gesendet!</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Vielen Dank für Ihre Anfrage. Wir haben Ihre Daten erhalten und
            melden uns zeitnah bei Ihnen.
          </p>
        </div>
        <p className="text-xs text-gray-400 mt-5">
          Sie können dieses Fenster nun schließen.
        </p>
      </div>
    </div>
  )
}

// ── Hilfsfunktionen ───────────────────────────────────────────
function inputCls(hatFehler: boolean) {
  return `w-full px-4 py-3 text-sm border rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 transition bg-gray-50 ${
    hatFehler
      ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
      : 'border-gray-200 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light'
  }`
}

function FormFeld({
  label, fehler, children,
}: {
  label: string
  fehler?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
      {fehler && <p className="text-xs text-red-500 mt-1">{fehler}</p>}
    </div>
  )
}
