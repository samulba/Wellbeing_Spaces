'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  MousePointer2, Minus, Plus, Grid3x3, Save,
  RotateCcw, RotateCw, Search, ChevronLeft, Pencil,
  Eraser, CheckCircle, DoorOpen, AppWindow, Ruler,
  HelpCircle, X, Maximize2, Minimize2, ChevronDown, ChevronRight,
  AlertCircle, Trash2, FileDown, PanelLeft,
  Copy, ArrowUpToLine, ArrowDownToLine, ArrowUp, ArrowDown,
  Magnet, Lock, LockOpen, Star, Share2, Image as ImageIcon, Check, Link2,
  LayoutTemplate,
  Package, Tag, ExternalLink, Link2Off, FileText,
  Download,
  AlignLeft, AlignCenterHorizontal, AlignRight,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignHorizontalSpaceBetween, AlignVerticalSpaceBetween,
  Group, Ungroup, PenLine, Sheet, Layers,
  Eye, EyeOff, Monitor,
} from 'lucide-react'
import QRCode from 'react-qr-code'
import {
  grundrissSpeichern, raumMasseAktualisieren,
  getRaumFreigabeInfo, raumFreigabeAktualisieren, raumTexturenSpeichern,
  getAllProdukteForPlaner, raumplanAngebotErstellen,
  getRaumEtagen, etageErstellen, etageSpeichern, etageLoeschen,
} from '@/app/actions/raumplaner'
import type { MoebelSymbol } from '@/lib/supabase/types'
import { ConfirmModal } from '@/components/ConfirmModal'

// ── Konstanten ────────────────────────────────────────────────

const SCALE          = 100   // px pro Meter
const WALL_THICKNESS = 15
const MIN_ZOOM       = 0.1
const MAX_ZOOM       = 5
const AUTOSAVE_DELAY = 3000

type Tool = 'select' | 'wall' | 'door' | 'window' | 'measure' | 'eraser'
type GridSize = 10 | 25 | 50 | 100

// Grid wird als Fabric.js Line-Objekte gezeichnet (data.type='gridLine')

const MOEBEL_GRUPPEN: { name: string; keys: string[] }[] = [
  { name: 'Wohnzimmer',   keys: ['Sofa', 'Sessel', 'Couchtisch', 'Sideboard', 'TV-Board', 'Stehlampe', 'Bücherregal', 'Pouf', 'Kaminofen', 'Pflanze', 'Teppich', 'Regal'] },
  { name: 'Schlafzimmer', keys: ['Bett', 'Nachttisch', 'Kleiderschrank', 'Kommode', 'Schminktisch', 'Spiegel', 'Wäschekorb'] },
  { name: 'Esszimmer',    keys: ['Esstisch', 'Esszimmerstuhl', 'Eckbank', 'Vitrine', 'Anrichte'] },
  { name: 'Büro',         keys: ['Schreibtisch', 'Bürostuhl', 'Barhocker', 'Aktenschrank', 'Rollcontainer', 'Konferenztisch', 'Stehpult', 'Flipchart', 'Drucker', 'Papierkorb'] },
  { name: 'Küche',        keys: ['Küchenzeile', 'Kücheninsel', 'Herd', 'Kühlschrank', 'Spüle', 'Geschirrspüler', 'Mikrowelle'] },
  { name: 'Bad',          keys: ['Badewanne', 'Dusche', 'Waschbecken', 'Toilette', 'WC', 'Bidet', 'Handtuchhalter', 'Wäschetrockner'] },
  { name: 'Garten',       keys: ['Gartentisch', 'Gartenstuhl', 'Sonnenliege', 'Sonnenschirm', 'Grill', 'Pflanzkübel', 'Outdoor', 'Pool'] },
  { name: 'Wellness',     keys: ['Sauna', 'Infrarotkabine', 'Whirlpool', 'Massageliege', 'Ruheliege', 'Handtuchregal'] },
  { name: 'Elektro',      keys: ['Steckdose', 'Lichtschalter', 'Deckenlampe', 'Wandlampe', 'Spot', 'Einbauleuchte', 'TV-Anschluss', 'Netzwerk', 'LAN', 'Rauchmelder', 'Thermostat'] },
]

// ── Layer-Definitionen ───────────────────────────────────────
interface LayerDef { id: string; name: string; types: string[]; color: string }
const LAYERS: LayerDef[] = [
  { id: 'walls',      name: 'Wände',          types: ['wall'],                color: '#475569' },
  { id: 'doors',      name: 'Türen & Fenster', types: ['door', 'window'],      color: '#3b82f6' },
  { id: 'furniture',  name: 'Möbel',           types: ['moebel'],              color: '#94c1a4' },
  { id: 'dimensions', name: 'Maße',            types: ['dimension', 'measure'],color: '#6b7280' },
  { id: 'elektro',   name: 'Elektro',         types: ['elektro'],             color: '#f59e0b' },
]
type LayerState = Record<string, { visible: boolean; locked: boolean }>
const DEFAULT_LAYER_STATE: LayerState = Object.fromEntries(
  LAYERS.map(l => [l.id, { visible: true, locked: false }])
)

// ── Türen & Fenster Varianten ────────────────────────────────
interface TuerFensterVariante {
  id: string; label: string; kategorie: 'tuer' | 'fenster'
  breite: number; beschreibung: string
}
const TUER_VARIANTEN: TuerFensterVariante[] = [
  { id: 'tuer-links',   label: 'Standard L', kategorie: 'tuer',    breite: 80,  beschreibung: 'Öffnung links'    },
  { id: 'tuer-rechts',  label: 'Standard R', kategorie: 'tuer',    breite: 80,  beschreibung: 'Öffnung rechts'   },
  { id: 'tuer-schiebe', label: 'Schiebetür', kategorie: 'tuer',    breite: 100, beschreibung: 'Schiebend'        },
  { id: 'fen-standard', label: 'Standard',   kategorie: 'fenster', breite: 100, beschreibung: '100 cm'           },
  { id: 'fen-bodentief',label: 'Bodentief',  kategorie: 'fenster', breite: 100, beschreibung: '200 cm hoch'      },
]

function TuerFensterPreviewSvg({ variant }: { variant: TuerFensterVariante }) {
  const w = 48, h = 28
  const T = 5  // wall thickness visual
  if (variant.kategorie === 'tuer') {
    switch (variant.id) {
      case 'tuer-links': return (
        <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} fill="none">
          <rect x="0" y={h/2-T/2} width={w*0.7} height={T} fill="#e2e8f0" stroke="#64748b" strokeWidth="0.8"/>
          <path d={`M 0,${h/2+T/2} A ${w*0.7},${w*0.7} 0 0 0 ${w*0.7},${h/2-T/2}`} stroke="#445c49" strokeWidth="1" strokeDasharray="3,2" fill="rgba(68,92,73,0.05)"/>
          <line x1={w*0.7} y1={h/2-T/2} x2={w*0.7} y2={h/2+T/2} stroke="#64748b" strokeWidth="0.8"/>
        </svg>
      )
      case 'tuer-rechts': return (
        <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} fill="none">
          <rect x={w*0.3} y={h/2-T/2} width={w*0.7} height={T} fill="#e2e8f0" stroke="#64748b" strokeWidth="0.8"/>
          <path d={`M ${w},${h/2+T/2} A ${w*0.7},${w*0.7} 0 0 1 ${w*0.3},${h/2-T/2}`} stroke="#445c49" strokeWidth="1" strokeDasharray="3,2" fill="rgba(68,92,73,0.05)"/>
          <line x1={w*0.3} y1={h/2-T/2} x2={w*0.3} y2={h/2+T/2} stroke="#64748b" strokeWidth="0.8"/>
        </svg>
      )
      case 'tuer-schiebe': return (
        <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} fill="none">
          <rect x="1" y={h/2-T/2} width={w-2} height={T} fill="#e2e8f0" stroke="#64748b" strokeWidth="0.8"/>
          <rect x="3" y={h/2-T/2+1} width={w/2-4} height={T-2} fill="rgba(100,116,139,0.2)" stroke="#94a3b8" strokeWidth="0.5"/>
          <path d={`M ${w*0.3},${h/2} L ${w*0.15},${h/2-3} M ${w*0.3},${h/2} L ${w*0.15},${h/2+3}`} stroke="#445c49" strokeWidth="1"/>
          <path d={`M ${w*0.7},${h/2} L ${w*0.85},${h/2-3} M ${w*0.7},${h/2} L ${w*0.85},${h/2+3}`} stroke="#445c49" strokeWidth="1"/>
        </svg>
      )
      default: return <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h}><rect x="1" y={h/2-T/2} width={w-2} height={T} fill="#e2e8f0" stroke="#64748b" strokeWidth="0.8"/></svg>
    }
  }
  // Fenster previews
  switch (variant.id) {
    case 'fen-standard': return (
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} fill="none">
        <rect x="1" y={h/2-T/2} width={w-2} height={T} fill="#e0f2fe" stroke="#64748b" strokeWidth="0.8"/>
        <line x1={w*0.33} y1={h/2-T/2+1} x2={w*0.33} y2={h/2+T/2-1} stroke="#94c1a4" strokeWidth="1.5"/>
        <line x1={w*0.66} y1={h/2-T/2+1} x2={w*0.66} y2={h/2+T/2-1} stroke="#94c1a4" strokeWidth="1.5"/>
      </svg>
    )
    case 'fen-bodentief': return (
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} fill="none">
        <rect x={w*0.2} y="1" width={w*0.6} height={h-2} fill="#e0f2fe" stroke="#64748b" strokeWidth="0.8"/>
        <line x1={w*0.5} y1="1" x2={w*0.5} y2={h-1} stroke="#94c1a4" strokeWidth="1.2"/>
        <line x1={w*0.2+1} y1={h/2} x2={w*0.8-1} y2={h/2} stroke="#94c1a4" strokeWidth="0.7" strokeDasharray="2,2"/>
      </svg>
    )
    default: return <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h}><rect x="1" y={h/2-T/2} width={w-2} height={T} fill="#e0f2fe" stroke="#64748b" strokeWidth="0.8"/></svg>
  }
}

// ── Boden-Texturen ────────────────────────────────────────────
interface FloorTexture { name: string; preview: string }
const FLOOR_TEXTURES: Record<string, FloorTexture> = {
  'none':           { name: 'Kein',          preview: '#f8f9fa' },
  'holz-hell':      { name: 'Holz hell',     preview: '#d4a574' },
  'holz-dunkel':    { name: 'Holz dunkel',   preview: '#7c5c3a' },
  'fliesen-weiss':  { name: 'Fliesen weiß',  preview: '#f5f5f5' },
  'fliesen-grau':   { name: 'Fliesen grau',  preview: '#d1d5db' },
  'marmor':         { name: 'Marmor',        preview: '#e8e0d8' },
  'beton':          { name: 'Beton',         preview: '#9ca3af' },
}

// Wand-Farbpalette
const WANDFARBEN = [
  '#ffffff', '#f5f5dc', '#e8e8e8', '#d3d3d3',
  '#cba178', '#add8e6',
  '#445c49', '#2d3e31',
]

function createPatternCanvas(textur: string): HTMLCanvasElement | null {
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')
  if (!ctx) return null

  switch (textur) {
    case 'holz-hell': {
      c.width = 20; c.height = 120
      ctx.fillStyle = '#d4a574'; ctx.fillRect(0, 0, 20, 120)
      ctx.strokeStyle = '#b8925a'; ctx.lineWidth = 1
      ctx.strokeRect(0.5, 0.5, 19, 119)
      ctx.strokeStyle = '#c9a06a'; ctx.lineWidth = 0.5
      ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(3, 120); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(14, 120); ctx.stroke()
      break
    }
    case 'holz-dunkel': {
      c.width = 20; c.height = 120
      ctx.fillStyle = '#7c5c3a'; ctx.fillRect(0, 0, 20, 120)
      ctx.strokeStyle = '#5e4428'; ctx.lineWidth = 1
      ctx.strokeRect(0.5, 0.5, 19, 119)
      ctx.strokeStyle = '#6b4e30'; ctx.lineWidth = 0.5
      ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(4, 120); ctx.stroke()
      break
    }
    case 'fliesen-weiss': {
      c.width = 52; c.height = 52
      ctx.fillStyle = '#f8f8f8'; ctx.fillRect(0, 0, 52, 52)
      ctx.strokeStyle = '#d8d8d8'; ctx.lineWidth = 2
      ctx.strokeRect(1, 1, 50, 50)
      break
    }
    case 'fliesen-grau': {
      c.width = 52; c.height = 52
      ctx.fillStyle = '#d1d5db'; ctx.fillRect(0, 0, 52, 52)
      ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 2
      ctx.strokeRect(1, 1, 50, 50)
      break
    }
    case 'marmor': {
      c.width = 100; c.height = 100
      ctx.fillStyle = '#ece8e0'; ctx.fillRect(0, 0, 100, 100)
      ctx.strokeStyle = '#d8d0c0'; ctx.lineWidth = 2
      ctx.strokeRect(1, 1, 98, 98)
      // Maserung
      ctx.strokeStyle = 'rgba(180,160,140,0.4)'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(0, 30); ctx.bezierCurveTo(30, 20, 70, 40, 100, 35); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, 60); ctx.bezierCurveTo(40, 55, 60, 70, 100, 65); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(20, 0); ctx.bezierCurveTo(25, 40, 15, 60, 22, 100); ctx.stroke()
      break
    }
    case 'beton': {
      c.width = 80; c.height = 80
      ctx.fillStyle = '#9ca3af'; ctx.fillRect(0, 0, 80, 80)
      // Grober Textur-Effekt
      for (let i = 0; i < 40; i++) {
        const x = Math.random() * 80, y = Math.random() * 80
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
        ctx.fillRect(x, y, 3, 3)
      }
      ctx.strokeStyle = 'rgba(107,114,128,0.3)'; ctx.lineWidth = 0.5
      ctx.beginPath(); ctx.moveTo(0, 40); ctx.lineTo(80, 40); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(40, 0); ctx.lineTo(40, 80); ctx.stroke()
      break
    }
    default: return null
  }
  return c
}

interface EtageType {
  id: string; name: string; etage_nummer: number; sortierung: number; grundriss_json: string | null
}
interface StuecklisteItem {
  nr: number; name: string; breite: number; laenge: number; menge: number
  einzelpreis: number | null; gesamt: number | null
}
interface SelectedProps {
  x: number; y: number; w: number; h: number; angle: number; name: string; objType?: string
  locked: boolean; produkt_id?: string
}
interface ProduktForPlaner {
  id: string; name: string; kategorie: string | null
  artikelnummer: string | null; verkaufspreis_netto: number | null
}
interface KostenItem { name: string; count: number; preis: number }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ContextMenuState { x: number; y: number; target: any }

interface Props {
  raumId: string; projektId: string; raumName: string
  breiteM: number | null; laengeM: number | null; hoeheM: number | null
  initialCanvasJson: string | null
  moebelSymbole: MoebelSymbol[]
  produkte: Array<{ id: string; name: string; kategorie: string | null }>
  freigabeToken?: string | null
  freigabeAktiv?: boolean
  bodenTextur?: string
  wandfarbe?: string
}

// ── Möbel SVG-Preview ─────────────────────────────────────────

function MoebelPreview({ symbol }: { symbol: MoebelSymbol }) {
  const aspect = symbol.tiefe_cm / symbol.breite_cm
  const vH = Math.round(100 * aspect)
  return (
    <svg viewBox={`0 0 100 ${vH}`} className="w-full" style={{ maxHeight: 52 }} fill="none">
      <path d={symbol.svg_path} fill={symbol.farbe + 'cc'} stroke={symbol.farbe}
        strokeWidth="3" strokeLinejoin="round"
        transform={vH !== 100 ? `scale(1,${vH / 100})` : undefined} />
    </svg>
  )
}

// ── Loading Screen ────────────────────────────────────────────

function LoadingScreen({ visible }: { visible: boolean }) {
  return (
    <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      style={{ background: '#2d3e31' }}>
      <div className="flex flex-col items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-wellbeing-green/20 border border-wellbeing-green/30 flex items-center justify-center">
          <svg viewBox="0 0 32 32" className="w-8 h-8 text-wellbeing-green-light" fill="currentColor">
            <rect x="2" y="2" width="12" height="12" rx="2"/>
            <rect x="18" y="2" width="12" height="12" rx="2" opacity=".6"/>
            <rect x="2" y="18" width="12" height="12" rx="2" opacity=".6"/>
            <rect x="18" y="18" width="12" height="12" rx="2" opacity=".3"/>
          </svg>
        </div>
        <p className="text-sm font-medium" style={{ color: '#c8dbc9' }}>Raumplaner wird geladen…</p>
        <div className="w-48 h-1 rounded-full overflow-hidden" style={{ background: '#354a3a' }}>
          <div className="h-full bg-wellbeing-green rounded-full animate-[loading_1.4s_ease-in-out_infinite]" style={{ width: '60%' }} />
        </div>
      </div>
      <style>{`@keyframes loading{0%{transform:translateX(-100%)}100%{transform:translateX(280%)}}`}</style>
    </div>
  )
}

// ── Shortcut-Overlay ──────────────────────────────────────────

