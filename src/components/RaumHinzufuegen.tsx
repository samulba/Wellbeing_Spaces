'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState, useRef, useEffect } from 'react'
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
  ChevronDown,
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
      className="px-4 py-2 bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
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
  const [offen, setOffen]                     = useState(false)
  const [state, formAction]                   = useFormState(aktion, null)
  const [gewaehlt, setGewaehlt]               = useState<string | null>(null)
  const [gewaehltIcon, setGewaehltIcon]       = useState<string>('Package')
  const [nameInput, setNameInput]             = useState('')
  const [dropdownOffen, setDropdownOffen]     = useState(false)
  const dropdownRef                           = useRef<HTMLDivElement>(null)

  const parsed = raumtypen.map(parseRaumtyp)

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOffen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function selectTyp(typName: string, iconName: string) {
    setGewaehlt(typName)
    setGewaehltIcon(iconName)
    setNameInput(typName)
    setDropdownOffen(false)
  }

  function clearTyp() {
    setGewaehlt(null)
    setGewaehltIcon('Package')
    setDropdownOffen(false)
  }

  function handleClose() {
    setOffen(false)
    setGewaehlt(null)
    setGewaehltIcon('Package')
    setNameInput('')
    setDropdownOffen(false)
  }

  const SelectedIcon = getIcon(gewaehltIcon)

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
            className="text-xs text-wellbeing-green hover:text-wellbeing-green-dark font-medium transition-colors"
          >
            + Raum hinzufügen
          </button>
        )}
      </div>

      {/* Aufklappbares Formular */}
      {offen && (
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/40 space-y-3">
          <form
            action={async (formData) => {
              await formAction(formData)
              if (!state?.fehler) {
                setOffen(false)
                setGewaehlt(null)
                setGewaehltIcon('Package')
                setNameInput('')
                setDropdownOffen(false)
              }
            }}
          >
            {/* Hidden icon input */}
            <input type="hidden" name="icon" value={gewaehltIcon} />

            {/* Dropdown Raumtyp */}
            {parsed.length > 0 && (
              <div ref={dropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOffen((v) => !v)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:border-wellbeing-green-light transition-colors"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {gewaehlt ? (
                      <>
                        <SelectedIcon className="w-4 h-4 text-wellbeing-green shrink-0" />
                        <span className="text-gray-700 truncate">{gewaehlt}</span>
                      </>
                    ) : (
                      <span className="text-gray-400">Raumtyp wählen (optional)</span>
                    )}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${dropdownOffen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOffen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-52 overflow-y-auto">
                    <button
                      type="button"
                      onClick={clearTyp}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 transition-colors"
                    >
                      — Kein Typ
                    </button>
                    {parsed.map(({ name: typName, iconName }) => {
                      const Icon = getIcon(iconName)
                      return (
                        <button
                          key={typName}
                          type="button"
                          onClick={() => selectTyp(typName, iconName)}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${gewaehlt === typName ? 'bg-wellbeing-green/5 text-wellbeing-green' : 'text-gray-700'}`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${gewaehlt === typName ? 'text-wellbeing-green' : 'text-gray-400'}`} />
                          {typName}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Namensfeld + Buttons */}
            <div className="flex items-center gap-2 mt-3">
              <input
                name="name"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                required
                autoFocus={parsed.length === 0}
                placeholder="Raumname, z. B. Lobby"
                className="flex-1 min-w-0 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition"
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
