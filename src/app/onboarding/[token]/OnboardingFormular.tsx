'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Check, ChevronRight, ChevronLeft, CheckCircle2, Clock, Copy } from 'lucide-react'
import { onboardingAbsenden } from '@/app/actions/onboarding'
import { onboardingAutoSave } from '@/app/actions/onboarding-erweitert'
import DynamischesFeld, { FormFeld, inputCls } from '@/components/onboarding/DynamischesFeld'
import OnboardingReviewModal from '@/components/onboarding/OnboardingReviewModal'
import { sichtbareFragen, antwortenFiltern } from '@/lib/onboarding-bedingungen'
import { extrahiereStammdatenAusAntworten } from '@/lib/onboarding-stammdaten'
import type { OnboardingVorlage, OnboardingFrage, OnboardingSektion, Branding } from '@/lib/supabase/types'

// ── Initial-State-Props ───────────────────────────────────────
// Vom Server geliefert: erlauben Auto-Save-Wiederherstellung beim Reload
// + Stammdaten-Prefill (bei verknuepftem Kunde).
export interface InitialStammdaten {
  kunde_name:        string | null
  kunde_email:       string | null
  kunde_telefon:     string | null
  projekt_name:      string | null
  projekt_adresse:   string | null
  raumtypen:         string[] | null
  budget_min:        number | null
  budget_max:        number | null
  zeitrahmen:        string | null
  stil_praeferenzen: string | null
  notizen:           string | null
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TEL_REGEX   = /^[+]?[\d][\d\s\-/().]{4,}$/

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

type Fehler = Partial<Record<'kunde_name' | 'kunde_email' | 'kunde_telefon', string>>

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
  branding,
  vorschauModus = false,
  initialAntworten = null,
  initialStammdaten,
  initialFortschritt = 0,
  initialSektion = 0,
}: {
  token: string
  vorlage: OnboardingVorlage | null
  branding?: Branding | null
  vorschauModus?: boolean
  initialAntworten?: Record<string, unknown> | null
  initialStammdaten?: InitialStammdaten
  initialFortschritt?: number
  initialSektion?: number
}) {
  // Custom-Vorlage (nicht Standard) → dynamisches Formular
  if (vorlage && !vorlage.ist_standard) {
    return (
      <DynamischesFormular
        token={token}
        vorlage={vorlage}
        branding={branding}
        vorschauModus={vorschauModus}
        initialAntworten={initialAntworten}
        initialFortschritt={initialFortschritt}
        initialSektion={initialSektion}
      />
    )
  }

  // Standard (4-Schritt) Formular
  return (
    <StandardFormular
      token={token}
      branding={branding}
      vorschauModus={vorschauModus}
      initialStammdaten={initialStammdaten}
    />
  )
}

