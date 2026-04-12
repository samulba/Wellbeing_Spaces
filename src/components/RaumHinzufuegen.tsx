'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import type { RaumActionState } from '@/app/actions/raeume'
import {
  type LucideIcon,
  Sofa, Armchair, Lamp, Lightbulb, Bed, Table2, Wind,
  Leaf, Flower, TreePine, Sunrise, Droplets, Mountain, Palmtree,
  Home, Building, Building2, Hotel, Layers, Grid, DoorOpen, Bath, BedDouble,
  Shirt, ShoppingBag, Gem, Heart, Star, Sparkles, Watch, Glasses,
  Monitor, Tv, Music, Volume2, Sun, Moon, Cloud, Thermometer, Wifi,
  Coffee, Utensils, Wine, ChefHat, Dumbbell, Waves,
  Wrench, Hammer, Paintbrush, Scissors, Ruler, Compass, Map, PenLine, Pencil,
  Package, Box, Archive, Tag, MessageSquare, Truck, Globe, Zap, Shield,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  Sofa, Armchair, Lamp, Lightbulb, Bed, Table2, Wind,
  Leaf, Flower, TreePine, Sunrise, Droplets, Mountain, Palmtree,
  Home, Building, Building2, Hotel, Layers, Grid, DoorOpen, Bath, BedDouble,
  Shirt, ShoppingBag, Gem, Heart, Star, Sparkles, Watch, Glasses,
  Monitor, Tv, Music, Volume2, Sun, Moon, Cloud, Thermometer, Wifi,
  Coffee, Utensils, Wine, ChefHat, Dumbbell, Waves,
  Wrench, Hammer, Paintbrush, Scissors, Ruler, Compass, Map, PenLine, Pencil,
  Package, Box, Archive, Tag, MessageSquare, Truck, Globe, Zap, Shield,
}

function getIcon(name: string): LucideIcon {
  return ICONS[name] ?? Package
}

function parseRaumtyp(raw: string): { name: string; iconName: string } {
  const idx = raw.indexOf('|')
  if (idx === -1) return { name: raw.trim(), iconName: 'Package' }
  return { name: raw.slice(0, idx).trim(), iconName: raw.slice(idx + 1).trim() || 'Package' }
}

function HinzufuegenButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
    >
      {pending ? '…' : 'Hinzufügen'}
    </button>
  )
}

interface Props {
  aktion: (prevState: RaumActionState, formData: FormData) => Promise<RaumActionState>
  raumtypen: string[]
  raumAnzahl: number
}

export default function RaumHinzufuegen({ aktion, raumtypen, raumAnzahl }: Props) {
  const [offen, setOffen] = useState(false)
  const [state, formAction] = useFormState(aktion, null)
  const [gewaehlt, setGewaehlt] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')

  const parsed = raumtypen.map(parseRaumtyp)

  function handleTile(typName: string) {
    if (gewaehlt === typName) {
      setGewaehlt(null)
      setNameInput('')
    } else {
      setGewaehlt(typName)
      setNameInput(typName)
    }
  }

  function handleClose() {
    setOffen(false)
    setGewaehlt(null)
    setNameInput('')
  }

  return (
    <>
      {/* Kartenheader */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">
          Räume <span className="text-gray-400 font-normal">({raumAnzahl})</span>
        </h2>
        {!offen && (
          <button
            onClick={() => setOffen(true)}
            className="text-xs text-gray-400 hover:text-indigo-600 transition-colors"
          >
            + Raum hinzufügen
          </button>
        )}
      </div>

      {/* Aufklappbares Formular */}
      {offen && (
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/40">
          <form
            action={async (formData) => {
              await formAction(formData)
              if (!state?.fehler) {
                setOffen(false)
                setGewaehlt(null)
                setNameInput('')
              }
            }}
            className="space-y-3"
          >
            {/* Raumtyp-Kacheln */}
            {parsed.length > 0 && (
              <div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-widest mb-2">
                  Raumtyp wählen
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {parsed.map(({ name: typName, iconName }) => {
                    const Icon = getIcon(iconName)
                    const aktiv = gewaehlt === typName
                    return (
                      <button
                        key={typName}
                        type="button"
                        onClick={() => handleTile(typName)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          aktiv
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        {typName}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Namensfeld + Buttons */}
            <div className="flex items-center gap-2">
              <input
                name="name"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                required
                autoFocus={parsed.length === 0}
                placeholder="Raumname, z. B. Lobby"
                className="flex-1 min-w-0 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
              />
              <HinzufuegenButton />
              <button
                type="button"
                onClick={handleClose}
                className="px-3 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors whitespace-nowrap"
              >
                Abbrechen
              </button>
            </div>

            {state?.fehler && (
              <p className="text-xs text-red-500">{state.fehler}</p>
            )}
          </form>
        </div>
      )}
    </>
  )
}
