'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import ProduktZuweisenModal, { type ProjektOption, type RaumOption } from '@/components/ProduktZuweisenModal'
import { ConfirmModal } from '@/components/ConfirmModal'
import { produktAusBibliothekLoeschen } from '@/app/actions/produkte'
import {
  type LucideIcon,
  ExternalLink, ChevronUp, ChevronDown, Search, X, Trash2,
  LayoutList, LayoutGrid, Grid3X3, Package,
  Sofa, Armchair, Lamp, Lightbulb, Bed, Table2, Vegan, Wind,
  Leaf, Flower, TreePine, Sunrise, Droplets, Mountain, Palmtree,
  Home, Building, Building2, Hotel, Layers, Grid, DoorOpen, Bath, BedDouble,
  Shirt, ShoppingBag, Gem, Heart, Star, Sparkles, Watch, Glasses,
  Monitor, Tv, Music, Volume2, Sun, Moon, Cloud, Thermometer, Wifi,
  Coffee, Utensils, Wine, ChefHat, Dumbbell, Waves,
  Wrench, Hammer, Paintbrush, Scissors, Ruler, Compass, Map, PenLine, Pencil,
  Box, Archive, Tag, MessageSquare, Truck, Globe, Zap, Shield,
} from 'lucide-react'

export type KategorieOption = { name: string; icon: string }

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

