'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  MousePointer2, Minus, Plus, Grid3x3, Save,
  RotateCcw, RotateCw, Search, ChevronLeft, Pencil,
  Eraser, CheckCircle, DoorOpen, AppWindow, Ruler,
  HelpCircle, X, Maximize2, Minimize2, ChevronDown, ChevronRight,
  AlertCircle, Trash2, FileDown, PanelLeft,
  Copy, ArrowUpToLine, ArrowDownToLine, ArrowUp, ArrowDown,
  Magnet, Lock, LockOpen, Star, Share2, Image as ImageIcon, Check, Link2,
  LayoutTemplate, Upload, TriangleAlert,
} from 'lucide-react'
import QRCode from 'react-qr-code'
import { grundrissSpeichern, raumMasseAktualisieren, getCustomMoebel, customMoebelErstellen, getRaumFreigabeInfo, raumFreigabeAktualisieren, raumTexturenSpeichern } from '@/app/actions/raumplaner'
import type { MoebelSymbol, CustomMoebel as CustomMoebelType } from '@/lib/supabase/types'

// ── Konstanten ────────────────────────────────────────────────

const SCALE          = 100   // px pro Meter
const WALL_THICKNESS = 15
const MIN_ZOOM       = 0.1
const MAX_ZOOM       = 5
const AUTOSAVE_DELAY = 3000

type Tool = 'select' | 'wall' | 'door' | 'window' | 'measure' | 'eraser'
type GridSize = 10 | 25 | 50 | 100

const MOEBEL_GRUPPEN: { name: string; keys: string[] }[] = [
  { name: 'Wohnzimmer',   keys: ['Sofa', 'Sessel', 'Couchtisch', 'Sideboard', 'TV-Board', 'Stehlampe', 'Bücherregal', 'Pouf', 'Kaminofen', 'Pflanze', 'Teppich', 'Regal'] },
  { name: 'Schlafzimmer', keys: ['Bett', 'Nachttisch', 'Kleiderschrank', 'Kommode', 'Schminktisch', 'Spiegel', 'Wäschekorb'] },
  { name: 'Esszimmer',    keys: ['Esstisch', 'Esszimmerstuhl', 'Eckbank', 'Vitrine', 'Anrichte'] },
  { name: 'Büro',         keys: ['Schreibtisch', 'Bürostuhl', 'Barhocker', 'Aktenschrank', 'Rollcontainer', 'Konferenztisch', 'Stehpult', 'Flipchart', 'Drucker', 'Papierkorb'] },
  { name: 'Küche',        keys: ['Küchenzeile', 'Kücheninsel', 'Herd', 'Kühlschrank', 'Spüle', 'Geschirrspüler', 'Mikrowelle'] },
  { name: 'Bad',          keys: ['Badewanne', 'Dusche', 'Waschbecken', 'Toilette', 'WC', 'Bidet', 'Handtuchhalter', 'Wäschetrockner'] },
  { name: 'Garten',       keys: ['Gartentisch', 'Gartenstuhl', 'Sonnenliege', 'Sonnenschirm', 'Grill', 'Pflanzkübel', 'Outdoor', 'Pool'] },
  { name: 'Wellness',     keys: ['Sauna', 'Infrarotkabine', 'Whirlpool', 'Massageliege', 'Ruheliege', 'Handtuchregal'] },
]

// ── Boden-Texturen ────────────────────────────────────────────
interface FloorTexture { name: string; preview: string }
const FLOOR_TEXTURES: Record<string, FloorTexture> = {
  'none':           { name: 'Kein',          preview: '#f8f9fa' },
  'holz-hell':      { name: 'Holz hell',     preview: '#d4a574' },
  'holz-dunkel':    { name: 'Holz dunkel',   preview: '#7c5c3a' },
  'parkett':        { name: 'Parkett',       preview: '#c49a6c' },
  'laminat-grau':   { name: 'Laminat',       preview: '#9ca3af' },
  'fliesen-weiss':  { name: 'Fliesen weiß',  preview: '#f5f5f5' },
  'fliesen-grau':   { name: 'Fliesen grau',  preview: '#d1d5db' },
  'fliesen-schwarz':{ name: 'Fliesen schwarz',preview: '#374151' },
  'marmor':         { name: 'Marmor',        preview: '#e8e0d8' },
  'beton':          { name: 'Beton',         preview: '#9ca3af' },
  'teppich-beige':  { name: 'Teppich beige', preview: '#d4b896' },
  'teppich-grau':   { name: 'Teppich grau',  preview: '#9ca3af' },
}

