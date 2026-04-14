'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { RaumActionState } from '@/app/actions/raeume'
import type { Kategorie } from '@/lib/supabase/types'
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
  ChevronDown, Settings,
} from 'lucide-react'
import Link from 'next/link'

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

interface Props {
  aktion: (prevState: RaumActionState, formData: FormData) => Promise<RaumActionState>
  raumtypen: Kategorie[]
  raumAnzahl: number
}

export default function RaumHinzufuegen({ aktion, raumtypen, raumAnzahl }: Props) {
  const router = useRouter()
  const [showAddRaum, setShowAddRaum]     = useState(false)
  const [newRaumName, setNewRaumName]     = useState('')
  const [newRaumTyp, setNewRaumTyp]       = useState<{ id: string; name: string; icon: string } | null>(null)
  const [fehler, setFehler]               = useState<string | null>(null)
  const [toast, setToast]                 = useState<string | null>(null)
  const [isPending, startTransition]      = useTransition()
  const [dropdownOffen, setDropdownOffen] = useState(false)
  const dropdownRef                       = useRef<HTMLDivElement>(null)

  // Dropdown außen schließen
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOffen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Toast auto-hide
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  function handleClose() {
    setShowAddRaum(false)
    setNewRaumName('')
    setNewRaumTyp(null)
    setFehler(null)
    setDropdownOffen(false)
  }

  function handleAddRaum() {
    if (!newRaumName.trim()) {
      setFehler('Raumname darf nicht leer sein.')
      return
    }
    const formData = new FormData()
    formData.set('name', newRaumName.trim())
    if (newRaumTyp?.id) formData.set('raumtyp_id', newRaumTyp.id)

    startTransition(async () => {
      const result = await aktion(null, formData)
      if (result?.fehler) {
        setFehler(result.fehler)
      } else {
        handleClose()
        setToast('Raum erfolgreich erstellt.')
        router.refresh()
      }
    })
  }

  const SelectedIcon = getIcon(newRaumTyp?.icon ?? 'Package')

  return (
    <>
      {/* Kartenheader */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">
          Räume <span className="text-gray-400 font-normal">({raumAnzahl})</span>
        </h2>
        {!showAddRaum && (
          <button
            onClick={() => setShowAddRaum(true)}
            className="text-xs text-wellbeing-green hover:text-wellbeing-green-dark font-medium transition-colors"
          >
            + Raum hinzufügen
          </button>
        )}
      </div>

      {/* Aufklappbares Formular */}
      {showAddRaum && (
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/40">
          <div className="space-y-3">
            {/* Raumname-Input */}
            <input
              type="text"
              value={newRaumName}
              onChange={(e) => { setNewRaumName(e.target.value); setFehler(null) }}
              onKeyDown={(e) => e.key === 'Enter' && handleAddRaum()}
              placeholder="Raumname…"
              autoFocus
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/30 focus:border-wellbeing-green-light transition-colors"
            />

            {/* Raumtyp-Dropdown – nur wenn Raumtypen konfiguriert */}
            {raumtypen.length > 0 ? (
              <div ref={dropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOffen((v) => !v)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white hover:border-wellbeing-green-light transition-colors"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {newRaumTyp ? (
                      <>
                        <SelectedIcon className="w-4 h-4 text-wellbeing-green shrink-0" />
                        <span className="text-gray-700 truncate">{newRaumTyp.name}</span>
                      </>
                    ) : (
                      <span className="text-gray-400">Raumtyp wählen (optional)…</span>
                    )}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${dropdownOffen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOffen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-52 overflow-y-auto">
                    {raumtypen.map((typ) => {
                      const Icon = getIcon(typ.icon)
                      const aktiv = newRaumTyp?.id === typ.id
                      return (
                        <button
                          key={typ.id}
                          type="button"
                          onClick={() => {
                            setNewRaumTyp({ id: typ.id, name: typ.name, icon: typ.icon })
                            setDropdownOffen(false)
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors ${aktiv ? 'bg-wellbeing-green/5 text-wellbeing-green' : 'text-gray-700'}`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${aktiv ? 'text-wellbeing-green' : 'text-gray-400'}`} />
                          {typ.name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Settings className="w-3 h-3 shrink-0" />
                <Link href="/dashboard/einstellungen?tab=workspace" className="hover:text-wellbeing-green hover:underline">
                  Raumtypen einrichten
                </Link>
                <span>(optional)</span>
              </p>
            )}

            {/* Aktionen */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddRaum}
                disabled={isPending}
                className="px-4 py-2 bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
              >
                {isPending ? '…' : 'Hinzufügen'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-3 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Abbrechen
              </button>
              {fehler && <p className="text-xs text-red-500 ml-2">{fehler}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium text-white bg-wellbeing-green transition-all">
          {toast}
        </div>
      )}
    </>
  )
}
