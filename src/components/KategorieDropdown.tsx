'use client'

import { useState, useRef, useEffect } from 'react'
import {
  type LucideIcon,
  ChevronDown, Package,
  Sofa, Armchair, Lamp, Lightbulb, Bed, Table2, Vegan, Wind,
  Leaf, Flower, TreePine, Sunrise, Droplets, Mountain, Palmtree,
  Home, Building, Building2, Hotel, Layers, Grid, DoorOpen, Bath, BedDouble,
  Shirt, ShoppingBag, Gem, Heart, Star, Sparkles, Watch, Glasses,
  Monitor, Tv, Music, Volume2, Sun, Moon, Cloud, Thermometer, Wifi,
  Coffee, Utensils, Wine, ChefHat, Dumbbell, Waves,
  Wrench, Hammer, Paintbrush, Scissors, Ruler, Compass, Map, PenLine, Pencil,
  Box, Archive, Tag, MessageSquare, Truck, Globe, Zap, Shield,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  Sofa, Armchair, Lamp, Lightbulb, Bed, Table2, Vegan, Wind,
  Leaf, Flower, TreePine, Sunrise, Droplets, Mountain, Palmtree,
  Home, Building, Building2, Hotel, Layers, Grid, DoorOpen, Bath, BedDouble,
  Shirt, ShoppingBag, Gem, Heart, Star, Sparkles, Watch, Glasses,
  Monitor, Tv, Music, Volume2, Sun, Moon, Cloud, Thermometer, Wifi,
  Coffee, Utensils, Wine, ChefHat, Dumbbell, Waves,
  Wrench, Hammer, Paintbrush, Scissors, Ruler, Compass, Map, PenLine, Pencil,
  Package, Box, Archive, Tag, MessageSquare, Truck, Globe, Zap, Shield,
}

export type KategorieOption = { name: string; icon: string }

export default function KategorieDropdown({
  optionen,
  value,
  onChange,
  placeholder = 'Alle Kategorien',
  alleOption = true,
  minWidth = '160px',
}: {
  optionen: KategorieOption[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
  alleOption?: boolean
  minWidth?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutsideClick)
    return () => document.removeEventListener('mousedown', onOutsideClick)
  }, [])

  const selected = optionen.find((o) => o.name === value)
  const SelectedIcon = selected ? (ICONS[selected.icon] ?? Package) : Package

  return (
    <div ref={ref} className="relative" style={{ minWidth }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-wellbeing-green-light"
      >
        <SelectedIcon
          className={`w-3.5 h-3.5 shrink-0 ${selected ? 'text-wellbeing-green' : 'text-gray-300'}`}
        />
        <span className="flex-1 text-left truncate">
          {selected ? selected.name : <span className="text-gray-400">{placeholder}</span>}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-full max-h-60 overflow-y-auto py-1">
          {alleOption && (
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${value === '' ? 'text-wellbeing-green font-medium' : 'text-gray-500'}`}
            >
              <Package className="w-3.5 h-3.5 text-gray-300 shrink-0" />
              {placeholder}
            </button>
          )}
          {optionen.map((o) => {
            const Ic = ICONS[o.icon] ?? Package
            const aktiv = value === o.name
            return (
              <button
                key={o.name}
                type="button"
                onClick={() => { onChange(o.name); setOpen(false) }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${aktiv ? 'bg-wellbeing-cream/60 text-wellbeing-green-dark font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <Ic className={`w-3.5 h-3.5 shrink-0 ${aktiv ? 'text-wellbeing-green' : 'text-gray-400'}`} />
                {o.name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
