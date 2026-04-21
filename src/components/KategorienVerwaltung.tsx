'use client'

import { useState, useTransition } from 'react'
import {
  type LucideIcon,
  // Möbel & Einrichtung
  Sofa, Armchair, Bed, BedDouble, Table2, DoorOpen, Bath, Lamp, Wrench,
  // Licht
  Lightbulb, Sun, Moon, Sparkles, Zap, Sunrise, Cloud,
  // Pflanzen & Natur
  Leaf, TreePine, Flower, Sprout, Vegan, Mountain, Palmtree, Droplets,
  // Textilien & Lifestyle
  Shirt, Scissors, Palette, ShoppingBag, Glasses, Watch, Gem,
  // Technik
  Monitor, Tv, Smartphone, Wifi, Volume2, Music, Speaker,
  // Wellness
  Heart, Dumbbell, Waves, Wind, Thermometer, Coffee, Droplet,
  // Gebäude & Räume
  Home, Building, Building2, Hotel, Store, Warehouse, Layers, Grid,
  // Sonstiges
  Package, Box, Archive, Tag, Star, Globe, Truck, Shield,
  MessageSquare, Compass, Map, Ruler, Hammer, Paintbrush, PenLine, Pencil,
  ChefHat, Utensils, Wine,
} from 'lucide-react'
import {
  addKategorie, updateKategorie, deleteKategorie, checkKategorieUsageById,
} from '@/app/actions/einstellungen'
import type { Kategorie, KategorieTyp } from '@/lib/supabase/types'

// ── Icon-Registrierung ─────────────────────────────────────────
const ICON_KOMPONENTEN: Record<string, LucideIcon> = {
  Sofa, Armchair, Bed, BedDouble, Table2, DoorOpen, Bath, Lamp, Wrench,
  Lightbulb, Sun, Moon, Sparkles, Zap, Sunrise, Cloud,
  Leaf, TreePine, Flower, Sprout, Vegan, Mountain, Palmtree, Droplets,
  Shirt, Scissors, Palette, ShoppingBag, Glasses, Watch, Gem,
  Monitor, Tv, Smartphone, Wifi, Volume2, Music, Speaker,
  Heart, Dumbbell, Waves, Wind, Thermometer, Coffee, Droplet,
  Home, Building, Building2, Hotel, Store, Warehouse, Layers, Grid,
  Package, Box, Archive, Tag, Star, Globe, Truck, Shield,
  MessageSquare, Compass, Map, Ruler, Hammer, Paintbrush, PenLine, Pencil,
  ChefHat, Utensils, Wine,
}

const ICON_GRUPPEN: { label: string; icons: string[] }[] = [
  { label: 'Möbel & Einrichtung', icons: ['Sofa', 'Armchair', 'Bed', 'BedDouble', 'Table2', 'DoorOpen', 'Bath', 'Lamp', 'Wrench'] },
  { label: 'Licht',               icons: ['Lightbulb', 'Sun', 'Moon', 'Sparkles', 'Zap', 'Sunrise', 'Cloud'] },
  { label: 'Pflanzen & Natur',    icons: ['Leaf', 'TreePine', 'Flower', 'Sprout', 'Vegan', 'Mountain', 'Palmtree', 'Droplets'] },
  { label: 'Textilien',           icons: ['Shirt', 'Scissors', 'Palette', 'ShoppingBag', 'Glasses', 'Watch', 'Gem'] },
  { label: 'Technik',             icons: ['Monitor', 'Tv', 'Smartphone', 'Wifi', 'Volume2', 'Music', 'Speaker'] },
  { label: 'Wellness',            icons: ['Heart', 'Dumbbell', 'Waves', 'Wind', 'Thermometer', 'Coffee', 'Droplet'] },
  { label: 'Gebäude & Räume',     icons: ['Home', 'Building', 'Building2', 'Hotel', 'Store', 'Warehouse', 'Layers', 'Grid'] },
  { label: 'Sonstiges',           icons: ['Package', 'Box', 'Archive', 'Tag', 'Star', 'Globe', 'Truck', 'Shield', 'MessageSquare', 'Compass', 'Map', 'Ruler', 'Hammer', 'Paintbrush', 'PenLine', 'Pencil', 'ChefHat', 'Utensils', 'Wine'] },
]

function getIconKomponente(iconName: string): LucideIcon {
  return ICON_KOMPONENTEN[iconName] ?? Package
}

