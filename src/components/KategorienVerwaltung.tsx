'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import {
  type LucideIcon,
  Sofa, Armchair, Lamp, Lightbulb, Bed,
  Leaf, Flower, TreePine,
  Home, Building, Building2, Hotel, Layers, Grid,
  Shirt, ShoppingBag, Gem, Heart, Star, Sparkles,
  Monitor, Tv, Music, Volume2, Sun, Moon, Cloud,
  Coffee, Utensils,
  Wrench, Hammer, Paintbrush, Scissors, Ruler, Compass, Map,
  Package, Box, Archive, Tag, MessageSquare,
  ChevronDown,
} from 'lucide-react'
import { addListItem, deleteListItem, type EinstellungActionState } from '@/app/actions/einstellungen'

// ── Icon-Registrierung ─────────────────────────────────────────
const ICON_KOMPONENTEN: Record<string, LucideIcon> = {
  Sofa, Armchair, Lamp, Lightbulb, Bed,
  Leaf, Flower, TreePine,
  Home, Building, Building2, Hotel, Layers, Grid,
  Shirt, ShoppingBag, Gem, Heart, Star, Sparkles,
  Monitor, Tv, Music, Volume2, Sun, Moon, Cloud,
  Coffee, Utensils,
  Wrench, Hammer, Paintbrush, Scissors, Ruler, Compass, Map,
  Package, Box, Archive, Tag, MessageSquare,
}

const ICON_GRUPPEN: { label: string; icons: string[] }[] = [
  { label: 'Möbel & Einrichtung', icons: ['Sofa', 'Armchair', 'Lamp', 'Lightbulb', 'Bed'] },
  { label: 'Natur',               icons: ['Leaf', 'Flower', 'TreePine'] },
  { label: 'Gebäude & Räume',     icons: ['Home', 'Building', 'Building2', 'Hotel', 'Layers', 'Grid'] },
  { label: 'Mode & Lifestyle',    icons: ['Shirt', 'ShoppingBag', 'Gem', 'Heart', 'Star', 'Sparkles'] },
  { label: 'Technik & Klima',     icons: ['Monitor', 'Tv', 'Music', 'Volume2', 'Sun', 'Moon', 'Cloud'] },
  { label: 'Gastronomie',         icons: ['Coffee', 'Utensils'] },
  { label: 'Handwerk & Planung',  icons: ['Wrench', 'Hammer', 'Paintbrush', 'Scissors', 'Ruler', 'Compass', 'Map'] },
  { label: 'Sonstiges',           icons: ['Package', 'Box', 'Archive', 'Tag', 'MessageSquare'] },
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

// ── Icon-Picker ────────────────────────────────────────────────
function IconPicker({ selected, onSelect }: { selected: string; onSelect: (name: string) => void }) {
  const [open, setOpen] = useState(false)
  const SelectedIcon = getIconKomponente(selected)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-white hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors text-sm text-gray-700"
      >
        <SelectedIcon className="w-4 h-4 text-indigo-500" />
        <span className="text-xs text-gray-500">{selected}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {open && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Picker-Dropdown */}
          <div className="absolute left-0 top-full mt-1 z-50 w-72 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            <div className="max-h-72 overflow-y-auto px-3 py-3 space-y-3">
              {ICON_GRUPPEN.map((gruppe) => (
                <div key={gruppe.label}>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5 px-0.5">
                    {gruppe.label}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {gruppe.icons.map((iconName) => {
                      const Icon = getIconKomponente(iconName)
                      const aktiv = selected === iconName
                      return (
                        <button
                          key={iconName}
                          type="button"
                          title={iconName}
                          onClick={() => { onSelect(iconName); setOpen(false) }}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                            aktiv
                              ? 'bg-indigo-600 text-white ring-2 ring-indigo-300'
                              : 'bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-600'
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
    </div>
  )
}

// ── Submit Button ─────────────────────────────────────────────
function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending}
      className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors whitespace-nowrap">
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

// ── Listen Abschnitt ──────────────────────────────────────────
function ListeAbschnitt({ titel, beschreibung, schluessel, items, platzhalter, mitIcons }: {
  titel: string; beschreibung?: string
  schluessel: string; items: string[]; platzhalter: string
  mitIcons?: boolean
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
            {items.map((rawItem) => {
              const { name, iconName } = parseItem(rawItem)
              const Icon         = getIconKomponente(iconName)
              const deleteAction = deleteListItem.bind(null, schluessel, rawItem)
              return (
                <div key={rawItem}
                  className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-3.5 py-3 hover:border-gray-300 hover:shadow-sm transition-all">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                    <Icon className="w-[18px] h-[18px] text-indigo-500" />
                  </div>
                  <span className="flex-1 text-sm text-gray-800 font-medium truncate">{name}</span>
                  <form action={deleteAction} className="shrink-0">
                    <button type="submit"
                      className="text-[11px] text-red-400/60 hover:text-red-500 transition-colors whitespace-nowrap"
                      onClick={(e) => { if (!confirm(`„${name}" löschen?`)) e.preventDefault() }}>
                      ✕
                    </button>
                  </form>
                </div>
              )
            })}
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
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
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
        mitIcons
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