// ── Standard-Formular (4 Schritte) ───────────────────────────
function StandardFormular({
  token, branding, vorschauModus = false, initialStammdaten,
}: {
  token: string
  branding?: Branding | null
  vorschauModus?: boolean
  initialStammdaten?: InitialStammdaten
}) {
  const prim       = branding?.primary_color    ?? '#445c49'
  const bg         = branding?.background_color ?? '#f6ede2'
  const firmenname = branding?.firmenname       ?? 'Wellbeing Spaces'
  const [schritt, setSchritt]         = useState(1)
  const [daten, setDaten]             = useState<Daten>(() => ({
    ...INITIAL,
    kunde_name:      initialStammdaten?.kunde_name      ?? '',
    kunde_email:     initialStammdaten?.kunde_email     ?? '',
    kunde_telefon:   initialStammdaten?.kunde_telefon   ?? '',
    projekt_name:    initialStammdaten?.projekt_name    ?? '',
    projekt_adresse: initialStammdaten?.projekt_adresse ?? '',
    raumtypen:       initialStammdaten?.raumtypen       ?? [],
    budget_min:      initialStammdaten?.budget_min      ?? null,
    budget_max:      initialStammdaten?.budget_max      ?? null,
    zeitrahmen:      initialStammdaten?.zeitrahmen      ?? '',
    stilTags:        initialStammdaten?.stil_praeferenzen
                       ? initialStammdaten.stil_praeferenzen.split(',').map((s) => s.trim()).filter(Boolean)
                       : [],
    notizen:         initialStammdaten?.notizen         ?? '',
  }))
  const [fehler, setFehler]           = useState<Fehler>({})
  const [erfolg, setErfolg]           = useState(false)
  const [fehlerMsg, setFehlerMsg]     = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()
  const [reviewOffen, setReviewOffen] = useState(false)
  const [autoSave, setAutoSave]       = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const ersteAenderungStd             = useRef(false)

  // Auto-Save fuer Standard-Form: schreibt die ausgefuellten Stammdaten
  // direkt in die Top-Level-Spalten via onboardingAbsenden — Nein, wir
  // koennen onboardingAbsenden nicht missbrauchen weil der Status auf
  // 'eingereicht' geht. Stattdessen: nur ein synthetisches Antworten-Objekt
  // in `auto_save` schreiben (kein Status-Change, nur Entwurfsspeicherung).
  useEffect(() => {
    if (vorschauModus) return
    if (!ersteAenderungStd.current) return
    setAutoSave('saving')
    const handle = setTimeout(async () => {
      try {
        const snapshot: Record<string, unknown> = {
          kunde_name:      daten.kunde_name,
          kunde_email:     daten.kunde_email,
          kunde_telefon:   daten.kunde_telefon,
          projekt_name:    daten.projekt_name,
          projekt_adresse: daten.projekt_adresse,
          raumtypen:       daten.raumtypen,
          budget_min:      daten.budget_min,
          budget_max:      daten.budget_max,
          zeitrahmen:      daten.zeitrahmen,
          stilTags:        daten.stilTags,
          notizen:         daten.notizen,
        }
        // Fortschritt = Anteil Pflichtfelder ausgefuellt × 100
        const pflichtFelder = ['kunde_name', 'kunde_email']
        const erfuellt = pflichtFelder.filter((k) => ((snapshot[k] as string) ?? '').trim().length > 0).length
        const fortschritt = Math.round((erfuellt / pflichtFelder.length) * 100)
        const res = await onboardingAutoSave(token, snapshot, fortschritt, schritt)
        setAutoSave(res.ok ? 'saved' : 'error')
      } catch {
        setAutoSave('error')
      }
    }, 1500)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daten, schritt, token, vorschauModus])

  function setField<K extends keyof Daten>(key: K, value: Daten[K]) {
    setDaten((d) => ({ ...d, [key]: value }))
    setFehler((e) => ({ ...e, [key]: undefined }))
    ersteAenderungStd.current = true
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
    } else if (!EMAIL_REGEX.test(daten.kunde_email)) {
      e.kunde_email = 'Bitte eine gültige E-Mail-Adresse eingeben.'
    }
    // Telefon ist optional, aber wenn ausgefuellt, muss es plausibel sein
    if (daten.kunde_telefon.trim() && !TEL_REGEX.test(daten.kunde_telefon)) {
      e.kunde_telefon = 'Telefonnummer ungültig (Ziffern, +, -, Leerzeichen).'
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

  function oeffneReview() {
    if (!validiereSchritt1()) { setSchritt(1); return }
    setFehlerMsg(null)
    setReviewOffen(true)
  }

  function wirklichAbsenden() {
    if (vorschauModus) {
      setFehlerMsg('Vorschau-Modus aktiv — Absenden ist deaktiviert. Entferne ?vorschau=1 aus der URL fuer echtes Absenden.')
      return
    }
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
        setReviewOffen(false)
        setErfolg(true)
      } else {
        setFehlerMsg(result.fehler ?? 'Ein Fehler ist aufgetreten.')
      }
    })
  }

  if (erfolg) return <ErfolgScreen branding={branding} />

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: bg }}>

      {vorschauModus && <VorschauBanner />}

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <BrandLogo branding={branding} firmenname={firmenname} prim={prim} />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-400 leading-none">Projekt-Anfrage</p>
            <p className="text-sm font-semibold font-syne leading-tight truncate" style={{ color: prim }}>{firmenname}</p>
          </div>
          {autoSave !== 'idle' && (
            <span className={`text-[10px] font-medium tabular-nums shrink-0 ${
              autoSave === 'saved' ? 'text-wellbeing-green' :
              autoSave === 'error' ? 'text-red-500' :
              'text-gray-400'
            }`}>
              {autoSave === 'saving' && 'Speichert …'}
              {autoSave === 'saved'  && '✓ Gespeichert'}
              {autoSave === 'error'  && '⚠ Nicht gespeichert'}
            </span>
          )}
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
                onClick={oeffneReview}
                disabled={isPending}
                className="flex items-center gap-1.5 px-6 py-3 text-sm font-semibold text-white bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 rounded-xl transition-colors"
              >
                Anfrage absenden <Check className="w-4 h-4" />
              </button>
            )}
          </div>

          <p className="text-xs text-center text-gray-400">
            Schritt {schritt} von {TOTAL}
          </p>
        </div>
      </div>

      {reviewOffen && (
        <OnboardingReviewModal
          stammdaten={{
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
          }}
          branding={branding ?? null}
          isPending={isPending}
          fehler={fehlerMsg}
          onZurueck={() => {
            setReviewOffen(false)
            if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          onAbsenden={wirklichAbsenden}
        />
      )}
    </div>
  )
}

