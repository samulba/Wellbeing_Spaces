'use client'

import { useState, useTransition } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import {
  type LucideIcon,
  // Möbel & Einrichtung
  Sofa, Armchair, Lamp, Lightbulb, Bed, Table2, Vegan, Wind,
  // Natur & Außen
  Leaf, Flower, TreePine, Sunrise, Droplets, Mountain, Palmtree,
  // Gebäude & Räume
  Home, Building, Building2, Hotel, Layers, Grid, DoorOpen, Bath, BedDouble,
  // Mode & Lifestyle
  Shirt, ShoppingBag, Gem, Heart, Star, Sparkles, Watch, Glasses,
  // Technik & Klima
  Monitor, Tv, Music, Volume2, Sun, Moon, Cloud, Thermometer, Wifi,
  // Gastronomie & Wellness
  Coffee, Utensils, Wine, ChefHat, Dumbbell, Waves,
  // Handwerk & Planung
  Wrench, Hammer, Paintbrush, Scissors, Ruler, Compass, Map, PenLine, Pencil,
  // Sonstiges
  Package, Box, Archive, Tag, MessageSquare, Truck, Globe, Zap, Shield,
  ChevronDown,
} from 'lucide-react'
import {
  addListItem, deleteListItem, checkKategorieUsage, updateListItem,
  type EinstellungActionState,
} from '@/app/actions/einstellungen'

// ── Icon-Registrierung ─────────────────────────────────────────
const ICON_KOMPONENTEN: Record<string, LucideIcon> = {
  Sofa, Armchair, Lamp, Lightbulb, Bed, Table2, Vegan, Wind,
  Leaf, Flower, TreePine, Sunrise, Droplets, Mountain, Palmtree,
  Home, Building, Building2, Hotel, Layers, Grid, DoorOpen, Bath, BedDouble,
  Shirt, ShoppingBag, Gem, Heart, Star, Sparkles, Watch, Glasses,
  Monitor, Tv, Music, Volume2, Sun, Moon, Cloud, Thermometer, Wifi,
  Coffee, Utensils, Wine, ChefHat, Dumbbell, Waves,
  Wrench, Hammer, Paintbrush, Scissors, Ruler, Compass, Map, PenLine, Pencil,
  Package, Box, Archive, Tag, MessageSquare, Truck, Globe, Zap, Shield,
}

const ICON_GRUPPEN: { label: string; icons: string[] }[] = [
  { label: 'Möbel & Einrichtung', icons: ['Sofa', 'Armchair', 'Lamp', 'Lightbulb', 'Bed', 'Table2', 'Wind'] },
  { label: 'Natur & Außen',       icons: ['Leaf', 'Flower', 'TreePine', 'Sunrise', 'Droplets', 'Mountain', 'Palmtree'] },
  { label: 'Gebäude & Räume',     icons: ['Home', 'Building', 'Building2', 'Hotel', 'Layers', 'Grid', 'DoorOpen', 'Bath', 'BedDouble'] },
  { label: 'Mode & Lifestyle',    icons: ['Shirt', 'ShoppingBag', 'Gem', 'Heart', 'Star', 'Sparkles', 'Watch', 'Glasses'] },
  { label: 'Technik & Klima',     icons: ['Monitor', 'Tv', 'Music', 'Volume2', 'Sun', 'Moon', 'Cloud', 'Thermometer', 'Wifi'] },
  { label: 'Gastronomie & Wellness', icons: ['Coffee', 'Utensils', 'Wine', 'ChefHat', 'Dumbbell', 'Waves'] },
  { label: 'Handwerk & Planung',  icons: ['Wrench', 'Hammer', 'Paintbrush', 'Scissors', 'Ruler', 'Compass', 'Map', 'PenLine', 'Pencil'] },
  { label: 'Sonstiges',           icons: ['Package', 'Box', 'Archive', 'Tag', 'MessageSquare', 'Truck', 'Globe', 'Zap', 'Shield'] },
]

function getIconKomponente(iconName: string): LucideIcon {
  return ICON_KOMPONENTEN[iconName] ?? Package
}