function KategorieSelect({
  optionen,
  value,
  onChange,
}: {
  optionen: KategorieOption[]
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  const selected = optionen.find((o) => o.name === value)
  const SelectedIcon = selected ? (ICONS[selected.icon] ?? Package) : Package

  return (
    <div ref={ref} className="relative" style={{ minWidth: '160px' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-wellbeing-green-light"
      >
        <SelectedIcon className={`w-3.5 h-3.5 shrink-0 ${selected ? 'text-wellbeing-green' : 'text-gray-300'}`} />
        <span className="flex-1 text-left truncate">
          {selected ? selected.name : <span className="text-gray-400">Alle Kategorien</span>}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 w-full max-h-60 overflow-y-auto py-1">
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false) }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${value === '' ? 'text-wellbeing-green font-medium' : 'text-gray-500'}`}
          >
            <Package className="w-3.5 h-3.5 text-gray-300 shrink-0" />
            Alle Kategorien
          </button>
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

export type ProduktZeile = {
  id: string
  name: string
  kategorie: string | null
  menge: number
  einheit: string
  verkaufspreis: number | null
  bild_url: string | null
  produkt_url: string | null
  partnerName: string | null
  partnerId: string | null
  raumId: string | null
  raumName: string | null
  projektId: string | null
  projektName: string | null
  kundeName: string | null
  verwendetInAnzahl?: number
  gelieferteAnzahl?:  number
}

const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)

const MWST_DEFAULT = 0.19

type SortKey = 'name' | 'verkaufspreis' | 'partner'
type SortDir = 'asc' | 'desc'
type Ansicht = 'tabelle' | 'grid' | 'kompakt'

function Thumbnail({ src, alt }: { src: string | null; alt: string }) {
  if (src) {
    return (
      <Image
        src={src} alt={alt} width={40} height={40}
        className="rounded-lg object-cover border border-gray-100 shrink-0"
        unoptimized
      />
    )
  }
  return (
    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
      <Package className="w-4 h-4 text-gray-300" />
    </div>
  )
}

// ── Hauptkomponente ───────────────────────────────────────────
export default function ProdukteTabelle({
  produkte,
  kategorienListe,
  projekte = [],
  raeume = [],
  mwst = MWST_DEFAULT,
}: {
  produkte: ProduktZeile[]
  kategorienListe?: KategorieOption[]
  projekte?: ProjektOption[]
  raeume?: RaumOption[]
  mwst?: number
}) {
  const [ansicht, setAnsicht]                 = useState<Ansicht>('tabelle')
  const [suche, setSuche]                     = useState('')
  const [filterPartner, setFilterPartner]     = useState('')
  const [filterKategorie, setFilterKategorie] = useState('')
  const [sortKey, setSortKey]                 = useState<SortKey>('name')
  const [sortDir, setSortDir]                 = useState<SortDir>('asc')

  const router = useRouter()
  // Löschen (Soft-Delete) — 2-stufige Bestätigung + optimistisches Ausblenden
  const [geloeschtIds, setGeloeschtIds]       = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget]       = useState<ProduktZeile | null>(null)
  const [isDeleting, setIsDeleting]           = useState(false)
  const [fehler, setFehler]                   = useState<string | null>(null)

  // localStorage für Ansicht
  useEffect(() => {
    const gespeichert = localStorage.getItem('produkte-ansicht') as Ansicht | null
    if (gespeichert && ['tabelle', 'grid', 'kompakt'].includes(gespeichert)) setAnsicht(gespeichert)
  }, [])

  function setAnsichtGespeichert(a: Ansicht) {
    setAnsicht(a)
    localStorage.setItem('produkte-ansicht', a)
  }

  // ── Partner-Optionen aus Produktdaten ableiten ─────────────
  const partnerOptionen = useMemo(() => {
    const map: Record<string, string> = {}
    for (const p of produkte) {
      if (p.partnerId && p.partnerName) map[p.partnerId] = p.partnerName
    }
    return Object.entries(map)
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [produkte])

  const hatSonstige = useMemo(() => produkte.some((p) => !p.partnerId), [produkte])

  // ── Kategorien ─────────────────────────────────────────────
  const kategorienOptionen = useMemo<KategorieOption[]>(() => {
    if (kategorienListe && kategorienListe.length > 0) return kategorienListe
    return Array.from(new Set(produkte.map((p) => p.kategorie).filter(Boolean) as string[]))
      .sort()
      .map((name) => ({ name, icon: 'Package' }))
  }, [kategorienListe, produkte])

  // ── Gefilterte + sortierte Liste ──────────────────────────
  const gefiltert = useMemo(() => {
    let liste = produkte.filter((p) => !geloeschtIds.has(p.id))

    if (suche) {
      const q = suche.toLowerCase()
      liste = liste.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.kategorie ?? '').toLowerCase().includes(q) ||
        (p.partnerName ?? '').toLowerCase().includes(q) ||
        (p.projektName ?? '').toLowerCase().includes(q) ||
        (p.raumName ?? '').toLowerCase().includes(q)
      )
    }

    if (filterPartner === '__kein_partner__') {
      liste = liste.filter((p) => !p.partnerId)
    } else if (filterPartner) {
      liste = liste.filter((p) => p.partnerId === filterPartner)
    }

    if (filterKategorie) liste = liste.filter((p) => p.kategorie === filterKategorie)

    return [...liste].sort((a, b) => {
      let v = 0
      if (sortKey === 'name')          v = a.name.localeCompare(b.name)
      if (sortKey === 'verkaufspreis') v = (a.verkaufspreis ?? 0) - (b.verkaufspreis ?? 0)
      if (sortKey === 'partner')       v = (a.partnerName ?? '').localeCompare(b.partnerName ?? '')
      return sortDir === 'asc' ? v : -v
    })
  }, [produkte, geloeschtIds, suche, filterPartner, filterKategorie, sortKey, sortDir])

  async function handleConfirmDelete() {
    if (!deleteTarget || isDeleting) return
    const id = deleteTarget.id
    setIsDeleting(true)
    setGeloeschtIds((prev) => new Set(prev).add(id)) // optimistisch ausblenden
    const res = await produktAusBibliothekLoeschen(id)
    setIsDeleting(false)
    setDeleteTarget(null)
    if (res?.fehler) {
      setGeloeschtIds((prev) => { const n = new Set(prev); n.delete(id); return n }) // Rollback
      setFehler('Produkt konnte nicht gelöscht werden. Bitte erneut versuchen.')
      setTimeout(() => setFehler(null), 4000)
    } else {
      router.refresh()
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 text-gray-300" />
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-wellbeing-green" />
      : <ChevronDown className="w-3 h-3 text-wellbeing-green" />
  }

  const activeFilters = [filterPartner, filterKategorie].filter(Boolean).length

  const produktLink = (_p: ProduktZeile) => `/dashboard/produkte/${_p.id}/bearbeiten`

  return (
    <div className="space-y-5">

      {/* ── Filter-Bar + View-Switcher ─────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Suche */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            placeholder="Produkt, Kategorie, Partner…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-wellbeing-green-light"
          />
        </div>

        {/* Partner-Filter */}
        <select
          value={filterPartner}
          onChange={(e) => setFilterPartner(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-wellbeing-green-light"
        >
          <option value="">Alle Partner</option>
          {partnerOptionen.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
          {hatSonstige && <option value="__kein_partner__">Sonstige (kein Partner)</option>}
        </select>

        {/* Kategorie-Filter */}
        <KategorieSelect
          optionen={kategorienOptionen}
          value={filterKategorie}
          onChange={setFilterKategorie}
        />

        {/* Filter zurücksetzen */}
        {(activeFilters > 0 || suche) && (
          <button
            onClick={() => { setFilterPartner(''); setFilterKategorie(''); setSuche('') }}
            className="flex items-center gap-1 px-3 py-2 text-xs text-gray-500 hover:text-red-500 border border-gray-200 rounded-lg bg-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Zurücksetzen
          </button>
        )}

        {/* Ergebniszahl */}
        <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">
          {gefiltert.length} von {produkte.length}
        </span>

        {/* View-Switcher */}
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white shrink-0">
          <button
            onClick={() => setAnsichtGespeichert('tabelle')}
            className={`px-3 py-2 transition-colors ${ansicht === 'tabelle' ? 'bg-wellbeing-green text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            title="Listenansicht"
          >
            <LayoutList className="w-4 h-4" />
          </button>
          <button
            onClick={() => setAnsichtGespeichert('grid')}
            className={`px-3 py-2 transition-colors ${ansicht === 'grid' ? 'bg-wellbeing-green text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            title="Rasteransicht"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setAnsichtGespeichert('kompakt')}
            className={`px-3 py-2 transition-colors ${ansicht === 'kompakt' ? 'bg-wellbeing-green text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            title="Kompaktansicht"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Grid-Ansicht ───────────────────────────────────── */}
      {ansicht === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {gefiltert.length === 0 ? (
            <div className="col-span-4 text-center py-16 text-sm text-gray-400">Keine Produkte gefunden.</div>
          ) : (
            gefiltert.map((p) => {
              const vpBrutto = p.verkaufspreis != null ? p.verkaufspreis * (1 + mwst) : null
              const isBibliothek = (p.verwendetInAnzahl ?? 0) === 0
              return (
                <div
                  key={p.id}
                  className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-wellbeing-green-light hover:shadow-md transition-all flex flex-col"
                >
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget(p) }}
                    aria-label={`${p.name} löschen`}
                    title="Produkt löschen"
                    className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-white/90 border border-gray-200 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-600 hover:border-red-200 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <Link href={produktLink(p)} className="flex-1 flex flex-col">
                    {/* Bild */}
                    <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                      {p.bild_url ? (
                        <Image
                          src={p.bild_url} alt={p.name}
                          width={200} height={200}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          unoptimized
                        />
                      ) : (
                        <Package className="w-10 h-10 text-gray-200" />
                      )}
                    </div>

                    <div className="p-3 space-y-1.5 flex-1">
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-wellbeing-green-dark transition-colors line-clamp-2 leading-snug">
                        {p.name}
                      </p>

                      {p.kategorie && (
                        <span className="inline-block text-[10px] px-1.5 py-0.5 bg-wellbeing-cream text-wellbeing-green rounded-full font-medium">
                          {p.kategorie}
                        </span>
                      )}

                      <p className="text-[11px] text-gray-400 truncate">
                        {p.partnerName ?? <span className="text-gray-300">Kein Partner</span>}
                      </p>

                      <div className="pt-1.5 border-t border-gray-100">
                        <span className="text-xs font-mono font-semibold text-gray-700">
                          {vpBrutto != null ? eur(vpBrutto) : '—'}
                          {vpBrutto != null && <span className="text-gray-400 font-normal"> brutto</span>}
                        </span>
                      </div>
                    </div>
                  </Link>

                  {/* Zuweisen-Button für Bibliotheksprodukte */}
                  {isBibliothek && projekte.length > 0 && (
                    <div className="px-3 pb-3 pt-1">
                      <ProduktZuweisenModal
                        produktId={p.id}
                        produktName={p.name}
                        projekte={projekte}
                        raeume={raeume}
                      />
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── Kompakt-Ansicht ────────────────────────────────── */}
      {ansicht === 'kompakt' && (
        <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2.5">
          {gefiltert.length === 0 ? (
            <div className="col-span-8 text-center py-16 text-sm text-gray-400">Keine Produkte gefunden.</div>
          ) : (
            gefiltert.map((p) => {
              const vpBrutto = p.verkaufspreis != null ? p.verkaufspreis * (1 + mwst) : null
              const tooltip = [p.kategorie, p.partnerName].filter(Boolean).join(' · ')
              return (
                <Link
                  key={p.id}
                  href={produktLink(p)}
                  title={tooltip || p.name}
                  className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-wellbeing-green-light hover:shadow-md transition-all flex flex-col"
                >
                  <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                    {p.bild_url ? (
                      <Image
                        src={p.bild_url} alt={p.name}
                        width={160} height={160}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized
                      />
                    ) : (
                      <Package className="w-6 h-6 text-gray-200" />
                    )}
                  </div>

                  <div className="px-2 py-1.5">
                    <p className="text-[11px] font-semibold text-gray-800 truncate leading-tight group-hover:text-wellbeing-green-dark transition-colors">
                      {p.name}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5 tabular-nums">
                      {vpBrutto != null ? eur(vpBrutto) : '—'}
                    </p>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      )}

      {/* ── Tabellen-Ansicht ────────────────────────────────── */}
      {ansicht === 'tabelle' && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-4 py-3 w-12" />
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">
                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-gray-700">
                      Produkt <SortIcon col="name" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Kategorie</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">Projekt → Raum</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs">
                    <button onClick={() => toggleSort('partner')} className="flex items-center gap-1 hover:text-gray-700">
                      Partner <SortIcon col="partner" />
                    </button>
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">Menge</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">
                    <button onClick={() => toggleSort('verkaufspreis')} className="flex items-center gap-1 hover:text-gray-700 ml-auto">
                      VP netto <SortIcon col="verkaufspreis" />
                    </button>
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs">VP brutto</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {gefiltert.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-14 text-center text-sm text-gray-400">
                      Keine Produkte gefunden.
                    </td>
                  </tr>
                ) : (
                  gefiltert.map((p) => {
                    const vpBrutto = p.verkaufspreis != null ? p.verkaufspreis * (1 + mwst) : null
                    return (
                      <tr key={p.id} className="hover:bg-gray-50/60 transition-colors cursor-pointer group">
                        {/* Thumbnail */}
                        <td className="px-4 py-3">
                          <Thumbnail src={p.bild_url} alt={p.name} />
                        </td>

                        {/* Name */}
                        <td className="px-4 py-3 max-w-[200px]">
                          <div className="flex items-start gap-1.5">
                            <Link
                              href={produktLink(p)}
                              className="font-medium text-gray-900 hover:text-wellbeing-green transition-colors leading-snug line-clamp-2"
                            >
                              {p.name}
                            </Link>
                            {p.produkt_url && (
                              <a href={p.produkt_url} target="_blank" rel="noopener noreferrer"
                                className="shrink-0 mt-0.5 text-gray-300 hover:text-wellbeing-green transition-colors"
                                onClick={(e) => e.stopPropagation()}>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Kategorie */}
                        <td className="px-4 py-3">
                          {p.kategorie ? (
                            <span className="inline-block px-2 py-0.5 text-[11px] bg-wellbeing-cream text-wellbeing-green rounded-full font-medium whitespace-nowrap">
                              {p.kategorie}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>

                        {/* Verwendung → In X Räumen + Re-Order-Indicator */}
                        <td className="px-4 py-3 max-w-[200px]">
                          {(p.verwendetInAnzahl ?? 0) > 0 ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-block px-2 py-0.5 text-[11px] bg-wellbeing-cream text-wellbeing-green-dark rounded-full font-medium whitespace-nowrap">
                                In {p.verwendetInAnzahl} {p.verwendetInAnzahl === 1 ? 'Raum' : 'Räumen'}
                              </span>
                              {(p.gelieferteAnzahl ?? 0) > 0 && (
                                <span
                                  className="inline-block px-2 py-0.5 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-medium whitespace-nowrap"
                                  title={`Schon ${p.gelieferteAnzahl}× erfolgreich geliefert — bewährtes Produkt`}
                                >
                                  ✓ {p.gelieferteAnzahl}× geliefert
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <span className="inline-block px-2 py-0.5 text-[11px] bg-gray-100 text-gray-500 rounded-full font-medium whitespace-nowrap">
                                Bibliothek
                              </span>
                              {projekte.length > 0 && (
                                <ProduktZuweisenModal
                                  produktId={p.id}
                                  produktName={p.name}
                                  projekte={projekte}
                                  raeume={raeume}
                                />
                              )}
                            </div>
                          )}
                        </td>

                        {/* Partner */}
                        <td className="px-4 py-3 max-w-[110px]">
                          {p.partnerName ? (
                            <Link href={`/dashboard/partner/${p.partnerId}`}
                              className="text-xs text-gray-600 hover:text-wellbeing-green transition-colors truncate block"
                              onClick={(e) => e.stopPropagation()}>
                              {p.partnerName}
                            </Link>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>

                        {/* Menge */}
                        <td className="px-4 py-3 text-right text-xs text-gray-600 whitespace-nowrap">
                          {p.menge} {p.einheit}
                        </td>

                        {/* VP netto */}
                        <td className="px-4 py-3 text-right text-xs font-mono text-gray-700 whitespace-nowrap">
                          {p.verkaufspreis != null ? eur(p.verkaufspreis) : <span className="text-gray-300">—</span>}
                        </td>

                        {/* VP brutto */}
                        <td className="px-4 py-3 text-right text-xs font-mono text-gray-500 whitespace-nowrap">
                          {vpBrutto != null ? eur(vpBrutto) : <span className="text-gray-300">—</span>}
                        </td>

                        {/* Aktionen */}
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(p)}
                            aria-label={`${p.name} löschen`}
                            title="Produkt löschen"
                            className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Löschen-Bestätigung (2-stufig) */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => { if (!isDeleting) setDeleteTarget(null) }}
        onConfirm={handleConfirmDelete}
        title="Produkt löschen?"
        message={deleteTarget
          ? `„${deleteTarget.name}" wird aus der Bibliothek gelöscht.` +
            ((deleteTarget.verwendetInAnzahl ?? 0) > 0
              ? ` Achtung: Es ist aktuell in ${deleteTarget.verwendetInAnzahl} ${deleteTarget.verwendetInAnzahl === 1 ? 'Raum' : 'Räumen'} verwendet und verschwindet dort ebenfalls.`
              : '')
          : ''}
        confirmText="Löschen"
        cancelText="Abbrechen"
        variant="danger"
        isLoading={isDeleting}
      />

      {fehler && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-red-600 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
          {fehler}
        </div>
      )}
    </div>
  )
}
