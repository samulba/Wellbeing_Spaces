'use client'

import { useState, useRef, useEffect, useTransition, type ReactNode } from 'react'
import {
  Plus, Trash2, Edit2, Check, X, GripVertical,
  ChevronDown, ChevronUp, Star, Eye, Copy, MoreHorizontal,
  Type, AlignLeft, Mail, Phone, Globe, Hash, Calendar,
  Sliders, List, CheckSquare, ToggleLeft, FolderPlus,
  Upload, Package, BarChart2, Layers, Clock, Users,
  ClipboardList, ArrowUpDown, GitBranch, Palette, Link,
  Euro, Sparkles,
} from 'lucide-react'
import {
  vorlageLoeschen,
} from '@/app/actions/onboarding'
import {
  vorlageErstellenV2, vorlageAktualisierenV2,
} from '@/app/actions/onboarding-erweitert'
import { standardOnboardingVorlagenErstellenAction } from '@/app/actions/vorlagen-seed'
import type {
  OnboardingVorlage, OnboardingFrage, OnboardingFrageTyp, OnboardingSektion,
  OnboardingBedingtVon, OnboardingTyp,
} from '@/lib/supabase/types'

// ── Typ-Gruppen ───────────────────────────────────────────────

type TypInfo = { wert: OnboardingFrageTyp; label: string; icon: ReactNode }
type FrageGruppe = { label: string; typen: TypInfo[] }

const FRAGE_GRUPPEN: FrageGruppe[] = [
  {
    label: 'Text',
    typen: [
      { wert: 'text',     label: 'Kurztext',    icon: <Type className="w-3.5 h-3.5" /> },
      { wert: 'textarea', label: 'Langer Text',  icon: <AlignLeft className="w-3.5 h-3.5" /> },
      { wert: 'email',    label: 'E-Mail',       icon: <Mail className="w-3.5 h-3.5" /> },
      { wert: 'telefon',  label: 'Telefon',      icon: <Phone className="w-3.5 h-3.5" /> },
      { wert: 'url',        label: 'Website (eine URL)',  icon: <Globe className="w-3.5 h-3.5" /> },
      { wert: 'link_liste', label: 'Mehrere Links',       icon: <Link className="w-3.5 h-3.5" /> },
    ],
  },
  {
    label: 'Auswahl',
    typen: [
      { wert: 'auswahl',         label: 'Einfachauswahl',  icon: <List className="w-3.5 h-3.5" /> },
      { wert: 'mehrfachauswahl', label: 'Mehrfachauswahl', icon: <CheckSquare className="w-3.5 h-3.5" /> },
      { wert: 'ja_nein',         label: 'Ja / Nein',       icon: <ToggleLeft className="w-3.5 h-3.5" /> },
      { wert: 'rangfolge',       label: 'Rangfolge / Sortierung', icon: <ArrowUpDown className="w-3.5 h-3.5" /> },
    ],
  },
  {
    label: 'Zahlen & Schieberegler',
    typen: [
      { wert: 'zahl',               label: 'Zahl',              icon: <Hash className="w-3.5 h-3.5" /> },
      { wert: 'datum',              label: 'Datum',             icon: <Calendar className="w-3.5 h-3.5" /> },
      { wert: 'bewertung',          label: 'Bewertung ★',       icon: <Star className="w-3.5 h-3.5" /> },
      { wert: 'skala',              label: 'Skala 1–10',        icon: <Sliders className="w-3.5 h-3.5" /> },
      { wert: 'slider',             label: 'Schieberegler',     icon: <BarChart2 className="w-3.5 h-3.5" /> },
      { wert: 'budget_verteilung',  label: 'Budget verteilen',  icon: <Euro className="w-3.5 h-3.5" /> },
    ],
  },
  {
    label: 'Spezial',
    typen: [
      { wert: 'upload',             label: 'Datei-Upload',      icon: <Upload className="w-3.5 h-3.5" /> },
      { wert: 'inventar',           label: 'Inventar erfassen', icon: <Package className="w-3.5 h-3.5" /> },
      { wert: 'prioritaeten',       label: 'Prioritäten',       icon: <Layers className="w-3.5 h-3.5" /> },
      { wert: 'checkliste',         label: 'Checkliste',        icon: <ClipboardList className="w-3.5 h-3.5" /> },
      { wert: 'datum_rechner',      label: 'Deadline-Rechner',  icon: <Clock className="w-3.5 h-3.5" /> },
      { wert: 'entscheider_matrix', label: 'Entscheider-Matrix',icon: <Users className="w-3.5 h-3.5" /> },
    ],
  },
]

function alleTypen(): TypInfo[] {
  return FRAGE_GRUPPEN.flatMap((g) => g.typen)
}
function typLabel(typ: OnboardingFrageTyp): string {
  return alleTypen().find((t) => t.wert === typ)?.label ?? typ
}
function typIcon(typ: OnboardingFrageTyp): ReactNode {
  return alleTypen().find((t) => t.wert === typ)?.icon ?? null
}

// ── Beispiel-Vorlagen ─────────────────────────────────────────

type BeispielVorlage = {
  emoji: string
  name: string
  beschreibung: string
  sektionen: OnboardingSektion[]
  fragen: Omit<OnboardingFrage, 'id'>[]
}