// Wand-Farbpalette
const WANDFARBEN = [
  '#ffffff', '#f5f5dc', '#e8e8e8', '#d3d3d3',
  '#c2b280', '#cba178', '#add8e6', '#98e8c0',
  '#ffe4e1', '#e6e6fa', '#e2725b', '#9dc183',
  '#1e293b', '#445c49', '#2d3e31', '#4b4b4b',
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
    case 'parkett': {
      c.width = 40; c.height = 40
      // Fischgrät - zwei diagonale Planken
      ctx.fillStyle = '#c49a6c'; ctx.fillRect(0, 0, 40, 40)
      ctx.strokeStyle = '#a07848'; ctx.lineWidth = 1
      // Plank 1
      ctx.fillStyle = '#c49a6c'
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(20, 0); ctx.lineTo(20, 20); ctx.lineTo(0, 20); ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#b8904e'
      ctx.beginPath(); ctx.moveTo(20, 20); ctx.lineTo(40, 20); ctx.lineTo(40, 40); ctx.lineTo(20, 40); ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#c49a6c'
      ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(40, 0); ctx.lineTo(40, 20); ctx.lineTo(20, 20); ctx.closePath(); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#b8904e'
      ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(20, 20); ctx.lineTo(20, 40); ctx.lineTo(0, 40); ctx.closePath(); ctx.fill(); ctx.stroke()
      break
    }
    case 'laminat-grau': {
      c.width = 20; c.height = 80
      ctx.fillStyle = '#b0b8c0'; ctx.fillRect(0, 0, 20, 80)
      ctx.strokeStyle = '#8a9299'; ctx.lineWidth = 1
      ctx.strokeRect(0.5, 0.5, 19, 79)
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
    case 'fliesen-schwarz': {
      c.width = 52; c.height = 52
      ctx.fillStyle = '#374151'; ctx.fillRect(0, 0, 52, 52)
      ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 2
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
    case 'teppich-beige': {
      c.width = 8; c.height = 8
      ctx.fillStyle = '#d4b896'; ctx.fillRect(0, 0, 8, 8)
      ctx.fillStyle = '#c4a886'; ctx.fillRect(0, 0, 4, 4)
      ctx.fillRect(4, 4, 4, 4)
      break
    }
    case 'teppich-grau': {
      c.width = 8; c.height = 8
      ctx.fillStyle = '#9ca3af'; ctx.fillRect(0, 0, 8, 8)
      ctx.fillStyle = '#8c939e'; ctx.fillRect(0, 0, 4, 4)
      ctx.fillRect(4, 4, 4, 4)
      break
    }
    default: return null
  }
  return c
}

interface SelectedProps {
  x: number; y: number; w: number; h: number; angle: number; name: string; objType?: string
  locked: boolean
}
interface NewMoebelForm {
  name: string; kategorie: string; breite_cm: number; laenge_cm: number; farbe: string
}
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
    name: 'Büro', emoji: '💼', beschreibung: 'L-Schreibtisch, Bürostuhl, Aktenschrank',
    objekte: [
      { name: 'Schreibtisch L-Form', x: 40, y: 40,  breite: 180, tiefe: 150, farbe: '#d4b896' },
      { name: 'Bürostuhl',           x: 110, y: 210, breite: 45,  tiefe:  45, farbe: '#b8cfc7' },
      { name: 'Aktenschrank',        x: 280, y: 40,  breite: 80,  tiefe:  45, farbe: '#c8c8c8' },
      { name: 'Regal',               x: 370, y: 40,  breite: 120, tiefe:  35, farbe: '#d4b896' },
    ],
  },
  {
    name: 'Küche', emoji: '🍳', beschreibung: 'Küchenzeile, Herd, Kühlschrank, Esstisch',
    objekte: [
      { name: 'Küchenzeile 3m', x: 30,  y: 30,  breite: 300, tiefe:  60, farbe: '#e0e0e0' },
      { name: 'Herd',           x: 330, y: 30,  breite:  60, tiefe:  60, farbe: '#e0e0e0' },
      { name: 'Kühlschrank',    x: 390, y: 30,  breite:  70, tiefe:  70, farbe: '#e0e0e0' },
      { name: 'Esstisch 4P',    x: 100, y: 180, breite: 120, tiefe:  80, farbe: '#d4b896' },
      { name: 'Esszimmerstuhl', x: 105, y: 120, breite:  45, tiefe:  45, farbe: '#b8cfc7' },
      { name: 'Esszimmerstuhl', x: 175, y: 120, breite:  45, tiefe:  45, farbe: '#b8cfc7' },
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
  {
    name: 'Esszimmer', emoji: '🍽️', beschreibung: 'Esstisch 6P mit Stühlen und Vitrine',
    objekte: [
      { name: 'Esstisch 6P',    x: 80,  y: 130, breite: 180, tiefe:  90, farbe: '#d4b896' },
      { name: 'Esszimmerstuhl', x: 90,  y: 65,  breite:  45, tiefe:  45, farbe: '#b8cfc7' },
      { name: 'Esszimmerstuhl', x: 160, y: 65,  breite:  45, tiefe:  45, farbe: '#b8cfc7' },
      { name: 'Esszimmerstuhl', x: 230, y: 65,  breite:  45, tiefe:  45, farbe: '#b8cfc7' },
      { name: 'Esszimmerstuhl', x: 90,  y: 245, breite:  45, tiefe:  45, farbe: '#b8cfc7' },
      { name: 'Esszimmerstuhl', x: 160, y: 245, breite:  45, tiefe:  45, farbe: '#b8cfc7' },
      { name: 'Esszimmerstuhl', x: 230, y: 245, breite:  45, tiefe:  45, farbe: '#b8cfc7' },
      { name: 'Vitrine',        x: 380, y: 130, breite: 100, tiefe:  45, farbe: '#d4b896' },
    ],
  },
]

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
  const [customMoebel,  setCustomMoebel]  = useState<CustomMoebelType[]>([])
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [customSaving,  setCustomSaving]  = useState(false)
  const [newMoebel,     setNewMoebel]     = useState<NewMoebelForm>({
    name: '', kategorie: 'Wohnzimmer', breite_cm: 80, laenge_cm: 80, farbe: '#94c1a4',
  })

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
  const [showKollision,     setShowKollision]      = useState(false)
  const [kollisionAnzahl,   setKollisionAnzahl]   = useState(0)
  const [showTemplatesModal, setShowTemplatesModal] = useState(false)
  const [showImportModal,   setShowImportModal]   = useState(false)
  const showDimensionsRef   = useRef(false)
  const showKollisionRef    = useRef(false)
  const dimTimerRef         = useRef<ReturnType<typeof setTimeout> | null>(null)
  const kollTimerRef        = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggerDimUpdateRef = useRef(() => {})
  const triggerKollUpdateRef = useRef(() => {})

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

  // ── Ref-Sync ──────────────────────────────────────────────

  useEffect(() => { activeToolRef.current = activeTool }, [activeTool])
  useEffect(() => { showGridRef.current = showGrid; fabricRef.current?.requestRenderAll() }, [showGrid])
  useEffect(() => { gridSizeRef.current = gridSize; fabricRef.current?.requestRenderAll() }, [gridSize])
  useEffect(() => { doorWidthRef.current = doorWidth }, [doorWidth])
  useEffect(() => { windowWidthRef.current = windowWidth }, [windowWidth])
  useEffect(() => { snapToGridRef.current = snapToGrid }, [snapToGrid])
  useEffect(() => { triggerDimUpdateRef.current() }, [showDimensions])
  useEffect(() => { triggerKollUpdateRef.current() }, [showKollision])

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

  // Custom-Möbel aus DB laden
  useEffect(() => {
    getCustomMoebel().then(data => setCustomMoebel(data)).catch(() => {})
  }, [])

  // ── Grid (world-coordinate approach, bewegt sich korrekt mit Zoom/Pan) ──

  function renderGrid(canvas: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!showGridRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx: CanvasRenderingContext2D = (canvas as any).getContext('2d')
    const vpt: number[] = canvas.viewportTransform ?? [1,0,0,1,0,0]
    const zoom = canvas.getZoom()
    const gSize = gridSizeRef.current

    ctx.save()
    // Apply viewport transform → draw in world/canvas coordinates
    ctx.setTransform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5])

    const cW = canvas.getWidth() / zoom
    const cH = canvas.getHeight() / zoom
    const ox = -vpt[4] / zoom
    const oy = -vpt[5] / zoom

    // Minor grid
    const sX = Math.floor(ox / gSize) * gSize
    const sY = Math.floor(oy / gSize) * gSize
    ctx.strokeStyle = 'rgba(150,180,150,0.30)'
    ctx.lineWidth = 0.5 / zoom
    for (let x = sX; x <= ox + cW + gSize; x += gSize) {
      ctx.beginPath(); ctx.moveTo(x, oy); ctx.lineTo(x, oy + cH); ctx.stroke()
    }
    for (let y = sY; y <= oy + cH + gSize; y += gSize) {
      ctx.beginPath(); ctx.moveTo(ox, y); ctx.lineTo(ox + cW, y); ctx.stroke()
    }

    // Major grid (1 m = 100 px)
    const mX = Math.floor(ox / 100) * 100
    const mY = Math.floor(oy / 100) * 100
    ctx.strokeStyle = 'rgba(80,130,90,0.40)'
    ctx.lineWidth = 1 / zoom
    for (let x = mX; x <= ox + cW + 100; x += 100) {
      ctx.beginPath(); ctx.moveTo(x, oy); ctx.lineTo(x, oy + cH); ctx.stroke()
    }
    for (let y = mY; y <= oy + cH + 100; y += 100) {
      ctx.beginPath(); ctx.moveTo(ox, y); ctx.lineTo(ox + cW, y); ctx.stroke()
    }

    ctx.restore()
  }

  // ── Canvas-JSON (ohne Outline/Preview) ───────────────────

  const getCanvasJson = useCallback(() => {
    const canvas = fabricRef.current; if (!canvas) return '{}'
    const full = canvas.toJSON(['data', 'name'])
    const SKIP = new Set(['outline','preview','alignment','floor','dimension','collision'])
    full.objects = (full.objects ?? []).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (o: any) => !SKIP.has(o.data?.type)
    )
    return JSON.stringify(full)
  }, [])

  const updateObjCount = useCallback(() => {
    const canvas = fabricRef.current; if (!canvas) return
    const SKIP_COUNT = new Set(['outline','preview','floor','dimension','collision'])
    setObjCount(canvas.getObjects().filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (o: any) => !SKIP_COUNT.has(o.data?.type)
    ).length)
  }, [])

  // ── Auto-Save ─────────────────────────────────────────────

  const triggerAutoSave = useCallback(() => {
    setSaveStatus('unsaved')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      const res = await grundrissSpeichern(raumId, getCanvasJson())
      setSaveStatus(res.fehler ? 'error' : 'saved')
    }, AUTOSAVE_DELAY)
  }, [raumId, getCanvasJson])

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
    const res = await grundrissSpeichern(raumId, getCanvasJson())
    setSaveStatus(res.fehler ? 'error' : 'saved')
  }, [raumId, getCanvasJson])

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
    canvas.add(outline); canvas.sendObjectToBack(outline); canvas.requestRenderAll()
  }, [])

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
      stroke: '#1e293b', strokeWidth: WALL_THICKNESS, strokeLineCap: 'square',
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
      locked: obj.data?.locked === true,
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

      // Grid nach jedem Render zeichnen
      canvas.on('after:render', () => {
        if (showGridRef.current) renderGrid(canvas)
        // Minimap-Update throttled (500ms)
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

      canvas.on('selection:created', (e: any) => { const o = e.selected?.[0]; if (o) setSelectedProps(extractObjProps(o)) }) // eslint-disable-line @typescript-eslint/no-explicit-any
      canvas.on('selection:updated', (e: any) => { const o = e.selected?.[0]; if (o) setSelectedProps(extractObjProps(o)) }) // eslint-disable-line @typescript-eslint/no-explicit-any
      canvas.on('selection:cleared', () => setSelectedProps(null))

      canvas.on('object:modified', () => {
        // Alignment-Linien + Wand-Highlights aufräumen
        alignmentLinesRef.current.forEach((l: any) => { try { canvas.remove(l) } catch { /* ignore */ } }) // eslint-disable-line @typescript-eslint/no-explicit-any
        alignmentLinesRef.current = []
        canvas.getObjects().forEach((o: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          if (o.data?.type === 'wall') o.set('stroke', '#1e293b')
        })
        pushHistory(); triggerAutoSave()
        triggerDimUpdateRef.current(); triggerKollUpdateRef.current()
      })
      canvas.on('object:added', () => { triggerDimUpdateRef.current(); triggerKollUpdateRef.current() })
      canvas.on('object:removed', () => { triggerDimUpdateRef.current(); triggerKollUpdateRef.current() })

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

          // Alle Wände zurücksetzen, dann beste highlighten
          walls.forEach((w: any) => w.set('stroke', '#1e293b')) // eslint-disable-line @typescript-eslint/no-explicit-any
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
        const json = e.dataTransfer?.getData('application/moebel-symbol'); if (!json) return
        const symbol: MoebelSymbol = JSON.parse(json)
        const rect = cont.getBoundingClientRect()
        const p = canvas.getPointer({ offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top } as MouseEvent)
        placeMoebel(symbol, p.x, p.y)
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
          if (t === 'wall') { stopWallTool(); return }
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const objs = canvas.getObjects().filter((o: any) => o.data?.type !== 'outline' && o.data?.type !== 'preview')
    const targets = objs.length > 0 ? objs : canvas.getObjects()
    if (!targets.length) { zoomReset(); return }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    targets.forEach((o: any) => {
      const b = o.getBoundingRect()
      minX = Math.min(minX, b.left); minY = Math.min(minY, b.top)
      maxX = Math.max(maxX, b.left + b.width); maxY = Math.max(maxY, b.top + b.height)
    })
    const pad = 60
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(
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
    if (!confirm('Alle Objekte löschen?')) return
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

  // ── Custom-Möbel platzieren ───────────────────────────────
  function placeCustomMoebel(cm: CustomMoebelType, x: number, y: number) {
    const canvas = fabricRef.current, imp = fabricImports.current
    if (!canvas || !imp) return
    const { Group, Rect, Text } = imp
    const w = cm.breite_cm, h = cm.laenge_cm
    const bg = new Rect({
      width: w, height: h, fill: cm.farbe, stroke: '#1e293b', strokeWidth: 1.5,
      rx: 3, ry: 3, originX: 'left', originY: 'top',
    })
    const label = new Text(cm.name, {
      fontSize: Math.max(7, Math.min(11, w / Math.max(cm.name.length, 4) * 1.4)),
      fill: '#1e293b', textAlign: 'center', originX: 'center', originY: 'center',
      left: w / 2, top: h / 2, fontFamily: 'system-ui, sans-serif',
    })
    const group = new Group([bg, label], {
      left: x - w / 2, top: y - h / 2,
      data: { type: 'moebel', customId: cm.id, name: cm.name }, name: cm.name,
    })
    canvas.add(group); canvas.setActiveObject(group); canvas.requestRenderAll()
    pushHistory(); triggerAutoSave(); updateObjCount()
  }

  // ── Custom-Möbel in DB speichern ─────────────────────────
  async function saveCustomMoebel() {
    if (!newMoebel.name.trim()) return
    setCustomSaving(true)
    try {
      const res = await customMoebelErstellen(newMoebel)
      if ('id' in res) {
        const created: CustomMoebelType = {
          ...newMoebel, id: res.id, ist_favorit: false, created_by: null, created_at: new Date().toISOString(), organisation_id: null,
        }
        setCustomMoebel(prev => [created, ...prev])
        setShowCustomModal(false)
        setNewMoebel({ name: '', kategorie: 'Wohnzimmer', breite_cm: 80, laenge_cm: 80, farbe: '#94c1a4' })
      }
    } finally { setCustomSaving(false) }
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
  function applyFloorTexture(textur: string, canvas?: any, bM?: number | null, lM?: number | null) {
    const c = canvas ?? fabricRef.current
    const imp = fabricImports.current
    if (!c || !imp) return

    const bW = (bM ?? breiteM) ?? (parseFloat(raumBreite) || 4)
    const lL = (lM ?? laengeM) ?? (parseFloat(raumLaenge) || 5)

    // Alte Floor-Objekte entfernen
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c.getObjects().filter((o: any) => o.data?.type === 'floor').forEach((o: any) => c.remove(o))

    if (textur === 'none') {
      c.requestRenderAll()
      return
    }

    const patternCanvas = createPatternCanvas(textur)
    if (!patternCanvas) return

    const floorRect = new imp.Rect({
      left: 0, top: 0,
      width: bW * SCALE, height: lL * SCALE,
      selectable: false, evented: false, hoverCursor: 'default',
      data: { type: 'floor' },
    })

    // Pattern zuweisen
    const pattern = new imp.Pattern({ source: patternCanvas, repeat: 'repeat' })
    floorRect.set('fill', pattern)

    c.add(floorRect)
    // Hinter outline, aber sichtbar
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const outlineObj = c.getObjects().find((o: any) => o.data?.type === 'outline')
    if (outlineObj) c.sendObjectTo(floorRect, c.getObjects().indexOf(outlineObj) + 1)
    else c.sendObjectToBack(floorRect)
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

  // ── Kollisionserkennung ─────────────────────────────────────
  function checkKollisionen() {
    const canvas = fabricRef.current, imp = fabricImports.current
    if (!canvas || !imp) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas.getObjects().filter((o: any) => o.data?.type === 'collision').forEach((o: any) => canvas.remove(o))
    if (!showKollisionRef.current) { setKollisionAnzahl(0); canvas.requestRenderAll(); return }

    const SKIP = new Set(['outline','preview','alignment','floor','dimension','collision','wall','door','window','measure'])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const objs = canvas.getObjects().filter((o: any) => o.data?.type && !SKIP.has(o.data.type))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const overlapping = new Set<any>()
    for (let i = 0; i < objs.length; i++) {
      for (let j = i + 1; j < objs.length; j++) {
        const a = objs[i], b = objs[j]
        const ba = a.getBoundingRect(true), bb = b.getBoundingRect(true)
        const hit = !(ba.left + ba.width < bb.left || bb.left + bb.width < ba.left ||
                      ba.top + ba.height < bb.top  || bb.top  + bb.height < ba.top)
        if (hit) { overlapping.add(a); overlapping.add(b) }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    overlapping.forEach((obj: any) => {
      const b = obj.getBoundingRect(true)
      canvas.add(new imp.Rect({
        left: b.left, top: b.top, width: b.width, height: b.height,
        fill: 'rgba(239,68,68,0.15)', stroke: '#ef4444', strokeWidth: 1.5,
        selectable: false, evented: false, strokeDashArray: [4, 3],
        data: { type: 'collision' },
      }))
    })

    setKollisionAnzahl(overlapping.size)
    canvas.requestRenderAll()
  }

  function triggerKollUpdate() {
    if (kollTimerRef.current) clearTimeout(kollTimerRef.current)
    kollTimerRef.current = setTimeout(checkKollisionen, 300)
  }
  triggerKollUpdateRef.current = triggerKollUpdate

  // Sync refs
  showDimensionsRef.current  = showDimensions
  showKollisionRef.current   = showKollision

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

  // ── Datei-Import ────────────────────────────────────────────
  function importDatei(file: File) {
    const canvas = fabricRef.current, imp = fabricImports.current
    if (!canvas || !imp) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      const imgEl = document.createElement('img')
      imgEl.onload = () => {
        const Z = canvas.getZoom()
        const scale = Math.min(
          (canvas.getWidth() / Z * 0.7) / imgEl.naturalWidth,
          (canvas.getHeight() / Z * 0.7) / imgEl.naturalHeight,
          1,
        )
        const vpt = canvas.viewportTransform ?? [1,0,0,1,0,0]
        const cx = (canvas.getWidth() / 2 - vpt[4]) / Z
        const cy = (canvas.getHeight() / 2 - vpt[5]) / Z
        const fabricImg = new imp.Image(imgEl, {
          left: cx, top: cy, scaleX: scale, scaleY: scale,
          originX: 'center', originY: 'center', opacity: 0.5,
          data: { type: 'import_bild', name: file.name }, name: file.name,
        })
        canvas.add(fabricImg)
        // Hinter echte Objekte aber über Floor schieben
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const floorIdx = canvas.getObjects().findIndex((o: any) => o.data?.type === 'floor')
        if (floorIdx >= 0) canvas.sendObjectTo(fabricImg, floorIdx + 1)
        pushHistory(); triggerAutoSave(); updateObjCount(); canvas.requestRenderAll()
      }
      imgEl.src = dataUrl
    }
    reader.readAsDataURL(file)
    setShowImportModal(false)
  }

  // ── Bild-Export ─────────────────────────────────────────────
  function exportAsImage() {
    const canvas = fabricRef.current; if (!canvas) return
    // Grid-Objekte temporär ausblenden
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gridObjs = canvas.getObjects().filter((o: any) => o.data?.type === 'grid')
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
    gridObjs.forEach((o: any) => o.set('visible', true))
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

  // ── PDF Export ────────────────────────────────────────────

  async function exportPdf() {
    const canvas = fabricRef.current; if (!canvas) return
    const { default: jsPDF } = await import('jspdf')
    const imgData = canvas.toDataURL({ format: 'png', multiplier: 2 })
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pw = pdf.internal.pageSize.getWidth()
    const ph = pdf.internal.pageSize.getHeight()
    const GREEN: [number, number, number] = [68, 92, 73]

    // Header
    pdf.setFillColor(...GREEN); pdf.rect(0, 0, pw, 14, 'F')
    pdf.setTextColor(255, 255, 255); pdf.setFontSize(11); pdf.setFont('helvetica', 'bold')
    pdf.text('Raumplaner – Grundriss', 10, 9)
    pdf.setFontSize(8); pdf.setFont('helvetica', 'normal')
    pdf.text(`${raumName}`, pw - 10, 6, { align: 'right' })
    const heute = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    pdf.text(`Datum: ${heute}`, pw - 10, 10, { align: 'right' })

    // Raummaße
    if (breiteM || laengeM) {
      pdf.setTextColor(80, 80, 80); pdf.setFontSize(8)
      const mText = `Raummaße: ${breiteM ?? '–'} m × ${laengeM ?? '–'} m${hoeheM ? ` · H ${hoeheM} m` : ''}`
      pdf.text(mText, 10, 20)
    }

    // Canvas-Bild zentriert skaliert
    const imgTop = 24
    const maxW = pw - 20, maxH = ph - imgTop - 14
    const cAspect = canvas.getWidth() / canvas.getHeight()
    let iW = maxW, iH = maxW / cAspect
    if (iH > maxH) { iH = maxH; iW = maxH * cAspect }
    const iX = (pw - iW) / 2
    pdf.addImage(imgData, 'PNG', iX, imgTop, iW, iH)

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
      { key: 'select'  as Tool, Icon: MousePointer2, label: 'Auswahl',   shortcut: 'V' },
      { key: 'wall'    as Tool, Icon: Pencil,        label: 'Wand',      shortcut: 'W' },
    ],
    [
      { key: 'door'    as Tool, Icon: DoorOpen,      label: 'Tür',       shortcut: 'D' },
      { key: 'window'  as Tool, Icon: AppWindow,     label: 'Fenster',   shortcut: 'F' },
    ],
    [
      { key: 'measure' as Tool, Icon: Ruler,         label: 'Bemaßung',  shortcut: 'M' },
      { key: 'eraser'  as Tool, Icon: Eraser,        label: 'Radierer',  shortcut: 'E' },
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
    toolbar: '#2d3e31',
    sidebar: '#354a3a',
    hover:   '#3f5645',
    border:  'rgba(74,99,80,0.4)',
    textLt:  '#94c1a4',
    textMd:  '#c8dbc9',
    input:   '#263d2c',
  }
  const tbBtn = `w-9 h-9 flex items-center justify-center rounded-lg transition-all`
  const tbSep = `w-px h-6 mx-1 opacity-40` // border via inline style

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="flex flex-col" style={{ height: '100vh', background: C.toolbar, color: C.textMd }}
      onClick={() => setContextMenu(null)}>

      <LoadingScreen visible={loading} />
      {showShortcuts && <ShortcutOverlay onClose={() => setShowShortcuts(false)} />}

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
      <div className="flex items-center h-12 px-3 shrink-0 gap-1.5"
        style={{ background: C.toolbar, borderBottom: `1px solid ${C.border}` }}>

        {/* Zurück */}
        <Link href={`/dashboard/projekte/${projektId}/raeume/${raumId}`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-colors mr-1"
          style={{ color: C.textLt }}
          onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="font-medium">{raumName}</span>
        </Link>

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
            <button key={v} type="button" onClick={() => { setGridSize(v); gridSizeRef.current = v; fabricRef.current?.requestRenderAll() }}
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

        {/* Kollisionserkennung */}
        <button type="button" title="Kollisionserkennung ein/aus" onClick={() => setShowKollision(v => !v)}
          className={tbBtn}
          style={{
            color: showKollision ? (kollisionAnzahl > 0 ? '#f87171' : '#fff') : C.textLt,
            background: showKollision ? (kollisionAnzahl > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(68,92,73,0.5)') : 'transparent',
          }}
          onMouseEnter={e => { if (!showKollision) e.currentTarget.style.background = C.hover }}
          onMouseLeave={e => { if (!showKollision) e.currentTarget.style.background = 'transparent' }}>
          <TriangleAlert className="w-4 h-4" />
        </button>

        {/* Templates */}
        <button type="button" title="Raum-Templates" onClick={() => setShowTemplatesModal(true)}
          className={tbBtn} style={{ color: C.textLt }}
          onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <LayoutTemplate className="w-4 h-4" />
        </button>

        {/* Bild importieren */}
        <button type="button" title="Bild importieren" onClick={() => setShowImportModal(true)}
          className={tbBtn} style={{ color: C.textLt }}
          onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Upload className="w-4 h-4" />
        </button>

        <div className="flex-1" />

        {/* Zoom */}
        <button type="button" onClick={() => zoomBy(1 / 1.2)} className={tbBtn} style={{ color: C.textLt }}
          onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={zoomReset}
          className="min-w-[48px] h-9 text-center text-xs px-2 rounded-lg transition-colors font-mono"
          style={{ color: C.textLt }}
          onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          {Math.round(zoom * 100)}%
        </button>
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
            <button type="button" onClick={() => setShowCustomModal(true)}
              className="w-full mt-2 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] rounded-lg transition-colors"
              style={{ border: `1px dashed ${C.border}`, color: C.textLt }}
              onMouseEnter={e => { e.currentTarget.style.background = C.hover; e.currentTarget.style.borderColor = '#445c49' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = C.border }}>
              <Plus className="w-3 h-3" /> Eigenes Möbel
            </button>
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
                  const favCustom = customMoebel.filter(cm => favoriten.has(cm.id))
                  if (favSym.length === 0 && favCustom.length === 0) return null
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
                          {favCustom.length > 0 && <CustomMoebelGrid items={favCustom} colors={C} onPlace={placeCustomMoebel} starredIds={favoriten} onStar={toggleFavorit} />}
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

                {/* Eigene Möbel */}
                {customMoebel.length > 0 && (
                  <div>
                    <button type="button"
                      onClick={() => setOpenGroups(prev => { const n = new Set(prev); if (n.has('Eigene Möbel')) n.delete('Eigene Möbel'); else n.add('Eigene Möbel'); return n })}
                      className="w-full flex items-center justify-between px-3 py-2 text-[10px] transition-colors"
                      style={{ color: C.textLt, borderBottom: `1px solid ${C.border}20` }}
                      onMouseEnter={e => (e.currentTarget.style.background = `${C.hover}80`)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <span className="uppercase tracking-wider font-semibold">Eigene Möbel</span>
                      {openGroups.has('Eigene Möbel') ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </button>
                    {openGroups.has('Eigene Möbel') && (
                      <div className="px-2 py-2">
                        <CustomMoebelGrid items={customMoebel} colors={C} onPlace={placeCustomMoebel} starredIds={favoriten} onStar={toggleFavorit} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Canvas ── */}
        <div ref={containerRef} className="flex-1 relative overflow-hidden" style={{ background: '#ffffff' }}>
          <canvas ref={canvasRef} className="absolute inset-0 z-10" />

          {/* Mini-Map */}
          <div className="absolute bottom-10 left-3 z-20 select-none">
            <div
              className="relative rounded-lg overflow-hidden shadow-lg cursor-crosshair"
              style={{ width: 150, height: 100, border: `1px solid rgba(68,92,73,0.3)`, background: '#f0f0f0' }}
              onClick={handleMinimapClick}
            >
              {minimapImage
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
            {selectedProps ? (
              <div>
                <div className="flex items-center justify-between px-3 py-2.5"
                  style={{ borderBottom: `1px solid ${C.border}` }}>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: `${C.textLt}60` }}>
                      {selectedProps.objType === 'wall' ? 'Wand' : selectedProps.objType === 'door' ? 'Tür' :
                       selectedProps.objType === 'window' ? 'Fenster' : selectedProps.objType === 'measure' ? 'Bemaßung' :
                       selectedProps.objType === 'moebel' ? 'Möbel' : 'Objekt'}
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
                <div className="px-3 py-2.5">
                  <button type="button" onClick={duplicateSelected}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
                    style={{ background: C.input, border: `1px solid ${C.border}`, color: C.textMd }}
                    onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
                    onMouseLeave={e => (e.currentTarget.style.background = C.input)}>
                    <Copy className="w-3 h-3" /> Duplizieren
                  </button>
                </div>
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

                {/* Wandfarbe */}
                <div className="px-3 py-3">
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Custom-Möbel Modal ── */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowCustomModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 max-w-full"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-gray-900">Eigenes Möbel erstellen</h2>
              <button onClick={() => setShowCustomModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-gray-500 block mb-1">Name *</label>
                <input type="text" value={newMoebel.name} onChange={e => setNewMoebel(p => ({ ...p, name: e.target.value }))}
                  placeholder="z.B. Mein Schrank" className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#445c49]/30 focus:border-[#445c49]" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 block mb-1">Kategorie</label>
                <select value={newMoebel.kategorie} onChange={e => setNewMoebel(p => ({ ...p, kategorie: e.target.value }))}
                  className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#445c49]/30 focus:border-[#445c49]">
                  {['Wohnzimmer','Schlafzimmer','Büro','Küche','Bad','Sonstiges'].map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-gray-500 block mb-1">Breite (cm)</label>
                  <input type="number" min={10} max={500} value={newMoebel.breite_cm} onChange={e => setNewMoebel(p => ({ ...p, breite_cm: parseInt(e.target.value) || 80 }))}
                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#445c49]/30 focus:border-[#445c49]" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-500 block mb-1">Länge (cm)</label>
                  <input type="number" min={10} max={500} value={newMoebel.laenge_cm} onChange={e => setNewMoebel(p => ({ ...p, laenge_cm: parseInt(e.target.value) || 80 }))}
                    className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#445c49]/30 focus:border-[#445c49]" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 block mb-1">Farbe</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={newMoebel.farbe} onChange={e => setNewMoebel(p => ({ ...p, farbe: e.target.value }))}
                    className="w-10 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                  <span className="text-sm text-gray-500 font-mono">{newMoebel.farbe}</span>
                  {/* Farbvorschläge */}
                  <div className="flex gap-1.5 ml-auto">
                    {['#94c1a4','#93c5fd','#fca5a5','#fde68a','#c4b5fd','#6ee7b7'].map(c => (
                      <button key={c} type="button" onClick={() => setNewMoebel(p => ({ ...p, farbe: c }))}
                        className="w-5 h-5 rounded-full border-2 transition-all"
                        style={{ background: c, borderColor: newMoebel.farbe === c ? '#1f2937' : 'transparent' }} />
                    ))}
                  </div>
                </div>
              </div>
              {/* Vorschau */}
              <div className="rounded-lg p-3 flex items-center justify-center" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', minHeight: 64 }}>
                <div style={{
                  width: Math.min(200, newMoebel.breite_cm * 1.5), height: Math.min(80, newMoebel.laenge_cm * 1.5),
                  background: newMoebel.farbe, border: '1.5px solid #1e293b', borderRadius: 3,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: '#1e293b', fontWeight: 500,
                }}>
                  {newMoebel.name || '…'}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowCustomModal(false)} className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Abbrechen
              </button>
              <button onClick={saveCustomMoebel} disabled={!newMoebel.name.trim() || customSaving}
                className="flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
                style={{ background: '#445c49' }}>
                {customSaving ? 'Speichern…' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* ── Import Modal ── */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowImportModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 max-w-full"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Bild importieren</h2>
                <p className="text-xs text-gray-400 mt-0.5">Als Referenz-Hintergrund einfügen (50% transparent)</p>
              </div>
              <button type="button" onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <label className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-gray-200 hover:border-[#445c49] hover:bg-[#f6faf7] transition-all cursor-pointer">
              <Upload className="w-8 h-8 text-gray-300" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">Bild auswählen</p>
                <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, SVG – als transparente Referenzebene</p>
              </div>
              <input type="file" accept="image/*,.svg" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) importDatei(f) }} />
            </label>
            <p className="text-[10px] text-gray-400 mt-3 text-center">
              Das Bild wird mit 50% Transparenz eingefügt und kann danach wie jedes andere Objekt verschoben werden.
            </p>
          </div>
        </div>
      )}

      {/* ── Status-Bar ── */}
      <div className="flex items-center justify-between px-4 py-1.5 shrink-0 h-8"
        style={{ background: C.toolbar, borderTop: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-4 text-[10px] font-mono" style={{ color: `${C.textLt}60` }}>
          <span>X {mousePos.x.toFixed(2)} m</span>
          <span>Y {mousePos.y.toFixed(2)} m</span>
        </div>
        <div className="flex items-center gap-3 text-[10px]" style={{ color: `${C.textLt}60` }}>
          {snapToGrid && (
            <span className="flex items-center gap-1" style={{ color: '#94c1a4' }}>
              <Magnet className="w-3 h-3" />Snap
            </span>
          )}
          {showKollision && kollisionAnzahl > 0 && (
            <span className="flex items-center gap-1" style={{ color: '#f87171' }}>
              <TriangleAlert className="w-3 h-3" />{kollisionAnzahl} Überschn.
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

// ── CustomMoebelGrid ──────────────────────────────────────────

function CustomMoebelGrid({ items, colors, onPlace, starredIds, onStar }: {
  items: CustomMoebelType[]
  colors: { hover: string; textLt: string; border: string; input: string }
  onPlace: (cm: CustomMoebelType, x: number, y: number) => void
  starredIds?: Set<string>
  onStar?: (id: string) => void
}) {
  if (items.length === 0) return (
    <p className="text-[10px] text-center py-3" style={{ color: `${colors.textLt}40` }}>Noch keine eigenen Möbel</p>
  )
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {items.map(cm => (
        <div key={cm.id}
          onClick={() => onPlace(cm, 0, 0)}
          className="relative rounded-lg p-1.5 cursor-pointer transition-all select-none"
          style={{ background: 'rgba(0,0,0,0.15)', border: `1px solid rgba(74,99,80,0.2)` }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = colors.hover; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(68,92,73,0.5)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.15)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(74,99,80,0.2)' }}
          title={`${cm.name} – ${cm.breite_cm}×${cm.laenge_cm}cm`}>
          {onStar && (
            <button type="button"
              onClick={e => { e.stopPropagation(); onStar(cm.id) }}
              className="absolute top-1 right-1 z-10 transition-opacity"
              style={{ color: starredIds?.has(cm.id) ? '#fbbf24' : `${colors.textLt}40` }}
              title={starredIds?.has(cm.id) ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}>
              <Star className="w-3 h-3" fill={starredIds?.has(cm.id) ? '#fbbf24' : 'none'} />
            </button>
          )}
          <div className="w-full rounded-md mb-1.5 flex items-center justify-center" style={{ minHeight: 36 }}>
            <div style={{
              width: Math.min(48, cm.breite_cm * 0.3), height: Math.min(32, cm.laenge_cm * 0.3),
              background: cm.farbe, border: '1.5px solid rgba(255,255,255,0.2)', borderRadius: 3,
            }} />
          </div>
          <p className="text-[10px] font-medium leading-tight truncate" style={{ color: colors.textLt }}>{cm.name}</p>
          <p className="text-[9px] leading-tight" style={{ color: `${colors.textLt}50` }}>{cm.breite_cm}×{cm.laenge_cm}cm</p>
        </div>
      ))}
    </div>
  )
}