// ── Dynamisches Formular (custom Vorlage) ─────────────────────
type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function DynamischesFormular({
  token, vorlage, branding,
  vorschauModus = false,
  initialAntworten = null,
  initialFortschritt = 0,
  initialSektion = 0,
}: {
  token: string
  vorlage: OnboardingVorlage
  branding?: Branding | null
  vorschauModus?: boolean
  initialAntworten?: Record<string, unknown> | null
  initialFortschritt?: number
  initialSektion?: number
}) {
  const prim       = branding?.primary_color    ?? '#445c49'
  const bg         = branding?.background_color ?? '#f6ede2'
  const firmenname = branding?.firmenname       ?? 'Wellbeing Spaces'

  // Initial-State aus auto_save: nur Keys uebernehmen, die in der
  // aktuellen Vorlage noch existieren (Vorlage-Edit-Drift-Schutz).
  const [antworten, setAntworten] = useState<Record<string, unknown>>(() => {
    if (!initialAntworten) return {}
    const validIds = new Set(vorlage.fragen?.map((f) => f.id) ?? [])
    const filtered: Record<string, unknown> = {}
    for (const k of Object.keys(initialAntworten)) {
      if (validIds.has(k)) filtered[k] = initialAntworten[k]
    }
    return filtered
  })
  // Aktuelle Sektion fuer Auto-Save-Tracking (z.Z. nur dokumentarisch in DB)
  const aktuelleSektionRef = useRef<number>(initialSektion)
  const [erfolg, setErfolg]           = useState(false)
  const [fehlerMsg, setFehlerMsg]     = useState<string | null>(null)
  const [feldFehler, setFeldFehler]   = useState<Record<string, string>>({})
  const [isPending, startTransition]  = useTransition()
  const [autoSave, setAutoSave]       = useState<AutoSaveStatus>(
    initialAntworten && Object.keys(initialAntworten).length > 0 ? 'saved' : 'idle',
  )
  const [reviewOffen, setReviewOffen] = useState(false)
  const ersteAenderung                = useRef(false)
  // Letzte Auto-Save-Anzeige nach 5 s wieder ausblenden, damit Indikator
  // nicht dauerhaft sichtbar bleibt.
  useEffect(() => {
    if (autoSave !== 'saved') return
    const h = setTimeout(() => setAutoSave('idle'), 5000)
    return () => clearTimeout(h)
  }, [autoSave])
  // initialFortschritt wird beim ersten Save überschrieben — wir nutzen
  // den Wert nur als initialen Fallback für die Berechnung.
  void initialFortschritt

  function setAntwort(id: string, value: unknown) {
    setAntworten((a) => ({ ...a, [id]: value }))
    setFeldFehler((e) => { const copy = { ...e }; delete copy[id]; return copy })
    ersteAenderung.current = true
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

  // Sichtbare Fragen unter Beruecksichtigung Conditional Logic
  const sichtbar = sichtbareFragen(vorlage.fragen, antworten)

  // ── Auto-Save (debounced 2s nach letzter Eingabe) ──────────
  useEffect(() => {
    if (vorschauModus) return
    if (!ersteAenderung.current) return
    setAutoSave('saving')
    const handle = setTimeout(async () => {
      try {
        // Versteckte (conditional) Antworten NICHT in DB persistieren.
        const gefiltert = antwortenFiltern(vorlage.fragen, antworten)
        // Fortschritt als Anteil ausgefuellter Pflichtfelder.
        const alleSichtbar = sichtbareFragen(vorlage.fragen, antworten)
        const pflichtIds = alleSichtbar.filter((f) => f.pflichtfeld).map((f) => f.id)
        const erfuellt = pflichtIds.filter((id) => {
          const v = gefiltert[id]
          if (v === undefined || v === null || v === '') return false
          if (Array.isArray(v) && v.length === 0) return false
          return true
        }).length
        const fortschritt = pflichtIds.length === 0 ? 0 : Math.round((erfuellt / pflichtIds.length) * 100)
        const res = await onboardingAutoSave(token, gefiltert, fortschritt, aktuelleSektionRef.current)
        setAutoSave(res.ok ? 'saved' : 'error')
      } catch {
        setAutoSave('error')
      }
    }, 2000)
    return () => clearTimeout(handle)
  }, [antworten, token, vorlage, vorschauModus])

  // ── Sektion-Gruppierung der sichtbaren Fragen ──────────────
  // Sektionen mit conditional-bedingten Fragen, die alle versteckt sind,
  // werden komplett ausgeblendet (D22). Auch `ohneSektion` wird leer
  // weggefiltert (kein leerer Header oben).
  const sektionen: OnboardingSektion[] = vorlage.sektionen ?? []
  const ohneSektion = sichtbar.filter((f) => !f.sektion_id)
  const sektionenMitFragen: { sektion: OnboardingSektion; fragen: OnboardingFrage[] }[] = []
  for (const s of sektionen) {
    const fragenS = sichtbar.filter((f) => f.sektion_id === s.id)
    if (fragenS.length > 0) sektionenMitFragen.push({ sektion: s, fragen: fragenS })
  }

  // ── Hilfsfunktion: Pflichtfeld-Status pro Sektion ──────────
  // Beachtet feldtyp-spezifische "leer"-Semantik:
  //  - bewertung: 0 zaehlt als leer (User hat deselected)
  //  - budget_verteilung: Summe muss 100 ergeben
  //  - rangfolge/prioritaeten: explizit gespeichert sein (nicht nur Default-Order)
  function istLeer(f: OnboardingFrage, v: unknown): boolean {
    if (v === undefined || v === null || v === '') return true
    if (Array.isArray(v) && v.length === 0) return true
    if (f.typ === 'bewertung') return Number(v) === 0
    if (f.typ === 'budget_verteilung') {
      const obj = v as Record<string, number>
      const summe = Object.values(obj).reduce((s, n) => s + (Number(n) || 0), 0)
      return summe === 0
    }
    return false
  }

  function pflichtCount(fragen: OnboardingFrage[]): { erfuellt: number; gesamt: number } {
    const pflicht = fragen.filter((f) => f.pflichtfeld)
    const erfuellt = pflicht.filter((f) => !istLeer(f, antworten[f.id])).length
    return { erfuellt, gesamt: pflicht.length }
  }

  // ── Heuristik: Adress-Sektionen erkennen + Wohnort uebernehmen ──
  // Eine Sektion gilt als Adress-Sektion, wenn ihre frage-IDs auf
  // 'adresse'/'strasse'/'plz'/'ort' enden bzw. enthalten.
  function adressFragen(fragen: OnboardingFrage[]): { strasse?: OnboardingFrage; plz?: OnboardingFrage; ort?: OnboardingFrage } {
    const r: { strasse?: OnboardingFrage; plz?: OnboardingFrage; ort?: OnboardingFrage } = {}
    for (const f of fragen) {
      const id = f.id.toLowerCase()
      if (!r.strasse && /strasse|straße|str(\b|_)/.test(id)) r.strasse = f
      else if (!r.plz && /(plz|postleit|zip)/.test(id))     r.plz = f
      else if (!r.ort && /(\bort\b|stadt|city|wohnort)/.test(id)) r.ort = f
    }
    return r
  }

  function uebernehmenWohnort(zielFragen: OnboardingFrage[]) {
    // Suche eine andere Sektion, die Adressfelder hat — die erste mit
    // ausgefuellten Werten dient als Quelle.
    for (const grp of sektionenMitFragen) {
      if (grp.fragen === zielFragen) continue
      const q = adressFragen(grp.fragen)
      if (!q.strasse && !q.plz && !q.ort) continue
      const z = adressFragen(zielFragen)
      if (q.strasse && z.strasse && antworten[q.strasse.id]) setAntwort(z.strasse.id, antworten[q.strasse.id])
      if (q.plz && z.plz && antworten[q.plz.id])             setAntwort(z.plz.id, antworten[q.plz.id])
      if (q.ort && z.ort && antworten[q.ort.id])             setAntwort(z.ort.id, antworten[q.ort.id])
      return
    }
  }

  // Eine Sektion zaehlt als 'Adress-Ziel', wenn sie mind. ein Adressfeld
  // enthaelt UND es eine andere Adress-Sektion mit ausgefuelltem Wert gibt.
  function kannWohnortUebernehmen(fragen: OnboardingFrage[]): boolean {
    const z = adressFragen(fragen)
    if (!z.strasse && !z.plz && !z.ort) return false
    for (const grp of sektionenMitFragen) {
      if (grp.fragen === fragen) continue
      const q = adressFragen(grp.fragen)
      const hatWert = (f?: OnboardingFrage) => f && antworten[f.id]
      if (hatWert(q.strasse) || hatWert(q.plz) || hatWert(q.ort)) return true
    }
    return false
  }

  function validieren(): boolean {
    const e: Record<string, string> = {}
    for (const f of sichtbar) {
      const val = antworten[f.id]
      // 1) Pflichtfeld-Check (mit Feldtyp-Semantik)
      if (f.pflichtfeld && istLeer(f, val)) {
        e[f.id] = 'Dieses Feld ist erforderlich.'
        continue
      }
      // 2) Format-Checks (nur wenn Wert ausgefuellt ist)
      if (val === undefined || val === null || val === '') continue
      if (f.typ === 'email' && typeof val === 'string' && !EMAIL_REGEX.test(val)) {
        e[f.id] = 'Bitte eine gueltige E-Mail-Adresse eingeben.'
      } else if (f.typ === 'telefon' && typeof val === 'string' && !TEL_REGEX.test(val)) {
        e[f.id] = 'Telefonnummer ungueltig (Ziffern, +, -, Leerzeichen).'
      } else if (f.typ === 'url' && typeof val === 'string') {
        try { new URL(val) } catch { e[f.id] = 'Bitte eine gueltige URL eingeben (z.B. https://...).' }
      } else if (f.typ === 'budget_verteilung' && typeof val === 'object') {
        const obj = val as Record<string, number>
        const summe = Object.values(obj).reduce((s, n) => s + (Number(n) || 0), 0)
        if (f.pflichtfeld && summe !== 100) {
          e[f.id] = `Summe muss 100 % ergeben (aktuell ${summe} %).`
        }
      }
    }
    setFeldFehler(e)
    // Scroll zum ersten Fehler, damit klar wird was fehlt
    if (Object.keys(e).length > 0) {
      const ersteId = Object.keys(e)[0]
      setTimeout(() => {
        const el = document.getElementById(`frage-${ersteId}`)
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
    }
    return Object.keys(e).length === 0
  }

  // Helper: Stammdaten aus den Antworten extrahieren — wird sowohl
  // im Review-Modal als auch beim wirklichen Submit benutzt, damit
  // beide dieselbe Quelle der Wahrheit haben. Nutzt den geteilten
  // Extraktor, der mit allen Vorlagen-ID-Konventionen (kontakt_*,
  // nk_*, pv_*, projekt_*) klarkommt.
  function stammdatenAusAntworten() {
    const extracted = extrahiereStammdatenAusAntworten(vorlage, antworten)
    return {
      kunde_name:        extracted.kunde_name        ?? null,
      kunde_email:       extracted.kunde_email       ?? null,
      kunde_telefon:     extracted.kunde_telefon     ?? null,
      projekt_name:      extracted.projekt_name      ?? null,
      projekt_adresse:   extracted.projekt_adresse   ?? null,
      raumtypen:         extracted.raumtypen         ?? null,
      budget_min:        extracted.budget_min        ?? null,
      budget_max:        extracted.budget_max        ?? null,
      zeitrahmen:        extracted.zeitrahmen        ?? null,
      stil_praeferenzen: extracted.stil_praeferenzen ?? null,
      notizen:           extracted.notizen           ?? null,
    }
  }

  function oeffneReview() {
    if (!validieren()) {
      setFehlerMsg('Bitte füllen Sie alle markierten Pflichtfelder aus.')
      return
    }
    setFehlerMsg(null)
    setReviewOffen(true)
  }

  function wirklichAbsenden() {
    if (vorschauModus) {
      setFehlerMsg('Vorschau-Modus aktiv — Absenden ist deaktiviert. Entferne ?vorschau=1 aus der URL fuer echtes Absenden.')
      return
    }
    setFehlerMsg(null)
    startTransition(async () => {
      // Antworten auf sichtbare Fragen reduzieren (versteckte Felder
      // sollen nicht persistiert werden — Bug 6 Conditional Logic).
      const gefiltert = antwortenFiltern(vorlage.fragen, antworten)
      const result = await onboardingAbsenden(token, {
        ...stammdatenAusAntworten(),
        antworten: gefiltert,
      })
      if (result.erfolg) {
        setReviewOffen(false)
        setErfolg(true)
      } else {
        setFehlerMsg(result.fehler ?? 'Ein Fehler ist aufgetreten.')
      }
    })
  }

  if (erfolg) return <ErfolgScreen branding={branding} />

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: bg }}>
      {vorschauModus && <VorschauBanner />}
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <BrandLogo branding={branding} firmenname={firmenname} prim={prim} />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-400 leading-none">Projekt-Anfrage · {vorlage.name}</p>
            <p className="text-sm font-semibold font-syne leading-tight truncate" style={{ color: prim }}>{firmenname}</p>
          </div>
          {/* Auto-Save-Indikator */}
          {autoSave !== 'idle' && (
            <span className={`text-[10px] font-medium tabular-nums shrink-0 ${
              autoSave === 'saved' ? 'text-wellbeing-green' :
              autoSave === 'error' ? 'text-red-500' :
              'text-gray-400'
            }`}>
              {autoSave === 'saving' && 'Speichert …'}
              {autoSave === 'saved'  && '✓ Gespeichert'}
              {autoSave === 'error'  && '⚠ Nicht gespeichert'}
            </span>
          )}
        </div>
      </header>

      <div className="flex-1 px-4 py-6">
        <div className="max-w-xl mx-auto space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <div className="mb-1">
              <h2 className="text-lg font-semibold text-gray-900">{vorlage.name}</h2>
              {vorlage.geschaetzte_minuten ? (
                <p className="text-xs text-gray-500 mt-1 inline-flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  Dauert ca. {vorlage.geschaetzte_minuten} Minuten
                </p>
              ) : null}
              {vorlage.beschreibung && (
                <p className="text-sm text-gray-500 mt-0.5">{vorlage.beschreibung}</p>
              )}
            </div>

            {/* Fragen OHNE Sektion zuerst */}
            {ohneSektion.map((frage) => (
              <div key={frage.id} id={`frage-${frage.id}`}>
                <DynamischesFeld
                  token={token}
                  frage={frage}
                  wert={antworten[frage.id]}
                  fehler={feldFehler[frage.id]}
                  onChange={(v) => setAntwort(frage.id, v)}
                  onToggle={(opt) => toggleOption(frage.id, opt, frage.typ === 'mehrfachauswahl')}
                />
              </div>
            ))}
          </div>

          {/* Fragen MIT Sektion gruppiert — jede Sektion als eigene Card */}
          {sektionenMitFragen.map(({ sektion, fragen }) => {
            const counter = pflichtCount(fragen)
            const adressOk = kannWohnortUebernehmen(fragen)
            return (
              <div
                key={sektion.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5"
              >
                <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-gray-900">{sektion.name}</h3>
                    {sektion.beschreibung && (
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{sektion.beschreibung}</p>
                    )}
                  </div>
                  {counter.gesamt > 0 && (
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 tabular-nums ${
                        counter.erfuellt === counter.gesamt
                          ? 'bg-wellbeing-green/10 text-wellbeing-green'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {counter.erfuellt}/{counter.gesamt} ausgefüllt
                    </span>
                  )}
                </div>

                {adressOk && (
                  <button
                    type="button"
                    onClick={() => uebernehmenWohnort(fragen)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-wellbeing-green border border-wellbeing-green/30 hover:bg-wellbeing-green/5 rounded-lg transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    Wohnort-Adresse uebernehmen
                  </button>
                )}

                {fragen.map((frage) => (
                  <div key={frage.id} id={`frage-${frage.id}`}>
                    <DynamischesFeld
                      token={token}
                      frage={frage}
                      wert={antworten[frage.id]}
                      fehler={feldFehler[frage.id]}
                      onChange={(v) => setAntwort(frage.id, v)}
                      onToggle={(opt) => toggleOption(frage.id, opt, frage.typ === 'mehrfachauswahl')}
                    />
                  </div>
                ))}
              </div>
            )
          })}

          {fehlerMsg && (
            <p className="text-sm text-red-600 text-center bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {fehlerMsg}
            </p>
          )}

          <button
            onClick={oeffneReview}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-white bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 rounded-xl transition-colors"
          >
            Anfrage absenden <Check className="w-4 h-4" />
          </button>
        </div>
      </div>

      {reviewOffen && (
        <OnboardingReviewModal
          vorlage={vorlage}
          antworten={antwortenFiltern(vorlage.fragen, antworten)}
          stammdaten={stammdatenAusAntworten()}
          branding={branding ?? null}
          isPending={isPending}
          fehler={fehlerMsg}
          onZurueck={() => {
            setReviewOffen(false)
            if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          onAbsenden={wirklichAbsenden}
        />
      )}
    </div>
  )
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

        <FormFeld label="Telefon (optional)" fehler={fehler.kunde_telefon}>
          <input
            type="tel"
            autoComplete="tel"
            placeholder="+49 ..."
            value={daten.kunde_telefon}
            onChange={(e) => onChange('kunde_telefon', e.target.value)}
            className={inputCls(!!fehler.kunde_telefon)}
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
function ErfolgScreen({ branding }: { branding?: Branding | null }) {
  const bg   = branding?.background_color ?? '#f6ede2'
  const prim = branding?.primary_color    ?? '#445c49'
  const name = branding?.firmenname       ?? 'Wellbeing Spaces'
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: bg }}>
      <div className="max-w-sm w-full text-center">
        {branding?.logo_url ? (
          <Image src={branding.logo_url} alt={name} width={28} height={28} className="rounded object-contain mx-auto mb-8" />
        ) : (
          <svg width="22" height="22" viewBox="0 0 18 18" fill="none" className="mx-auto mb-8">
            <rect x="0" y="0" width="10" height="10" rx="2" fill={prim} opacity="0.30" />
            <rect x="4" y="4" width="10" height="10" rx="2" fill={prim} opacity="0.55" />
            <rect x="8" y="8" width="10" height="10" rx="2" fill={prim} />
          </svg>
        )}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: `${prim}1a` }}>
            <CheckCircle2 className="w-8 h-8" style={{ color: prim }} />
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
        {(branding?.show_powered_by ?? true) && (
          <p className="text-[10px] text-gray-300 mt-3">Powered by Wellbeing Spaces</p>
        )}
      </div>
    </div>
  )
}


// ── Helper: Vorschau-Banner ───────────────────────────────────
// Sichtbar wenn ?vorschau=1 in der URL — verhindert Verwechslung mit
// echtem Kunden-Modus und kommuniziert dass Absenden deaktiviert ist.
function VorschauBanner() {
  return (
    <div className="bg-amber-100 border-b border-amber-200 px-4 py-2.5 text-center text-xs font-semibold text-amber-900">
      ⚙ Vorschau-Modus — Eingaben werden nicht gespeichert und nicht abgesendet.
    </div>
  )
}

// ── Helper: Branding-Logo mit Fallback ────────────────────────
// Wenn logo_url 404 ist oder onError feuert, wird auf den DepthStack-SVG
// zurueckgefallen — verhindert dass der Header visuell bricht.
function BrandLogo({
  branding, firmenname, prim, size = 24,
}: {
  branding: Branding | null | undefined
  firmenname: string
  prim: string
  size?: number
}) {
  const [fehlt, setFehlt] = useState(false)
  if (!branding?.logo_url || fehlt) {
    return (
      <svg width={size - 2} height={size - 2} viewBox="0 0 18 18" fill="none" className="shrink-0">
        <rect x="0" y="0" width="10" height="10" rx="2" fill={prim} opacity="0.30" />
        <rect x="4" y="4" width="10" height="10" rx="2" fill={prim} opacity="0.55" />
        <rect x="8" y="8" width="10" height="10" rx="2" fill={prim} />
      </svg>
    )
  }
  return (
    <Image
      src={branding.logo_url}
      alt={firmenname}
      width={size}
      height={size}
      className="rounded object-contain shrink-0"
      onError={() => setFehlt(true)}
    />
  )
}