const BEISPIEL_VORLAGEN: BeispielVorlage[] = [
  {
    emoji: '🏢',
    name: 'Gewerbe-Kunde',
    beschreibung: 'Für gewerbliche Projekte & Büros',
    sektionen: [
      { id: 'bv-k', name: 'Kontaktdaten' },
      { id: 'bv-p', name: 'Projektdetails' },
    ],
    fragen: [
      { titel: 'Firmenname', typ: 'text', pflichtfeld: true, placeholder: 'Mustermann GmbH', sektion_id: 'bv-k' },
      { titel: 'Ansprechpartner', typ: 'text', pflichtfeld: true, placeholder: 'Max Mustermann', sektion_id: 'bv-k' },
      { titel: 'E-Mail-Adresse', typ: 'email', pflichtfeld: true, sektion_id: 'bv-k' },
      { titel: 'Telefon', typ: 'telefon', pflichtfeld: false, sektion_id: 'bv-k' },
      { titel: 'Projektart', typ: 'auswahl', pflichtfeld: true, optionen: ['Büro', 'Praxis', 'Hotel', 'Restaurant', 'Sonstiges'], sektion_id: 'bv-p' },
      { titel: 'Gewünschte Räume', typ: 'mehrfachauswahl', pflichtfeld: false, optionen: ['Empfang', 'Büros', 'Konferenzraum', 'Küche', 'Sanitär'], sektion_id: 'bv-p' },
      { titel: 'Budget', typ: 'auswahl', pflichtfeld: false, optionen: ['bis 50.000 €', '50.000 – 150.000 €', '150.000 – 300.000 €', 'über 300.000 €'], sektion_id: 'bv-p' },
      { titel: 'Fertigstellungstermin', typ: 'datum', pflichtfeld: false, sektion_id: 'bv-p' },
      { titel: 'Besondere Anforderungen', typ: 'textarea', pflichtfeld: false, placeholder: 'Barrierefreiheit, spezielle Materialien…', sektion_id: 'bv-p' },
    ],
  },
  {
    emoji: '🏠',
    name: 'Privat-Kunde',
    beschreibung: 'Für private Wohn- und Renovierungsprojekte',
    sektionen: [
      { id: 'bv-k', name: 'Kontaktdaten' },
      { id: 'bv-w', name: 'Wohnsituation & Wünsche' },
    ],
    fragen: [
      { titel: 'Vollständiger Name', typ: 'text', pflichtfeld: true, sektion_id: 'bv-k' },
      { titel: 'E-Mail-Adresse', typ: 'email', pflichtfeld: true, sektion_id: 'bv-k' },
      { titel: 'Telefonnummer', typ: 'telefon', pflichtfeld: false, sektion_id: 'bv-k' },
      { titel: 'Adresse des Projekts', typ: 'text', pflichtfeld: false, sektion_id: 'bv-w' },
      { titel: 'Zu gestaltende Räume', typ: 'mehrfachauswahl', pflichtfeld: false, optionen: ['Wohnzimmer', 'Schlafzimmer', 'Küche', 'Bad', 'Kinderzimmer', 'Arbeitszimmer'], sektion_id: 'bv-w' },
      { titel: 'Stil-Präferenzen', typ: 'mehrfachauswahl', pflichtfeld: false, optionen: ['Modern', 'Skandinavisch', 'Klassisch', 'Industriell', 'Natürlich/Biophilic'], sektion_id: 'bv-w' },
      { titel: 'Budget', typ: 'auswahl', pflichtfeld: false, optionen: ['bis 20.000 €', '20.000 – 50.000 €', '50.000 – 100.000 €', 'über 100.000 €'], sektion_id: 'bv-w' },
      { titel: 'Zeitrahmen', typ: 'auswahl', pflichtfeld: false, optionen: ['So bald wie möglich', 'In 3 Monaten', 'In 6 Monaten', 'In 1 Jahr+'], sektion_id: 'bv-w' },
      { titel: 'Besondere Wünsche', typ: 'textarea', pflichtfeld: false, sektion_id: 'bv-w' },
    ],
  },
  {
    emoji: '🏨',
    name: 'Hotel-Projekt',
    beschreibung: 'Für Hotels, Resorts und Gastgewerbe',
    sektionen: [
      { id: 'bv-h', name: 'Hotelinformationen' },
      { id: 'bv-a', name: 'Ausstattung & Umfang' },
    ],
    fragen: [
      { titel: 'Hotel-Name', typ: 'text', pflichtfeld: true, sektion_id: 'bv-h' },
      { titel: 'Sterne-Kategorie', typ: 'auswahl', pflichtfeld: false, optionen: ['3 Sterne', '4 Sterne', '5 Sterne', 'Boutique-Hotel'], sektion_id: 'bv-h' },
      { titel: 'Ansprechpartner', typ: 'text', pflichtfeld: true, sektion_id: 'bv-h' },
      { titel: 'E-Mail', typ: 'email', pflichtfeld: true, sektion_id: 'bv-h' },
      { titel: 'Telefon', typ: 'telefon', pflichtfeld: false, sektion_id: 'bv-h' },
      { titel: 'Zu gestaltende Bereiche', typ: 'mehrfachauswahl', pflichtfeld: false, optionen: ['Zimmer', 'Lobby', 'Restaurant', 'Bar', 'Spa', 'Konferenzräume', 'Außenbereich'], sektion_id: 'bv-a' },
      { titel: 'Anzahl Zimmer', typ: 'zahl', pflichtfeld: false, sektion_id: 'bv-a' },
      { titel: 'Budget', typ: 'auswahl', pflichtfeld: false, optionen: ['bis 500.000 €', '500k – 1 Mio €', '1 – 3 Mio €', 'über 3 Mio €'], sektion_id: 'bv-a' },
      { titel: 'Fertigstellungstermin', typ: 'datum', pflichtfeld: false, sektion_id: 'bv-a' },
      { titel: 'Besondere Anforderungen', typ: 'textarea', pflichtfeld: false, sektion_id: 'bv-a' },
    ],
  },
]

// ── Hilfsfunktionen ───────────────────────────────────────────

function neueFrage(sektionId?: string): OnboardingFrage {
  return {
    id: crypto.randomUUID(),
    titel: '',
    typ: 'text',
    pflichtfeld: false,
    placeholder: '',
    optionen: [],
    sektion_id: sektionId,
  }
}

function neueSektion(): OnboardingSektion {
  return { id: crypto.randomUUID(), name: 'Neue Sektion' }
}

// ── OptionenEditor (Tag-Input) ────────────────────────────────

function OptionenEditor({
  optionen,
  onChange,
}: {
  optionen: string[]
  onChange: (opts: string[]) => void
}) {
  const [inputWert, setInputWert] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function addOption(wert: string) {
    const trimmed = wert.trim()
    if (trimmed && !optionen.includes(trimmed)) {
      onChange([...optionen, trimmed])
    }
    setInputWert('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addOption(inputWert)
    } else if (e.key === 'Backspace' && !inputWert && optionen.length > 0) {
      onChange(optionen.slice(0, -1))
    }
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">Optionen</label>
      <div
        className="min-h-[42px] w-full px-2 py-1.5 border border-gray-200 rounded-lg bg-gray-50 flex flex-wrap gap-1.5 cursor-text focus-within:ring-2 focus-within:ring-wellbeing-green/20 focus-within:border-wellbeing-green-light"
        onClick={() => inputRef.current?.focus()}
      >
        {optionen.map((opt, i) => (
          <span
            key={`${i}-${opt}`}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-wellbeing-green/10 text-wellbeing-green-dark rounded-full"
          >
            {opt}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onChange(optionen.filter((_, j) => j !== i))
              }}
              className="text-wellbeing-green/60 hover:text-wellbeing-green-dark"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputWert}
          onChange={(e) => setInputWert(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (inputWert.trim()) addOption(inputWert) }}
          placeholder={optionen.length === 0 ? 'Option eingeben, Enter zum Hinzufügen…' : ''}
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder-gray-400 py-0.5"
        />
      </div>
      <p className="text-[10px] text-gray-400 mt-1">Enter oder Komma zum Hinzufügen · Backspace zum Entfernen</p>
    </div>
  )
}

// ── TypDropdown (Grouped) ─────────────────────────────────────