// ── parseItem: "Name|IconName" → { name, iconName } ───────────
function parseItem(raw: string): { name: string; iconName: string } {
  const idx = raw.indexOf('|')
  if (idx === -1) return { name: raw.trim(), iconName: 'Package' }
  return {
    name:     raw.slice(0, idx).trim(),
    iconName: raw.slice(idx + 1).trim() || 'Package',
  }
}

// ── Icon-Picker (zentriertes Modal) ────────────────────────────
function IconPicker({ selected, onSelect }: { selected: string; onSelect: (name: string) => void }) {
  const [open, setOpen] = useState(false)
  const SelectedIcon = getIconKomponente(selected)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-white hover:border-wellbeing-green-light hover:bg-wellbeing-cream/40 transition-colors text-sm text-gray-700"
      >
        <SelectedIcon className="w-4 h-4 text-wellbeing-green" />
        <span className="text-xs text-gray-500">{selected}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setOpen(false)} />
          <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-800">Icon auswählen</p>
              <button type="button" onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                ✕
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto px-4 py-3 space-y-4">
              {ICON_GRUPPEN.map((gruppe) => (
                <div key={gruppe.label}>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2 px-0.5">
                    {gruppe.label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {gruppe.icons.map((iconName) => {
                      const Icon = getIconKomponente(iconName)
                      const aktiv = selected === iconName
                      return (
                        <button
                          key={iconName}
                          type="button"
                          title={iconName}
                          onClick={() => { onSelect(iconName); setOpen(false) }}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                            aktiv
                              ? 'bg-wellbeing-green text-white ring-2 ring-wellbeing-green-light'
                              : 'bg-gray-100 text-gray-600 hover:bg-wellbeing-cream hover:text-wellbeing-green'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}

// ── Submit Button ─────────────────────────────────────────────
function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending}
      className="px-4 py-2 text-sm font-medium bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 text-white rounded-lg transition-colors whitespace-nowrap">
      {pending ? '…' : label}
    </button>
  )
}

function Meldung({ state }: { state: EinstellungActionState | null }) {
  if (!state) return null
  return (
    <p className={`text-xs mt-1 ${state.fehler ? 'text-red-500' : 'text-emerald-600'}`}>
      {state.fehler ?? state.erfolg}
    </p>
  )
}

// ── Einzelne Kategorie-Karte ───────────────────────────────────
function KategorieKarte({ rawItem, schluessel, mitPruefung }: {
  rawItem: string
  schluessel: string
  mitPruefung?: boolean
}) {
  const { name, iconName } = parseItem(rawItem)
  const Icon = getIconKomponente(iconName)

  const [editMode, setEditMode]   = useState(false)
  const [editName, setEditName]   = useState(name)
  const [editIcon, setEditIcon]   = useState(iconName)
  const [fehler, setFehler]       = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      if (mitPruefung) {
        const count = await checkKategorieUsage(name)
        if (count > 0) {
          setFehler(`${count} Produkt${count !== 1 ? 'e' : ''} verwend${count !== 1 ? 'en' : 'et'} diese Kategorie. Bitte ändere zuerst die Kategorie dieser Produkte.`)
          return
        }
      }
      setFehler(null)
      await deleteListItem(schluessel, rawItem)
    })
  }

  function handleSave() {
    if (!editName.trim()) { setFehler('Name darf nicht leer sein.'); return }
    startTransition(async () => {
      const neuesItem = `${editName.trim()}|${editIcon}`
      const result = await updateListItem(schluessel, rawItem, neuesItem)
      if (result?.fehler) {
        setFehler(result.fehler)
      } else {
        setEditMode(false)
        setFehler(null)
      }
    })
  }

  function cancelEdit() {
    setEditMode(false)
    setFehler(null)
    setEditName(name)
    setEditIcon(iconName)
  }

  if (editMode) {
    return (
      <div className="bg-white border border-wellbeing-green-light rounded-xl px-3.5 py-3 space-y-2.5">
        <div className="flex items-center gap-2">
          <IconPicker selected={editIcon} onSelect={setEditIcon} />
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') cancelEdit() }}
            className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green-light"
            autoFocus
          />
        </div>
        {fehler && <p className="text-[11px] text-red-500">{fehler}</p>}
        <div className="flex items-center gap-2 justify-end">
          <button type="button" onClick={cancelEdit}
            className="text-xs px-3 py-1.5 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors">
            Abbrechen
          </button>
          <button type="button" onClick={handleSave} disabled={isPending}
            className="text-xs px-3 py-1.5 bg-wellbeing-green hover:bg-wellbeing-green-dark text-white rounded-lg font-medium transition-colors disabled:opacity-50">
            {isPending ? '…' : 'Speichern'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className={`flex items-center gap-3 bg-white border rounded-xl px-3.5 py-3 hover:border-gray-300 hover:shadow-sm transition-all ${fehler ? 'border-red-200' : 'border-gray-200'}`}>
        <div className="w-9 h-9 rounded-lg bg-wellbeing-cream flex items-center justify-center shrink-0">
          <Icon className="w-[18px] h-[18px] text-wellbeing-green" />
        </div>
        <span className="flex-1 text-sm text-gray-800 font-medium truncate">{name}</span>
        {/* Bearbeiten */}
        <button type="button" onClick={() => { setEditMode(true); setFehler(null) }}
          disabled={isPending}
          title={`„${name}" bearbeiten`}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-wellbeing-green hover:bg-wellbeing-cream transition-colors shrink-0">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        {/* Löschen */}
        <button type="button" onClick={handleDelete} disabled={isPending}
          title={`„${name}" löschen`}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
          <span className="text-[13px] leading-none">✕</span>
        </button>
      </div>
      {fehler && (
        <p className="text-[11px] text-red-500 mt-1 px-1 leading-tight">{fehler}</p>
      )}
    </div>
  )
}

// ── Listen Abschnitt ──────────────────────────────────────────
function ListeAbschnitt({ titel, beschreibung, schluessel, items, platzhalter, mitIcons, mitPruefung }: {
  titel: string; beschreibung?: string
  schluessel: string; items: string[]; platzhalter: string
  mitIcons?: boolean; mitPruefung?: boolean
}) {
  const boundAdd = addListItem.bind(null, schluessel)
  const [state, action] = useFormState(boundAdd, null)
  const [gewaehltesIcon, setGewaehltesIcon] = useState('Package')

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <h3 className="text-sm font-semibold text-gray-900">{titel}</h3>
        {beschreibung && <p className="text-xs text-gray-500 mt-0.5">{beschreibung}</p>}
      </div>

      <div className="px-6 py-5 space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-gray-400">Noch keine Einträge vorhanden.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {items.map((rawItem) => (
              <KategorieKarte
                key={rawItem}
                rawItem={rawItem}
                schluessel={schluessel}
                mitPruefung={mitPruefung}
              />
            ))}
          </div>
        )}

        <form action={action} className="space-y-2 pt-1">
          <div className="flex items-center gap-2">
            {mitIcons && (
              <>
                <IconPicker selected={gewaehltesIcon} onSelect={setGewaehltesIcon} />
                <input type="hidden" name="icon" value={gewaehltesIcon} />
              </>
            )}
            <input name="name" placeholder={platzhalter} required
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green-light" />
            <SubmitButton label="Hinzufügen" />
          </div>
          <Meldung state={state} />
        </form>
      </div>
    </div>
  )
}

// ── Haupt-Komponente ──────────────────────────────────────────
export default function KategorienVerwaltung({ kategorien, raumtypen, projektarten }: {
  kategorien: string[]; raumtypen: string[]; projektarten: string[]
}) {
  return (
    <div className="space-y-6">
      <ListeAbschnitt
        titel="Produktkategorien"
        beschreibung="Kategorien für Produkte in Räumen (z.B. Möbel, Leuchten)"
        schluessel="produktkategorien" items={kategorien} platzhalter="z.B. Spiegel"
        mitIcons mitPruefung
      />
      <ListeAbschnitt
        titel="Raumtypen"
        beschreibung="Typen für neue Räume in Projekten"
        schluessel="raumtypen" items={raumtypen} platzhalter="z.B. Empfang"
        mitIcons
      />
      <ListeAbschnitt
        titel="Projektarten"
        beschreibung="Klassifizierung von Projekten"
        schluessel="projektarten" items={projektarten} platzhalter="z.B. Umbau"
        mitIcons
      />
    </div>
  )
}