function ShortcutOverlay({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { keys: ['V'],         desc: 'Auswahl' },
    { keys: ['W'],         desc: 'Wand zeichnen' },
    { keys: ['D'],         desc: 'Tür platzieren' },
    { keys: ['F'],         desc: 'Fenster platzieren' },
    { keys: ['M'],         desc: 'Bemaßung' },
    { keys: ['E'],         desc: 'Radierer' },
    { keys: ['Esc'],       desc: 'Abbrechen / Auswahl' },
    { keys: ['Ctrl','Z'],  desc: 'Rückgängig' },
    { keys: ['Ctrl','Y'],  desc: 'Wiederholen' },
    { keys: ['Ctrl','S'],  desc: 'Speichern' },
    { keys: ['Ctrl','G'],           desc: 'Objekte gruppieren' },
    { keys: ['Ctrl','Shift','G'],   desc: 'Gruppe auflösen' },
    { keys: ['Del'],       desc: 'Löschen' },
    { keys: ['L'],         desc: 'Sperren / Entsperren' },
    { keys: ['F11'],       desc: 'Vollbild' },
    { keys: ['Space','↖'], desc: 'Pan (Verschieben)' },
    { keys: ['Scroll'],    desc: 'Zoom' },
    { keys: ['Magnet'],    desc: 'Snap an Raster' },
    { keys: ['?'],         desc: 'Shortcuts' },
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="rounded-2xl p-6 w-80 shadow-2xl border" onClick={e => e.stopPropagation()}
        style={{ background: '#2d3e31', borderColor: 'rgba(74,99,80,0.4)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold" style={{ color: '#c8dbc9' }}>Tastaturkürzel</h3>
          <button type="button" onClick={onClose} style={{ color: '#94c1a4' }}
            className="hover:opacity-70 transition-opacity"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-2">
          {shortcuts.map(s => (
            <div key={s.desc} className="flex items-center justify-between">
              <span className="text-xs" style={{ color: '#94c1a4' }}>{s.desc}</span>
              <div className="flex items-center gap-1">
                {s.keys.map(k => (
                  <kbd key={k} className="px-1.5 py-0.5 text-[10px] font-mono rounded" style={{ background: '#354a3a', border: '1px solid rgba(74,99,80,0.4)', color: '#c8dbc9' }}>{k}</kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Snap & Alignment Helpers ──────────────────────────────────

/** Nächsten Punkt auf einem Liniensegment (a→b) zum Punkt p berechnen */
function getClosestPointOnSegment(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number
): { x: number; y: number; distance: number } {
  const dx = bx - ax, dy = by - ay
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return { x: ax, y: ay, distance: Math.hypot(px - ax, py - ay) }
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
  const cx = ax + t * dx, cy = ay + t * dy
  return { x: cx, y: cy, distance: Math.hypot(px - cx, py - cy) }
}

/** Wand-Endpunkte in Canvas-Weltkoordinaten ermitteln (korrigiert Offset bei verschobenen Wänden) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getWallWorldPoints(wall: any): { p1: { x: number; y: number }; p2: { x: number; y: number } } {
  const origLeft = Math.min(wall.x1, wall.x2)
  const origTop  = Math.min(wall.y1, wall.y2)
  const dx = (wall.left ?? origLeft) - origLeft
  const dy = (wall.top  ?? origTop)  - origTop
  return {
    p1: { x: wall.x1 + dx, y: wall.y1 + dy },
    p2: { x: wall.x2 + dx, y: wall.y2 + dy },
  }
}

/** Achsenparallele Bounds eines Fabric-Objekts in Weltkoordinaten */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getObjBounds(obj: any) {
  const c = obj.getCenterPoint()
  const w = obj.getScaledWidth(), h = obj.getScaledHeight()
  return {
    left: c.x - w / 2, right:  c.x + w / 2,
    top:  c.y - h / 2, bottom: c.y + h / 2,
    centerX: c.x,      centerY: c.y,
  }
}

// ── Raum-Templates ────────────────────────────────────────────
interface RaumTemplateObj { name: string; x: number; y: number; breite: number; tiefe: number; farbe: string }
interface RaumTemplate { name: string; emoji: string; beschreibung: string; objekte: RaumTemplateObj[] }

const RAUM_TEMPLATES: RaumTemplate[] = [
  {
    name: 'Wohnzimmer', emoji: '🛋️', beschreibung: 'Sofa, Couchtisch, TV-Board, Sessel',
    objekte: [
      { name: 'Sofa 3-Sitzer', x: 60,  y: 200, breite: 200, tiefe:  90, farbe: '#b8cfc7' },
      { name: 'Sessel',        x: 290, y: 200, breite:  80, tiefe:  80, farbe: '#b8cfc7' },
      { name: 'Couchtisch',    x: 100, y: 310, breite: 120, tiefe:  60, farbe: '#d4b896' },
      { name: 'TV-Board',      x: 60,  y: 40,  breite: 160, tiefe:  45, farbe: '#8b7355' },
    ],
  },
  {
    name: 'Schlafzimmer', emoji: '🛏️', beschreibung: 'Doppelbett, Nachttische, Kleiderschrank',
    objekte: [
      { name: 'Doppelbett',      x: 100, y: 100, breite: 200, tiefe: 180, farbe: '#c8d8e8' },
      { name: 'Nachttisch',      x: 38,  y: 115, breite:  45, tiefe:  40, farbe: '#d4b896' },
      { name: 'Nachttisch',      x: 317, y: 115, breite:  45, tiefe:  40, farbe: '#d4b896' },
      { name: 'Kleiderschrank',  x: 80,  y: 330, breite: 200, tiefe:  60, farbe: '#c8c8c8' },
    ],
  },
  {
    name: 'Badezimmer', emoji: '🛁', beschreibung: 'Badewanne, Dusche, WC, Waschbecken',
    objekte: [
      { name: 'Badewanne freistehend', x: 30,  y: 30,  breite: 180, tiefe:  80, farbe: '#aed4e8' },
      { name: 'Dusche 90x90',          x: 240, y: 30,  breite:  90, tiefe:  90, farbe: '#aed4e8' },
      { name: 'WC wandhängend',        x: 30,  y: 210, breite:  40, tiefe:  55, farbe: '#aed4e8' },
      { name: 'Waschbecken',           x: 100, y: 215, breite:  60, tiefe:  45, farbe: '#aed4e8' },
    ],
  },
]

// ── Toolbar-Dropdown (für kompakte Ansicht) ───────────────────
interface TbDropItem { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean }
function ToolbarDropdown({ label, icon, items, tbStyle }: {
  label: string; icon: React.ReactNode; items: TbDropItem[]
  tbStyle: { color: string; hover: string; border: string; textLt: string }
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 h-9 px-2 text-xs rounded-lg transition-all"
        style={{ color: open ? '#fff' : tbStyle.textLt, background: open ? 'rgba(68,92,73,0.5)' : 'transparent' }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = tbStyle.hover }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent' }}>
        {icon}
        <span className="text-[11px]">{label}</span>
        <ChevronDown className="w-2.5 h-2.5 opacity-60" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 bg-white rounded-xl shadow-2xl border border-gray-100 py-1 z-50 min-w-[160px]"
          onClick={() => setOpen(false)}>
          {items.map((item, i) => (
            <button key={i} type="button" onClick={item.onClick}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-left transition-colors hover:bg-gray-50"
              style={{ color: item.active ? '#445c49' : '#374151', fontWeight: item.active ? 600 : 400 }}>
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Haupt-Editor ──────────────────────────────────────────────

export default function RaumplanerEditor({
  raumId, projektId, raumName,
  breiteM, laengeM, hoeheM,
  initialCanvasJson, moebelSymbole,
  freigabeToken: initialFreigabeToken = null,
  freigabeAktiv: initialFreigabeAktiv = false,
  bodenTextur: initialBodenTextur = 'none',
  wandfarbe: initialWandfarbe = '#1e293b',
}: Props) {
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const containerRef  = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fabricRef     = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fabricImports = useRef<any>(null)

  const [loading,       setLoading]       = useState(true)
  const [activeTool,    setActiveTool]    = useState<Tool>('select')
  const [showGrid,      setShowGrid]      = useState(true)
  const [gridSize,      setGridSize]      = useState<GridSize>(25)
  const [zoom,          setZoom]          = useState(1)
  const [mousePos,      setMousePos]      = useState({ x: 0, y: 0 })
  const [saveStatus,    setSaveStatus]    = useState<'saved'|'unsaved'|'saving'|'error'>('saved')
  const [moebelSuche,   setMoebelSuche]   = useState('')
  const [selectedProps, setSelectedProps] = useState<SelectedProps | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [doorWidth,     setDoorWidth]     = useState(80)
  const [windowWidth,   setWindowWidth]   = useState(100)
  const [objCount,      setObjCount]      = useState(0)
  const [contextMenu,   setContextMenu]   = useState<ContextMenuState | null>(null)
  const [openGroups,    setOpenGroups]    = useState<Set<string>>(new Set(MOEBEL_GRUPPEN.map(g => g.name)))
  const [sidebarOffen,  setSidebarOffen]  = useState(true)
  const [minimapImage,  setMinimapImage]  = useState('')
  const [viewportRect,  setViewportRect]  = useState({ x: 0, y: 0, w: 150, h: 100 })
  const [isFullscreen,  setIsFullscreen]  = useState(false)
  const [snapToGrid,    setSnapToGrid]    = useState(false)
  const [favoriten,     setFavoriten]     = useState<Set<string>>(new Set())
  // Freigabe-Modal
  const [showFreigabeModal, setShowFreigabeModal] = useState(false)
  const [freigabeAktiv,     setFreigabeAktiv]     = useState(initialFreigabeAktiv)
  const [freigabeToken,     setFreigabeToken]      = useState<string | null>(initialFreigabeToken)
  const [freigabeSaving,    setFreigabeSaving]     = useState(false)
  const [linkKopiert,       setLinkKopiert]        = useState(false)

  // Bild-Export-Modal
  const [showBildModal,     setShowBildModal]      = useState(false)
  const [bildFormat,        setBildFormat]         = useState<'png' | 'jpg'>('png')
  const [bildMultiplier,    setBildMultiplier]     = useState<1 | 2 | 4>(2)
  const [bildTransparent,   setBildTransparent]    = useState(false)

  // Boden + Wand
  const [bodenTextur,       setBodenTextur]        = useState(initialBodenTextur)
  const [wandfarbe,         setWandfarbe]          = useState(initialWandfarbe)
  const bodenTexturRef = useRef(initialBodenTextur)

  // Maßketten + Kollision + Modals
  const [showDimensions,    setShowDimensions]    = useState(false)
  const [showTemplatesModal, setShowTemplatesModal] = useState(false)

  // ── Produkt-Verknüpfung ───────────────────────────────────────
  const [showProduktModal,  setShowProduktModal]  = useState(false)
  const [allProdukte,       setAllProdukte]       = useState<ProduktForPlaner[]>([])
  const [produkteLoaded,    setProdukteLoaded]    = useState(false)
  const [produktSuche,      setProduktSuche]      = useState('')
  const [produktKatFilter,  setProduktKatFilter]  = useState('')
  const allProdukteRef = useRef<ProduktForPlaner[]>([])

  const [showZoomDropdown,      setShowZoomDropdown]      = useState(false)

  // ── Angebot ──────────────────────────────────────────────────
  const [angebotCreating,   setAngebotCreating]   = useState(false)

  // ── Multi-Select / Ausrichten / Gruppieren ───────────────────
  const [isMultiSelect,     setIsMultiSelect]     = useState(false)
  const [multiSelectCount,  setMultiSelectCount]  = useState(0)

  // ── Etagen ────────────────────────────────────────────────────
  const [etagen,            setEtagen]            = useState<EtageType[]>([])
  const [aktiveEtageId,     setAktiveEtageId]     = useState<string | null>(null)
  const [etagenLoading,     setEtagenLoading]     = useState(false)

  // ── Stückliste ───────────────────────────────────────────────
  const [showStuecklisteModal, setShowStuecklisteModal] = useState(false)

  // ── Layer-System ─────────────────────────────────────────────
  const [layerStates,     setLayerStates]     = useState<LayerState>(DEFAULT_LAYER_STATE)
  const [layersExpanded,  setLayersExpanded]  = useState(true)

  // ── Responsive Toolbar ───────────────────────────────────────
  const [isCompactToolbar,    setIsCompactToolbar]    = useState(false)

  // ── Toast + Confirm-Modal ────────────────────────────────────
  const [raumAlert,           setRaumAlert]           = useState<string | null>(null)
  const [raumConfirm,         setRaumConfirm]         = useState<{ open: boolean; msg: string; onOk: () => void }>({ open: false, msg: '', onOk: () => {} })

  useEffect(() => {
    const check = () => setIsCompactToolbar(window.innerWidth < 1400)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── Türen & Fenster Varianten ────────────────────────────────
  const [openTuerFenster,   setOpenTuerFenster]   = useState(true)

  const showDimensionsRef   = useRef(false)
  const dimTimerRef         = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggerDimUpdateRef = useRef(() => {})

  const [raumBreite, setRaumBreite] = useState(breiteM?.toString() ?? '')
  const [raumLaenge, setRaumLaenge] = useState(laengeM?.toString() ?? '')
  const [raumHoehe,  setRaumHoehe]  = useState(hoeheM?.toString() ?? '2.50')

  // Refs (kein Re-Render nötig)
  const activeToolRef    = useRef<Tool>('select')
  const showGridRef      = useRef(true)
  const gridSizeRef      = useRef<number>(25)
  const saveTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSpaceRef       = useRef(false)
  const isPanningRef     = useRef(false)
  const lastPanPosRef    = useRef({ x: 0, y: 0 })
  const historyRef       = useRef<string[]>([])
  const historyIdxRef    = useRef(-1)
  const doorWidthRef     = useRef(80)
  const windowWidthRef   = useRef(100)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wallPreviewRef   = useRef<any>(null)
  const wallStartRef     = useRef<{ x: number; y: number } | null>(null)
  const measureStartRef  = useRef<{ x: number; y: number } | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const measurePreviewRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const outlineRef       = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alignmentLinesRef    = useRef<any[]>([])
  const isCapturingMinimap   = useRef(false)
  const minimapThrottleRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateMinimapRef     = useRef<() => void>(() => {})
  const snapToGridRef        = useRef(false)
  const fitToViewRef         = useRef<() => void>(() => {})
  const toggleLockRef        = useRef(() => {})
  const groupSelectedRef     = useRef(() => {})
  const ungroupSelectedRef   = useRef(() => {})
  const aktiveEtageIdRef     = useRef<string | null>(null)
  const wandfarbeRef         = useRef(initialWandfarbe)
  const createGridLinesRef   = useRef<() => void>(() => {})
  // ── Ref-Sync ──────────────────────────────────────────────

  useEffect(() => { activeToolRef.current = activeTool }, [activeTool])
  useEffect(() => {
    showGridRef.current = showGrid
    const canvas = fabricRef.current; if (!canvas) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas.getObjects().filter((o: any) => o.data?.type === 'gridLine').forEach((o: any) => {
      o.set('visible', showGrid)
    })
    canvas.requestRenderAll()
  }, [showGrid])
  useEffect(() => {
    gridSizeRef.current = gridSize
    // Visuelles Grid bleibt bei 1m – nur Snap-Raster ändert sich
  }, [gridSize])
  useEffect(() => { doorWidthRef.current = doorWidth }, [doorWidth])
  useEffect(() => { windowWidthRef.current = windowWidth }, [windowWidth])
  useEffect(() => { snapToGridRef.current = snapToGrid }, [snapToGrid])
  useEffect(() => { wandfarbeRef.current = wandfarbe }, [wandfarbe])
  useEffect(() => { triggerDimUpdateRef.current() }, [showDimensions])

  // Etagen beim Start laden
  useEffect(() => {
    getRaumEtagen(raumId).then(data => {
      setEtagen(data)
      if (data.length > 0 && !aktiveEtageId) setAktiveEtageId(data[0].id)
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raumId])

  // Aktive-Etage-Ref sync
  useEffect(() => { aktiveEtageIdRef.current = aktiveEtageId }, [aktiveEtageId])

  // Fullscreen-Änderung beobachten
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // Favoriten aus localStorage laden
  useEffect(() => {
    try {
      const raw = localStorage.getItem('raumplaner-favoriten')
      if (raw) setFavoriten(new Set(JSON.parse(raw)))
    } catch { /* ignore */ }
  }, [])

  // Layer-States aus localStorage laden und auf Canvas anwenden (nach Canvas-Init)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`raumplaner-layers-${raumId}`)
      if (!saved) return
      const parsed: LayerState = JSON.parse(saved)
      setLayerStates(parsed)
      // Canvas ist beim ersten Render noch nicht initialisiert → 500ms warten
      setTimeout(() => {
        const canvas = fabricRef.current; if (!canvas) return
        Object.entries(parsed).forEach(([layerId, state]) => {
          const layer = LAYERS.find(l => l.id === layerId); if (!layer) return
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          canvas.getObjects().forEach((obj: any) => {
            if (!layer.types.includes(obj.data?.type)) return
            obj.set('visible', state.visible)
            if (state.locked) {
              obj.set({ selectable: false, evented: false, lockMovementX: true, lockMovementY: true, lockScalingX: true, lockScalingY: true, lockRotation: true })
            }
          })
        })
        canvas.requestRenderAll()
      }, 500)
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raumId])

  // Grid: Fabric.js Line-Objekte (createGridLinesRef)

  // ── Canvas-JSON (ohne Outline/Preview) ───────────────────

  const getCanvasJson = useCallback(() => {
    const canvas = fabricRef.current; if (!canvas) return '{}'
    const full = canvas.toJSON(['data', 'name'])
    const SKIP = new Set(['outline','preview','alignment','floor','dimension','collision','gridLine'])
    full.objects = (full.objects ?? []).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (o: any) => !SKIP.has(o.data?.type)
    )
    return JSON.stringify(full)
  }, [])

  const updateObjCount = useCallback(() => {
    const canvas = fabricRef.current; if (!canvas) return
    const SKIP_COUNT = new Set(['outline','preview','floor','dimension','collision','gridLine'])
    const allObjs = canvas.getObjects()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setObjCount(allObjs.filter((o: any) => !SKIP_COUNT.has(o.data?.type)).length)
  }, [])

  // ── Auto-Save ─────────────────────────────────────────────

  const triggerAutoSave = useCallback(() => {
    setSaveStatus('unsaved')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      const json = getCanvasJson()
      const etageId = aktiveEtageIdRef.current
      const res = etageId
        ? await etageSpeichern(etageId, json)
        : await grundrissSpeichern(raumId, json, projektId)
      setSaveStatus(res.fehler ? 'error' : 'saved')
    }, AUTOSAVE_DELAY)
  }, [raumId, projektId, getCanvasJson])

  // ── History ───────────────────────────────────────────────

  const pushHistory = useCallback(() => {
    const json = getCanvasJson()
    historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1)
    historyRef.current.push(json)
    historyIdxRef.current = historyRef.current.length - 1
    if (historyRef.current.length > 50) { historyRef.current.shift(); historyIdxRef.current-- }
  }, [getCanvasJson])

  const applyHistory = useCallback(async (json: string) => {
    const canvas = fabricRef.current; if (!canvas) return
    canvas.clear()
    await canvas.loadFromJSON(JSON.parse(json))
    if (breiteM && laengeM) { outlineRef.current = null; updateOutline(breiteM, laengeM) }
    // Grid neu erstellen (loadFromJSON hat alle Objekte ersetzt, inkl. gridLines)
    gridCreatedRef.current = false; createGridLinesRef.current()
    canvas.requestRenderAll(); updateObjCount()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breiteM, laengeM, updateObjCount])

  const undo = useCallback(async () => {
    if (historyIdxRef.current <= 0) return
    historyIdxRef.current--
    await applyHistory(historyRef.current[historyIdxRef.current])
  }, [applyHistory])

  const redo = useCallback(async () => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return
    historyIdxRef.current++
    await applyHistory(historyRef.current[historyIdxRef.current])
  }, [applyHistory])

  const saveNow = useCallback(async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSaveStatus('saving')
    const json = getCanvasJson()
    const etageId = aktiveEtageIdRef.current
    const res = etageId
      ? await etageSpeichern(etageId, json)
      : await grundrissSpeichern(raumId, json, projektId)
    setSaveStatus(res.fehler ? 'error' : 'saved')
  }, [raumId, projektId, getCanvasJson])

  // ── Raum-Umriss ──────────────────────────────────────────

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const updateOutline = useCallback((b: number | null, l: number | null) => {
    const canvas = fabricRef.current, imp = fabricImports.current
    if (!canvas || !imp || !b || !l) return
    if (outlineRef.current) canvas.remove(outlineRef.current)
    const outline = new imp.Rect({
      left: 0, top: 0, width: b * SCALE, height: l * SCALE,
      fill: 'transparent', stroke: '#94a3b8', strokeWidth: 16,
      selectable: false, evented: false, data: { type: 'outline' }, name: 'Raumumriss',
    })
    outlineRef.current = outline
    canvas.add(outline)
    reorderLayersRef.current()
    canvas.requestRenderAll()
  }, [])

  // ── Grid + Layer-Ordnung ──────────────────────────────────

  // Schiebt gridLines → floor → outline ans Ende (= unterste Ebene)
  const reorderLayersRef = useRef<() => void>(() => {})
  useEffect(() => {
    reorderLayersRef.current = () => {
      const canvas = fabricRef.current; if (!canvas) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const objs = (canvas as any)._objects as unknown[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gridLines: unknown[] = [], floors: unknown[] = [], outlines: unknown[] = [], rest: unknown[] = []
      for (const o of objs) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const t = (o as any).data?.type
        if (t === 'gridLine') gridLines.push(o)
        else if (t === 'floor') floors.push(o)
        else if (t === 'outline') outlines.push(o)
        else rest.push(o)
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(canvas as any)._objects = [...gridLines, ...floors, ...outlines, ...rest]
      canvas.requestRenderAll()
    }
  })

  // Fabric.js Line-Objekte als Grid – nur einmal erstellen (Major-Lines 100px = 1m)
  const gridCreatedRef = useRef(false)
  useEffect(() => {
    createGridLinesRef.current = () => {
      const canvas = fabricRef.current, imp = fabricImports.current
      if (!canvas || !imp) return
      // Nur erstellen wenn noch nicht vorhanden
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (canvas.getObjects().some((o: any) => o.data?.type === 'gridLine')) {
        reorderLayersRef.current(); return
      }
      const RANGE  = 10000  // 100m × 100m – sieht man nie den Rand
      const STEP   = 100    // immer 1m = 100px (Major only für Performance)
      const STROKE = 'rgba(200,200,200,0.4)'
      const opts   = { stroke: STROKE, strokeWidth: 1, selectable: false, evented: false,
                       excludeFromExport: true, objectCaching: true, data: { type: 'gridLine' },
                       visible: showGridRef.current }
      for (let pos = -RANGE; pos <= RANGE; pos += STEP) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        canvas.add(new imp.Line([-RANGE, pos, RANGE, pos], opts) as any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        canvas.add(new imp.Line([pos, -RANGE, pos, RANGE], opts) as any)
      }
      gridCreatedRef.current = true
      reorderLayersRef.current()
    }
  })

  // ── Tool-Stopper ─────────────────────────────────────────

  const stopWallTool = useCallback(() => {
    const canvas = fabricRef.current; if (!canvas) return
    if (wallPreviewRef.current) { canvas.remove(wallPreviewRef.current); wallPreviewRef.current = null }
    wallStartRef.current = null; canvas.requestRenderAll(); switchToolRef.current('select')
  }, [])

  const stopMeasureTool = useCallback(() => {
    const canvas = fabricRef.current; if (!canvas) return
    if (measurePreviewRef.current) { canvas.remove(measurePreviewRef.current); measurePreviewRef.current = null }
    measureStartRef.current = null; canvas.requestRenderAll(); switchToolRef.current('select')
  }, [])

  // ── Möbel platzieren ─────────────────────────────────────

  const placeMoebel = useCallback((symbol: MoebelSymbol, canvasX: number, canvasY: number) => {
    const canvas = fabricRef.current, imp = fabricImports.current
    if (!canvas || !imp) return
    const { Rect, Text, Group } = imp
    const w = symbol.breite_cm, h = symbol.tiefe_cm
    const bg = new Rect({ width: w, height: h, fill: symbol.farbe || '#94c1a4',
      stroke: '#1e293b', strokeWidth: 1.5, rx: 3, ry: 3, originX: 'left', originY: 'top' })
    const label = new Text(symbol.name, {
      fontSize: Math.max(7, Math.min(11, w / Math.max(symbol.name.length, 4) * 1.4)),
      fill: '#1e293b', textAlign: 'center', originX: 'center', originY: 'center',
      left: w / 2, top: h / 2, fontFamily: 'system-ui, sans-serif',
    })
    const group = new Group([bg, label], {
      left: canvasX - w / 2, top: canvasY - h / 2,
      data: { type: 'moebel', symbolId: symbol.id, name: symbol.name }, name: symbol.name,
    })
    canvas.add(group); canvas.setActiveObject(group); canvas.requestRenderAll()
    pushHistory(); triggerAutoSave(); updateObjCount()
  }, [pushHistory, triggerAutoSave, updateObjCount])

  // ── Wand ─────────────────────────────────────────────────

  const finishWall = useCallback((x2: number, y2: number) => {
    const canvas = fabricRef.current, imp = fabricImports.current
    if (!canvas || !imp || !wallStartRef.current) return
    const { x: x1, y: y1 } = wallStartRef.current
    if (wallPreviewRef.current) { canvas.remove(wallPreviewRef.current); wallPreviewRef.current = null }
    if (Math.abs(x2 - x1) < 3 && Math.abs(y2 - y1) < 3) return
    canvas.add(new imp.Line([x1, y1, x2, y2], {
      stroke: wandfarbeRef.current, strokeWidth: WALL_THICKNESS, strokeLineCap: 'square',
      selectable: true, data: { type: 'wall' }, name: 'Wand',
    }))
    pushHistory(); triggerAutoSave(); updateObjCount(); canvas.requestRenderAll()
  }, [pushHistory, triggerAutoSave, updateObjCount])

  // ── Tür ──────────────────────────────────────────────────

  const placeDoor = useCallback((x: number, y: number) => {
    const canvas = fabricRef.current, imp = fabricImports.current
    if (!canvas || !imp) return
    const { Group, Rect, Path } = imp
    const w = doorWidthRef.current, thick = WALL_THICKNESS
    canvas.add(new Group([
      new Rect({ left: 0, top: 0, width: w, height: thick, fill: '#f8fafc', stroke: '#64748b', strokeWidth: 1 }),
      new Path(`M 0,${thick} A ${w},${w} 0 0 1 ${w},${thick + w} L ${w},${thick} Z`,
        { fill: 'transparent', stroke: '#445c49', strokeWidth: 1.5, strokeDashArray: [4, 3] }),
    ], { left: x - w / 2, top: y - thick / 2, data: { type: 'door', breite: w }, name: 'Tür' }))
    canvas.requestRenderAll(); pushHistory(); triggerAutoSave(); updateObjCount()
  }, [pushHistory, triggerAutoSave, updateObjCount])

  // ── Fenster ───────────────────────────────────────────────

  const placeWindow = useCallback((x: number, y: number) => {
    const canvas = fabricRef.current, imp = fabricImports.current
    if (!canvas || !imp) return
    const { Group, Rect, Line } = imp
    const w = windowWidthRef.current, thick = WALL_THICKNESS
    canvas.add(new Group([
      new Rect({ left: 0, top: 0, width: w, height: thick, fill: '#e0f2fe', stroke: '#64748b', strokeWidth: 1 }),
      new Line([w * 0.33, 2, w * 0.33, thick - 2], { stroke: '#94c1a4', strokeWidth: 1.5 }),
      new Line([w * 0.66, 2, w * 0.66, thick - 2], { stroke: '#94c1a4', strokeWidth: 1.5 }),
    ], { left: x - w / 2, top: y - thick / 2, data: { type: 'window', breite: w }, name: 'Fenster' }))
    canvas.requestRenderAll(); pushHistory(); triggerAutoSave(); updateObjCount()
  }, [pushHistory, triggerAutoSave, updateObjCount])

  // ── Tür/Fenster Varianten platzieren ─────────────────────

  const placeTuerVariante = useCallback((varianteId: string, x: number, y: number) => {
    const canvas = fabricRef.current, imp = fabricImports.current
    if (!canvas || !imp) return
    const { Group, Rect, Path, Line } = imp
    const T = WALL_THICKNESS
    let group: ReturnType<typeof Group>
    let breite = 80

    switch (varianteId) {
      case 'tuer-rechts': {
        breite = 80
        group = new Group([
          new Rect({ left: 0, top: 0, width: breite, height: T, fill: '#f8fafc', stroke: '#64748b', strokeWidth: 1 }),
          new Path(`M ${breite},${T} A ${breite},${breite} 0 0 0 0,${T + breite} L 0,${T} Z`,
            { fill: 'transparent', stroke: '#445c49', strokeWidth: 1.5, strokeDashArray: [4, 3] }),
        ], { left: x - breite / 2, top: y - T / 2, data: { type: 'door', doorType: 'tuer-rechts', breite }, name: 'Tür (Rechts)' })
        break
      }
      case 'tuer-doppel': {
        breite = 160
        const hw = breite / 2
        group = new Group([
          new Rect({ left: 0, top: 0, width: breite, height: T, fill: '#f8fafc', stroke: '#64748b', strokeWidth: 1 }),
          new Path(`M 0,${T} A ${hw},${hw} 0 0 1 ${hw},${T + hw} L ${hw},${T} Z`,
            { fill: 'transparent', stroke: '#445c49', strokeWidth: 1.5, strokeDashArray: [4, 3] }),
          new Path(`M ${breite},${T} A ${hw},${hw} 0 0 0 ${hw},${T + hw} L ${hw},${T} Z`,
            { fill: 'transparent', stroke: '#445c49', strokeWidth: 1.5, strokeDashArray: [4, 3] }),
        ], { left: x - breite / 2, top: y - T / 2, data: { type: 'door', doorType: 'tuer-doppel', breite }, name: 'Doppeltür' })
        break
      }
      case 'tuer-schiebe': {
        breite = 100
        group = new Group([
          new Rect({ left: 0, top: 0, width: breite, height: T, fill: '#f8fafc', stroke: '#64748b', strokeWidth: 1 }),
          new Rect({ left: 2, top: 1, width: breite / 2 - 4, height: T - 2, fill: 'rgba(100,116,139,0.15)', stroke: '#94a3b8', strokeWidth: 0.8 }),
          new Line([breite * 0.25, T / 2, breite * 0.1, T / 2], { stroke: '#445c49', strokeWidth: 1.5 }),
          new Path(`M ${breite * 0.1},${T / 2 - 3} L ${breite * 0.1},${T / 2 + 3}`, { stroke: '#445c49', strokeWidth: 1.5 }),
          new Line([breite * 0.75, T / 2, breite * 0.9, T / 2], { stroke: '#445c49', strokeWidth: 1.5 }),
          new Path(`M ${breite * 0.9},${T / 2 - 3} L ${breite * 0.9},${T / 2 + 3}`, { stroke: '#445c49', strokeWidth: 1.5 }),
        ], { left: x - breite / 2, top: y - T / 2, data: { type: 'door', doorType: 'tuer-schiebe', breite }, name: 'Schiebetür' })
        break
      }
      case 'tuer-falt': {
        breite = 80
        group = new Group([
          new Rect({ left: 0, top: 0, width: breite, height: T, fill: '#f8fafc', stroke: '#64748b', strokeWidth: 1 }),
          new Path(`M 0,${T} L ${breite * 0.25},0 L ${breite * 0.5},${T} L ${breite * 0.75},0 L ${breite},${T}`,
            { fill: 'transparent', stroke: '#445c49', strokeWidth: 1.5 }),
          new Path(`M 0,${T} A ${breite},${breite} 0 0 0 ${breite},${T + breite} L ${breite},${T} Z`,
            { fill: 'transparent', stroke: '#94a3b8', strokeWidth: 0.8, strokeDashArray: [3, 3] }),
        ], { left: x - breite / 2, top: y - T / 2, data: { type: 'door', doorType: 'tuer-falt', breite }, name: 'Falttür' })
        break
      }
      case 'tuer-glas': {
        breite = 80
        group = new Group([
          new Rect({ left: 0, top: 0, width: breite, height: T, fill: 'rgba(147,197,253,0.25)', stroke: '#64748b', strokeWidth: 1 }),
          new Line([breite * 0.2, 2, breite * 0.2, T - 2], { stroke: '#93c5fd', strokeWidth: 1 }),
          new Line([breite * 0.4, 2, breite * 0.4, T - 2], { stroke: '#93c5fd', strokeWidth: 1 }),
          new Path(`M 0,${T} A ${breite},${breite} 0 0 1 ${breite},${T + breite} L ${breite},${T} Z`,
            { fill: 'rgba(147,197,253,0.06)', stroke: '#445c49', strokeWidth: 1.5, strokeDashArray: [4, 3] }),
        ], { left: x - breite / 2, top: y - T / 2, data: { type: 'door', doorType: 'tuer-glas', breite }, name: 'Glastür' })
        break
      }
      default: {
        // tuer-links (standard)
        breite = 80
        group = new Group([
          new Rect({ left: 0, top: 0, width: breite, height: T, fill: '#f8fafc', stroke: '#64748b', strokeWidth: 1 }),
          new Path(`M 0,${T} A ${breite},${breite} 0 0 1 ${breite},${T + breite} L ${breite},${T} Z`,
            { fill: 'transparent', stroke: '#445c49', strokeWidth: 1.5, strokeDashArray: [4, 3] }),
        ], { left: x - breite / 2, top: y - T / 2, data: { type: 'door', doorType: 'tuer-links', breite }, name: 'Tür (Links)' })
      }
    }
    canvas.add(group); canvas.setActiveObject(group); canvas.requestRenderAll()
    pushHistory(); triggerAutoSave(); updateObjCount()
  }, [pushHistory, triggerAutoSave, updateObjCount])

  const placeFensterVariante = useCallback((varianteId: string, x: number, y: number) => {
    const canvas = fabricRef.current, imp = fabricImports.current
    if (!canvas || !imp) return
    const { Group, Rect, Line, Path, Circle } = imp
    const T = WALL_THICKNESS
    let breite = 100

    switch (varianteId) {
      case 'fen-breit': {
        breite = 150
        const group = new Group([
          new Rect({ left: 0, top: 0, width: breite, height: T, fill: '#e0f2fe', stroke: '#64748b', strokeWidth: 1 }),
          new Line([breite * 0.25, 2, breite * 0.25, T - 2], { stroke: '#94c1a4', strokeWidth: 1.2 }),
          new Line([breite * 0.5,  2, breite * 0.5,  T - 2], { stroke: '#94c1a4', strokeWidth: 1.2 }),
          new Line([breite * 0.75, 2, breite * 0.75, T - 2], { stroke: '#94c1a4', strokeWidth: 1.2 }),
        ], { left: x - breite / 2, top: y - T / 2, data: { type: 'window', windowType: 'fen-breit', breite }, name: 'Fenster Breit (150cm)' })
        canvas.add(group); canvas.setActiveObject(group); canvas.requestRenderAll()
        pushHistory(); triggerAutoSave(); updateObjCount(); return
      }
      case 'fen-bodentief': {
        // Bodentiefes Fenster – hochkant, größer
        const W = 80, H = 200
        const group = new Group([
          new Rect({ left: 0, top: 0, width: W, height: H, fill: '#e0f2fe', stroke: '#64748b', strokeWidth: 1.5 }),
          new Line([W / 2, 2, W / 2, H - 2], { stroke: '#94c1a4', strokeWidth: 1.5 }),
          new Line([2, H / 2, W - 2, H / 2], { stroke: '#94c1a4', strokeWidth: 0.8, strokeDashArray: [3, 3] }),
        ], { left: x - W / 2, top: y - H / 2, data: { type: 'window', windowType: 'fen-bodentief', breite: W }, name: 'Fenster Bodentief' })
        canvas.add(group); canvas.setActiveObject(group); canvas.requestRenderAll()
        pushHistory(); triggerAutoSave(); updateObjCount(); return
      }
      case 'fen-dach': {
        const W = 80, H = 60
        const group = new Group([
          new Rect({ left: 0, top: 0, width: W, height: H, fill: '#e0f2fe', stroke: '#64748b', strokeWidth: 1.5 }),
          new Line([0, 0, W, H], { stroke: '#94c1a4', strokeWidth: 1 }),
          new Line([W, 0, 0, H], { stroke: '#94c1a4', strokeWidth: 1 }),
        ], { left: x - W / 2, top: y - H / 2, data: { type: 'window', windowType: 'fen-dach', breite: W }, name: 'Dachfenster' })
        canvas.add(group); canvas.setActiveObject(group); canvas.requestRenderAll()
        pushHistory(); triggerAutoSave(); updateObjCount(); return
      }
      case 'fen-bogen': {
        const W = 100, H = 80, halfW = W / 2
        const group = new Group([
          new Rect({ left: 0, top: halfW, width: W, height: H - halfW, fill: '#e0f2fe', stroke: '#64748b', strokeWidth: 1 }),
          new Path(`M 0,${halfW} A ${halfW},${halfW} 0 0 1 ${W},${halfW}`, { fill: '#e0f2fe', stroke: '#64748b', strokeWidth: 1 }),
          new Line([halfW, 0, halfW, H], { stroke: '#94c1a4', strokeWidth: 1.5 }),
        ], { left: x - W / 2, top: y - H / 2, data: { type: 'window', windowType: 'fen-bogen', breite: W }, name: 'Bogenfenster' })
        canvas.add(group); canvas.setActiveObject(group); canvas.requestRenderAll()
        pushHistory(); triggerAutoSave(); updateObjCount(); return
      }
      case 'fen-rund': {
        const R = 40
        const group = new Group([
          new Circle({ radius: R, left: 0, top: 0, fill: '#e0f2fe', stroke: '#64748b', strokeWidth: 1.5, originX: 'center', originY: 'center' }),
          new Line([-R + 2, 0, R - 2, 0], { stroke: '#94c1a4', strokeWidth: 1.2 }),
          new Line([0, -R + 2, 0, R - 2], { stroke: '#94c1a4', strokeWidth: 1.2 }),
        ], { left: x, top: y, data: { type: 'window', windowType: 'fen-rund', breite: R * 2 }, name: 'Rundfenster' })
        canvas.add(group); canvas.setActiveObject(group); canvas.requestRenderAll()
        pushHistory(); triggerAutoSave(); updateObjCount(); return
      }
      default: {
        // fen-standard (100cm) - already covered by placeWindow, but add here too
        breite = 100
        const group = new Group([
          new Rect({ left: 0, top: 0, width: breite, height: T, fill: '#e0f2fe', stroke: '#64748b', strokeWidth: 1 }),
          new Line([breite * 0.33, 2, breite * 0.33, T - 2], { stroke: '#94c1a4', strokeWidth: 1.5 }),
          new Line([breite * 0.66, 2, breite * 0.66, T - 2], { stroke: '#94c1a4', strokeWidth: 1.5 }),
        ], { left: x - breite / 2, top: y - T / 2, data: { type: 'window', windowType: 'fen-standard', breite }, name: 'Fenster Standard' })
        canvas.add(group); canvas.setActiveObject(group); canvas.requestRenderAll()
        pushHistory(); triggerAutoSave(); updateObjCount(); return
      }
    }
  }, [pushHistory, triggerAutoSave, updateObjCount])

  // ── Bemaßung ─────────────────────────────────────────────

  const finishMeasure = useCallback((x2: number, y2: number) => {
    const canvas = fabricRef.current, imp = fabricImports.current
    if (!canvas || !imp || !measureStartRef.current) return
    const { Group, Line, Text } = imp
    const { x: x1, y: y1 } = measureStartRef.current
    if (measurePreviewRef.current) { canvas.remove(measurePreviewRef.current); measurePreviewRef.current = null }
    const dx = x2 - x1, dy = y2 - y1, distPx = Math.sqrt(dx * dx + dy * dy)
    if (distPx < 5) { measureStartRef.current = null; return }
    const distM = distPx / SCALE
    const label = distM >= 1 ? `${distM.toFixed(2)} m` : `${Math.round(distM * 100)} cm`
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
    const norm = { x: -dy / distPx, y: dx / distPx }, tl = 6
    canvas.add(new Group([
      new Line([x1, y1, x2, y2], { stroke: '#f59e0b', strokeWidth: 1.5, selectable: false }),
      new Line([x1 - norm.x * tl, y1 - norm.y * tl, x1 + norm.x * tl, y1 + norm.y * tl], { stroke: '#f59e0b', strokeWidth: 1.5, selectable: false }),
      new Line([x2 - norm.x * tl, y2 - norm.y * tl, x2 + norm.x * tl, y2 + norm.y * tl], { stroke: '#f59e0b', strokeWidth: 1.5, selectable: false }),
      new Text(label, {
        left: mx, top: my, fontSize: 11, fill: '#f59e0b', fontFamily: 'system-ui, sans-serif',
        backgroundColor: 'rgba(255,255,255,0.85)', originX: 'center', originY: 'center',
        angle: angle > 90 || angle < -90 ? angle + 180 : angle, selectable: false,
      }),
    ], { selectable: true, data: { type: 'measure', distM }, name: `Maß ${label}` }))
    canvas.requestRenderAll(); pushHistory(); triggerAutoSave(); updateObjCount()
    measureStartRef.current = null
  }, [pushHistory, triggerAutoSave, updateObjCount])

  // ── extractObjProps ───────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function extractObjProps(obj: any): SelectedProps {
    return {
      x: Math.round((obj.left ?? 0) * 10) / 10, y: Math.round((obj.top ?? 0) * 10) / 10,
      w: Math.round((obj.getScaledWidth?.() ?? 0) * 10) / 10,
      h: Math.round((obj.getScaledHeight?.() ?? 0) * 10) / 10,
      angle: Math.round(obj.angle ?? 0), name: obj.name ?? '', objType: obj.data?.type ?? '',
      locked: obj.data?.locked === true, produkt_id: obj.data?.produkt_id,
    }
  }

  // ── Canvas initialisieren ─────────────────────────────────

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return
    let disposed = false

    import('fabric').then(async (fabric) => {
      if (disposed || !canvasRef.current) return
      fabricImports.current = fabric
      const { Canvas, Line, Point } = fabric
      const cont = containerRef.current!

      const canvas = new Canvas(canvasRef.current!, {
        selection: true, preserveObjectStacking: true,
        stopContextMenu: true, fireRightClick: true,
        renderOnAddRemove: false,
        backgroundColor: '#ffffff',
      })
      fabricRef.current = canvas
      canvas.selectionColor       = 'rgba(68,92,73,0.08)'
      canvas.selectionBorderColor = '#445c49'
      canvas.selectionLineWidth   = 1.5

      // Resize
      function resizeCanvas() {
        canvas.setWidth(cont.clientWidth); canvas.setHeight(cont.clientHeight); canvas.requestRenderAll()
      }
      resizeCanvas()
      const ro = new ResizeObserver(resizeCanvas); ro.observe(cont)

      // Minimap-Update throttled (500ms)
      canvas.on('after:render', () => {
        if (isCapturingMinimap.current || minimapThrottleRef.current) return
        minimapThrottleRef.current = setTimeout(() => {
          minimapThrottleRef.current = null
          updateMinimapRef.current()
        }, 500)
      })

      // ── ZOOM (smooth, zoomToPoint) + Mac Trackpad Support ──
      canvas.on('mouse:wheel', (opt: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const e = opt.e as WheelEvent
        e.preventDefault(); e.stopPropagation()

        // Mac Trackpad Pinch-to-Zoom: Chrome/Firefox simulieren Pinch als wheel+ctrlKey
        if (e.ctrlKey || e.metaKey) {
          let z = canvas.getZoom()
          z *= 0.99 ** e.deltaY   // Pinch braucht stärkere Sensitivität als Mausrad
          z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))
          canvas.zoomToPoint(new Point(e.offsetX, e.offsetY), z)
          setZoom(Math.round(z * 100) / 100)
          canvas.requestRenderAll()
          return
        }

        // Mac Trackpad Two-Finger-Pan (deltaX + deltaY gleichzeitig)
        if (Math.abs(e.deltaX) > 1) {
          canvas.relativePan(new Point(-e.deltaX, -e.deltaY))
          canvas.requestRenderAll()
          return
        }

        // Normales Mausrad = Zoom
        let z = canvas.getZoom()
        z *= 0.999 ** e.deltaY
        z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))
        canvas.zoomToPoint(new Point(e.offsetX, e.offsetY), z)
        setZoom(Math.round(z * 100) / 100)
        canvas.requestRenderAll()
      })

      // Safari Pinch-Gesture (gesturestart / gesturechange Events)
      const upperEl = canvas.upperCanvasEl as HTMLElement
      function onGestureStart(e: Event) { e.preventDefault() }
      function onGestureChange(e: Event) {
        e.preventDefault()
        const ge = e as any // eslint-disable-line @typescript-eslint/no-explicit-any
        const rect = upperEl.getBoundingClientRect()
        // Safari liefert ge.scale als kumulativen Faktor ab letztem gesturestart
        const factor = ge.scale > 1 ? 1.06 : 0.94
        const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, canvas.getZoom() * factor))
        canvas.zoomToPoint(new Point(ge.clientX - rect.left, ge.clientY - rect.top), z)
        setZoom(Math.round(z * 100) / 100)
        canvas.requestRenderAll()
      }
      upperEl.addEventListener('gesturestart', onGestureStart)
      upperEl.addEventListener('gesturechange', onGestureChange)

      // ── MAUS-BEWEGUNG (Wand/Bemaßungs-Preview + Maus-Koordinaten) ──
      canvas.on('mouse:move', (opt: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const e = opt.e as MouseEvent
        const p = canvas.getPointer(e)
        setMousePos({ x: Math.round(p.x / SCALE * 100) / 100, y: Math.round(p.y / SCALE * 100) / 100 })
        const tool = activeToolRef.current
        const grid = gridSizeRef.current
        const snapped = { x: Math.round(p.x / grid) * grid, y: Math.round(p.y / grid) * grid }
        if (tool === 'wall' && wallStartRef.current && wallPreviewRef.current) {
          wallPreviewRef.current.set({ x2: snapped.x, y2: snapped.y }); canvas.requestRenderAll()
        }
        if (tool === 'measure' && measureStartRef.current && measurePreviewRef.current) {
          measurePreviewRef.current.set({ x2: snapped.x, y2: snapped.y }); canvas.requestRenderAll()
        }
      })

      // ── RECHTSKLICK (via Fabric mouse:down) ──
      canvas.on('mouse:down', (opt: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const e = opt.e as MouseEvent
        setContextMenu(null)
        if (e.button === 2) {
          const tool = activeToolRef.current
          if (tool === 'wall')    { stopWallTool();    return }
          if (tool === 'measure') { stopMeasureTool(); return }
          if (opt.target && opt.target.data?.type !== 'outline') {
            canvas.setActiveObject(opt.target)
            setContextMenu({ x: e.clientX, y: e.clientY, target: opt.target })
          }
          return
        }
        // LMB ohne Space → Zeichen-Tools
        if (e.button !== 0 || isPanningRef.current) return
        const p = canvas.getPointer(e)
        const grid = gridSizeRef.current
        const snapped = { x: Math.round(p.x / grid) * grid, y: Math.round(p.y / grid) * grid }
        const tool = activeToolRef.current

        if (tool === 'wall') {
          if (e.detail === 2) { stopWallTool(); return }
          if (!wallStartRef.current) {
            wallStartRef.current = snapped
            const prev = new Line([snapped.x, snapped.y, snapped.x, snapped.y], {
              stroke: '#445c49', strokeWidth: WALL_THICKNESS, strokeLineCap: 'square',
              selectable: false, evented: false, opacity: 0.55, data: { type: 'preview' },
            })
            wallPreviewRef.current = prev; canvas.add(prev); canvas.requestRenderAll()
          } else {
            finishWall(snapped.x, snapped.y)
            wallStartRef.current = snapped
            const prev = new Line([snapped.x, snapped.y, snapped.x, snapped.y], {
              stroke: '#445c49', strokeWidth: WALL_THICKNESS, strokeLineCap: 'square',
              selectable: false, evented: false, opacity: 0.55, data: { type: 'preview' },
            })
            wallPreviewRef.current = prev; canvas.add(prev); canvas.requestRenderAll()
          }
          return
        }
        if (tool === 'door')    { placeDoor(snapped.x, snapped.y);   switchToolRef.current('select'); return }
        if (tool === 'window')  { placeWindow(snapped.x, snapped.y); switchToolRef.current('select'); return }
        if (tool === 'measure') {
          if (!measureStartRef.current) {
            measureStartRef.current = snapped
            const prev = new Line([snapped.x, snapped.y, snapped.x, snapped.y], {
              stroke: '#f59e0b', strokeWidth: 1.5, strokeDashArray: [5, 4],
              selectable: false, evented: false, data: { type: 'preview' },
            })
            measurePreviewRef.current = prev; canvas.add(prev); canvas.requestRenderAll()
          } else { finishMeasure(snapped.x, snapped.y); switchToolRef.current('select') }
          return
        }
        if (tool === 'eraser') {
          const target = opt.target as any // eslint-disable-line @typescript-eslint/no-explicit-any
          if (target && target.selectable !== false && target.data?.type !== 'outline') {
            canvas.remove(target); setSelectedProps(null)
            pushHistory(); triggerAutoSave(); updateObjCount(); canvas.requestRenderAll()
          }
        }
      })

      canvas.on('selection:created', (e: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const selected = e.selected ?? []
        const multi = selected.length > 1
        setIsMultiSelect(multi); setMultiSelectCount(selected.length)
        const o = selected[0]; if (o) setSelectedProps(extractObjProps(o))
      })
      canvas.on('selection:updated', () => {
        const active = canvas.getActiveObject() as any // eslint-disable-line @typescript-eslint/no-explicit-any
        const objs = active?.type === 'activeSelection' ? active.getObjects() : (active ? [active] : [])
        const multi = objs.length > 1
        setIsMultiSelect(multi); setMultiSelectCount(objs.length)
        const o = objs[0]; if (o) setSelectedProps(extractObjProps(o))
      })
      canvas.on('selection:cleared', () => { setSelectedProps(null); setIsMultiSelect(false); setMultiSelectCount(0) })

      canvas.on('object:modified', () => {
        // Alignment-Linien + Wand-Highlights aufräumen
        alignmentLinesRef.current.forEach((l: any) => { try { canvas.remove(l) } catch { /* ignore */ } }) // eslint-disable-line @typescript-eslint/no-explicit-any
        alignmentLinesRef.current = []
        canvas.getObjects().forEach((o: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          if (o.data?.type === 'wall') o.set('stroke', wandfarbeRef.current)
        })
        pushHistory(); triggerAutoSave()
        triggerDimUpdateRef.current()
      })
      canvas.on('object:added', () => { triggerDimUpdateRef.current() })
      canvas.on('object:removed', () => { triggerDimUpdateRef.current() })

      // ── SNAP-TO-WALL + ALIGNMENT-HILFSLINIEN ──────────────
      canvas.on('object:moving', (opt: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const obj = opt.target as any // eslint-disable-line @typescript-eslint/no-explicit-any
        if (!obj) return

        // ── SNAP-TO-GRID ──────────────────────────────────
        if (snapToGridRef.current) {
          const grid = gridSizeRef.current
          obj.set({ left: Math.round(obj.left / grid) * grid, top: Math.round(obj.top / grid) * grid })
          obj.setCoords()
        }

        // Alignment-Linien aus letztem Frame entfernen
        alignmentLinesRef.current.forEach((l: any) => { try { canvas.remove(l) } catch { /* ignore */ } }) // eslint-disable-line @typescript-eslint/no-explicit-any
        alignmentLinesRef.current = []

        const allObjs: any[] = canvas.getObjects() // eslint-disable-line @typescript-eslint/no-explicit-any

        // ── TEIL 1: Snap Tür/Fenster an nächste Wand ──────
        if (obj.data?.type === 'door' || obj.data?.type === 'window') {
          const SNAP_PX = 25
          const walls = allObjs.filter((o: any) => o.data?.type === 'wall') // eslint-disable-line @typescript-eslint/no-explicit-any
          const center = obj.getCenterPoint()

          let best: { d: number; x: number; y: number; angle: number; wall: any } | null = null // eslint-disable-line @typescript-eslint/no-explicit-any
          for (const wall of walls) {
            const { p1, p2 } = getWallWorldPoints(wall)
            const snap = getClosestPointOnSegment(center.x, center.y, p1.x, p1.y, p2.x, p2.y)
            if (snap.distance < SNAP_PX && (!best || snap.distance < best.d)) {
              const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI
              best = { d: snap.distance, x: snap.x, y: snap.y, angle, wall }
            }
          }

          // Alle Wände zurücksetzen (auf aktuelle Wandfarbe), dann beste highlighten
          walls.forEach((w: any) => w.set('stroke', wandfarbeRef.current)) // eslint-disable-line @typescript-eslint/no-explicit-any
          if (best) {
            // Einrasten: Objekt auf Wand-Mittellinie positionieren + ausrichten
            const hw = obj.getScaledWidth() / 2
            const hh = obj.getScaledHeight() / 2
            obj.set({ left: best.x - hw, top: best.y - hh, angle: best.angle })
            obj.setCoords()
            best.wall.set('stroke', '#94c1a4')
          }
        }

        // ── TEIL 2: Alignment-Hilfslinien ─────────────────
        const others = allObjs.filter((o: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
          o !== obj &&
          o.data?.type !== 'outline' &&
          o.data?.type !== 'alignment' &&
          o.data?.type !== 'preview'
        )
        if (others.length === 0 || others.length >= 50) {
          canvas.requestRenderAll()
          return
        }

        const TOLS = 5   // Toleranz in Canvas-Weltpixeln
        const mov = getObjBounds(obj)
        const newAlignLines: any[] = [] // eslint-disable-line @typescript-eslint/no-explicit-any
        const { Line: FLine } = fabricImports.current ?? {}
        if (!FLine) { canvas.requestRenderAll(); return }

        const lineOpts = {
          stroke: '#445c49', strokeWidth: 1, strokeDashArray: [5, 5],
          selectable: false, evented: false, opacity: 0.75,
          data: { type: 'alignment' },
        }

        for (const other of others) {
          const oth = getObjBounds(other)

          // Vertikale Hilfslinien (gleiche X-Koordinate)
          const vChecks: [number, number][] = [
            [mov.left,    oth.left],    [mov.left,    oth.centerX], [mov.left,    oth.right],
            [mov.centerX, oth.left],    [mov.centerX, oth.centerX], [mov.centerX, oth.right],
            [mov.right,   oth.left],    [mov.right,   oth.centerX], [mov.right,   oth.right],
          ]
          for (const [mVal, oVal] of vChecks) {
            if (Math.abs(mVal - oVal) < TOLS) {
              // Snap
              obj.set('left', obj.left + (oVal - mVal))
              obj.setCoords()
              Object.assign(mov, getObjBounds(obj))
              // Linie von oben nach unten durch beide Objekte
              const minY = Math.min(mov.top, oth.top) - 24
              const maxY = Math.max(mov.bottom, oth.bottom) + 24
              newAlignLines.push(new FLine([oVal, minY, oVal, maxY], lineOpts))
              break
            }
          }

          // Horizontale Hilfslinien (gleiche Y-Koordinate)
          const hChecks: [number, number][] = [
            [mov.top,     oth.top],     [mov.top,     oth.centerY], [mov.top,     oth.bottom],
            [mov.centerY, oth.top],     [mov.centerY, oth.centerY], [mov.centerY, oth.bottom],
            [mov.bottom,  oth.top],     [mov.bottom,  oth.centerY], [mov.bottom,  oth.bottom],
          ]
          for (const [mVal, oVal] of hChecks) {
            if (Math.abs(mVal - oVal) < TOLS) {
              // Snap
              obj.set('top', obj.top + (oVal - mVal))
              obj.setCoords()
              Object.assign(mov, getObjBounds(obj))
              // Linie von links nach rechts durch beide Objekte
              const minX = Math.min(mov.left, oth.left) - 24
              const maxX = Math.max(mov.right, oth.right) + 24
              newAlignLines.push(new FLine([minX, oVal, maxX, oVal], lineOpts))
              break
            }
          }
        }

        newAlignLines.forEach((l: any) => canvas.add(l)) // eslint-disable-line @typescript-eslint/no-explicit-any
        alignmentLinesRef.current = newAlignLines
        canvas.requestRenderAll()
      })

      // Drag & Drop
      cont.addEventListener('dragover', (e: DragEvent) => e.preventDefault())
      cont.addEventListener('drop', (e: DragEvent) => {
        e.preventDefault()
        const rect = cont.getBoundingClientRect()
        const p = canvas.getPointer({ offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top } as MouseEvent)
        const moebelJson = e.dataTransfer?.getData('application/moebel-symbol')
        if (moebelJson) { placeMoebel(JSON.parse(moebelJson) as MoebelSymbol, p.x, p.y); return }
        const tuerVariante = e.dataTransfer?.getData('application/tuer-variante')
        if (tuerVariante) { placeTuerVariante(tuerVariante, p.x, p.y); return }
        const fensterVariante = e.dataTransfer?.getData('application/fenster-variante')
        if (fensterVariante) { placeFensterVariante(fensterVariante, p.x, p.y); return }
      })

      // ── PAN via native events (zuverlässig für Mitte-Taste + Space+LMB) ──
      function onMouseDown(e: MouseEvent) {
        const isMid   = e.button === 1
        const isSpace = isSpaceRef.current && e.button === 0
        if (!isMid && !isSpace) return
        e.preventDefault()
        isPanningRef.current = true
        lastPanPosRef.current = { x: e.clientX, y: e.clientY }
        canvas.selection = false
        canvas.setCursor('grabbing')
        canvas.discardActiveObject()
        canvas.requestRenderAll()
      }
      function onMouseMove(e: MouseEvent) {
        if (!isPanningRef.current) return
        canvas.relativePan(new Point(
          e.clientX - lastPanPosRef.current.x,
          e.clientY - lastPanPosRef.current.y
        ))
        lastPanPosRef.current = { x: e.clientX, y: e.clientY }
        canvas.requestRenderAll()
      }
      function onMouseUp(e: MouseEvent) {
        if (!isPanningRef.current) return
        if (e.button === 1 || e.button === 0) {
          isPanningRef.current = false
          canvas.selection = activeToolRef.current === 'select'
          canvas.setCursor(isSpaceRef.current ? 'grab' : (activeToolRef.current === 'select' ? 'default' : 'crosshair'))
        }
      }
      cont.addEventListener('mousedown', onMouseDown)
      cont.addEventListener('mousemove', onMouseMove)
      cont.addEventListener('mouseup', onMouseUp)
      // Rechtsklick: Browser-Menü unterdrücken + Wand/Maß-Tool abbrechen
      function onContextMenu(e: MouseEvent) {
        e.preventDefault()
        const t = activeToolRef.current
        if (t === 'wall')    { stopWallTool();    return }
        if (t === 'measure') { stopMeasureTool(); return }
      }
      cont.addEventListener('contextmenu', onContextMenu)

      // Ctrl+Scroll = Browser-Zoom verhindern
      const preventCtrlScroll = (e: WheelEvent) => { if (e.ctrlKey || e.metaKey) e.preventDefault() }
      window.addEventListener('wheel', preventCtrlScroll, { passive: false })

      // ── LADEN ──
      if (initialCanvasJson) {
        try {
          const parsed = JSON.parse(initialCanvasJson)
          if (parsed.objects) {
            const SKIP_LOAD = new Set(['outline','preview','floor','dimension','collision'])
            parsed.objects = parsed.objects.filter(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (o: any) => !SKIP_LOAD.has(o.data?.type)
            )
          }
          await canvas.loadFromJSON(parsed)
          canvas.requestRenderAll()
          // Auto-Fit: Grundriss zentriert anzeigen
          setTimeout(() => fitToViewRef.current(), 150)
        } catch { /* ignore */ }
      }
      if (breiteM && laengeM) updateOutline(breiteM, laengeM)
      // Grid-Linien beim Init erstellen (Canvas ist frisch – gridCreatedRef ist false)
      createGridLinesRef.current()
      // Boden-Textur wiederherstellen
      if (initialBodenTextur && initialBodenTextur !== 'none') {
        setTimeout(() => applyFloorTexture(initialBodenTextur, canvas, breiteM, laengeM), 50)
      }
      canvas.requestRenderAll(); pushHistory(); updateObjCount()
      setLoading(false)

      // ── TASTATUR ──
      function handleKeyDown(ev: KeyboardEvent) {
        const tag = (ev.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        if (ev.key === 'Escape') {
          const t = activeToolRef.current
          if (t === 'wall')    { stopWallTool();    return }
          if (t === 'measure') { stopMeasureTool(); return }
          switchToolRef.current('select'); return
        }
        if (ev.code === 'Space') { isSpaceRef.current = true; canvas.setCursor('grab'); ev.preventDefault(); return }
        if (ev.key === '?') { setShowShortcuts(v => !v); return }
        if ((ev.key === 'Delete' || ev.key === 'Backspace') && !ev.repeat) {
          const obj = canvas.getActiveObject()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (obj && (obj as any).data?.type !== 'outline') {
            canvas.remove(obj); setSelectedProps(null)
            pushHistory(); triggerAutoSave(); updateObjCount(); canvas.requestRenderAll()
          }
        }
        if (ev.key === 'F11') { ev.preventDefault(); toggleFullscreenRef.current(); return }
        if (!ev.ctrlKey && !ev.metaKey) {
          if (ev.key.toLowerCase() === 'l') { toggleLockRef.current(); return }
          const map: Record<string, Tool> = { v:'select', w:'wall', d:'door', f:'window', m:'measure', e:'eraser' }
          if (map[ev.key.toLowerCase()]) switchToolRef.current(map[ev.key.toLowerCase()] as Tool)
        }
        if ((ev.ctrlKey || ev.metaKey) && ev.key === 'z' && !ev.shiftKey) { ev.preventDefault(); undo() }
        if ((ev.ctrlKey || ev.metaKey) && (ev.key === 'y' || (ev.key === 'z' && ev.shiftKey))) { ev.preventDefault(); redo() }
        if ((ev.ctrlKey || ev.metaKey) && ev.key === 's') { ev.preventDefault(); saveNow() }
        if ((ev.ctrlKey || ev.metaKey) && ev.key === 'g' && !ev.shiftKey) { ev.preventDefault(); groupSelectedRef.current() }
        if ((ev.ctrlKey || ev.metaKey) && ev.key === 'g' && ev.shiftKey)  { ev.preventDefault(); ungroupSelectedRef.current() }
      }
      function handleKeyUp(ev: KeyboardEvent) {
        if (ev.code === 'Space') {
          isSpaceRef.current = false
          if (!isPanningRef.current) canvas.setCursor(activeToolRef.current === 'select' ? 'default' : 'crosshair')
        }
      }
      window.addEventListener('keydown', handleKeyDown)
      window.addEventListener('keyup', handleKeyUp)

      return () => {
        disposed = true
        window.removeEventListener('keydown', handleKeyDown)
        window.removeEventListener('keyup', handleKeyUp)
        window.removeEventListener('wheel', preventCtrlScroll)
        cont.removeEventListener('mousedown', onMouseDown)
        cont.removeEventListener('mousemove', onMouseMove)
        cont.removeEventListener('mouseup', onMouseUp)
        cont.removeEventListener('contextmenu', onContextMenu)
        upperEl.removeEventListener('gesturestart', onGestureStart)
        upperEl.removeEventListener('gesturechange', onGestureChange)
        if (minimapThrottleRef.current) clearTimeout(minimapThrottleRef.current)
        ro.disconnect(); canvas.dispose()
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── switchTool ────────────────────────────────────────────

  const switchToolRef = useRef<(t: Tool) => void>(() => {})
  function switchTool(tool: Tool) {
    setActiveTool(tool); activeToolRef.current = tool
    const canvas = fabricRef.current; if (!canvas) return
    if (wallPreviewRef.current)    { canvas.remove(wallPreviewRef.current);    wallPreviewRef.current = null }
    if (measurePreviewRef.current) { canvas.remove(measurePreviewRef.current); measurePreviewRef.current = null }
    wallStartRef.current = null; measureStartRef.current = null
    canvas.selection = tool === 'select'
    canvas.setCursor(tool === 'select' ? 'default' : 'crosshair')
    if (tool !== 'select') canvas.discardActiveObject()
    canvas.requestRenderAll()
  }
  switchToolRef.current = switchTool

  // ── Zoom ─────────────────────────────────────────────────

  function zoomBy(factor: number) {
    const c = fabricRef.current; if (!c) return
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, c.getZoom() * factor))
    c.zoomToPoint({ x: c.getWidth() / 2, y: c.getHeight() / 2 }, z)
    setZoom(Math.round(z * 100) / 100); c.requestRenderAll()
  }
  function zoomReset() {
    const c = fabricRef.current; if (!c) return
    c.setViewportTransform([1,0,0,1,0,0]); setZoom(1); c.requestRenderAll()
  }

  // ── Fit to View ───────────────────────────────────────────

  function fitToView() {
    const canvas = fabricRef.current; if (!canvas) return
    const SKIP_FIT = new Set(['gridLine', 'floor', 'outline', 'preview', 'alignment', 'dimension', 'collision'])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const objs = canvas.getObjects().filter((o: any) => !SKIP_FIT.has(o.data?.type ?? ''))
    // Fallback: outline only (leere Leinwand mit Raumumriss)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const targets = objs.length > 0 ? objs : canvas.getObjects().filter((o: any) => o.data?.type === 'outline')
    if (!targets.length) { zoomReset(); return }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    targets.forEach((o: any) => {
      const b = o.getBoundingRect(true)
      minX = Math.min(minX, b.left); minY = Math.min(minY, b.top)
      maxX = Math.max(maxX, b.left + b.width); maxY = Math.max(maxY, b.top + b.height)
    })
    const pad = 80
    const z = Math.min(2, Math.max(MIN_ZOOM, Math.min(
      (canvas.getWidth() - pad * 2) / (maxX - minX || 1),
      (canvas.getHeight() - pad * 2) / (maxY - minY || 1)
    )))
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
    canvas.setViewportTransform([z, 0, 0, z, canvas.getWidth() / 2 - cx * z, canvas.getHeight() / 2 - cy * z])
    setZoom(Math.round(z * 100) / 100); canvas.requestRenderAll()
  }
  fitToViewRef.current = fitToView

  // ── Alle löschen ──────────────────────────────────────────

  function clearAll() {
    setRaumConfirm({ open: true, msg: 'Alle Objekte löschen?', onOk: doClearAll })
  }
  function doClearAll() {
    const canvas = fabricRef.current; if (!canvas) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas.getObjects().filter((o: any) => o.data?.type !== 'outline').forEach((o: any) => canvas.remove(o))
    setSelectedProps(null); pushHistory(); triggerAutoSave(); updateObjCount(); canvas.requestRenderAll()
  }

  function deleteSelected() {
    const c = fabricRef.current; if (!c) return
    const obj = c.getActiveObject()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!obj || (obj as any).data?.type === 'outline') return
    c.remove(obj); setSelectedProps(null); pushHistory(); triggerAutoSave(); updateObjCount(); c.requestRenderAll()
  }

  async function duplicateSelected() {
    const c = fabricRef.current; if (!c) return
    const obj = c.getActiveObject(); if (!obj) return
    const clone = await obj.clone(['data', 'name'])
    clone.set({ left: (obj.left ?? 0) + 20, top: (obj.top ?? 0) + 20 })
    c.add(clone); c.setActiveObject(clone); c.requestRenderAll()
    pushHistory(); triggerAutoSave(); updateObjCount(); setContextMenu(null)
  }

  function bringForward() {
    const c = fabricRef.current; if (!c) return
    const obj = c.getActiveObject(); if (!obj) return
    c.bringObjectForward(obj); c.requestRenderAll(); setContextMenu(null)
  }
  function sendBackward() {
    const c = fabricRef.current; if (!c) return
    const obj = c.getActiveObject(); if (!obj) return
    c.sendObjectBackwards(obj)
    if (outlineRef.current) c.sendObjectToBack(outlineRef.current)
    c.requestRenderAll(); setContextMenu(null)
  }
  function bringToFront() {
    const c = fabricRef.current; if (!c) return
    const obj = c.getActiveObject(); if (!obj) return
    c.bringObjectToFront(obj); c.requestRenderAll(); setContextMenu(null)
  }
  function sendToBack() {
    const c = fabricRef.current; if (!c) return
    const obj = c.getActiveObject(); if (!obj) return
    c.sendObjectToBack(obj)
    if (outlineRef.current) c.sendObjectToBack(outlineRef.current)
    c.requestRenderAll(); setContextMenu(null)
  }

  // ── Fullscreen ─────────────────────────────────────────────
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {})
    } else {
      document.exitFullscreen?.().catch(() => {})
    }
  }
  const toggleFullscreenRef = useRef(toggleFullscreen)
  toggleFullscreenRef.current = toggleFullscreen

  // ── Objekt sperren/entsperren ─────────────────────────────
  function toggleLock() {
    const c = fabricRef.current; if (!c) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = c.getActiveObject() as any; if (!obj || obj.data?.type === 'outline') return
    const locked = !obj.data?.locked
    obj.set({
      lockMovementX: locked, lockMovementY: locked,
      lockScalingX: locked,  lockScalingY: locked,
      lockRotation: locked,
      data: { ...obj.data, locked },
    })
    c.requestRenderAll()
    setSelectedProps(extractObjProps(obj))
    triggerAutoSave()
  }
  toggleLockRef.current = toggleLock

  // ── Objekt-Eigenschaft live updaten ──────────────────────
  function applyObjProp(field: 'x'|'y'|'angle'|'name', raw: string) {
    const canvas = fabricRef.current; if (!canvas) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = canvas.getActiveObject() as any; if (!obj) return
    const num = parseFloat(raw)
    if (field === 'x')     { obj.set({ left:  isNaN(num) ? obj.left  : num }); obj.setCoords?.() }
    if (field === 'y')     { obj.set({ top:   isNaN(num) ? obj.top   : num }); obj.setCoords?.() }
    if (field === 'angle') { obj.set({ angle: isNaN(num) ? obj.angle : num }); obj.setCoords?.() }
    if (field === 'name')  { obj.name = raw }
    canvas.requestRenderAll()
    setSelectedProps(extractObjProps(obj))
    triggerAutoSave()
  }

  // ── Favoriten-Toggle (localStorage) ──────────────────────
  function toggleFavorit(id: string) {
    setFavoriten(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      localStorage.setItem('raumplaner-favoriten', JSON.stringify(Array.from(next)))
      return next
    })
  }

  // ── Freigabe-Toggle ─────────────────────────────────────────
  async function toggleFreigabe() {
    setFreigabeSaving(true)
    try {
      const naechsterZustand = !freigabeAktiv
      const res = await raumFreigabeAktualisieren(raumId, naechsterZustand, projektId)
      if (!res.fehler) {
        setFreigabeAktiv(naechsterZustand)
        if (res.token) setFreigabeToken(res.token)
        if (!freigabeToken) {
          // Token nachladen falls noch nicht vorhanden
          const info = await getRaumFreigabeInfo(raumId)
          if (info.token) setFreigabeToken(info.token)
        }
      }
    } finally { setFreigabeSaving(false) }
  }

  async function kopiereFreigabeLink() {
    if (!freigabeToken) return
    const url = `${window.location.origin}/raumplan/${freigabeToken}`
    await navigator.clipboard.writeText(url)
    setLinkKopiert(true)
    setTimeout(() => setLinkKopiert(false), 2000)
  }

  // ── Boden-Textur ─────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyFloorTexture(textur: string, canvas?: any, bM?: number | null, lM?: number | null) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const c = canvas ?? fabricRef.current
    const imp = fabricImports.current
    if (!c || !imp) return

    if (textur === 'none') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      c.getObjects().filter((o: any) => o.data?.type === 'floor').forEach((o: any) => c.remove(o))
      c.requestRenderAll()
      return
    }

    const patternCanvas = createPatternCanvas(textur)
    if (!patternCanvas) return
    const pattern = new imp.Pattern({ source: patternCanvas, repeat: 'repeat' })

    // Immer alte Bodenrechtecke entfernen und neu berechnen
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c.getObjects().filter((o: any) => o.data?.type === 'floor').forEach((o: any) => c.remove(o))

    // Bounding-Box aus allen Wänden berechnen (absolute Koordinaten)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const walls: any[] = c.getObjects().filter((o: any) => o.data?.type === 'wall')
    const bW = (bM ?? breiteM) ?? (parseFloat(raumBreite) || 4)
    const lL = (lM ?? laengeM) ?? (parseFloat(raumLaenge) || 5)

    let left = 0, top = 0, width = bW * SCALE, height = lL * SCALE
    if (walls.length > 0) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      walls.forEach((w: any) => {
        const bb = w.getBoundingRect(true)  // absolute coords
        minX = Math.min(minX, bb.left);  maxX = Math.max(maxX, bb.left + bb.width)
        minY = Math.min(minY, bb.top);   maxY = Math.max(maxY, bb.top  + bb.height)
      })
      const PAD = WALL_THICKNESS / 2
      left = minX - PAD; top = minY - PAD
      width = maxX - minX + PAD * 2; height = maxY - minY + PAD * 2
    }

    const floorRect = new imp.Rect({
      left, top, width, height,
      selectable: false, evented: false, hasControls: false,
      data: { type: 'floor' }, name: 'Bodenfläche',
      fill: pattern,
    })

    c.add(floorRect)
    reorderLayersRef.current()
    c.requestRenderAll()
  }

  async function changeBodenTextur(textur: string) {
    setBodenTextur(textur)
    bodenTexturRef.current = textur
    applyFloorTexture(textur)
    // Debounced save
    await raumTexturenSpeichern(raumId, textur, wandfarbe, projektId)
  }

  // ── Wandfarbe ─────────────────────────────────────────────
  function applyWallColor(color: string) {
    const canvas = fabricRef.current; if (!canvas) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas.getObjects().filter((o: any) => o.data?.type === 'wall').forEach((o: any) => {
      o.set('stroke', color)
    })
    canvas.requestRenderAll()
    pushHistory()
    triggerAutoSave()
  }

  async function changeWandfarbe(color: string) {
    setWandfarbe(color)
    applyWallColor(color)
    await raumTexturenSpeichern(raumId, bodenTextur, color, projektId)
  }

  // ── Maßketten ─────────────────────────────────────────────
  function generateDimensions() {
    const canvas = fabricRef.current, imp = fabricImports.current
    if (!canvas || !imp) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas.getObjects().filter((o: any) => o.data?.type === 'dimension').forEach((o: any) => canvas.remove(o))
    if (!showDimensionsRef.current) { canvas.requestRenderAll(); return }

    const color = '#64748b'
    const GAP = 38, TICK = 6, FS = 10

    // Outline-Dimensionen (Breite & Länge des Raums)
    const bW = (breiteM ?? 0) * SCALE
    const lL = (laengeM ?? 0) * SCALE
    if (bW > 0 && lL > 0) {
      addDimLine(canvas, imp, 0, -GAP, bW, -GAP, `${breiteM?.toFixed(2)} m`, false, color, TICK, FS)
      addDimLine(canvas, imp, -GAP, 0, -GAP, lL, `${laengeM?.toFixed(2)} m`, true, color, TICK, FS)
    }

    // Wand-Segment-Längen
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas.getObjects().filter((o: any) => o.data?.type === 'wall').forEach((wall: any) => {
      const pts = getWallWorldPoints(wall)
      const dx = pts.p2.x - pts.p1.x, dy = pts.p2.y - pts.p1.y
      const len = Math.sqrt(dx * dx + dy * dy) / SCALE  // meters
      if (len < 0.05) return
      const angle = Math.atan2(dy, dx) * 180 / Math.PI
      const cx = (pts.p1.x + pts.p2.x) / 2
      const cy = (pts.p1.y + pts.p2.y) / 2
      const lbl = new imp.Text(`${len.toFixed(2)} m`, {
        left: cx, top: cy - 12, angle,
        fontSize: 8, fill: color, fontFamily: 'monospace',
        originX: 'center', originY: 'center',
        selectable: false, evented: false, hoverCursor: 'default',
        data: { type: 'dimension' },
      })
      canvas.add(lbl)
    })

    canvas.requestRenderAll()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function addDimLine(canvas: any, imp: any, x1: number, y1: number, x2: number, y2: number, label: string, isVert: boolean, color: string, TICK: number, FS: number) {
    const mk = (obj: object) => Object.assign(obj, { data: { type: 'dimension' } })
    const objs = [
      mk(new imp.Line([x1, y1, x2, y2], { stroke: color, strokeWidth: 0.8, selectable: false, evented: false, strokeDashArray: [5, 3] })),
    ]
    if (isVert) {
      objs.push(mk(new imp.Line([x1 - TICK, y1, x1 + TICK, y1], { stroke: color, strokeWidth: 1.5, selectable: false, evented: false })))
      objs.push(mk(new imp.Line([x2 - TICK, y2, x2 + TICK, y2], { stroke: color, strokeWidth: 1.5, selectable: false, evented: false })))
      objs.push(mk(new imp.Text(label, {
        left: x1 - 20, top: (y1 + y2) / 2, angle: -90,
        fontSize: FS, fill: color, fontFamily: 'monospace',
        originX: 'center', originY: 'center', selectable: false, evented: false,
      })))
    } else {
      objs.push(mk(new imp.Line([x1, y1 - TICK, x1, y1 + TICK], { stroke: color, strokeWidth: 1.5, selectable: false, evented: false })))
      objs.push(mk(new imp.Line([x2, y2 - TICK, x2, y2 + TICK], { stroke: color, strokeWidth: 1.5, selectable: false, evented: false })))
      objs.push(mk(new imp.Text(label, {
        left: (x1 + x2) / 2, top: y1 - 18,
        fontSize: FS, fill: color, fontFamily: 'monospace',
        originX: 'center', originY: 'center', selectable: false, evented: false,
      })))
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    objs.forEach((o: any) => canvas.add(o))
  }

  function triggerDimUpdate() {
    if (dimTimerRef.current) clearTimeout(dimTimerRef.current)
    dimTimerRef.current = setTimeout(generateDimensions, 400)
  }
  triggerDimUpdateRef.current = triggerDimUpdate

  // Sync refs
  showDimensionsRef.current  = showDimensions
  allProdukteRef.current     = allProdukte

  // ── Templates laden ─────────────────────────────────────────
  function ladeTemplate(template: RaumTemplate) {
    const canvas = fabricRef.current, imp = fabricImports.current
    if (!canvas || !imp) return
    const { Rect, Text, Group } = imp
    template.objekte.forEach(obj => {
      const w = obj.breite * SCALE / 100
      const h = obj.tiefe  * SCALE / 100
      const bg  = new Rect({ width: w, height: h, fill: obj.farbe, stroke: '#1e293b', strokeWidth: 1.5, rx: 3, ry: 3, originX: 'left', originY: 'top' })
      const lbl = new Text(obj.name, {
        fontSize: Math.max(7, Math.min(11, w / Math.max(obj.name.length, 4) * 1.4)),
        fill: '#1e293b', textAlign: 'center',
        originX: 'center', originY: 'center', left: w / 2, top: h / 2,
        fontFamily: 'system-ui, sans-serif',
      })
      canvas.add(new Group([bg, lbl], {
        left: obj.x * SCALE / 100, top: obj.y * SCALE / 100,
        data: { type: 'moebel', name: obj.name }, name: obj.name,
      }))
    })
    pushHistory(); triggerAutoSave(); updateObjCount(); canvas.requestRenderAll()
    setShowTemplatesModal(false)
  }

  // ── Produkt-Verknüpfung ──────────────────────────────────────

  async function loadProdukte() {
    if (produkteLoaded) return
    const data = await getAllProdukteForPlaner()
    setAllProdukte(data); allProdukteRef.current = data; setProdukteLoaded(true)
  }

  function openProduktModal() {
    setProduktSuche(''); setProduktKatFilter('')
    loadProdukte(); setShowProduktModal(true)
  }

  function linkProdukt(p: ProduktForPlaner) {
    const canvas = fabricRef.current; if (!canvas) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = canvas.getActiveObject() as any; if (!obj) return
    obj.set('data', { ...obj.data, produkt_id: p.id })
    canvas.requestRenderAll()
    setSelectedProps(extractObjProps(obj))
    pushHistory(); triggerAutoSave()
    setShowProduktModal(false)
  }

  function unlinkProdukt() {
    const canvas = fabricRef.current; if (!canvas) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = canvas.getActiveObject() as any; if (!obj) return
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { produkt_id: _pid, ...restData } = obj.data ?? {}
    obj.set('data', restData)
    canvas.requestRenderAll()
    setSelectedProps(extractObjProps(obj))
    pushHistory(); triggerAutoSave()
  }

  // Inline Kosten-Berechnung aus Canvas (liest refs, kein State benötigt)
  function getKostenUebersicht(): { items: KostenItem[]; gesamt: number } {
    const canvas = fabricRef.current; if (!canvas) return { items: [], gesamt: 0 }
    const produktMap = new Map(allProdukteRef.current.map(p => [p.id, p]))
    const grouped = new Map<string, KostenItem>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas.getObjects().forEach((obj: any) => {
      const pid = obj.data?.produkt_id; if (!pid) return
      const prod = produktMap.get(pid); if (!prod) return
      const existing = grouped.get(pid)
      if (existing) existing.count++
      else grouped.set(pid, { name: prod.name, count: 1, preis: prod.verkaufspreis_netto ?? 0 })
    })
    const items = Array.from(grouped.values())
    return { items, gesamt: items.reduce((s, i) => s + i.preis * i.count, 0) }
  }

  function exportKostenCsv() {
    const { items, gesamt } = getKostenUebersicht()
    if (!items.length) return
    const rows = [
      ['Produkt', 'Menge', 'Einzelpreis Netto', 'Gesamt Netto'],
      ...items.map(i => [i.name, String(i.count), i.preis.toFixed(2), (i.preis * i.count).toFixed(2)]),
      ['', '', 'GESAMT', gesamt.toFixed(2)],
    ]
    const csv = rows.map(r => r.map(v => `"${v.replace(/"/g,'""')}"`).join(';')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }))
    a.download = `Kosten-${raumName}.csv`; a.click()
  }

  async function createAngebotFromCanvas() {
    if (allProdukteRef.current.length === 0) await loadProdukte()
    const { items } = getKostenUebersicht()
    if (!items.length) { setRaumAlert('Keine Produkte mit Möbeln verknüpft.'); return }
    setAngebotCreating(true)
    try {
      const positionen = items.map(i => ({ name: i.name, preis_netto: i.preis, menge: i.count }))
      const res = await raumplanAngebotErstellen(projektId, positionen)
      if ('id' in res) router.push(`/dashboard/projekte/${projektId}/angebote`)
      else setRaumAlert('Fehler: ' + res.fehler)
    } finally { setAngebotCreating(false) }
  }

  // ── Layer-System ─────────────────────────────────────────────

  function countObjectsInLayer(types: string[]): number {
    const canvas = fabricRef.current; if (!canvas) return 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return canvas.getObjects().filter((o: any) =>
      types.includes(o.data?.type) &&
      o.data?.type !== 'outline' && o.data?.type !== 'preview' &&
      o.data?.type !== 'collision' && o.data?.type !== 'dimension'
    ).length
  }

  function applyLayerToCanvas(layerId: string, visible: boolean, locked: boolean) {
    const canvas = fabricRef.current; if (!canvas) return
    const layer = LAYERS.find(l => l.id === layerId); if (!layer) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas.getObjects().forEach((obj: any) => {
      if (!layer.types.includes(obj.data?.type)) return
      obj.set('visible', visible)
      obj.set('selectable', !locked)
      obj.set('evented', !locked)
      obj.set({ lockMovementX: locked, lockMovementY: locked, lockScalingX: locked, lockScalingY: locked, lockRotation: locked })
    })
    if (locked) {
      const active = canvas.getActiveObject()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (active && layer.types.includes((active as any).data?.type)) canvas.discardActiveObject()
    }
    canvas.requestRenderAll()
  }

  function toggleLayerVisibility(layerId: string) {
    // Use functional update to always read latest state (avoids stale closure)
    setLayerStates(prev => {
      const cur = prev[layerId]; if (!cur) return prev
      const newVisible = !cur.visible
      applyLayerToCanvas(layerId, newVisible, cur.locked)
      const next = { ...prev, [layerId]: { ...cur, visible: newVisible } }
      try { localStorage.setItem(`raumplaner-layers-${raumId}`, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  function toggleLayerLock(layerId: string) {
    setLayerStates(prev => {
      const cur = prev[layerId]; if (!cur) return prev
      const newLocked = !cur.locked
      applyLayerToCanvas(layerId, cur.visible, newLocked)
      const next = { ...prev, [layerId]: { ...cur, locked: newLocked } }
      try { localStorage.setItem(`raumplaner-layers-${raumId}`, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  function showAllLayers() {
    const canvas = fabricRef.current; if (!canvas) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas.getObjects().forEach((obj: any) => { if (obj.data?.type !== 'outline' && obj.data?.type !== 'preview') obj.set('visible', true) })
    canvas.requestRenderAll()
    const next = Object.fromEntries(LAYERS.map(l => [l.id, { visible: true, locked: layerStates[l.id]?.locked ?? false }]))
    setLayerStates(next)
    try { localStorage.setItem(`raumplaner-layers-${raumId}`, JSON.stringify(next)) } catch { /* ignore */ }
  }

  function hideAllLayers() {
    const canvas = fabricRef.current; if (!canvas) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas.getObjects().forEach((obj: any) => {
      if (obj.data?.type !== 'outline' && obj.data?.type !== 'preview' && obj.data?.type !== 'wall') obj.set('visible', false)
    })
    canvas.requestRenderAll()
    const next = Object.fromEntries(LAYERS.map(l => [l.id, { visible: l.id === 'walls', locked: layerStates[l.id]?.locked ?? false }]))
    setLayerStates(next)
    try { localStorage.setItem(`raumplaner-layers-${raumId}`, JSON.stringify(next)) } catch { /* ignore */ }
  }

  // ── Ausrichten ───────────────────────────────────────────────

  function alignSelected(direction: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom') {
    const canvas = fabricRef.current, imp = fabricImports.current; if (!canvas || !imp) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const active = canvas.getActiveObject() as any
    if (!active) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const objs: any[] = active.type === 'activeSelection' ? active.getObjects() : [active]
    if (objs.length < 2) return

    canvas.discardActiveObject()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rects = objs.map((o: any) => ({ obj: o, ...o.getBoundingRect(true) }))

    const minLeft   = Math.min(...rects.map(r => r.left))
    const maxRight  = Math.max(...rects.map(r => r.left + r.width))
    const minTop    = Math.min(...rects.map(r => r.top))
    const maxBottom = Math.max(...rects.map(r => r.top + r.height))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rects.forEach(({ obj, left, top, width, height }: any) => {
      switch (direction) {
        case 'left':    obj.set('left', obj.left + (minLeft - left)); break
        case 'right':   obj.set('left', obj.left + (maxRight - (left + width))); break
        case 'centerH': obj.set('left', obj.left + ((minLeft + maxRight) / 2 - (left + width / 2))); break
        case 'top':     obj.set('top',  obj.top  + (minTop  - top)); break
        case 'bottom':  obj.set('top',  obj.top  + (maxBottom - (top + height))); break
        case 'centerV': obj.set('top',  obj.top  + ((minTop + maxBottom) / 2 - (top + height / 2))); break
      }
      obj.setCoords()
    })

    const sel = new imp.ActiveSelection(objs, { canvas })
    canvas.setActiveObject(sel); canvas.requestRenderAll()
    pushHistory(); triggerAutoSave()
  }

  function distributeSelected(direction: 'H' | 'V') {
    const canvas = fabricRef.current, imp = fabricImports.current; if (!canvas || !imp) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const active = canvas.getActiveObject() as any
    if (!active) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const objs: any[] = active.type === 'activeSelection' ? active.getObjects() : [active]
    if (objs.length < 3) return

    canvas.discardActiveObject()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rects = objs.map((o: any) => ({ obj: o, ...o.getBoundingRect(true) }))

    if (direction === 'H') {
      rects.sort((a, b) => a.left - b.left)
      const totalW = rects.reduce((s, r) => s + r.width, 0)
      const span   = rects[rects.length - 1].left + rects[rects.length - 1].width - rects[0].left
      const gap    = (span - totalW) / (rects.length - 1)
      let x = rects[0].left
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rects.forEach(({ obj, left, width }: any) => {
        obj.set('left', obj.left + (x - left)); obj.setCoords(); x += width + gap
      })
    } else {
      rects.sort((a, b) => a.top - b.top)
      const totalH = rects.reduce((s, r) => s + r.height, 0)
      const span   = rects[rects.length - 1].top + rects[rects.length - 1].height - rects[0].top
      const gap    = (span - totalH) / (rects.length - 1)
      let y = rects[0].top
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rects.forEach(({ obj, top, height }: any) => {
        obj.set('top', obj.top + (y - top)); obj.setCoords(); y += height + gap
      })
    }

    const sel = new imp.ActiveSelection(objs, { canvas })
    canvas.setActiveObject(sel); canvas.requestRenderAll()
    pushHistory(); triggerAutoSave()
  }

  // ── Gruppieren ────────────────────────────────────────────────

  function groupSelected() {
    const canvas = fabricRef.current; if (!canvas) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const active = canvas.getActiveObject() as any
    if (!active || active.type !== 'activeSelection') return
    active.toGroup()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const grp = canvas.getActiveObject() as any
    if (grp) { grp.set('data', { type: 'group' }); grp.set('name', `Gruppe (${grp.getObjects().length})`) }
    canvas.requestRenderAll()
    pushHistory(); triggerAutoSave(); updateObjCount()
    setIsMultiSelect(false)
  }

  function ungroupSelected() {
    const canvas = fabricRef.current; if (!canvas) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const active = canvas.getActiveObject() as any
    if (!active || active.data?.type !== 'group') return
    active.toActiveSelection()
    canvas.requestRenderAll()
    pushHistory(); triggerAutoSave(); updateObjCount()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sel = canvas.getActiveObject() as any
    if (sel) {
      setIsMultiSelect(true)
      setMultiSelectCount(sel.getObjects?.()?.length ?? 0)
    }
  }

  groupSelectedRef.current   = groupSelected
  ungroupSelectedRef.current = ungroupSelected

  // ── Stückliste ────────────────────────────────────────────────

  function getStueckliste(): StuecklisteItem[] {
    const canvas = fabricRef.current; if (!canvas) return []
    const SKIP = new Set(['outline','preview','floor','dimension','collision','alignment'])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const objs = canvas.getObjects().filter((o: any) => !SKIP.has(o.data?.type ?? ''))
    const map = new Map<string, StuecklisteItem>()
    const produktMap = new Map(allProdukteRef.current.map(p => [p.id, p]))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    objs.forEach((o: any) => {
      const nm = o.name ?? 'Unbekannt'
      const w = Math.round((o.getScaledWidth?.() ?? 0) / SCALE * 100)
      const h = Math.round((o.getScaledHeight?.() ?? 0) / SCALE * 100)
      const pid = o.data?.produkt_id
      const prod = pid ? produktMap.get(pid) : null
      const preis = prod?.verkaufspreis_netto ?? null
      const key = `${nm}_${w}_${h}`
      const existing = map.get(key)
      if (existing) { existing.menge++; if (existing.einzelpreis !== null && preis !== null) existing.gesamt = existing.einzelpreis * (existing.menge) }
      else map.set(key, { nr: map.size + 1, name: nm, breite: w, laenge: h, menge: 1, einzelpreis: preis, gesamt: preis })
    })
    return Array.from(map.values()).map((item, i) => ({ ...item, nr: i + 1, gesamt: item.einzelpreis !== null ? item.einzelpreis * item.menge : null }))
  }

  function exportStuecklisteCsv() {
    const items = getStueckliste(); if (!items.length) return
    const rows = [
      ['Nr', 'Bezeichnung', 'Breite (cm)', 'Länge (cm)', 'Menge', 'Einzelpreis Netto', 'Gesamt Netto'],
      ...items.map(i => [
        String(i.nr), i.name, String(i.breite), String(i.laenge), String(i.menge),
        i.einzelpreis !== null ? i.einzelpreis.toFixed(2) : '',
        i.gesamt !== null ? i.gesamt.toFixed(2) : '',
      ]),
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }))
    a.download = `Stueckliste_${raumName}.csv`; a.click()
  }

  async function exportStuecklisteXlsx() {
    const items = getStueckliste(); if (!items.length) return
    const XLSX = await import('xlsx')
    const wsData = [
      ['Nr', 'Bezeichnung', 'Breite (cm)', 'Länge (cm)', 'Menge', 'Einzelpreis Netto', 'Gesamt Netto'],
      ...items.map(i => [
        i.nr, i.name, i.breite, i.laenge, i.menge,
        i.einzelpreis ?? '', i.gesamt ?? '',
      ]),
    ]
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    // Spaltenbreiten
    ws['!cols'] = [{ wch: 4 }, { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 18 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Stückliste')
    XLSX.writeFile(wb, `Stueckliste_${raumName}.xlsx`)
  }

  // ── Etagen-Verwaltung ─────────────────────────────────────────

  async function ladeEtage(etage: EtageType) {
    if (aktiveEtageId === etage.id) return
    // 1. Aktuelle Etage speichern
    const json = getCanvasJson()
    if (aktiveEtageIdRef.current) await etageSpeichern(aktiveEtageIdRef.current, json)
    // 2. Neue Etage laden
    const canvas = fabricRef.current, imp = fabricImports.current
    if (!canvas || !imp) return
    canvas.clear()
    if (etage.grundriss_json) {
      try {
        const parsed = JSON.parse(etage.grundriss_json)
        if (parsed.objects) {
          const SKIP = new Set(['outline','preview','floor','dimension','collision'])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          parsed.objects = parsed.objects.filter((o: any) => !SKIP.has(o.data?.type))
        }
        await canvas.loadFromJSON(parsed)
      } catch { /* ignore */ }
    }
    if (breiteM && laengeM) { outlineRef.current = null; updateOutline(breiteM, laengeM) }
    gridCreatedRef.current = false; createGridLinesRef.current()
    canvas.requestRenderAll(); updateObjCount()
    fitToViewRef.current()
    setAktiveEtageId(etage.id)
    aktiveEtageIdRef.current = etage.id
    setSaveStatus('saved')
  }

  async function erstelleEtage() {
    if (etagenLoading) return
    setEtagenLoading(true)
    // Aktuelle Etage speichern zuerst
    const json = getCanvasJson()
    if (aktiveEtageIdRef.current) await etageSpeichern(aktiveEtageIdRef.current, json)
    const newNum = etagen.length > 0 ? Math.max(...etagen.map(e => e.etage_nummer)) + 1 : 0
    const names: Record<number, string> = { 0: 'Erdgeschoss', 1: '1. OG', 2: '2. OG', 3: '3. OG', '-1': 'Untergeschoss' }
    const name = names[newNum] ?? `${newNum}. OG`
    try {
      const res = await etageErstellen(raumId, name, newNum, etagen.length)
      if ('id' in res) {
        const neueEtage: EtageType = { id: res.id, name, etage_nummer: newNum, sortierung: etagen.length, grundriss_json: null }
        setEtagen(prev => [...prev, neueEtage])
        // Leere neue Etage laden
        const canvas = fabricRef.current, imp = fabricImports.current
        if (canvas && imp) {
          canvas.clear()
          if (breiteM && laengeM) { outlineRef.current = null; updateOutline(breiteM, laengeM) }
          gridCreatedRef.current = false; createGridLinesRef.current()
          canvas.requestRenderAll()
          updateObjCount()
        }
        setAktiveEtageId(res.id); aktiveEtageIdRef.current = res.id
        pushHistory(); setSaveStatus('saved')
      }
    } finally { setEtagenLoading(false) }
  }

  async function loescheEtage(etage: EtageType) {
    if (etagen.length <= 1) { setRaumAlert('Mindestens eine Etage muss vorhanden sein.'); return }
    setRaumConfirm({ open: true, msg: `Etage "${etage.name}" löschen?`, onOk: () => doLoescheEtage(etage) })
  }
  async function doLoescheEtage(etage: EtageType) {
    await etageLoeschen(etage.id)
    const updated = etagen.filter(e => e.id !== etage.id)
    setEtagen(updated)
    if (aktiveEtageId === etage.id) {
      const next = updated[0]
      if (next) await ladeEtage(next)
    }
  }

  // ── Bild-Export ─────────────────────────────────────────────
  function exportAsImage() {
    const canvas = fabricRef.current; if (!canvas) return
    // Grid-Objekte temporär ausblenden
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gridObjs = canvas.getObjects().filter((o: any) => o.data?.type === 'gridLine')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gridObjs.forEach((o: any) => o.set('visible', false))

    // Hintergrund
    const prevBg = canvas.backgroundColor
    canvas.backgroundColor = bildTransparent && bildFormat === 'png' ? '' : '#ffffff'

    canvas.requestRenderAll()
    const dataUrl = canvas.toDataURL({
      format: bildFormat,
      multiplier: bildMultiplier,
      quality: 0.95,
    })

    // Wiederherstellen
    canvas.backgroundColor = prevBg
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gridObjs.forEach((o: any) => o.set('visible', showGridRef.current))
    canvas.requestRenderAll()

    const a = document.createElement('a')
    a.download = `Grundriss-${raumName}.${bildFormat}`
    a.href = dataUrl; a.click()
    setShowBildModal(false)
  }

  function handleMinimapClick(e: React.MouseEvent<HTMLDivElement>) {
    const canvas = fabricRef.current; if (!canvas) return
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = (e.clientX - rect.left) / rect.width   // 0..1
    const my = (e.clientY - rect.top)  / rect.height  // 0..1
    const cW = canvas.getWidth(), cH = canvas.getHeight()
    const Z  = canvas.getZoom()
    // Klickpunkt in Weltkoordinaten (bei Zoom=1, Pan=0)
    const wx = mx * cW, wy = my * cH
    // Viewport auf diesen Weltpunkt zentrieren
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas.setViewportTransform([Z, 0, 0, Z, cW / 2 - wx * Z, cH / 2 - wy * Z] as any)
    canvas.requestRenderAll()
  }

  // Minimap-Update: kurz auf Identitäts-Viewport schalten, PNG schießen, zurück
  function doUpdateMinimap() {
    if (isCapturingMinimap.current) return
    const canvas = fabricRef.current; if (!canvas) return
    const cW = canvas.getWidth(), cH = canvas.getHeight()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vpt = [...canvas.viewportTransform] as any[]
    isCapturingMinimap.current = true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0] as any)
    canvas.renderAll()
    const dataUrl = canvas.toDataURL({ format: 'jpeg', quality: 0.5 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas.setViewportTransform(vpt as any)
    canvas.renderAll()
    isCapturingMinimap.current = false
    setMinimapImage(dataUrl)
    // Viewport-Rechteck berechnen
    const Z = vpt[0], pX = vpt[4], pY = vpt[5]
    const MW = 150, MH = 100
    const rx = Math.max(0, -pX / Z * (MW / cW))
    const ry = Math.max(0, -pY / Z * (MH / cH))
    setViewportRect({
      x: rx,
      y: ry,
      w: Math.min(MW - rx, MW / Z),
      h: Math.min(MH - ry, MH / Z),
    })
  }
  updateMinimapRef.current = doUpdateMinimap

  async function saveRaumMasse() {
    const b = parseFloat(raumBreite) || null
    const l = parseFloat(raumLaenge) || null
    const h = parseFloat(raumHoehe) || null
    await raumMasseAktualisieren(raumId, b, l, h, projektId)
    updateOutline(b, l)
  }

  // ── PDF Export (FIXED: Bounding-Box basierter Export) ────────

  async function exportPdf() {
    const canvas = fabricRef.current; if (!canvas) return
    const { default: jsPDF } = await import('jspdf')
    const GREEN: [number, number, number] = [68, 92, 73]

    // ── Bounding Box aller sichtbaren Inhalts-Objekte ──
    const SKIP_PDF = new Set(['alignment','preview','dimension','collision','gridLine'])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exportObjs = canvas.getObjects().filter((o: any) => !SKIP_PDF.has(o.data?.type ?? ''))
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    exportObjs.forEach((o: any) => {
      const b = o.getBoundingRect(true)
      minX = Math.min(minX, b.left); minY = Math.min(minY, b.top)
      maxX = Math.max(maxX, b.left + b.width); maxY = Math.max(maxY, b.top + b.height)
    })
    if (!isFinite(minX)) { minX = 0; minY = 0; maxX = canvas.getWidth(); maxY = canvas.getHeight() }

    const PAD = 40
    const contentW = maxX - minX + PAD * 2
    const contentH = maxY - minY + PAD * 2

    // ── Viewport + Grid temporär anpassen ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const savedVpt = [...(canvas.viewportTransform ?? [1,0,0,1,0,0])] as any[]
    const savedBg  = canvas.backgroundColor
    const cW = canvas.getWidth(), cH = canvas.getHeight()

    const scaleX = cW / contentW, scaleY = cH / contentH
    const scale  = Math.min(scaleX, scaleY)
    const tx     = (cW - contentW * scale) / 2 - (minX - PAD) * scale
    const ty     = (cH - contentH * scale) / 2 - (minY - PAD) * scale

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hiddenObjs = canvas.getObjects().filter((o: any) => o.data?.type === 'gridLine')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hiddenObjs.forEach((o: any) => o.set('visible', false))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas.setViewportTransform([scale, 0, 0, scale, tx, ty] as any)
    canvas.backgroundColor = '#ffffff'
    canvas.renderAll()

    const imgData = canvas.toDataURL({ format: 'png', multiplier: 2 })

    // ── Viewport wiederherstellen ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas.setViewportTransform(savedVpt as any)
    canvas.backgroundColor = savedBg
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hiddenObjs.forEach((o: any) => o.set('visible', showGridRef.current))
    canvas.renderAll()

    // ── PDF aufbauen ──
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pw = pdf.internal.pageSize.getWidth()
    const ph = pdf.internal.pageSize.getHeight()

    // Header
    pdf.setFillColor(...GREEN); pdf.rect(0, 0, pw, 14, 'F')
    pdf.setTextColor(255, 255, 255); pdf.setFontSize(11); pdf.setFont('helvetica', 'bold')
    pdf.text('Raumplaner – Grundriss', 10, 9)
    pdf.setFontSize(8); pdf.setFont('helvetica', 'normal')
    pdf.text(raumName, pw - 10, 6, { align: 'right' })
    const heute = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    pdf.text(`Datum: ${heute}`, pw - 10, 10, { align: 'right' })

    // Raummaße
    if (breiteM || laengeM) {
      pdf.setTextColor(80, 80, 80); pdf.setFontSize(8)
      pdf.text(`Raummaße: ${breiteM ?? '–'} m × ${laengeM ?? '–'} m${hoeheM ? ` · H ${hoeheM} m` : ''}`, 10, 20)
    }

    // Canvas-Screenshot zentriert + proportional
    const imgTop = 24
    const maxW = pw - 20, maxH = ph - imgTop - 14
    const aspect = contentW / contentH
    let iW = maxW, iH = maxW / aspect
    if (iH > maxH) { iH = maxH; iW = maxH * aspect }
    pdf.addImage(imgData, 'PNG', (pw - iW) / 2, imgTop, iW, iH)

    // Footer
    pdf.setFillColor(...GREEN); pdf.rect(0, ph - 8, pw, 8, 'F')
    pdf.setTextColor(255, 255, 255); pdf.setFontSize(7)
    pdf.text('Wellbeing Spaces', 10, ph - 3)
    pdf.text('Seite 1 / 1', pw - 10, ph - 3, { align: 'right' })

    pdf.save(`${raumName.replace(/[^a-zA-Z0-9äöüÄÖÜß\s]/g, '_')}_Grundriss.pdf`)
  }

  // ── Tool-Gruppen ──────────────────────────────────────────

  const toolGroups = [
    [
      { key: 'select'  as Tool, Icon: MousePointer2, label: 'Auswahl',       shortcut: 'V' },
      { key: 'wall'    as Tool, Icon: Pencil,        label: 'Wand',          shortcut: 'W' },
    ],
    [
      { key: 'door'    as Tool, Icon: DoorOpen,      label: 'Tür',           shortcut: 'D' },
      { key: 'window'  as Tool, Icon: AppWindow,     label: 'Fenster',       shortcut: 'F' },
    ],
    [
      { key: 'measure' as Tool, Icon: Ruler,         label: 'Bemaßung',      shortcut: 'M' },
      { key: 'eraser'  as Tool, Icon: Eraser,        label: 'Radierer',      shortcut: 'E' },
    ],
  ]
  const allTools = toolGroups.flat()

  // ── Möbel-Gruppen ─────────────────────────────────────────

  const isSearching = moebelSuche.length > 0
  const filteredMoebel = moebelSymbole.filter(s => s.name.toLowerCase().includes(moebelSuche.toLowerCase()))
  const groupedMoebel = MOEBEL_GRUPPEN.map(g => ({
    name: g.name,
    items: moebelSymbole.filter(s => g.keys.some(k => s.name.includes(k))),
  })).filter(g => g.items.length > 0)
  const sonstige = moebelSymbole.filter(s => !MOEBEL_GRUPPEN.some(g => g.keys.some(k => s.name.includes(k))))

  // ── Style-Helfer ─────────────────────────────────────────

  const C = {
    toolbar: '#3d5242',
    sidebar: '#3f5544',
    hover:   '#4a6350',
    border:  'rgba(84,115,92,0.4)',
    textLt:  '#94c1a4',
    textMd:  '#c8dbc9',
    input:   '#2e4a35',
  }
  const tbBtn = `w-9 h-9 flex items-center justify-center rounded-lg transition-all`
  const tbSep = `w-px h-6 mx-1 opacity-40` // border via inline style

  // ── Render ────────────────────────────────────────────────

  return (
    <>
    {/* Mobile-Hinweis: nur auf kleinen Screens */}
    <div className="md:hidden fixed inset-0 z-50 flex flex-col items-center justify-center p-8 text-center"
      style={{ background: '#f8faf8' }}>
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ background: 'rgba(68,92,73,0.1)' }}>
        <Monitor className="w-8 h-8" style={{ color: '#445c49' }} />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Desktop empfohlen</h2>
      <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
        Der Raumplaner ist für die Nutzung am Computer optimiert.
        Bitte öffne diese Seite auf einem Desktop oder Laptop.
      </p>
      <Link
        href="/dashboard/raumplaner"
        className="mt-6 px-5 py-2.5 rounded-lg text-sm font-medium text-white"
        style={{ background: '#445c49' }}
      >
        Zurück zur Übersicht
      </Link>
    </div>

    {/* Desktop Editor */}
    <div className="hidden md:flex flex-col" style={{ height: '100vh', background: C.toolbar, color: C.textMd }}
      onClick={() => { setContextMenu(null); setShowZoomDropdown(false) }}>

      <LoadingScreen visible={loading} />
      {showShortcuts && <ShortcutOverlay onClose={() => setShowShortcuts(false)} />}

      {/* Toast-Alert */}
      {raumAlert && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-lg text-sm text-gray-800">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <span>{raumAlert}</span>
          <button onClick={() => setRaumAlert(null)} className="ml-2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Confirm-Modal */}
      <ConfirmModal
        isOpen={raumConfirm.open}
        onClose={() => setRaumConfirm(p => ({ ...p, open: false }))}
        onConfirm={() => { raumConfirm.onOk(); setRaumConfirm(p => ({ ...p, open: false })) }}
        title="Bestätigung"
        message={raumConfirm.msg}
      />

      {/* Kontext-Menü */}
      {contextMenu && (
        <div className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 py-1.5 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}>
          <button type="button" onClick={duplicateSelected}
            className="w-full flex items-center gap-2.5 px-3.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
            <Copy className="w-3.5 h-3.5 text-gray-400" /> Duplizieren
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button type="button" onClick={bringToFront}
            className="w-full flex items-center gap-2.5 px-3.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
            <ArrowUpToLine className="w-3.5 h-3.5 text-gray-400" /> Ganz nach vorne
          </button>
          <button type="button" onClick={bringForward}
            className="w-full flex items-center gap-2.5 px-3.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
            <ArrowUp className="w-3.5 h-3.5 text-gray-400" /> Eine Ebene hoch
          </button>
          <button type="button" onClick={sendBackward}
            className="w-full flex items-center gap-2.5 px-3.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
            <ArrowDown className="w-3.5 h-3.5 text-gray-400" /> Eine Ebene runter
          </button>
          <button type="button" onClick={sendToBack}
            className="w-full flex items-center gap-2.5 px-3.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
            <ArrowDownToLine className="w-3.5 h-3.5 text-gray-400" /> Ganz nach hinten
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button type="button" onClick={() => {
            const c = fabricRef.current; if (!c) return
            if (contextMenu.target?.data?.type === 'outline') { setContextMenu(null); return }
            c.remove(contextMenu.target); setSelectedProps(null)
            pushHistory(); triggerAutoSave(); updateObjCount(); c.requestRenderAll(); setContextMenu(null)
          }} className="w-full flex items-center gap-2.5 px-3.5 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Löschen
          </button>
        </div>
      )}

      {/* ── TOOLBAR ── */}
      <div className="flex items-center h-12 px-3 shrink-0 gap-1.5 overflow-x-auto"
        style={{ background: C.toolbar, borderBottom: `1px solid ${C.border}` }}>

        {/* Zurück */}
        <Link href={`/dashboard/projekte/${projektId}/raeume/${raumId}`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-colors mr-1 shrink-0"
          style={{ color: C.textLt }}
          onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="font-medium truncate max-w-[80px]">{raumName}</span>
        </Link>

        {isCompactToolbar ? (
          <>
            {/* Compact: Sidebar-Toggle */}
            <button type="button" title="Sidebar" onClick={() => setSidebarOffen(v => !v)}
              className={tbBtn} style={{ color: sidebarOffen ? '#fff' : C.textLt, background: sidebarOffen ? 'rgba(68,92,73,0.5)' : 'transparent' }}>
              <PanelLeft className="w-4 h-4" />
            </button>
            <div className={tbSep} style={{ background: C.border }} />
            {/* Compact: Select + Wall + Eraser always visible */}
            {[
              { key: 'select' as Tool, Icon: MousePointer2, label: 'Auswahl (V)' },
              { key: 'wall' as Tool, Icon: Pencil, label: 'Wand (W)' },
              { key: 'eraser' as Tool, Icon: Eraser, label: 'Radierer (E)' },
            ].map(({ key, Icon, label }) => (
              <button key={key} type="button" title={label} onClick={() => switchTool(key)}
                className={tbBtn}
                style={{ background: activeTool === key ? '#445c49' : 'transparent', color: activeTool === key ? '#fff' : C.textLt }}>
                <Icon className="w-4 h-4" />
              </button>
            ))}
            <div className={tbSep} style={{ background: C.border }} />
            {/* Compact: Zeichnen dropdown */}
            <ToolbarDropdown label="Zeichnen" icon={<PenLine className="w-3.5 h-3.5" />} tbStyle={{ color: C.textLt, hover: C.hover, border: C.border, textLt: C.textLt }} items={[
              { icon: <DoorOpen className="w-3.5 h-3.5" />, label: 'Tür (D)', onClick: () => switchTool('door'), active: activeTool === 'door' },
              { icon: <AppWindow className="w-3.5 h-3.5" />, label: 'Fenster (F)', onClick: () => switchTool('window'), active: activeTool === 'window' },
            ]} />
            {/* Compact: Bearbeiten dropdown */}
            <ToolbarDropdown label="Bearbeiten" icon={<RotateCcw className="w-3.5 h-3.5" />} tbStyle={{ color: C.textLt, hover: C.hover, border: C.border, textLt: C.textLt }} items={[
              { icon: <RotateCcw className="w-3.5 h-3.5" />, label: 'Rückgängig', onClick: undo },
              { icon: <RotateCw className="w-3.5 h-3.5" />, label: 'Wiederholen', onClick: redo },
              { icon: <Maximize2 className="w-3.5 h-3.5" />, label: 'Einpassen', onClick: fitToView },
              { icon: <Trash2 className="w-3.5 h-3.5" />, label: 'Alle löschen', onClick: clearAll },
            ]} />
            {/* Compact: Ansicht dropdown */}
            <ToolbarDropdown label="Ansicht" icon={<Grid3x3 className="w-3.5 h-3.5" />} tbStyle={{ color: C.textLt, hover: C.hover, border: C.border, textLt: C.textLt }} items={[
              { icon: <Grid3x3 className="w-3.5 h-3.5" />, label: `Raster ${showGrid ? 'aus' : 'an'}`, onClick: () => setShowGrid(v => !v), active: showGrid },
              { icon: <Magnet className="w-3.5 h-3.5" />, label: `Einrasten ${snapToGrid ? 'aus' : 'an'}`, onClick: () => setSnapToGrid(v => !v), active: snapToGrid },
              { icon: <Ruler className="w-3.5 h-3.5" />, label: `Maßketten ${showDimensions ? 'aus' : 'an'}`, onClick: () => setShowDimensions(v => !v), active: showDimensions },
              { icon: isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />, label: isFullscreen ? 'Vollbild beenden' : 'Vollbild (F11)', onClick: toggleFullscreen },
            ]} />
            {/* Compact: Export dropdown */}
            <ToolbarDropdown label="Export" icon={<FileDown className="w-3.5 h-3.5" />} tbStyle={{ color: C.textLt, hover: C.hover, border: C.border, textLt: C.textLt }} items={[
              { icon: <ImageIcon className="w-3.5 h-3.5" />, label: 'Als Bild', onClick: () => setShowBildModal(true) },
              { icon: <FileDown className="w-3.5 h-3.5" />, label: 'Als PDF', onClick: exportPdf },
              { icon: <Sheet className="w-3.5 h-3.5" />, label: 'Stückliste', onClick: () => setShowStuecklisteModal(true) },
              { icon: <FileText className="w-3.5 h-3.5" />, label: 'Angebot erstellen', onClick: createAngebotFromCanvas },
              { icon: <Share2 className="w-3.5 h-3.5" />, label: 'Freigabe-Link', onClick: () => setShowFreigabeModal(true), active: freigabeAktiv },
            ]} />
            <div className={tbSep} style={{ background: C.border }} />
            {/* Compact: Etagen */}
            {etagen.length > 0 && (
              <div className="flex items-center gap-0.5 rounded-lg px-0.5 py-0.5" style={{ background: 'rgba(0,0,0,0.2)' }}>
                {etagen.map(etage => (
                  <button key={etage.id} type="button" onClick={() => ladeEtage(etage)}
                    className="flex items-center gap-0.5 px-1.5 py-1 text-[10px] rounded-md transition-all"
                    style={{ background: aktiveEtageId === etage.id ? '#445c49' : 'transparent', color: aktiveEtageId === etage.id ? '#fff' : C.textLt }}>
                    <Layers className="w-3 h-3" />
                    <span className="truncate max-w-[40px]">{etage.name}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex-1" />
            {/* Compact: Zoom */}
            <button type="button" onClick={() => zoomBy(1 / 1.2)} className={tbBtn} style={{ color: C.textLt }}>
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono px-1" style={{ color: C.textLt }}>{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => zoomBy(1.2)} className={tbBtn} style={{ color: C.textLt }}>
              <Plus className="w-3.5 h-3.5" />
            </button>
            <div className={tbSep} style={{ background: C.border }} />
            {/* Compact: Speichern */}
            <button type="button" onClick={saveNow}
              className="flex items-center gap-1 h-9 px-2 text-xs font-semibold rounded-lg transition-all"
              style={{
                background: saveStatus === 'unsaved' ? '#445c49' : saveStatus === 'error' ? 'rgba(239,68,68,0.15)' : 'transparent',
                color: saveStatus === 'saved' ? C.textLt : saveStatus === 'saving' ? `${C.textLt}60` : saveStatus === 'error' ? '#f87171' : '#fff',
                border: saveStatus === 'error' ? '1px solid rgba(239,68,68,0.4)' : '1px solid transparent',
              }}>
              {saveStatus === 'saving' ? <Save className="w-3.5 h-3.5 animate-pulse" /> : <Save className="w-3.5 h-3.5" />}
            </button>
          </>
        ) : (
          <>
        {/* Sidebar-Toggle */}
        <button type="button" title="Möbel-Sidebar ein/ausblenden" onClick={() => setSidebarOffen(v => !v)}
          className={tbBtn}
          style={{ color: sidebarOffen ? '#fff' : C.textLt, background: sidebarOffen ? 'rgba(68,92,73,0.5)' : 'transparent' }}
          onMouseEnter={e => { if (!sidebarOffen) e.currentTarget.style.background = C.hover }}
          onMouseLeave={e => { if (!sidebarOffen) e.currentTarget.style.background = 'transparent' }}>
          <PanelLeft className="w-4 h-4" />
        </button>

        <div className={tbSep} style={{ background: C.border }} />

        {/* Tool-Gruppen */}
        {toolGroups.map((group, gi) => (
          <div key={gi} className="flex items-center gap-0.5">
            {group.map(({ key, Icon, label, shortcut }) => (
              <button key={key} type="button" title={`${label} (${shortcut})`}
                onClick={() => switchTool(key)}
                className={tbBtn}
                style={{
                  background: activeTool === key ? '#445c49' : 'transparent',
                  color: activeTool === key ? '#fff' : C.textLt,
                  boxShadow: activeTool === key ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
                }}>
                <Icon className="w-4 h-4" />
              </button>
            ))}
            {gi < toolGroups.length - 1 && <div className={tbSep} style={{ background: C.border }} />}
          </div>
        ))}

        <div className={tbSep} style={{ background: C.border }} />

        {/* Undo/Redo */}
        {[{ fn: undo, Icon: RotateCcw, title: 'Rückgängig (Ctrl+Z)' }, { fn: redo, Icon: RotateCw, title: 'Wiederholen (Ctrl+Y)' }].map(({ fn, Icon, title }) => (
          <button key={title} type="button" title={title} onClick={fn}
            className={tbBtn} style={{ color: C.textLt }}
            onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Icon className="w-4 h-4" />
          </button>
        ))}

        <div className={tbSep} style={{ background: C.border }} />

        {/* Fit + Clear */}
        <button type="button" title="Einpassen" onClick={fitToView}
          className={tbBtn} style={{ color: C.textLt }}
          onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Maximize2 className="w-4 h-4" />
        </button>
        <button type="button" title="Alle löschen" onClick={clearAll}
          className={tbBtn} style={{ color: C.textLt }}
          onMouseEnter={e => { e.currentTarget.style.background = C.hover; e.currentTarget.style.color = '#f87171' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textLt }}>
          <Trash2 className="w-4 h-4" />
        </button>

        <div className={tbSep} style={{ background: C.border }} />

        {/* Grid Toggle */}
        <button type="button" title="Raster an/aus" onClick={() => setShowGrid(g => !g)}
          className={tbBtn}
          style={{ color: showGrid ? '#fff' : C.textLt, background: showGrid ? 'rgba(68,92,73,0.5)' : 'transparent' }}
          onMouseEnter={e => { if (!showGrid) e.currentTarget.style.background = C.hover }}
          onMouseLeave={e => { if (!showGrid) e.currentTarget.style.background = 'transparent' }}>
          <Grid3x3 className="w-4 h-4" />
        </button>
        {/* Snap-to-Grid Toggle */}
        <button type="button" title={`Einrasten ${snapToGrid ? 'aus' : 'ein'}schalten`}
          onClick={() => setSnapToGrid(v => !v)}
          className={tbBtn}
          style={{ color: snapToGrid ? '#fff' : C.textLt, background: snapToGrid ? 'rgba(68,92,73,0.5)' : 'transparent' }}
          onMouseEnter={e => { if (!snapToGrid) e.currentTarget.style.background = C.hover }}
          onMouseLeave={e => { if (!snapToGrid) e.currentTarget.style.background = 'transparent' }}>
          <Magnet className="w-4 h-4" />
        </button>
        {/* Grid-Größe: 4 Toggle-Buttons */}
        <div className="flex items-center gap-0.5 rounded-lg p-0.5" style={{ background: 'rgba(0,0,0,0.2)' }}>
          {([10, 25, 50, 100] as GridSize[]).map(v => (
            <button key={v} type="button" onClick={() => { setGridSize(v); gridSizeRef.current = v }}
              className="px-2 py-1 text-[11px] font-medium rounded-md transition-all"
              style={{
                background: gridSize === v ? '#445c49' : 'transparent',
                color: gridSize === v ? '#fff' : C.textLt,
              }}>
              {v}
            </button>
          ))}
          <span className="text-[10px] px-1" style={{ color: `${C.textLt}80` }}>cm</span>
        </div>

        <div className={tbSep} style={{ background: C.border }} />

        {/* Maßketten */}
        <button type="button" title="Maßketten ein/aus" onClick={() => setShowDimensions(v => !v)}
          className={tbBtn}
          style={{ color: showDimensions ? '#fff' : C.textLt, background: showDimensions ? 'rgba(68,92,73,0.5)' : 'transparent' }}
          onMouseEnter={e => { if (!showDimensions) e.currentTarget.style.background = C.hover }}
          onMouseLeave={e => { if (!showDimensions) e.currentTarget.style.background = 'transparent' }}>
          <Ruler className="w-4 h-4" />
        </button>

        {/* Templates */}
        <button type="button" title="Raum-Templates" onClick={() => setShowTemplatesModal(true)}
          className={tbBtn} style={{ color: C.textLt }}
          onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <LayoutTemplate className="w-4 h-4" />
        </button>

        {/* Stückliste */}
        <button type="button" title="Stückliste" onClick={() => setShowStuecklisteModal(true)}
          className={tbBtn} style={{ color: C.textLt }}
          onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Sheet className="w-4 h-4" />
        </button>

        <div className={tbSep} style={{ background: C.border }} />

        {/* Etagen-Tabs */}
        {etagen.length > 0 && (
          <div className="flex items-center gap-0.5 rounded-lg px-0.5 py-0.5" style={{ background: 'rgba(0,0,0,0.2)' }}>
            {etagen.map(etage => (
              <div key={etage.id} className="flex items-center rounded-md overflow-hidden"
                style={{ background: aktiveEtageId === etage.id ? '#445c49' : 'transparent' }}>
                <button type="button"
                  title={`Etage: ${etage.name}`}
                  onClick={() => ladeEtage(etage)}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium transition-all truncate max-w-[72px]"
                  style={{ color: aktiveEtageId === etage.id ? '#fff' : C.textLt }}>
                  <Layers className="w-3 h-3 shrink-0" />
                  <span className="truncate">{etage.name}</span>
                </button>
                {etagen.length > 1 && (
                  <button type="button" title="Etage löschen"
                    onClick={e => { e.stopPropagation(); loescheEtage(etage) }}
                    className="w-4 h-4 flex items-center justify-center mr-1 rounded opacity-60 hover:opacity-100 transition-opacity"
                    style={{ color: aktiveEtageId === etage.id ? '#fff' : C.textLt }}>
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" title="Neue Etage" onClick={erstelleEtage} disabled={etagenLoading}
              className="w-7 h-7 flex items-center justify-center rounded-md transition-colors disabled:opacity-40"
              style={{ color: C.textLt }}
              onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <Plus className="w-3 h-3" />
            </button>
          </div>
        )}
        {etagen.length === 0 && (
          <button type="button" title="Etagen aktivieren" onClick={erstelleEtage} disabled={etagenLoading}
            className={`${tbBtn} gap-1 px-2 text-[10px]`} style={{ color: C.textLt }}
            onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Layers className="w-3.5 h-3.5" />
          </button>
        )}

        <div className={tbSep} style={{ background: C.border }} />

        {/* Angebot aus Raumplan */}
        <button type="button" title="Angebot aus Raumplan erstellen" onClick={createAngebotFromCanvas}
          disabled={angebotCreating}
          className={`${tbBtn} disabled:opacity-40`} style={{ color: C.textLt }}
          onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <FileText className="w-4 h-4" />
        </button>

        <div className="flex-1" />

        {/* Zoom */}
        <button type="button" onClick={() => zoomBy(1 / 1.2)} className={tbBtn} style={{ color: C.textLt }}
          onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Minus className="w-3.5 h-3.5" />
        </button>
        <div className="relative">
          <button type="button"
            onClick={() => setShowZoomDropdown(v => !v)}
            className="min-w-[52px] h-9 text-center text-xs px-2 rounded-lg transition-colors font-mono flex items-center gap-1"
            style={{ color: C.textLt }}
            onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            {Math.round(zoom * 100)}%
            <ChevronDown className="w-2.5 h-2.5 opacity-60" />
          </button>
          {showZoomDropdown && (
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-2xl border border-gray-100 py-1 z-50 min-w-[100px]"
              onClick={() => setShowZoomDropdown(false)}>
              {[25, 50, 75, 100, 150, 200].map(p => (
                <button key={p} type="button"
                  onClick={() => { const c = fabricRef.current; if (!c) return; c.setViewportTransform([p/100,0,0,p/100,0,0]); setZoom(p/100); c.requestRenderAll() }}
                  className="w-full px-3 py-1.5 text-xs text-left hover:bg-gray-50 transition-colors font-mono"
                  style={{ color: Math.round(zoom * 100) === p ? '#445c49' : '#374151', fontWeight: Math.round(zoom * 100) === p ? 600 : 400 }}>
                  {p}%
                </button>
              ))}
              <div className="border-t border-gray-100 my-1" />
              <button type="button" onClick={fitToView}
                className="w-full px-3 py-1.5 text-xs text-left hover:bg-gray-50 transition-colors text-gray-600">
                Einpassen
              </button>
              <button type="button" onClick={zoomReset}
                className="w-full px-3 py-1.5 text-xs text-left hover:bg-gray-50 transition-colors text-gray-600">
                100% zurücksetzen
              </button>
            </div>
          )}
        </div>
        <button type="button" onClick={() => zoomBy(1.2)} className={tbBtn} style={{ color: C.textLt }}
          onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Plus className="w-3.5 h-3.5" />
        </button>

        <div className={tbSep} style={{ background: C.border }} />

        {/* PDF Export */}
        <button type="button" title="Als PDF exportieren" onClick={exportPdf}
          className={tbBtn} style={{ color: C.textLt }}
          onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <FileDown className="w-4 h-4" />
        </button>

        {/* Bild-Export */}
        <button type="button" title="Als Bild exportieren" onClick={() => setShowBildModal(true)}
          className={tbBtn} style={{ color: C.textLt }}
          onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <ImageIcon className="w-4 h-4" />
        </button>

        {/* Freigabe */}
        <button type="button" title="Freigabe-Link" onClick={() => setShowFreigabeModal(true)}
          className={tbBtn}
          style={{ color: freigabeAktiv ? '#4ade80' : C.textLt, background: freigabeAktiv ? 'rgba(74,222,128,0.1)' : 'transparent' }}
          onMouseEnter={e => { if (!freigabeAktiv) e.currentTarget.style.background = C.hover }}
          onMouseLeave={e => { if (!freigabeAktiv) e.currentTarget.style.background = 'transparent' }}>
          <Share2 className="w-4 h-4" />
        </button>

        <div className={tbSep} style={{ background: C.border }} />

        {/* Speichern */}
        <button type="button" onClick={saveNow}
          className="flex items-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-lg transition-all"
          style={{
            background: saveStatus === 'unsaved' ? '#445c49' : saveStatus === 'error' ? 'rgba(239,68,68,0.15)' : 'transparent',
            color: saveStatus === 'saved' ? C.textLt : saveStatus === 'saving' ? `${C.textLt}60` : saveStatus === 'error' ? '#f87171' : '#fff',
            border: saveStatus === 'error' ? '1px solid rgba(239,68,68,0.4)' : '1px solid transparent',
          }}>
          {saveStatus === 'saved'  ? <><CheckCircle className="w-3.5 h-3.5" /> Gespeichert</> :
           saveStatus === 'saving' ? <><Save className="w-3.5 h-3.5 animate-pulse" /> Speichern…</> :
           saveStatus === 'error'  ? <><AlertCircle className="w-3.5 h-3.5" /> Fehler</> :
                                     <><Save className="w-3.5 h-3.5" /> Speichern</>}
        </button>

        {/* Fullscreen */}
        <button type="button" title={isFullscreen ? 'Vollbild beenden' : 'Vollbild (F11)'}
          onClick={toggleFullscreen} className={tbBtn} style={{ color: C.textLt }}
          onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        <button type="button" title="Tastaturkürzel (?)" onClick={() => setShowShortcuts(true)}
          className={`${tbBtn} ml-0.5`} style={{ color: C.textLt }}
          onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <HelpCircle className="w-4 h-4" />
        </button>
          </>
        )}
      </div>

      {/* ── Hauptbereich ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Linke Sidebar ── */}
        <div className={`flex flex-col overflow-hidden shrink-0 transition-all duration-200 ${sidebarOffen ? 'w-56' : 'w-0'}`}
          style={{ background: C.sidebar, borderRight: sidebarOffen ? `1px solid ${C.border}` : 'none' }}>
          <div className="px-2 py-2" style={{ borderBottom: `1px solid ${C.border}` }}>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: `${C.textLt}60` }} />
              <input type="text" placeholder="Möbel suchen…" value={moebelSuche}
                onChange={e => setMoebelSuche(e.target.value)}
                className="w-full text-[11px] rounded-lg pl-7 pr-2 py-1.5 focus:outline-none"
                style={{ background: C.input, border: `1px solid ${C.border}`, color: C.textMd }} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isSearching ? (
              <div className="px-2 py-2">
                <p className="text-[9px] uppercase tracking-wider font-semibold px-1 mb-2" style={{ color: `${C.textLt}60` }}>{filteredMoebel.length} Treffer</p>
                <MoebelGrid symbols={filteredMoebel} fabricRef={fabricRef} placeMoebel={placeMoebel} colors={C} starredIds={favoriten} onStar={toggleFavorit} />
              </div>
            ) : (
              <div>
                {/* ⭐ Favoriten */}
                {favoriten.size > 0 && (() => {
                  const favSym = moebelSymbole.filter(s => favoriten.has(s.id))
                  if (favSym.length === 0) return null
                  return (
                    <div>
                      <button type="button"
                        onClick={() => setOpenGroups(prev => { const n = new Set(prev); if (n.has('⭐ Favoriten')) n.delete('⭐ Favoriten'); else n.add('⭐ Favoriten'); return n })}
                        className="w-full flex items-center justify-between px-3 py-2 text-[10px] transition-colors"
                        style={{ color: '#fbbf24', borderBottom: `1px solid ${C.border}20` }}
                        onMouseEnter={e => (e.currentTarget.style.background = `${C.hover}80`)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <span className="uppercase tracking-wider font-semibold flex items-center gap-1"><Star className="w-3 h-3 fill-[#fbbf24]" /> Favoriten</span>
                        {openGroups.has('⭐ Favoriten') ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      </button>
                      {openGroups.has('⭐ Favoriten') && (
                        <div className="px-2 py-2" style={{ borderBottom: `1px solid ${C.border}15` }}>
                          {favSym.length > 0 && <MoebelGrid symbols={favSym} fabricRef={fabricRef} placeMoebel={placeMoebel} colors={C} starredIds={favoriten} onStar={toggleFavorit} />}
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* System-Möbel Gruppen */}
                {groupedMoebel.map(group => (
                  <div key={group.name}>
                    <button type="button"
                      onClick={() => setOpenGroups(prev => { const n = new Set(prev); if (n.has(group.name)) n.delete(group.name); else n.add(group.name); return n })}
                      className="w-full flex items-center justify-between px-3 py-2 text-[10px] transition-colors"
                      style={{ color: C.textLt, borderBottom: `1px solid ${C.border}20` }}
                      onMouseEnter={e => (e.currentTarget.style.background = `${C.hover}80`)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <span className="uppercase tracking-wider font-semibold">{group.name}</span>
                      {openGroups.has(group.name) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </button>
                    {openGroups.has(group.name) && (
                      <div className="px-2 py-2" style={{ borderBottom: `1px solid ${C.border}15` }}>
                        <MoebelGrid symbols={group.items} fabricRef={fabricRef} placeMoebel={placeMoebel} colors={C} starredIds={favoriten} onStar={toggleFavorit} />
                      </div>
                    )}
                  </div>
                ))}
                {sonstige.length > 0 && (
                  <div>
                    <button type="button"
                      onClick={() => setOpenGroups(prev => { const n = new Set(prev); if (n.has('Sonstige')) n.delete('Sonstige'); else n.add('Sonstige'); return n })}
                      className="w-full flex items-center justify-between px-3 py-2 text-[10px] transition-colors"
                      style={{ color: C.textLt, borderBottom: `1px solid ${C.border}20` }}
                      onMouseEnter={e => (e.currentTarget.style.background = `${C.hover}80`)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <span className="uppercase tracking-wider font-semibold">Sonstige</span>
                      {openGroups.has('Sonstige') ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </button>
                    {openGroups.has('Sonstige') && (
                      <div className="px-2 py-2" style={{ borderBottom: `1px solid ${C.border}15` }}>
                        <MoebelGrid symbols={sonstige} fabricRef={fabricRef} placeMoebel={placeMoebel} colors={C} starredIds={favoriten} onStar={toggleFavorit} />
                      </div>
                    )}
                  </div>
                )}

                {/* ── TÜREN & FENSTER ── */}
                <div>
                  <button type="button"
                    onClick={() => setOpenTuerFenster(v => !v)}
                    className="w-full flex items-center justify-between px-3 py-2 text-[10px] transition-colors"
                    style={{ color: C.textLt, borderBottom: `1px solid ${C.border}20` }}
                    onMouseEnter={e => (e.currentTarget.style.background = `${C.hover}80`)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span className="uppercase tracking-wider font-semibold flex items-center gap-1.5">
                      <DoorOpen className="w-3 h-3" /> Türen & Fenster
                    </span>
                    {openTuerFenster ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                  {openTuerFenster && (
                    <div className="px-2 py-2" style={{ borderBottom: `1px solid ${C.border}15` }}>
                      <p className="text-[9px] uppercase tracking-wider font-semibold mb-1.5 px-1" style={{ color: `${C.textLt}50` }}>Türen</p>
                      <div className="grid grid-cols-2 gap-1 mb-2">
                        {TUER_VARIANTEN.filter(v => v.kategorie === 'tuer').map(variant => (
                          <button key={variant.id} type="button"
                            title={`${variant.label} – ${variant.beschreibung}`}
                            onClick={() => {
                              const canvas = fabricRef.current; if (!canvas) return
                              const vpt = canvas.viewportTransform ?? [1,0,0,1,0,0]
                              const Z = canvas.getZoom()
                              const cx = (canvas.getWidth() / 2 - vpt[4]) / Z
                              const cy = (canvas.getHeight() / 2 - vpt[5]) / Z
                              placeTuerVariante(variant.id, cx, cy)
                            }}
                            draggable
                            onDragStart={e => e.dataTransfer.setData('application/tuer-variante', variant.id)}
                            className="flex flex-col items-center gap-1 rounded-lg p-1.5 transition-all cursor-grab active:cursor-grabbing"
                            style={{ background: 'rgba(0,0,0,0.15)', border: `1px solid ${C.border}20` }}
                            onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.15)')}>
                            <TuerFensterPreviewSvg variant={variant} />
                            <span className="text-[9px] text-center leading-tight" style={{ color: C.textLt }}>{variant.label}</span>
                          </button>
                        ))}
                      </div>
                      <p className="text-[9px] uppercase tracking-wider font-semibold mb-1.5 px-1" style={{ color: `${C.textLt}50` }}>Fenster</p>
                      <div className="grid grid-cols-2 gap-1">
                        {TUER_VARIANTEN.filter(v => v.kategorie === 'fenster').map(variant => (
                          <button key={variant.id} type="button"
                            title={`${variant.label} – ${variant.beschreibung}`}
                            onClick={() => {
                              const canvas = fabricRef.current; if (!canvas) return
                              const vpt = canvas.viewportTransform ?? [1,0,0,1,0,0]
                              const Z = canvas.getZoom()
                              const cx = (canvas.getWidth() / 2 - vpt[4]) / Z
                              const cy = (canvas.getHeight() / 2 - vpt[5]) / Z
                              placeFensterVariante(variant.id, cx, cy)
                            }}
                            draggable
                            onDragStart={e => e.dataTransfer.setData('application/fenster-variante', variant.id)}
                            className="flex flex-col items-center gap-1 rounded-lg p-1.5 transition-all cursor-grab active:cursor-grabbing"
                            style={{ background: 'rgba(0,0,0,0.15)', border: `1px solid ${C.border}20` }}
                            onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.15)')}>
                            <TuerFensterPreviewSvg variant={variant} />
                            <span className="text-[9px] text-center leading-tight" style={{ color: C.textLt }}>{variant.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>

        {/* ── Canvas ── */}
        <div ref={containerRef} className="flex-1 relative overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
          <canvas ref={canvasRef} className="absolute inset-0 z-10" />

          {/* Mini-Map */}
          <div className="absolute bottom-10 left-3 z-20 select-none">
            <div
              className="relative rounded-lg overflow-hidden shadow-lg cursor-crosshair"
              style={{ width: 150, height: 100, border: `1px solid rgba(68,92,73,0.3)`, background: '#f0f0f0' }}
              onClick={handleMinimapClick}
            >
              {minimapImage
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={minimapImage} alt="" className="absolute inset-0 w-full h-full pointer-events-none" style={{ objectFit: 'fill' }} draggable={false} />
                : <div className="flex items-center justify-center w-full h-full text-[10px] text-gray-400">Minimap</div>
              }
              {/* Viewport-Indikator */}
              <div
                className="absolute pointer-events-none"
                style={{
                  left: viewportRect.x, top: viewportRect.y,
                  width: Math.max(4, viewportRect.w), height: Math.max(4, viewportRect.h),
                  border: '2px solid #445c49',
                  background: 'rgba(68,92,73,0.12)',
                }}
              />
            </div>
            <p className="text-center text-[9px] mt-0.5" style={{ color: 'rgba(148,193,164,0.4)' }}>Übersicht</p>
          </div>
        </div>

        {/* ── Rechte Sidebar ── */}
        <div className="w-60 flex flex-col overflow-hidden shrink-0"
          style={{ background: C.sidebar, borderLeft: `1px solid ${C.border}` }}>
          <div className="flex-1 overflow-y-auto">
            {isMultiSelect ? (
              /* ── Multi-Select Panel ── */
              <div>
                <div className="flex items-center justify-between px-3 py-2.5"
                  style={{ borderBottom: `1px solid ${C.border}` }}>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: `${C.textLt}60` }}>Mehrfachauswahl</p>
                    <p className="text-xs font-medium" style={{ color: '#fff' }}>{multiSelectCount} Objekte</p>
                  </div>
                  <button type="button" onClick={deleteSelected}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: `${C.textLt}60` }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.hover; e.currentTarget.style.color = '#f87171' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = `${C.textLt}60` }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* Ausrichten */}
                <div className="px-3 py-3" style={{ borderBottom: `1px solid ${C.border}20` }}>
                  <p className="text-[9px] uppercase tracking-wider font-semibold mb-2" style={{ color: `${C.textLt}60` }}>Horizontal ausrichten</p>
                  <div className="grid grid-cols-3 gap-1 mb-1">
                    {([
                      { dir: 'left'    as const, Icon: AlignLeft,             title: 'Linksbündig' },
                      { dir: 'centerH' as const, Icon: AlignCenterHorizontal, title: 'Zentriert H' },
                      { dir: 'right'   as const, Icon: AlignRight,            title: 'Rechtsbündig' },
                    ]).map(({ dir, Icon, title }) => (
                      <button key={dir} type="button" title={title} onClick={() => alignSelected(dir)}
                        className="flex items-center justify-center py-1.5 rounded-lg transition-colors text-[11px]"
                        style={{ background: C.input, border: `1px solid ${C.border}`, color: C.textLt }}
                        onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
                        onMouseLeave={e => (e.currentTarget.style.background = C.input)}>
                        <Icon className="w-3.5 h-3.5" />
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] uppercase tracking-wider font-semibold mb-2 mt-2.5" style={{ color: `${C.textLt}60` }}>Vertikal ausrichten</p>
                  <div className="grid grid-cols-3 gap-1">
                    {([
                      { dir: 'top'     as const, Icon: AlignStartVertical,  title: 'Oben ausrichten' },
                      { dir: 'centerV' as const, Icon: AlignCenterVertical, title: 'Zentriert V' },
                      { dir: 'bottom'  as const, Icon: AlignEndVertical,    title: 'Unten ausrichten' },
                    ]).map(({ dir, Icon, title }) => (
                      <button key={dir} type="button" title={title} onClick={() => alignSelected(dir)}
                        className="flex items-center justify-center py-1.5 rounded-lg transition-colors"
                        style={{ background: C.input, border: `1px solid ${C.border}`, color: C.textLt }}
                        onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
                        onMouseLeave={e => (e.currentTarget.style.background = C.input)}>
                        <Icon className="w-3.5 h-3.5" />
                      </button>
                    ))}
                  </div>
                </div>
                {/* Verteilen (nur bei 3+) */}
                {multiSelectCount >= 3 && (
                  <div className="px-3 py-3" style={{ borderBottom: `1px solid ${C.border}20` }}>
                    <p className="text-[9px] uppercase tracking-wider font-semibold mb-2" style={{ color: `${C.textLt}60` }}>Gleichmäßig verteilen</p>
                    <div className="grid grid-cols-2 gap-1">
                      <button type="button" title="Horizontal verteilen" onClick={() => distributeSelected('H')}
                        className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-colors text-[10px]"
                        style={{ background: C.input, border: `1px solid ${C.border}`, color: C.textLt }}
                        onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
                        onMouseLeave={e => (e.currentTarget.style.background = C.input)}>
                        <AlignHorizontalSpaceBetween className="w-3.5 h-3.5" /> H
                      </button>
                      <button type="button" title="Vertikal verteilen" onClick={() => distributeSelected('V')}
                        className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-colors text-[10px]"
                        style={{ background: C.input, border: `1px solid ${C.border}`, color: C.textLt }}
                        onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
                        onMouseLeave={e => (e.currentTarget.style.background = C.input)}>
                        <AlignVerticalSpaceBetween className="w-3.5 h-3.5" /> V
                      </button>
                    </div>
                  </div>
                )}
                {/* Gruppieren */}
                <div className="px-3 py-3">
                  <button type="button" onClick={groupSelected}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
                    style={{ background: 'rgba(68,92,73,0.2)', border: `1px solid rgba(68,92,73,0.4)`, color: C.textMd }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(68,92,73,0.35)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(68,92,73,0.2)')}>
                    <Group className="w-3.5 h-3.5" /> Gruppieren (Ctrl+G)
                  </button>
                </div>
              </div>
            ) : selectedProps ? (
              <div>
                <div className="flex items-center justify-between px-3 py-2.5"
                  style={{ borderBottom: `1px solid ${C.border}` }}>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: `${C.textLt}60` }}>
                      {selectedProps.objType === 'wall' ? 'Wand' : selectedProps.objType === 'door' ? 'Tür' :
                       selectedProps.objType === 'window' ? 'Fenster' : selectedProps.objType === 'measure' ? 'Bemaßung' :
                       selectedProps.objType === 'moebel' ? 'Möbel' : selectedProps.objType === 'group' ? 'Gruppe' :
                       'Objekt'}
                    </p>
                    <p className="text-xs font-medium truncate max-w-[140px]" style={{ color: '#fff' }}>
                      {selectedProps.name || '–'}
                    </p>
                  </div>
                  <button type="button" onClick={deleteSelected}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: `${C.textLt}60` }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.hover; e.currentTarget.style.color = '#f87171' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = `${C.textLt}60` }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* Name */}
                <div className="px-3 py-2.5" style={{ borderBottom: `1px solid ${C.border}20` }}>
                  <p className="text-[9px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: `${C.textLt}60` }}>Name</p>
                  <input type="text" defaultValue={selectedProps.name} key={selectedProps.name}
                    onBlur={e => applyObjProp('name', e.target.value)}
                    className="w-full text-[11px] rounded-lg px-2 py-1.5 focus:outline-none"
                    style={{ background: C.input, border: `1px solid ${C.border}`, color: C.textMd }} />
                </div>

                {/* Position */}
                <div className="px-3 py-2.5" style={{ borderBottom: `1px solid ${C.border}20` }}>
                  <p className="text-[9px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: `${C.textLt}60` }}>Position (cm)</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ l:'X', f:'x' as const, v: selectedProps.x }, { l:'Y', f:'y' as const, v: selectedProps.y }].map(({ l, f, v }) => (
                      <div key={l}>
                        <label className="text-[9px] block mb-0.5" style={{ color: `${C.textLt}50` }}>{l}</label>
                        <input type="number" step="1" defaultValue={v} key={v}
                          onBlur={e => applyObjProp(f, e.target.value)}
                          className="w-full text-[11px] rounded-lg px-2 py-1.5 focus:outline-none"
                          style={{ background: C.input, border: `1px solid ${C.border}`, color: C.textMd }} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Größe (readonly) */}
                <div className="px-3 py-2.5" style={{ borderBottom: `1px solid ${C.border}20` }}>
                  <p className="text-[9px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: `${C.textLt}60` }}>Größe (cm)</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ l:'B', v: Math.round(selectedProps.w) }, { l:'L', v: Math.round(selectedProps.h) }].map(({ l, v }) => (
                      <div key={l}>
                        <label className="text-[9px] block mb-0.5" style={{ color: `${C.textLt}50` }}>{l}</label>
                        <div className="w-full text-[11px] rounded-lg px-2 py-1.5 font-mono opacity-60"
                          style={{ background: C.input, border: `1px solid ${C.border}20`, color: C.textMd }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rotation */}
                <div className="px-3 py-2.5" style={{ borderBottom: `1px solid ${C.border}20` }}>
                  <p className="text-[9px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: `${C.textLt}60` }}>Rotation</p>
                  <div>
                    <label className="text-[9px] block mb-0.5" style={{ color: `${C.textLt}50` }}>Winkel °</label>
                    <input type="number" step="1" min={-180} max={180} defaultValue={selectedProps.angle} key={selectedProps.angle}
                      onBlur={e => applyObjProp('angle', e.target.value)}
                      className="w-full text-[11px] rounded-lg px-2 py-1.5 focus:outline-none"
                      style={{ background: C.input, border: `1px solid ${C.border}`, color: C.textMd }} />
                  </div>
                </div>

                {/* Lock + Aktionen */}
                <div className="px-3 py-2.5" style={{ borderBottom: `1px solid ${C.border}20` }}>
                  <button type="button" onClick={toggleLock}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
                    style={{
                      background: selectedProps.locked ? 'rgba(239,68,68,0.1)' : C.input,
                      border: `1px solid ${selectedProps.locked ? 'rgba(239,68,68,0.3)' : C.border}`,
                      color: selectedProps.locked ? '#f87171' : C.textMd,
                    }}>
                    {selectedProps.locked ? <Lock className="w-3 h-3" /> : <LockOpen className="w-3 h-3" />}
                    {selectedProps.locked ? 'Gesperrt (L)' : 'Sperren (L)'}
                  </button>
                </div>

                {/* Duplizieren */}
                <div className="px-3 py-2.5" style={{ borderBottom: `1px solid ${C.border}20` }}>
                  <button type="button" onClick={duplicateSelected}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
                    style={{ background: C.input, border: `1px solid ${C.border}`, color: C.textMd }}
                    onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
                    onMouseLeave={e => (e.currentTarget.style.background = C.input)}>
                    <Copy className="w-3 h-3" /> Duplizieren
                  </button>
                </div>

                {/* Gruppe auflösen */}
                {selectedProps.objType === 'group' && (
                  <div className="px-3 py-2.5" style={{ borderBottom: `1px solid ${C.border}20` }}>
                    <button type="button" onClick={ungroupSelected}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
                      style={{ background: 'rgba(68,92,73,0.15)', border: `1px solid rgba(68,92,73,0.35)`, color: C.textMd }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(68,92,73,0.3)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(68,92,73,0.15)')}>
                      <Ungroup className="w-3.5 h-3.5" /> Gruppe auflösen (Ctrl+Shift+G)
                    </button>
                  </div>
                )}

                {/* Produkt-Verknüpfung (nur für Möbel) */}
                {selectedProps.objType === 'moebel' && (() => {
                  const linkedProd = allProdukteRef.current.find(p => p.id === selectedProps.produkt_id)
                  const isLinked = !!selectedProps.produkt_id
                  return (
                    <div className="px-3 py-3">
                      <p className="text-[9px] uppercase tracking-wider font-semibold mb-2" style={{ color: `${C.textLt}60` }}>Produkt</p>
                      {isLinked ? (
                        <div className="rounded-lg p-2.5" style={{ background: 'rgba(68,92,73,0.12)', border: `1px solid rgba(68,92,73,0.3)` }}>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Package className="w-3 h-3 shrink-0" style={{ color: '#94c1a4' }} />
                            <span className="text-[10px] font-semibold truncate" style={{ color: C.textMd }}>
                              {linkedProd?.name ?? selectedProps.produkt_id?.slice(0, 8) + '…'}
                            </span>
                          </div>
                          {linkedProd?.artikelnummer && (
                            <p className="text-[9px] mb-0.5" style={{ color: `${C.textLt}60` }}>Art. {linkedProd.artikelnummer}</p>
                          )}
                          {linkedProd?.verkaufspreis_netto != null && (
                            <p className="text-[11px] font-semibold" style={{ color: '#94c1a4' }}>
                              {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(linkedProd.verkaufspreis_netto)} Netto
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {selectedProps.produkt_id && (
                              <Link href={`/dashboard/produkte/${selectedProps.produkt_id}/bearbeiten`} target="_blank"
                                className="flex items-center gap-1 text-[9px] transition-opacity hover:opacity-70"
                                style={{ color: '#94c1a4' }}>
                                <ExternalLink className="w-2.5 h-2.5" /> Öffnen
                              </Link>
                            )}
                            <button type="button" onClick={unlinkProdukt}
                              className="flex items-center gap-1 text-[9px] transition-opacity hover:opacity-70 ml-auto"
                              style={{ color: '#f87171' }}>
                              <Link2Off className="w-2.5 h-2.5" /> Entfernen
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button type="button" onClick={openProduktModal}
                          className="w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-[10px] transition-colors"
                          style={{ border: `1px dashed ${C.border}`, color: C.textLt }}
                          onMouseEnter={e => { e.currentTarget.style.background = C.hover; e.currentTarget.style.borderColor = '#445c49' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = C.border }}>
                          <Tag className="w-3 h-3" /> Produkt verknüpfen
                        </button>
                      )}
                    </div>
                  )
                })()}
              </div>
            ) : (
              <div>
                <div className="px-3 py-2.5" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: `${C.textLt}60` }}>Kein Objekt</p>
                  <p className="text-xs font-medium" style={{ color: '#fff' }}>Raum-Einstellungen</p>
                </div>
                <div className="px-3 py-3" style={{ borderBottom: `1px solid ${C.border}20` }}>
                  <p className="text-[9px] uppercase tracking-wider font-semibold mb-3" style={{ color: `${C.textLt}60` }}>Raummaße</p>
                  <div className="space-y-2.5">
                    {[
                      { label: 'Breite (m)', val: raumBreite, set: setRaumBreite },
                      { label: 'Länge (m)',  val: raumLaenge, set: setRaumLaenge },
                      { label: 'Höhe (m)',   val: raumHoehe,  set: setRaumHoehe },
                    ].map(({ label, val, set }) => (
                      <div key={label}>
                        <label className="text-[10px] block mb-1" style={{ color: `${C.textLt}80` }}>{label}</label>
                        <input type="number" step="0.1" min="0.5" max="50" value={val}
                          onChange={e => set(e.target.value)} onBlur={saveRaumMasse}
                          className="w-full text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
                          style={{ background: C.input, border: `1px solid ${C.border}`, color: C.textMd }} />
                      </div>
                    ))}
                  </div>
                </div>
                {/* Raum-Info */}
                {(parseFloat(raumBreite) > 0 || (breiteM ?? 0) > 0) && (parseFloat(raumLaenge) > 0 || (laengeM ?? 0) > 0) && (() => {
                  const b = parseFloat(raumBreite) || breiteM || 0
                  const l = parseFloat(raumLaenge) || laengeM || 0
                  const h = parseFloat(raumHoehe) || hoeheM || 0
                  const flaeche = b * l
                  const umfang = 2 * (b + l)
                  const volumen = h > 0 ? flaeche * h : null
                  return (
                    <div className="px-3 py-3" style={{ borderBottom: `1px solid ${C.border}20` }}>
                      <p className="text-[9px] uppercase tracking-wider font-semibold mb-2" style={{ color: `${C.textLt}60` }}>Raum-Info</p>
                      <div className="space-y-1.5">
                        {[
                          { label: 'Fläche',   value: `${flaeche.toFixed(2)} m²` },
                          { label: 'Umfang',   value: `${umfang.toFixed(2)} m` },
                          ...(volumen !== null ? [{ label: 'Volumen', value: `${volumen.toFixed(2)} m³` }] : []),
                          { label: 'Möbel',    value: `${objCount}` },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex items-center justify-between">
                            <span className="text-[10px]" style={{ color: `${C.textLt}70` }}>{label}</span>
                            <span className="text-[10px] font-medium font-mono" style={{ color: C.textMd }}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                <div className="px-3 py-3" style={{ borderBottom: `1px solid ${C.border}20` }}>
                  <p className="text-[9px] uppercase tracking-wider font-semibold mb-2" style={{ color: `${C.textLt}60` }}>Standard-Maße</p>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] block mb-1" style={{ color: `${C.textLt}80` }}>Tür-Breite</label>
                      <select value={doorWidth} onChange={e => setDoorWidth(Number(e.target.value))}
                        className="w-full text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
                        style={{ background: C.input, border: `1px solid ${C.border}`, color: C.textMd }}>
                        {[60,70,80,90,100].map(v => <option key={v} value={v}>{v} cm</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] block mb-1" style={{ color: `${C.textLt}80` }}>Fenster-Breite</label>
                      <div className="flex items-center gap-2">
                        <input type="number" value={windowWidth} min={60} max={300} step={10}
                          onChange={e => setWindowWidth(Number(e.target.value))}
                          className="w-full text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
                          style={{ background: C.input, border: `1px solid ${C.border}`, color: C.textMd }} />
                        <span className="text-[10px] shrink-0" style={{ color: `${C.textLt}60` }}>cm</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Boden-Textur */}
                <div className="px-3 py-3" style={{ borderBottom: `1px solid ${C.border}20` }}>
                  <p className="text-[9px] uppercase tracking-wider font-semibold mb-2.5" style={{ color: `${C.textLt}60` }}>Boden</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {Object.entries(FLOOR_TEXTURES).map(([key, tex]) => (
                      <button key={key} type="button" onClick={() => changeBodenTextur(key)}
                        title={tex.name}
                        className="flex flex-col items-center gap-1 rounded-lg p-1 transition-all"
                        style={{
                          background: bodenTextur === key ? 'rgba(68,92,73,0.4)' : 'rgba(0,0,0,0.15)',
                          border: `1.5px solid ${bodenTextur === key ? '#445c49' : 'transparent'}`,
                        }}>
                        <div className="w-8 h-8 rounded-md border flex items-center justify-center"
                          style={{ background: tex.preview, borderColor: `${C.border}40` }}>
                          {key === 'none' && <span className="text-[8px]" style={{ color: C.textLt }}>–</span>}
                        </div>
                        <span className="text-[8px] text-center leading-tight" style={{ color: C.textLt }}>{tex.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Kostenübersicht */}
                {produkteLoaded && (() => {
                  const { items, gesamt } = getKostenUebersicht()
                  return (
                    <div className="px-3 py-3" style={{ borderBottom: `1px solid ${C.border}20` }}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: `${C.textLt}60` }}>Kostenübersicht</p>
                        {items.length > 0 && (
                          <button type="button" onClick={exportKostenCsv} title="Als CSV exportieren"
                            className="transition-opacity hover:opacity-70" style={{ color: `${C.textLt}50` }}>
                            <Download className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {items.length > 0 ? (
                        <>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {items.map((item, i) => (
                              <div key={i} className="flex items-center justify-between text-[10px]">
                                <span className="truncate max-w-[100px]" style={{ color: `${C.textLt}70` }}>{item.count}× {item.name}</span>
                                <span className="font-medium shrink-0" style={{ color: C.textMd }}>
                                  {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(item.preis * item.count)}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: `1px solid ${C.border}30` }}>
                            <span className="text-[10px] font-semibold" style={{ color: C.textLt }}>Gesamt (Netto)</span>
                            <span className="text-[11px] font-bold" style={{ color: '#94c1a4' }}>
                              {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(gesamt)}
                            </span>
                          </div>
                        </>
                      ) : (
                        <p className="text-[10px]" style={{ color: `${C.textLt}40` }}>Keine Produkte verknüpft</p>
                      )}
                    </div>
                  )
                })()}


                {/* Wandfarbe */}
                <div className="px-3 py-3" style={{ borderBottom: `1px solid ${C.border}20` }}>
                  <p className="text-[9px] uppercase tracking-wider font-semibold mb-2.5" style={{ color: `${C.textLt}60` }}>Wandfarbe</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {WANDFARBEN.map(c => (
                      <button key={c} type="button" onClick={() => changeWandfarbe(c)}
                        title={c}
                        className="w-6 h-6 rounded-full transition-all hover:scale-110"
                        style={{
                          background: c,
                          border: `2px solid ${wandfarbe === c ? '#fff' : 'rgba(255,255,255,0.1)'}`,
                          boxShadow: wandfarbe === c ? '0 0 0 1.5px #445c49' : 'none',
                        }} />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="color" value={wandfarbe}
                      onChange={e => setWandfarbe(e.target.value)}
                      onBlur={e => changeWandfarbe(e.target.value)}
                      className="w-7 h-7 rounded-lg cursor-pointer p-0.5"
                      style={{ border: `1px solid ${C.border}`, background: 'transparent' }}
                      title="Eigene Farbe" />
                    <span className="text-[10px] font-mono" style={{ color: `${C.textLt}80` }}>{wandfarbe}</span>
                    <button type="button" onClick={() => changeWandfarbe(wandfarbe)}
                      className="ml-auto text-[10px] px-2 py-1 rounded-lg transition-colors"
                      style={{ background: C.input, color: C.textLt, border: `1px solid ${C.border}` }}>
                      Anwenden
                    </button>
                  </div>
                </div>

                {/* ── Ebenen-Panel ── */}
                <div className="px-3 py-3">
                  <button type="button"
                    onClick={() => setLayersExpanded(v => !v)}
                    className="flex items-center justify-between w-full mb-0 text-left">
                    <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: `${C.textLt}60` }}>Ebenen</span>
                    <ChevronDown className="w-3 h-3 transition-transform" style={{ color: `${C.textLt}60`, transform: layersExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                  </button>

                  {layersExpanded && (
                    <div className="mt-2.5 space-y-0.5">
                      {LAYERS.map(layer => {
                        const st = layerStates[layer.id] ?? { visible: true, locked: false }
                        const cnt = countObjectsInLayer(layer.types)
                        return (
                          <div key={layer.id} className="flex items-center gap-1.5 py-1 px-1.5 rounded-lg transition-colors"
                            style={{
                              background: !st.visible ? 'rgba(0,0,0,0.1)' : 'transparent',
                              opacity: !st.visible ? 0.55 : 1,
                            }}>
                            {/* Farb-Dot */}
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: layer.color }} />
                            {/* Name */}
                            <span className="flex-1 text-[11px] truncate" style={{ color: C.textMd }}>
                              {layer.name}
                              {cnt > 0 && <span className="ml-1 text-[9px]" style={{ color: `${C.textLt}60` }}>({cnt})</span>}
                            </span>
                            {/* Sichtbarkeit */}
                            <button type="button" title={st.visible ? 'Ausblenden' : 'Einblenden'}
                              onClick={() => toggleLayerVisibility(layer.id)}
                              className="w-6 h-6 flex items-center justify-center rounded transition-colors"
                              style={{ color: st.visible ? C.textLt : `${C.textLt}30` }}
                              onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                              {st.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            </button>
                            {/* Sperren */}
                            <button type="button" title={st.locked ? 'Entsperren' : 'Sperren'}
                              onClick={() => toggleLayerLock(layer.id)}
                              className="w-6 h-6 flex items-center justify-center rounded transition-colors"
                              style={{ color: st.locked ? '#fbbf24' : `${C.textLt}30` }}
                              onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                              {st.locked ? <Lock className="w-3 h-3" /> : <LockOpen className="w-3 h-3" />}
                            </button>
                          </div>
                        )
                      })}
                      {/* Quick Actions */}
                      <div className="flex gap-1 pt-2 mt-1" style={{ borderTop: `1px solid ${C.border}20` }}>
                        <button type="button" onClick={showAllLayers}
                          className="flex-1 text-[10px] py-1 rounded-lg transition-colors"
                          style={{ color: C.textLt, background: 'transparent' }}
                          onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          Alle zeigen
                        </button>
                        <button type="button" onClick={hideAllLayers}
                          className="flex-1 text-[10px] py-1 rounded-lg transition-colors"
                          style={{ color: C.textLt, background: 'transparent' }}
                          onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          Alle aus
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stückliste Modal ── */}
      {showStuecklisteModal && (() => {
        const items = getStueckliste()
        const gesamt = items.reduce((s, i) => s + (i.gesamt ?? 0), 0)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowStuecklisteModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-[680px] max-w-[95vw] max-h-[80vh] flex flex-col"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Stückliste – {raumName}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{items.length} Positionen</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={exportStuecklisteCsv} disabled={!items.length}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 text-gray-600">
                    <Download className="w-3.5 h-3.5" /> CSV
                  </button>
                  <button onClick={exportStuecklisteXlsx} disabled={!items.length}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors disabled:opacity-40"
                    style={{ background: '#445c49' }}>
                    <Sheet className="w-3.5 h-3.5" /> Excel
                  </button>
                  <button onClick={() => setShowStuecklisteModal(false)} className="text-gray-400 hover:text-gray-600 ml-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <Sheet className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm">Keine Objekte im Grundriss</p>
                  </div>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="sticky top-0">
                      <tr style={{ background: '#445c49' }}>
                        {['Nr', 'Bezeichnung', 'B (cm)', 'L (cm)', 'Menge', 'EP Netto', 'Gesamt Netto'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left text-white font-semibold first:w-8">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-2 text-gray-400 font-mono">{item.nr}</td>
                          <td className="px-3 py-2 text-gray-900 font-medium max-w-[200px] truncate">{item.name}</td>
                          <td className="px-3 py-2 text-gray-600 font-mono">{item.breite || '–'}</td>
                          <td className="px-3 py-2 text-gray-600 font-mono">{item.laenge || '–'}</td>
                          <td className="px-3 py-2 text-gray-900 font-semibold text-center">{item.menge}</td>
                          <td className="px-3 py-2 text-gray-600 font-mono text-right">
                            {item.einzelpreis !== null ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(item.einzelpreis) : '–'}
                          </td>
                          <td className="px-3 py-2 font-semibold font-mono text-right" style={{ color: item.gesamt !== null ? '#445c49' : '#9ca3af' }}>
                            {item.gesamt !== null ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(item.gesamt) : '–'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {gesamt > 0 && (
                      <tfoot>
                        <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                          <td colSpan={5} className="px-3 py-2.5 text-right text-sm font-semibold text-gray-700">Gesamt Netto</td>
                          <td />
                          <td className="px-3 py-2.5 text-right text-sm font-bold" style={{ color: '#445c49' }}>
                            {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(gesamt)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                )}
              </div>
              {etagen.length > 1 && (
                <div className="px-6 py-3 border-t border-gray-100 shrink-0">
                  <p className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Layers className="w-3 h-3" /> Aktive Etage: <span className="font-medium">{etagen.find(e => e.id === aktiveEtageId)?.name ?? '–'}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* ── Freigabe-Modal ── */}
      {showFreigabeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowFreigabeModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-96 max-w-full"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Freigabe-Link</h2>
                <p className="text-xs text-gray-400 mt-0.5">Grundriss öffentlich teilen</p>
              </div>
              <button onClick={() => setShowFreigabeModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl mb-4"
              style={{ background: freigabeAktiv ? 'rgba(74,222,128,0.08)' : '#f8fafc', border: `1px solid ${freigabeAktiv ? 'rgba(74,222,128,0.3)' : '#e2e8f0'}` }}>
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {freigabeAktiv ? 'Freigabe aktiv' : 'Freigabe inaktiv'}
                </p>
                <p className="text-xs text-gray-400">
                  {freigabeAktiv ? 'Link ist öffentlich zugänglich' : 'Link ist deaktiviert'}
                </p>
              </div>
              <button type="button" onClick={toggleFreigabe} disabled={freigabeSaving}
                className="relative w-12 h-6 rounded-full transition-all duration-200 disabled:opacity-50"
                style={{ background: freigabeAktiv ? '#445c49' : '#d1d5db' }}>
                <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                  style={{ transform: freigabeAktiv ? 'translateX(24px)' : 'translateX(0)' }} />
              </button>
            </div>

            {freigabeAktiv && freigabeToken && (() => {
              const url = `${typeof window !== 'undefined' ? window.location.origin : 'https://app.wellbeing-spaces.de'}/raumplan/${freigabeToken}`
              return (
                <>
                  {/* Link */}
                  <div className="mb-4">
                    <label className="text-[11px] font-medium text-gray-500 block mb-1.5">Freigabe-Link</label>
                    <div className="flex gap-2">
                      <div className="flex-1 flex items-center px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-600 truncate">
                        {url}
                      </div>
                      <button type="button" onClick={kopiereFreigabeLink}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors"
                        style={{
                          background: linkKopiert ? 'rgba(74,222,128,0.08)' : '#f8fafc',
                          borderColor: linkKopiert ? 'rgba(74,222,128,0.4)' : '#e2e8f0',
                          color: linkKopiert ? '#16a34a' : '#374151',
                        }}>
                        {linkKopiert ? <><Check className="w-3.5 h-3.5" /> Kopiert</> : <><Link2 className="w-3.5 h-3.5" /> Kopieren</>}
                      </button>
                    </div>
                  </div>

                  {/* QR-Code */}
                  <div className="mb-4">
                    <label className="text-[11px] font-medium text-gray-500 block mb-1.5">QR-Code</label>
                    <div className="flex items-center gap-4">
                      <div className="bg-white p-3 rounded-xl border border-gray-200 inline-block">
                        <QRCode value={url} size={120} level="M" />
                      </div>
                      <div className="text-xs text-gray-400 leading-relaxed">
                        QR-Code scannen<br />um den Grundriss<br />auf dem Handy<br />zu öffnen.
                      </div>
                    </div>
                  </div>

                  {/* Vorschau-Button */}
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium rounded-xl transition-colors"
                    style={{ background: '#445c49', color: '#fff' }}>
                    Vorschau öffnen
                  </a>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* ── Bild-Export-Modal ── */}
      {showBildModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowBildModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 max-w-full"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-gray-900">Als Bild exportieren</h2>
              <button onClick={() => setShowBildModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Format */}
              <div>
                <label className="text-[11px] font-medium text-gray-500 block mb-1.5">Format</label>
                <div className="flex gap-2">
                  {(['png', 'jpg'] as const).map(f => (
                    <button key={f} type="button" onClick={() => { setBildFormat(f); if (f === 'jpg') setBildTransparent(false) }}
                      className="flex-1 py-1.5 text-sm font-medium rounded-lg border transition-all uppercase"
                      style={{
                        background: bildFormat === f ? '#445c49' : '#f8fafc',
                        borderColor: bildFormat === f ? '#445c49' : '#e2e8f0',
                        color: bildFormat === f ? '#fff' : '#374151',
                      }}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auflösung */}
              <div>
                <label className="text-[11px] font-medium text-gray-500 block mb-1.5">Auflösung</label>
                <div className="flex gap-2">
                  {([1, 2, 4] as const).map(m => (
                    <button key={m} type="button" onClick={() => setBildMultiplier(m)}
                      className="flex-1 py-1.5 text-sm font-medium rounded-lg border transition-all"
                      style={{
                        background: bildMultiplier === m ? '#445c49' : '#f8fafc',
                        borderColor: bildMultiplier === m ? '#445c49' : '#e2e8f0',
                        color: bildMultiplier === m ? '#fff' : '#374151',
                      }}>
                      {m}×
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  {bildMultiplier === 1 ? 'Normale Auflösung' : bildMultiplier === 2 ? 'Doppelte Auflösung (empfohlen)' : 'Vierfache Auflösung (Druck)'}
                </p>
              </div>

              {/* Hintergrund (nur PNG) */}
              {bildFormat === 'png' && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-700">Transparenter Hintergrund</p>
                    <p className="text-[10px] text-gray-400">Nur Möbel, kein weißer Hintergrund</p>
                  </div>
                  <button type="button" onClick={() => setBildTransparent(v => !v)}
                    className="relative w-10 h-5 rounded-full transition-all duration-200"
                    style={{ background: bildTransparent ? '#445c49' : '#d1d5db' }}>
                    <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
                      style={{ transform: bildTransparent ? 'translateX(20px)' : 'translateX(0)' }} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowBildModal(false)} className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Abbrechen
              </button>
              <button onClick={exportAsImage}
                className="flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                style={{ background: '#445c49' }}>
                Exportieren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Templates Modal ── */}
      {showTemplatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowTemplatesModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[560px] max-w-[95vw] max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Raum-Templates</h2>
                <p className="text-xs text-gray-400 mt-0.5">Voreingerichtete Layouts als Ausgangspunkt laden</p>
              </div>
              <button type="button" onClick={() => setShowTemplatesModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {RAUM_TEMPLATES.map(tpl => (
                <button key={tpl.name} type="button" onClick={() => ladeTemplate(tpl)}
                  className="text-left p-4 rounded-xl border border-gray-200 hover:border-[#445c49] hover:bg-[#f6faf7] transition-all group">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl leading-none mt-0.5">{tpl.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-[#445c49] transition-colors">{tpl.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{tpl.beschreibung}</p>
                      <p className="text-[10px] text-gray-300 mt-1">{tpl.objekte.length} Objekte</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}


      {/* ── Produkt-Suche Modal ── */}
      {showProduktModal && (() => {
        const kategorien = Array.from(new Set(allProdukte.map(p => p.kategorie).filter(Boolean))) as string[]
        const gefiltert = allProdukte.filter(p => {
          const matchSuche = p.name.toLowerCase().includes(produktSuche.toLowerCase()) ||
            (p.artikelnummer?.toLowerCase().includes(produktSuche.toLowerCase()) ?? false)
          const matchKat = !produktKatFilter || p.kategorie === produktKatFilter
          return matchSuche && matchKat
        })
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowProduktModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-[480px] max-w-[95vw] max-h-[80vh] flex flex-col"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Produkt verknüpfen</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Möbel mit einem Produkt aus der Bibliothek verbinden</p>
                </div>
                <button type="button" onClick={() => setShowProduktModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Suche + Filter */}
              <div className="px-5 pb-3 shrink-0 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input type="text" placeholder="Produktname oder Artikelnummer…" value={produktSuche}
                    onChange={e => setProduktSuche(e.target.value)} autoFocus
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#445c49]/20 focus:border-[#445c49]" />
                </div>
                <select value={produktKatFilter} onChange={e => setProduktKatFilter(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-[#445c49]/20 focus:border-[#445c49] text-gray-600">
                  <option value="">Alle Kategorien</option>
                  {kategorien.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              {/* Produktliste */}
              <div className="flex-1 overflow-y-auto px-5 pb-4">
                {gefiltert.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                    <Package className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-sm">Keine Produkte gefunden</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {gefiltert.map(p => (
                      <button key={p.id} type="button" onClick={() => linkProdukt(p)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-transparent hover:border-[#445c49]/30 hover:bg-[#f6faf7] transition-all group text-left">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 group-hover:text-[#445c49] truncate">{p.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {p.artikelnummer && <span className="text-[10px] text-gray-400">Art. {p.artikelnummer}</span>}
                            {p.kategorie && <span className="text-[10px] text-gray-400 px-1.5 py-0.5 bg-gray-100 rounded-full">{p.kategorie}</span>}
                          </div>
                        </div>
                        {p.verkaufspreis_netto != null && (
                          <span className="text-sm font-semibold text-[#445c49] ml-3 shrink-0">
                            {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(p.verkaufspreis_netto)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}


      {/* ── Status-Bar ── */}
      <div className="flex items-center justify-between px-4 py-1.5 shrink-0 h-8"
        style={{ background: C.toolbar, borderTop: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-4 text-[10px] font-mono" style={{ color: `${C.textLt}60` }}>
          <span>X {mousePos.x.toFixed(2)} m</span>
          <span>Y {mousePos.y.toFixed(2)} m</span>
          {/* Ausgeblendete Ebenen Indikator */}
          {(() => {
            const hidden = LAYERS.filter(l => !(layerStates[l.id]?.visible ?? true))
            if (hidden.length === 0) return null
            return (
              <button type="button" onClick={showAllLayers}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors"
                style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}
                title="Ausgeblendete Ebenen – klicken um alle anzuzeigen">
                <EyeOff className="w-3 h-3" />
                {hidden.length} {hidden.length === 1 ? 'Ebene' : 'Ebenen'} ausgeblendet
              </button>
            )
          })()}
        </div>
        <div className="flex items-center gap-3 text-[10px]" style={{ color: `${C.textLt}60` }}>
          {snapToGrid && (
            <span className="flex items-center gap-1" style={{ color: '#94c1a4' }}>
              <Magnet className="w-3 h-3" />Snap
            </span>
          )}
          <span style={{
            color: activeTool === 'wall' || activeTool === 'measure' ? '#fbbf24' :
                   activeTool === 'eraser' ? '#f87171' :
                   activeTool === 'door' || activeTool === 'window' ? '#93c5fd' : C.textLt
          }}>{allTools.find(t => t.key === activeTool)?.label}</span>
          <span>Raster {gridSize}cm</span>
          <span>{objCount} Objekte</span>
          <span>{Math.round(zoom * 100)}%</span>
        </div>
      </div>
    </div>
    </>
  )
}

// ── MoebelGrid ────────────────────────────────────────────────

function MoebelGrid({ symbols, fabricRef, placeMoebel, colors, starredIds, onStar }: {
  symbols: MoebelSymbol[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fabricRef: React.MutableRefObject<any>
  placeMoebel: (s: MoebelSymbol, x: number, y: number) => void
  colors: { hover: string; textLt: string; border: string }
  starredIds?: Set<string>
  onStar?: (id: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {symbols.map(symbol => (
        <div key={symbol.id} draggable
          onDragStart={e => { e.dataTransfer.setData('application/moebel-symbol', JSON.stringify(symbol)); e.dataTransfer.effectAllowed = 'copy' }}
          onClick={() => {
            const c = fabricRef.current; if (!c) return
            const vpt = c.viewportTransform ?? [1,0,0,1,0,0]
            placeMoebel(symbol, (c.getWidth() / 2 - vpt[4]) / vpt[0], (c.getHeight() / 2 - vpt[5]) / vpt[3])
          }}
          className="relative rounded-lg p-1.5 cursor-grab active:cursor-grabbing transition-all select-none"
          style={{ background: 'rgba(0,0,0,0.15)', border: `1px solid rgba(74,99,80,0.2)` }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = colors.hover; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(68,92,73,0.5)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.15)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(74,99,80,0.2)' }}
          title={`${symbol.name} – ${symbol.breite_cm}×${symbol.tiefe_cm}cm`}>
          {onStar && (
            <button type="button"
              onClick={e => { e.stopPropagation(); onStar(symbol.id) }}
              className="absolute top-1 right-1 z-10 transition-opacity"
              style={{
                color: starredIds?.has(symbol.id) ? '#fbbf24' : `${colors.textLt}40`,
                opacity: starredIds?.has(symbol.id) ? 1 : 0.4,
              }}
              title={starredIds?.has(symbol.id) ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}>
              <Star className="w-3 h-3" fill={starredIds?.has(symbol.id) ? '#fbbf24' : 'none'} />
            </button>
          )}
          <div className="w-full rounded-md mb-1.5 overflow-hidden flex items-center justify-center p-1 bg-white/10" style={{ minHeight: 36 }}>
            <MoebelPreview symbol={symbol} />
          </div>
          <p className="text-[10px] font-medium leading-tight truncate transition-colors" style={{ color: colors.textLt }}>{symbol.name}</p>
          <p className="text-[9px] leading-tight" style={{ color: `${colors.textLt}50` }}>{symbol.breite_cm}×{symbol.tiefe_cm}cm</p>
        </div>
      ))}
    </div>
  )
}