function TypDropdown({
  wert,
  onChange,
}: {
  wert: OnboardingFrageTyp
  onChange: (typ: OnboardingFrageTyp) => void
}) {
  const [offen, setOffen] = useState(false)
  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const aktuellerTyp = alleTypen().find((t) => t.wert === wert)

  useEffect(() => {
    if (!offen) return
    function update() {
      if (!btnRef.current) return
      const r = btnRef.current.getBoundingClientRect()
      setDropPos({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [offen])

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">Typ</label>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOffen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 hover:border-gray-300 transition-colors text-left"
      >
        <span className="text-gray-500">{aktuellerTyp?.icon}</span>
        <span className="flex-1 text-gray-700">{aktuellerTyp?.label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      </button>

      {offen && dropPos && (
        <>
          <div className="fixed inset-0 z-[110]" onClick={() => setOffen(false)} />
          <div
            className="fixed z-[120] bg-white border border-gray-200 rounded-xl shadow-lg overflow-y-auto max-h-72"
            style={{ top: dropPos.top, left: dropPos.left, width: dropPos.width }}
          >
            {FRAGE_GRUPPEN.map((gruppe) => (
              <div key={gruppe.label}>
                <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
                  {gruppe.label}
                </p>
                {gruppe.typen.map((typ) => (
                  <button
                    key={typ.wert}
                    type="button"
                    onClick={() => { onChange(typ.wert); setOffen(false) }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left ${
                      typ.wert === wert
                        ? 'bg-wellbeing-green/10 text-wellbeing-green-dark'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className={typ.wert === wert ? 'text-wellbeing-green' : 'text-gray-400'}>
                      {typ.icon}
                    </span>
                    {typ.label}
                    {typ.wert === wert && <Check className="w-3.5 h-3.5 ml-auto text-wellbeing-green" />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── FrageEditor ───────────────────────────────────────────────

function ConditionalLogicEditor({
  frage,
  alleFragen,
  onChange,
}: {
  frage: OnboardingFrage
  alleFragen: OnboardingFrage[]
  onChange: (f: OnboardingFrage) => void
}) {
  const [offen, setOffen] = useState(!!frage.bedingt_von)
  const quellFragen = alleFragen.filter((f) => f.id !== frage.id && ['auswahl','mehrfachauswahl','ja_nein','text'].includes(f.typ))

  if (!offen) {
    return (
      <button
        type="button"
        onClick={() => setOffen(true)}
        className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-wellbeing-green transition-colors"
      >
        <GitBranch className="w-3 h-3" />
        Conditional Logic hinzufügen
      </button>
    )
  }

  function updateLogic(partial: Partial<OnboardingBedingtVon>) {
    const current = frage.bedingt_von ?? { frage_id: '', operator: 'gleich' as const, wert: '' }
    onChange({ ...frage, bedingt_von: { ...current, ...partial } })
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-amber-700 flex items-center gap-1.5">
          <GitBranch className="w-3 h-3" /> Conditional Logic
        </p>
        <button
          type="button"
          onClick={() => { setOffen(false); onChange({ ...frage, bedingt_von: undefined }) }}
          className="text-amber-400 hover:text-amber-600"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-[10px] text-amber-600">Dieses Feld nur zeigen, wenn:</p>
      <div className="grid grid-cols-3 gap-2">
        <select
          value={frage.bedingt_von?.frage_id ?? ''}
          onChange={(e) => updateLogic({ frage_id: e.target.value })}
          className="col-span-1 px-2 py-1.5 text-xs border border-amber-200 rounded-lg bg-white focus:outline-none"
        >
          <option value="">Frage wählen…</option>
          {quellFragen.map((q) => (
            <option key={q.id} value={q.id}>{q.titel || `Frage ${alleFragen.indexOf(q) + 1}`}</option>
          ))}
        </select>
        <select
          value={frage.bedingt_von?.operator ?? 'gleich'}
          onChange={(e) => updateLogic({ operator: e.target.value as OnboardingBedingtVon['operator'] })}
          className="px-2 py-1.5 text-xs border border-amber-200 rounded-lg bg-white focus:outline-none"
        >
          <option value="gleich">ist gleich</option>
          <option value="nicht_gleich">ist nicht</option>
          <option value="enthaelt">enthält</option>
          <option value="nicht_leer">ist ausgefüllt</option>
          <option value="ist_leer">ist leer</option>
        </select>
        {frage.bedingt_von?.operator !== 'nicht_leer' && frage.bedingt_von?.operator !== 'ist_leer' && (
          <input
            type="text"
            placeholder="Wert…"
            value={frage.bedingt_von?.wert ?? ''}
            onChange={(e) => updateLogic({ wert: e.target.value })}
            className="px-2 py-1.5 text-xs border border-amber-200 rounded-lg bg-white focus:outline-none"
          />
        )}
      </div>
    </div>
  )
}

function FrageEditor({
  frage,
  index,
  total,
  alleFragen,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: {
  frage: OnboardingFrage
  index: number
  total: number
  alleFragen: OnboardingFrage[]
  onChange: (f: OnboardingFrage) => void
  onDelete: () => void
  onDuplicate: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [menuOffen, setMenuOffen] = useState(false)
  const hatOptionen = frage.typ === 'auswahl' || frage.typ === 'mehrfachauswahl' || frage.typ === 'rangfolge' || frage.typ === 'checkliste' || frage.typ === 'prioritaeten'
  const hatPlaceholder = ['text', 'textarea', 'email', 'telefon', 'url', 'zahl'].includes(frage.typ)
  const hatSlider = frage.typ === 'slider' || frage.typ === 'skala'
  const hatUpload = frage.typ === 'upload'
  const hatBudget = frage.typ === 'budget_verteilung'

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-b border-gray-100">
        <div className="flex flex-col gap-0.5">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="text-gray-300 hover:text-gray-500 disabled:opacity-30 transition-colors leading-none"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="text-gray-300 hover:text-gray-500 disabled:opacity-30 transition-colors leading-none"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
        <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
        <span className="text-xs font-semibold text-gray-400 shrink-0">#{index + 1}</span>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-gray-400 shrink-0">{typIcon(frage.typ)}</span>
          <p className="text-sm text-gray-700 truncate">
            {frage.titel || <span className="italic text-gray-400">Neues Feld</span>}
          </p>
        </div>
        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0 hidden sm:inline">
          {typLabel(frage.typ)}
        </span>
        {frage.pflichtfeld && (
          <span className="text-[10px] text-red-400 font-semibold shrink-0">*</span>
        )}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {/* ⋮ Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOffen((o) => !o)}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {menuOffen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOffen(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[140px]">
                <button
                  onClick={() => { onDuplicate(); setMenuOffen(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Duplizieren
                </button>
                <button
                  onClick={() => { onDelete(); setMenuOffen(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Löschen
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Frage / Label</label>
              <input
                type="text"
                placeholder="z. B. Wie heißen Sie?"
                value={frage.titel}
                onChange={(e) => onChange({ ...frage, titel: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light"
              />
            </div>
            <TypDropdown
              wert={frage.typ}
              onChange={(typ) => onChange({ ...frage, typ, optionen: [] })}
            />
          </div>

          {/* Beschreibung/Hilfetext */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Hilfetext (optional)</label>
            <input
              type="text"
              placeholder="Erklärender Text unter dem Label…"
              value={frage.beschreibung ?? ''}
              onChange={(e) => onChange({ ...frage, beschreibung: e.target.value || undefined })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light"
            />
          </div>

          {hatPlaceholder && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Platzhalter (optional)</label>
              <input
                type="text"
                placeholder="Beispiel-Eingabe…"
                value={frage.placeholder ?? ''}
                onChange={(e) => onChange({ ...frage, placeholder: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light"
              />
            </div>
          )}

          {hatOptionen && (
            <>
              <OptionenEditor
                optionen={frage.optionen ?? []}
                onChange={(opts) => onChange({ ...frage, optionen: opts })}
              />
              {frage.typ === 'mehrfachauswahl' && (
                <div className="flex items-center gap-3">
                  <label className="text-xs text-gray-600 shrink-0">Max. Auswahl:</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="unbegrenzt"
                    value={frage.max_auswahl ?? ''}
                    onChange={(e) => onChange({ ...frage, max_auswahl: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-24 px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none"
                  />
                </div>
              )}
            </>
          )}

          {/* Slider-Konfiguration */}
          {hatSlider && frage.typ === 'slider' && (
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Min</label>
                <input type="number" value={frage.slider_min ?? 0} onChange={(e) => onChange({ ...frage, slider_min: Number(e.target.value) })}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Max</label>
                <input type="number" value={frage.slider_max ?? 100} onChange={(e) => onChange({ ...frage, slider_max: Number(e.target.value) })}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Schritt</label>
                <input type="number" value={frage.slider_schritt ?? 1} onChange={(e) => onChange({ ...frage, slider_schritt: Number(e.target.value) })}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Einheit</label>
                <input type="text" placeholder="€" value={frage.slider_einheit ?? ''} onChange={(e) => onChange({ ...frage, slider_einheit: e.target.value || undefined })}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none" />
              </div>
            </div>
          )}

          {/* Upload-Konfiguration */}
          {hatUpload && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Dateitypen (leer = Bilder + PDF)</label>
                <input type="text" placeholder="image/*, application/pdf"
                  value={(frage.upload_typen ?? []).join(', ')}
                  onChange={(e) => onChange({ ...frage, upload_typen: e.target.value ? e.target.value.split(',').map(s => s.trim()) : undefined })}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Max. Größe (MB)</label>
                <input type="number" min="1" max="50" placeholder="50"
                  value={frage.upload_max_mb ?? ''}
                  onChange={(e) => onChange({ ...frage, upload_max_mb: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Max. Anzahl Dateien</label>
                <input type="number" min="1" max="20" placeholder="5"
                  value={frage.upload_max_dateien ?? ''}
                  onChange={(e) => onChange({ ...frage, upload_max_dateien: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none" />
              </div>
            </div>
          )}

          {/* Budget-Verteilung Kategorien */}
          {hatBudget && (
            <OptionenEditor
              optionen={frage.budget_kategorien ?? []}
              onChange={(opts) => onChange({ ...frage, budget_kategorien: opts })}
            />
          )}

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={frage.pflichtfeld}
                onChange={(e) => onChange({ ...frage, pflichtfeld: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-wellbeing-green focus:ring-wellbeing-green/20"
              />
              <span className="text-xs text-gray-600">Pflichtfeld</span>
            </label>
            <ConditionalLogicEditor
              frage={frage}
              alleFragen={alleFragen}
              onChange={onChange}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── SektionsBlock ─────────────────────────────────────────────

function SektionsBlock({
  sektion,
  sektionsIndex,
  sektionsTotal,
  fragen,
  alleFragen,
  onRename,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAddFrage,
  onUpdateFrage,
  onDeleteFrage,
  onDuplicateFrage,
  onMoveFrageUp,
  onMoveFrageDown,
}: {
  sektion: OnboardingSektion
  sektionsIndex: number
  sektionsTotal: number
  fragen: OnboardingFrage[]
  alleFragen: OnboardingFrage[]
  onRename: (name: string) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onAddFrage: () => void
  onUpdateFrage: (id: string, f: OnboardingFrage) => void
  onDeleteFrage: (id: string) => void
  onDuplicateFrage: (id: string) => void
  onMoveFrageUp: (id: string) => void
  onMoveFrageDown: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(sektion.name)

  function saveRename() {
    if (nameInput.trim()) onRename(nameInput.trim())
    setEditingName(false)
  }

  return (
    <div className="border-2 border-wellbeing-green/20 rounded-xl overflow-hidden bg-wellbeing-green/[0.03]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex flex-col gap-0.5">
          <button
            onClick={onMoveUp}
            disabled={sektionsIndex === 0}
            className="text-gray-300 hover:text-gray-500 disabled:opacity-30 transition-colors leading-none"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={sektionsIndex === sektionsTotal - 1}
            className="text-gray-300 hover:text-gray-500 disabled:opacity-30 transition-colors leading-none"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {editingName ? (
          <input
            autoFocus
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={saveRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveRename()
              if (e.key === 'Escape') setEditingName(false)
            }}
            className="flex-1 px-2 py-1 text-sm font-semibold border border-wellbeing-green/40 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20"
          />
        ) : (
          <button
            className="flex-1 text-left text-sm font-semibold text-wellbeing-green-dark"
            onDoubleClick={() => setEditingName(true)}
          >
            {sektion.name}
          </button>
        )}

        <span className="text-xs text-gray-400 shrink-0">{fragen.length} Fragen</span>
        <button
          onClick={() => setEditingName(true)}
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-wellbeing-green transition-colors"
          title="Umbenennen"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="w-6 h-6 flex items-center justify-center text-red-300 hover:text-red-500 transition-colors"
          title="Sektion löschen"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {fragen.map((f, i) => (
            <FrageEditor
              key={f.id}
              frage={f}
              index={i}
              total={fragen.length}
              alleFragen={alleFragen}
              onChange={(updated) => onUpdateFrage(f.id, updated)}
              onDelete={() => onDeleteFrage(f.id)}
              onDuplicate={() => onDuplicateFrage(f.id)}
              onMoveUp={() => onMoveFrageUp(f.id)}
              onMoveDown={() => onMoveFrageDown(f.id)}
            />
          ))}
          <button
            onClick={onAddFrage}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-wellbeing-green border border-dashed border-wellbeing-green/40 hover:border-wellbeing-green/70 rounded-xl transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Frage in dieser Sektion
          </button>
        </div>
      )}
    </div>
  )
}

// ── VorschauModal ─────────────────────────────────────────────

function VorschauFeld({ frage }: { frage: OnboardingFrage }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-800">
        {frage.titel || <span className="italic text-gray-400">Unbenannte Frage</span>}
        {frage.pflichtfeld && <span className="text-red-500 ml-1">*</span>}
      </label>
      {(frage.typ === 'text' || frage.typ === 'email' || frage.typ === 'telefon' || frage.typ === 'url') && (
        <input
          type={frage.typ === 'email' ? 'email' : frage.typ === 'telefon' ? 'tel' : frage.typ === 'url' ? 'url' : 'text'}
          placeholder={frage.placeholder ?? (frage.typ === 'email' ? 'name@beispiel.de' : frage.typ === 'telefon' ? '+49 123 456789' : frage.typ === 'url' ? 'https://www.beispiel.de' : '')}
          disabled
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400"
        />
      )}
      {frage.typ === 'textarea' && (
        <textarea
          rows={3}
          placeholder={frage.placeholder}
          disabled
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400 resize-none"
        />
      )}
      {frage.typ === 'zahl' && (
        <input type="number" placeholder={frage.placeholder ?? '0'} disabled className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400" />
      )}
      {frage.typ === 'datum' && (
        <input type="date" disabled className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400" />
      )}
      {frage.typ === 'auswahl' && (
        <div className="space-y-1.5">
          {(frage.optionen ?? []).map((opt, i) => (
            <label key={i} className="flex items-center gap-2 text-sm text-gray-600 cursor-default">
              <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
              {opt}
            </label>
          ))}
          {!frage.optionen?.length && <p className="text-xs text-gray-400 italic">Noch keine Optionen definiert</p>}
        </div>
      )}
      {frage.typ === 'mehrfachauswahl' && (
        <div className="space-y-1.5">
          {(frage.optionen ?? []).map((opt, i) => (
            <label key={i} className="flex items-center gap-2 text-sm text-gray-600 cursor-default">
              <div className="w-4 h-4 rounded border border-gray-300 shrink-0" />
              {opt}
            </label>
          ))}
          {!frage.optionen?.length && <p className="text-xs text-gray-400 italic">Noch keine Optionen definiert</p>}
        </div>
      )}
      {frage.typ === 'ja_nein' && (
        <div className="flex gap-4">
          {['Ja', 'Nein'].map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm text-gray-600 cursor-default">
              <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
              {opt}
            </label>
          ))}
        </div>
      )}
      {frage.typ === 'bewertung' && (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} className="w-6 h-6 text-gray-300" />
          ))}
        </div>
      )}
      {frage.typ === 'skala' && (
        <div className="space-y-1">
          <input type="range" min="1" max="10" defaultValue="5" disabled className="w-full" />
          <div className="flex justify-between text-xs text-gray-400">
            <span>1</span>
            <span>10</span>
          </div>
        </div>
      )}
      {frage.typ === 'slider' && (
        <div className="space-y-1">
          <input type="range" min={frage.slider_min ?? 0} max={frage.slider_max ?? 100} defaultValue={(frage.slider_min ?? 0)} disabled className="w-full" />
          <div className="flex justify-between text-xs text-gray-400">
            <span>{frage.slider_min ?? 0}{frage.slider_einheit}</span>
            <span>{frage.slider_max ?? 100}{frage.slider_einheit}</span>
          </div>
        </div>
      )}
      {frage.typ === 'rangfolge' && (
        <div className="space-y-1.5">
          {(frage.optionen ?? []).map((opt, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 cursor-default">
              <span className="text-xs font-bold text-gray-300 w-4">{i + 1}.</span>
              {opt}
            </div>
          ))}
          {!frage.optionen?.length && <p className="text-xs text-gray-400 italic">Noch keine Optionen definiert</p>}
        </div>
      )}
      {frage.typ === 'upload' && (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center bg-gray-50">
          <Upload className="w-6 h-6 text-gray-300 mx-auto mb-1" />
          <p className="text-xs text-gray-400">Datei hochladen{frage.upload_typen?.length ? ` (${frage.upload_typen.join(', ')})` : ''}</p>
        </div>
      )}
      {frage.typ === 'inventar' && (
        <div className="border border-gray-200 rounded-xl p-3 text-center bg-gray-50">
          <Package className="w-5 h-5 text-gray-300 mx-auto mb-1" />
          <p className="text-xs text-gray-400">Bestandserfassung – Fotos + behalten/ersetzen</p>
        </div>
      )}
      {frage.typ === 'prioritaeten' && (
        <div className="space-y-1.5">
          {(frage.optionen ?? ['Option A', 'Option B', 'Option C']).map((opt, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 cursor-default">
              <Layers className="w-3.5 h-3.5 text-gray-300" />
              {opt}
            </div>
          ))}
        </div>
      )}
      {frage.typ === 'checkliste' && (
        <div className="space-y-1.5">
          {(frage.optionen ?? ['Punkt 1', 'Punkt 2']).map((opt, i) => (
            <label key={i} className="flex items-center gap-2 text-sm text-gray-600 cursor-default">
              <div className="w-4 h-4 rounded border border-gray-300 shrink-0" />
              {opt}
            </label>
          ))}
        </div>
      )}
      {frage.typ === 'budget_verteilung' && (
        <div className="space-y-2">
          {(frage.budget_kategorien ?? ['Wohnzimmer', 'Schlafzimmer']).map((kat, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-gray-600 w-24 shrink-0 truncate">{kat}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-wellbeing-green/30 rounded-full" style={{ width: `${100 / (frage.budget_kategorien?.length ?? 2)}%` }} />
              </div>
              <span className="text-xs text-gray-400">0 %</span>
            </div>
          ))}
        </div>
      )}
      {frage.typ === 'datum_rechner' && (
        <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 text-center">
          <Clock className="w-5 h-5 text-gray-300 mx-auto mb-1" />
          <p className="text-xs text-gray-400">Wunschdatum + automatische Deadline-Berechnung</p>
        </div>
      )}
      {frage.typ === 'entscheider_matrix' && (
        <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 text-center">
          <Users className="w-5 h-5 text-gray-300 mx-auto mb-1" />
          <p className="text-xs text-gray-400">Wer entscheidet was? (Rollen-Matrix)</p>
        </div>
      )}
    </div>
  )
}

function VorschauModal({
  name,
  sektionen,
  fragen,
  onClose,
}: {
  name: string
  sektionen: OnboardingSektion[]
  fragen: OnboardingFrage[]
  onClose: () => void
}) {
  const unsektioniert = fragen.filter((f) => !f.sektion_id)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Vorschau: {name || 'Vorlage'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">So sieht der Kunde das Formular</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {unsektioniert.length > 0 && (
            <div className="space-y-5">
              {unsektioniert.map((f) => <VorschauFeld key={f.id} frage={f} />)}
            </div>
          )}
          {sektionen.map((s) => {
            const sf = fragen.filter((f) => f.sektion_id === s.id)
            if (!sf.length) return null
            return (
              <div key={s.id}>
                <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">{s.name}</h3>
                <div className="space-y-5">
                  {sf.map((f) => <VorschauFeld key={f.id} frage={f} />)}
                </div>
              </div>
            )
          })}
          {fragen.length === 0 && (
            <p className="text-sm text-gray-400 italic text-center py-8">Noch keine Fragen vorhanden.</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  )
}

// ── BeispielVorlagenPicker ────────────────────────────────────

function BeispielVorlagenPicker({
  onPick,
}: {
  onPick: (sektionen: OnboardingSektion[], fragen: OnboardingFrage[]) => void
}) {
  return (
    <div className="px-6 py-5 space-y-3">
      <div className="text-center mb-5">
        <p className="text-sm font-semibold text-gray-800">Aus Vorlage starten</p>
        <p className="text-xs text-gray-400 mt-1">Wähle eine Vorlage oder beginne mit einem leeren Formular</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {BEISPIEL_VORLAGEN.map((v) => (
          <button
            key={v.name}
            type="button"
            onClick={() => {
              const idMap: Record<string, string> = {}
              const newSektionen = v.sektionen.map((s) => {
                const newId = crypto.randomUUID()
                idMap[s.id] = newId
                return { id: newId, name: s.name }
              })
              const newFragen = v.fragen.map((f) => ({
                ...f,
                id: crypto.randomUUID(),
                sektion_id: f.sektion_id ? idMap[f.sektion_id] : undefined,
              }))
              onPick(newSektionen, newFragen)
            }}
            className="flex flex-col items-center gap-2 px-4 py-5 border border-gray-200 hover:border-wellbeing-green/50 hover:bg-wellbeing-green/5 rounded-xl transition-all text-center"
          >
            <span className="text-3xl">{v.emoji}</span>
            <span className="text-xs font-semibold text-gray-800">{v.name}</span>
            <span className="text-[10px] text-gray-400 leading-tight">{v.beschreibung}</span>
            <span className="text-[10px] text-wellbeing-green font-medium">{v.fragen.length} Fragen</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onPick([], [neueFrage()])}
        className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-gray-500 border border-dashed border-gray-200 hover:border-gray-300 rounded-xl transition-colors"
      >
        <Plus className="w-4 h-4" />
        Leere Vorlage starten
      </button>
    </div>
  )
}

// ── VorlageEditorModal ────────────────────────────────────────

function VorlageEditorModal({
  vorlage,
  onSave,
  onClose,
}: {
  vorlage: OnboardingVorlage | null
  onSave: (name: string, beschreibung: string, fragen: OnboardingFrage[], sektionen: OnboardingSektion[], extra: Partial<OnboardingVorlage>) => void
  onClose: () => void
}) {
  const [schritt, setSchritt]         = useState<'picker' | 'editor'>(vorlage ? 'editor' : 'picker')
  const [tab, setTab]                 = useState<'felder' | 'einstellungen' | 'whitelabel'>('felder')
  const [name, setName]               = useState(vorlage?.name ?? '')
  const [beschreibung, setBeschreibung] = useState(vorlage?.beschreibung ?? '')
  const [typ, setTyp]                 = useState<OnboardingTyp>(vorlage?.typ ?? 'neukunde')
  const [einleitungText, setEinleitungText] = useState(vorlage?.einleitung_text ?? '')
  const [abschlussText, setAbschlussText]   = useState(vorlage?.abschluss_text ?? '')
  const [akzentFarbe, setAkzentFarbe]       = useState(vorlage?.akzent_farbe ?? '#445c49')
  const [logoUrl, setLogoUrl]               = useState(vorlage?.logo_url ?? '')
  const [emailBetreff, setEmailBetreff]     = useState(vorlage?.email_betreff ?? '')
  const [emailText, setEmailText]           = useState(vorlage?.email_text ?? '')
  const [deadlineTage, setDeadlineTage]     = useState<number | ''>(vorlage?.deadline_tage ?? '')
  const [geschaetzteMinuten, setGeschaetzteMinuten] = useState<number | ''>(vorlage?.geschaetzte_minuten ?? '')
  const [fragen, setFragen]           = useState<OnboardingFrage[]>(vorlage?.fragen ?? [])
  const [sektionen, setSektionen]     = useState<OnboardingSektion[]>(vorlage?.sektionen ?? [])
  const [vorschauOffen, setVorschauOffen] = useState(false)
  const [isPending, startTransition]  = useTransition()

  // ── Fragen-Mutations ──────────────────────────────────────

  function frageHinzufuegen(sektionId?: string) {
    setFragen((fs) => [...fs, neueFrage(sektionId)])
  }

  function frageAktualisieren(id: string, updated: OnboardingFrage) {
    setFragen((fs) => fs.map((f) => (f.id === id ? updated : f)))
  }

  function frageLöschen(id: string) {
    setFragen((fs) => fs.filter((f) => f.id !== id))
  }

  function frageDuplizieren(id: string) {
    setFragen((fs) => {
      const idx = fs.findIndex((f) => f.id === id)
      if (idx === -1) return fs
      const kopie: OnboardingFrage = {
        ...fs[idx],
        id: crypto.randomUUID(),
        titel: fs[idx].titel + ' (Kopie)',
      }
      return [...fs.slice(0, idx + 1), kopie, ...fs.slice(idx + 1)]
    })
  }

  function frageVerschieben(id: string, richtung: -1 | 1, sektionId: string | undefined) {
    setFragen((fs) => {
      const gleicheGruppe = sektionId
        ? fs.filter((f) => f.sektion_id === sektionId)
        : fs.filter((f) => !f.sektion_id)
      const idx = gleicheGruppe.findIndex((f) => f.id === id)
      const zielIdx = idx + richtung
      if (zielIdx < 0 || zielIdx >= gleicheGruppe.length) return fs
      const nachbarId = gleicheGruppe[zielIdx].id
      const posA = fs.findIndex((f) => f.id === id)
      const posB = fs.findIndex((f) => f.id === nachbarId)
      const result = [...fs]
      ;[result[posA], result[posB]] = [result[posB], result[posA]]
      return result
    })
  }

  // ── Sektions-Mutations ────────────────────────────────────

  function sektionHinzufuegen() {
    setSektionen((ss) => [...ss, neueSektion()])
  }

  function sektionUmbenennen(id: string, neuName: string) {
    setSektionen((ss) => ss.map((s) => (s.id === id ? { ...s, name: neuName } : s)))
  }

  function sektionLöschen(id: string) {
    setSektionen((ss) => ss.filter((s) => s.id !== id))
    setFragen((fs) => fs.map((f) => (f.sektion_id === id ? { ...f, sektion_id: undefined } : f)))
  }

  function sektionVerschieben(id: string, richtung: -1 | 1) {
    setSektionen((ss) => {
      const idx = ss.findIndex((s) => s.id === id)
      const ziel = idx + richtung
      if (ziel < 0 || ziel >= ss.length) return ss
      const arr = [...ss]
      const [item] = arr.splice(idx, 1)
      arr.splice(ziel, 0, item)
      return arr
    })
  }

  // ── Save ──────────────────────────────────────────────────

  function handleSave() {
    if (!name.trim()) return
    startTransition(async () => {
      const cleanFragen = fragen.filter((f) => f.titel.trim())
      onSave(name.trim(), beschreibung.trim(), cleanFragen, sektionen, {
        typ,
        einleitung_text: einleitungText || null,
        abschluss_text:  abschlussText  || null,
        akzent_farbe:    akzentFarbe    || null,
        logo_url:        logoUrl        || null,
        email_betreff:   emailBetreff   || null,
        email_text:      emailText      || null,
        deadline_tage:   deadlineTage !== '' ? Number(deadlineTage) : null,
        geschaetzte_minuten: geschaetzteMinuten !== '' ? Number(geschaetzteMinuten) : null,
      })
    })
  }

  const allgemeineFragen = fragen.filter((f) => !f.sektion_id)

  // ── Picker ────────────────────────────────────────────────

  if (schritt === 'picker') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[88vh]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <h2 className="text-base font-semibold text-gray-900">Neue Vorlage erstellen</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            <BeispielVorlagenPicker
              onPick={(newSektionen, newFragen) => {
                setSektionen(newSektionen)
                setFragen(newFragen)
                setSchritt('editor')
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  // ── Editor ────────────────────────────────────────────────

  return (
    <>
      {vorschauOffen && (
        <VorschauModal
          name={name}
          sektionen={sektionen}
          fragen={fragen}
          onClose={() => setVorschauOffen(false)}
        />
      )}

      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[88vh]">

          {/* Fixed Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-3">
              {!vorlage && (
                <button
                  onClick={() => setSchritt('picker')}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Zurück zur Auswahl"
                >
                  <ChevronDown className="w-4 h-4 -rotate-90" />
                </button>
              )}
              <h2 className="text-base font-semibold text-gray-900">
                {vorlage ? 'Vorlage bearbeiten' : 'Neue Vorlage'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setVorschauOffen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 hover:border-gray-300 rounded-lg transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                Vorschau
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 shrink-0 px-6">
            {([['felder', 'Felder'], ['einstellungen', 'Einstellungen'], ['whitelabel', 'White-Label']] as const).map(([t, label]) => (
              <button key={t} type="button" onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${tab === t ? 'border-wellbeing-green text-wellbeing-green' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Scrollable Body */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            {tab === 'felder' && <>
              {/* Meta */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                  <input type="text" autoFocus placeholder="z. B. Gewerbe-Kunden" value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Typ</label>
                  <select value={typ} onChange={(e) => setTyp(e.target.value as OnboardingTyp)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20">
                    <option value="neukunde">Neukunde</option>
                    <option value="projekt">Projekt</option>
                    <option value="universal">Universal</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Beschreibung (optional)</label>
                <input type="text" placeholder="Kurze Beschreibung…" value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light" />
              </div>

              {/* Allgemeine Fragen */}
              {allgemeineFragen.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Allgemeine Fragen</label>
                  {allgemeineFragen.map((f, i) => (
                    <FrageEditor key={f.id} frage={f} index={i} total={allgemeineFragen.length} alleFragen={fragen}
                      onChange={(updated) => frageAktualisieren(f.id, updated)}
                      onDelete={() => frageLöschen(f.id)} onDuplicate={() => frageDuplizieren(f.id)}
                      onMoveUp={() => frageVerschieben(f.id, -1, undefined)} onMoveDown={() => frageVerschieben(f.id, 1, undefined)} />
                  ))}
                </div>
              )}

              {/* Sektionen */}
              {sektionen.length > 0 && (
                <div className="space-y-3">
                  {sektionen.map((s, si) => {
                    const sf = fragen.filter((f) => f.sektion_id === s.id)
                    return (
                      <SektionsBlock key={s.id} sektion={s} sektionsIndex={si} sektionsTotal={sektionen.length}
                        fragen={sf} alleFragen={fragen}
                        onRename={(n) => sektionUmbenennen(s.id, n)} onDelete={() => sektionLöschen(s.id)}
                        onMoveUp={() => sektionVerschieben(s.id, -1)} onMoveDown={() => sektionVerschieben(s.id, 1)}
                        onAddFrage={() => frageHinzufuegen(s.id)} onUpdateFrage={frageAktualisieren}
                        onDeleteFrage={frageLöschen} onDuplicateFrage={frageDuplizieren}
                        onMoveFrageUp={(id) => frageVerschieben(id, -1, s.id)} onMoveFrageDown={(id) => frageVerschieben(id, 1, s.id)} />
                    )
                  })}
                </div>
              )}

              {fragen.length === 0 && sektionen.length === 0 && (
                <p className="text-sm text-gray-400 italic text-center py-6 border border-dashed border-gray-200 rounded-xl">
                  Noch keine Fragen. Füge eine Frage oder Sektion hinzu.
                </p>
              )}

              <div className="flex gap-2">
                <button onClick={() => frageHinzufuegen()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-wellbeing-green border-2 border-dashed border-wellbeing-green/30 hover:border-wellbeing-green/60 rounded-xl transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Frage hinzufügen
                </button>
                <button onClick={sektionHinzufuegen}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-gray-500 border-2 border-dashed border-gray-200 hover:border-gray-300 rounded-xl transition-colors">
                  <FolderPlus className="w-3.5 h-3.5" /> Sektion hinzufügen
                </button>
              </div>
            </>}

            {tab === 'einstellungen' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Einleitungstext</label>
                  <textarea rows={3} placeholder="Text, den der Kunde am Anfang des Formulars sieht…" value={einleitungText}
                    onChange={(e) => setEinleitungText(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none resize-none focus:ring-2 focus:ring-wellbeing-green/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Abschluss-Text</label>
                  <textarea rows={3} placeholder="Dankesnachricht nach dem Absenden…" value={abschlussText}
                    onChange={(e) => setAbschlussText(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none resize-none focus:ring-2 focus:ring-wellbeing-green/20" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Link-Gültigkeit (Tage)</label>
                    <input type="number" min="1" placeholder="unbegrenzt" value={deadlineTage}
                      onChange={(e) => setDeadlineTage(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Geschätzte Ausfüllzeit (Min.)</label>
                    <input type="number" min="1" placeholder="z. B. 10" value={geschaetzteMinuten}
                      onChange={(e) => setGeschaetzteMinuten(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20" />
                    <p className="text-[10px] text-gray-400 mt-1">Wird dem Kunden oben angezeigt.</p>
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">E-Mail-Benachrichtigung</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Betreff</label>
                      <input type="text" placeholder="Neue Onboarding-Anfrage eingegangen" value={emailBetreff}
                        onChange={(e) => setEmailBetreff(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nachricht</label>
                      <textarea rows={4} placeholder="Benachrichtigungstext…" value={emailText}
                        onChange={(e) => setEmailText(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none resize-none focus:ring-2 focus:ring-wellbeing-green/20" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'whitelabel' && (
              <div className="space-y-5">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-xs text-blue-700">White-Label-Einstellungen überschreiben die globalen Branding-Einstellungen für dieses Formular.</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Logo-URL (optional)</label>
                  <div className="flex gap-2">
                    <input type="url" placeholder="https://…" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)}
                      className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20" />
                    <Link className="w-4 h-4 text-gray-400 my-auto shrink-0" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Akzentfarbe</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={akzentFarbe} onChange={(e) => setAkzentFarbe(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white" />
                    <div className="flex gap-1.5">
                      {['#445c49','#2d3e31','#94c1a4','#823509','#cba178','#1e293b','#6366f1'].map((c) => (
                        <button key={c} type="button" onClick={() => setAkzentFarbe(c)}
                          className="w-6 h-6 rounded-full border-2 transition-all hover:scale-110"
                          style={{ background: c, borderColor: akzentFarbe === c ? '#374151' : 'transparent' }} />
                      ))}
                    </div>
                    <input type="text" value={akzentFarbe} onChange={(e) => setAkzentFarbe(e.target.value)}
                      className="w-24 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 font-mono focus:outline-none" />
                  </div>
                </div>
                <div className="border rounded-xl p-4" style={{ borderColor: akzentFarbe + '40' }}>
                  <p className="text-xs text-gray-500 mb-2">Vorschau</p>
                  <div className="flex items-center gap-3">
                    {logoUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={logoUrl} alt="" className="h-8 object-contain" />
                      : <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: akzentFarbe }}>
                          <Palette className="w-4 h-4 text-white" />
                        </div>
                    }
                    <button className="px-4 py-2 text-xs font-semibold text-white rounded-lg" style={{ background: akzentFarbe }}>
                      Weiter →
                    </button>
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full w-1/3" style={{ background: akzentFarbe }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fixed Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
            <p className="text-xs text-gray-400">
              {fragen.length} Fragen · {sektionen.length} Sektionen · <span className="capitalize">{typ}</span>
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={isPending || !name.trim()}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 rounded-xl transition-colors"
              >
                <Check className="w-4 h-4" />
                {isPending ? 'Wird gespeichert…' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── VorlageKarte (Listenansicht) ──────────────────────────────

function VorlageKarte({
  vorlage,
  onEdit,
  onDelete,
}: {
  vorlage: OnboardingVorlage
  onEdit: () => void
  onDelete: () => void
}) {
  const sektionenAnzahl = vorlage.sektionen?.length ?? 0
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-gray-900">{vorlage.name}</p>
          {vorlage.ist_standard && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-wellbeing-green bg-wellbeing-green/10 px-1.5 py-0.5 rounded-full">
              <Star className="w-2.5 h-2.5" />
              Standard
            </span>
          )}
        </div>
        {vorlage.beschreibung && (
          <p className="text-xs text-gray-400 mb-1">{vorlage.beschreibung}</p>
        )}
        <p className="text-xs text-gray-400">
          {vorlage.fragen.length} Fragen
          {sektionenAnzahl > 0 && ` · ${sektionenAnzahl} Sektionen`}
          {vorlage.typ && vorlage.typ !== 'neukunde' && ` · ${vorlage.typ === 'projekt' ? 'Projekt' : 'Universal'}`}
          {vorlage.deadline_tage && ` · ${vorlage.deadline_tage} Tage gültig`}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 hover:border-gray-300 rounded-lg transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
          Bearbeiten
        </button>
        {!vorlage.ist_standard && (
          <button
            onClick={onDelete}
            className="w-7 h-7 flex items-center justify-center text-red-300 hover:text-red-500 border border-gray-200 hover:border-red-200 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Haupt-Komponente ──────────────────────────────────────────

export default function VorlagenVerwaltung({ vorlagen: initVorlagen }: { vorlagen: OnboardingVorlage[] }) {
  const [vorlagen, setVorlagen]           = useState<OnboardingVorlage[]>(initVorlagen)
  const [editorVorlage, setEditorVorlage] = useState<OnboardingVorlage | null | undefined>(undefined)
  const [isPending, startTransition]      = useTransition()
  const [seedFehler, setSeedFehler]       = useState<string | null>(null)

  function handleStandardLaden() {
    setSeedFehler(null)
    startTransition(async () => {
      const res = await standardOnboardingVorlagenErstellenAction()
      if (res.fehler) { setSeedFehler(res.fehler); return }
      if (res.erstellt === 0) {
        setSeedFehler('Es sind bereits Vorlagen vorhanden.')
        return
      }
      // Seite neu laden, damit die frisch angelegten Vorlagen sichtbar werden
      window.location.reload()
    })
  }

  function handleSave(
    name: string,
    beschreibung: string,
    fragen: OnboardingFrage[],
    sektionen: OnboardingSektion[],
    extra: Partial<OnboardingVorlage>
  ) {
    startTransition(async () => {
      if (editorVorlage === null) {
        // Neue Vorlage mit erweiterten Feldern
        const neu = await vorlageErstellenV2({
          name, beschreibung, fragen, sektionen,
          typ: extra.typ ?? 'neukunde',
          einleitung_text: extra.einleitung_text,
          abschluss_text:  extra.abschluss_text,
          akzent_farbe:    extra.akzent_farbe,
          logo_url:        extra.logo_url,
          email_betreff:   extra.email_betreff,
          email_text:      extra.email_text,
          deadline_tage:   extra.deadline_tage,
        })
        setVorlagen((vs) => [...vs, neu])
      } else if (editorVorlage) {
        // Bestehende Vorlage aktualisieren
        await vorlageAktualisierenV2(editorVorlage.id, {
          name, beschreibung: beschreibung || null, fragen, sektionen, ...extra,
        })
        setVorlagen((vs) =>
          vs.map((v) =>
            v.id === editorVorlage.id
              ? { ...v, name, beschreibung: beschreibung || null, fragen, sektionen, ...extra }
              : v
          )
        )
      }
      setEditorVorlage(undefined)
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await vorlageLoeschen(id)
      setVorlagen((vs) => vs.filter((v) => v.id !== id))
    })
  }

  return (
    <>
      {editorVorlage !== undefined && (
        <VorlageEditorModal
          vorlage={editorVorlage}
          onSave={handleSave}
          onClose={() => setEditorVorlage(undefined)}
        />
      )}

      {seedFehler && (
        <div className="mb-4 px-4 py-2.5 rounded-lg bg-red-50 border border-red-100 text-xs text-red-600">
          {seedFehler}
        </div>
      )}

      {/* Empty-State: Standard-Vorlagen laden oder leer starten */}
      {vorlagen.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-2xl py-14 px-6 text-center">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-wellbeing-green/10 items-center justify-center mb-4">
            <ClipboardList className="w-6 h-6 text-wellbeing-green" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Noch keine Onboarding-Vorlagen</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto mb-5">
            Lade 6 sorgfältig ausgearbeitete Standard-Vorlagen für Kontaktanfragen, Neukunden-Onboarding und Projekt-Briefings. Du kannst sie danach beliebig anpassen oder löschen.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleStandardLaden}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 text-white rounded-lg transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isPending ? 'Lade…' : 'Standard-Vorlagen laden'}
            </button>
            <span className="text-[11px] text-gray-300">oder</span>
            <button
              type="button"
              onClick={() => setEditorVorlage(null)}
              disabled={isPending}
              className="text-xs font-medium text-wellbeing-green hover:text-wellbeing-green-dark transition-colors"
            >
              Leere Vorlage erstellen
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-500">
              {vorlagen.length} {vorlagen.length === 1 ? 'Vorlage' : 'Vorlagen'}
            </p>
          </div>
          <div className="space-y-3">
            {vorlagen.map((v) => (
              <VorlageKarte
                key={v.id}
                vorlage={v}
                onEdit={() => setEditorVorlage(v)}
                onDelete={() => handleDelete(v.id)}
              />
            ))}

            <button
              onClick={() => setEditorVorlage(null)}
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-wellbeing-green border-2 border-dashed border-wellbeing-green/30 hover:border-wellbeing-green/60 rounded-xl transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Neue Vorlage erstellen
            </button>
          </div>
        </>
      )}
    </>
  )
}