// ── Icon-Picker Modal ──────────────────────────────────────────
function IconPicker({ selected, onSelect }: { selected: string; onSelect: (name: string) => void }) {
  const [open, setOpen] = useState(false)
  const SelectedIcon = getIconKomponente(selected)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={`Icon: ${selected}`}
        className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-lg bg-white hover:border-wellbeing-green-light hover:bg-wellbeing-cream/40 transition-colors shrink-0"
      >
        <SelectedIcon className="w-4 h-4 text-wellbeing-green" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setOpen(false)} />
          <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-800">Icon auswählen</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors text-sm"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[420px] overflow-y-auto px-4 py-3 space-y-4">
              {ICON_GRUPPEN.map((gruppe) => (
                <div key={gruppe.label}>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                    {gruppe.label}
                  </p>
                  <div className="grid grid-cols-8 gap-1">
                    {gruppe.icons.map((iconName) => {
                      const Icon = getIconKomponente(iconName)
                      const aktiv = selected === iconName
                      return (
                        <button
                          key={iconName}
                          type="button"
                          title={iconName}
                          onClick={() => { onSelect(iconName); setOpen(false) }}
                          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                            aktiv
                              ? 'bg-wellbeing-green text-white ring-2 ring-wellbeing-green ring-offset-1'
                              : 'text-gray-500 hover:bg-wellbeing-green-light/20 hover:text-wellbeing-green'
                          }`}
                        >
                          <Icon className="w-[18px] h-[18px]" />
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

// ── Einzelne Kategorie-Karte ───────────────────────────────────
function KategorieKarte({ item, mitPruefung }: {
  item: Kategorie
  mitPruefung?: boolean
}) {
  const Icon = getIconKomponente(item.icon)
  const [editMode, setEditMode]   = useState(false)
  const [editName, setEditName]   = useState(item.name)
  const [editIcon, setEditIcon]   = useState(item.icon)
  const [fehler, setFehler]       = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      if (mitPruefung) {
        const count = await checkKategorieUsageById(item.id, item.typ)
        if (count > 0) {
          setFehler(`${count} Produkt${count !== 1 ? 'e' : ''} verwend${count !== 1 ? 'en' : 'et'} diese Kategorie. Bitte ändere zuerst die Kategorie dieser Produkte.`)
          return
        }
      }
      setFehler(null)
      const result = await deleteKategorie(item.id)
      if (result?.fehler) setFehler(result.fehler)
    })
  }

  function handleSave() {
    if (!editName.trim()) { setFehler('Name darf nicht leer sein.'); return }
    startTransition(async () => {
      const result = await updateKategorie(item.id, editName.trim(), editIcon)
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
    setEditName(item.name)
    setEditIcon(item.icon)
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
        <span className="flex-1 text-sm text-gray-800 font-medium truncate">{item.name}</span>
        <button type="button" onClick={() => { setEditMode(true); setFehler(null) }}
          disabled={isPending}
          title={`„${item.name}" bearbeiten`}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-wellbeing-green hover:bg-wellbeing-cream transition-colors shrink-0">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={handleDelete} disabled={isPending}
          title={`„${item.name}" löschen`}
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
function ListeAbschnitt({ titel, beschreibung, typ, items, platzhalter, mitIcons, mitPruefung }: {
  titel: string; beschreibung?: string
  typ: KategorieTyp; items: Kategorie[]; platzhalter: string
  mitIcons?: boolean; mitPruefung?: boolean
}) {
  const [neuName, setNeuName]           = useState('')
  const [gewaehltesIcon, setGewaehltesIcon] = useState('Package')
  const [meldung, setMeldung]           = useState<{ fehler?: string; erfolg?: string } | null>(null)
  const [isPending, startTransition]    = useTransition()

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const name = neuName.trim()
    if (!name) return
    startTransition(async () => {
      const result = await addKategorie(typ, name, gewaehltesIcon)
      if (result?.fehler) {
        setMeldung({ fehler: result.fehler })
      } else {
        setMeldung({ erfolg: `„${name}" hinzugefügt.` })
        setNeuName('')
        setGewaehltesIcon('Package')
      }
    })
  }

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
            {items.map((item) => (
              <KategorieKarte
                key={item.id}
                item={item}
                mitPruefung={mitPruefung}
              />
            ))}
          </div>
        )}

        <form onSubmit={handleAdd} className="space-y-2 pt-1">
          <div className="flex items-center gap-2">
            {mitIcons && (
              <IconPicker selected={gewaehltesIcon} onSelect={setGewaehltesIcon} />
            )}
            <input
              value={neuName}
              onChange={(e) => setNeuName(e.target.value)}
              placeholder={platzhalter}
              required
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green-light"
            />
            <button type="submit" disabled={isPending}
              className="px-4 py-2 text-sm font-medium bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 text-white rounded-lg transition-colors whitespace-nowrap">
              {isPending ? '…' : 'Hinzufügen'}
            </button>
          </div>
          {meldung && (
            <p className={`text-xs mt-1 ${meldung.fehler ? 'text-red-500' : 'text-emerald-600'}`}>
              {meldung.fehler ?? meldung.erfolg}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}

// ── Haupt-Komponente ──────────────────────────────────────────
export default function KategorienVerwaltung({ kategorien, raumtypen, projektarten }: {
  kategorien: Kategorie[]; raumtypen: Kategorie[]; projektarten: Kategorie[]
}) {
  return (
    <div className="space-y-6">
      <ListeAbschnitt
        titel="Produktkategorien"
        beschreibung="Kategorien für Produkte in Räumen (z.B. Möbel, Leuchten)"
        typ="produktkategorie" items={kategorien} platzhalter="z.B. Spiegel"
        mitIcons mitPruefung
      />
      <ListeAbschnitt
        titel="Projektarten"
        beschreibung="Kontext des Kunden (z.B. Hotel, Büro, Privat, Praxis)"
        typ="projektart" items={projektarten} platzhalter="z.B. Hotel"
        mitIcons
      />
      <ListeAbschnitt
        titel="Raumtypen"
        beschreibung="Einzelne Räume innerhalb eines Projekts (z.B. Küche, Bad)"
        typ="raumtyp" items={raumtypen} platzhalter="z.B. Küche"
        mitIcons
      />
    </div>
  )
}
