'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  MousePointer2, Minus, Plus, Grid3x3, Save,
  RotateCcw, RotateCw, Search, ChevronLeft, Pencil,
  Eraser, CheckCircle, DoorOpen, AppWindow, Ruler,
  HelpCircle, X, Maximize2, ChevronDown, ChevronRight,
  AlertCircle, Trash2, FileDown,
} from 'lucide-react'
import { grundrissSpeichern, raumMasseAktualisieren } from '@/app/actions/raumplaner'
import type { MoebelSymbol } from '@/lib/supabase/types'

// ── Konstanten ────────────────────────────────────────────────

const SCALE          = 100   // px pro Meter
const WALL_THICKNESS = 15
const MIN_ZOOM       = 0.1
const MAX_ZOOM       = 5
const AUTOSAVE_DELAY = 3000

type Tool = 'select' | 'wall' | 'door' | 'window' | 'measure' | 'eraser'
type GridSize = 10 | 25 | 50 | 100

const MOEBEL_GRUPPEN: { name: string; keys: string[] }[] = [
  { name: 'Wohnzimmer',   keys: ['Sofa', 'Sessel', 'Couchtisch', 'Sideboard', 'Regal'] },
  { name: 'Schlafzimmer', keys: ['Doppelbett', 'Einzelbett', 'Nachttisch', 'Kleiderschrank'] },
  { name: 'Büro',         keys: ['Schreibtisch', 'Stuhl', 'Barhocker'] },
  { name: 'Küche',        keys: ['Küchenzeile', 'Herd', 'Esstisch'] },
  { name: 'Bad',          keys: ['Badewanne', 'Dusche', 'Waschbecken', 'Toilette'] },
]

interface SelectedProps {
  x: number; y: number; w: number; h: number; angle: number; name: string; objType?: string
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ContextMenuState { x: number; y: number; target: any }

interface Props {
  raumId: string; projektId: string; raumName: string
  breiteM: number | null; laengeM: number | null; hoeheM: number | null
  initialCanvasJson: string | null
  moebelSymbole: MoebelSymbol[]
  produkte: Array<{ id: string; name: string; kategorie: string | null }>
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
    { keys: ['Space','↖'], desc: 'Pan (Verschieben)' },
    { keys: ['Scroll'],    desc: 'Zoom' },
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

// ── Haupt-Editor ──────────────────────────────────────────────

export default function RaumplanerEditor({
  raumId, projektId, raumName,
  breiteM, laengeM, hoeheM,
  initialCanvasJson, moebelSymbole,
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
  const alignmentLinesRef = useRef<any[]>([])

  // ── Ref-Sync ──────────────────────────────────────────────

  useEffect(() => { activeToolRef.current = activeTool }, [activeTool])
  useEffect(() => { showGridRef.current = showGrid; fabricRef.current?.requestRenderAll() }, [showGrid])
  useEffect(() => { gridSizeRef.current = gridSize; fabricRef.current?.requestRenderAll() }, [gridSize])
  useEffect(() => { doorWidthRef.current = doorWidth }, [doorWidth])
  useEffect(() => { windowWidthRef.current = windowWidth }, [windowWidth])

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
    full.objects = (full.objects ?? []).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (o: any) => o.data?.type !== 'outline' && o.data?.type !== 'preview' && o.data?.type !== 'alignment'
    )
    return JSON.stringify(full)
  }, [])

  const updateObjCount = useCallback(() => {
    const canvas = fabricRef.current; if (!canvas) return
    setObjCount(canvas.getObjects().filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (o: any) => o.data?.type !== 'outline' && o.data?.type !== 'preview'
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
      canvas.on('after:render', () => { if (showGridRef.current) renderGrid(canvas) })

      // ── ZOOM (smooth, zoomToPoint) ──
      canvas.on('mouse:wheel', (opt: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const e = opt.e as WheelEvent
        e.preventDefault(); e.stopPropagation()
        if (e.ctrlKey || e.metaKey) return  // Ctrl+Scroll nur abfangen, kein Canvas-Zoom
        let z = canvas.getZoom()
        z *= 0.999 ** e.deltaY
        z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))
        canvas.zoomToPoint(new Point(e.offsetX, e.offsetY), z)
        setZoom(Math.round(z * 100) / 100)
        canvas.requestRenderAll()
      })

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
      })

      // ── SNAP-TO-WALL + ALIGNMENT-HILFSLINIEN ──────────────
      canvas.on('object:moving', (opt: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const obj = opt.target as any // eslint-disable-line @typescript-eslint/no-explicit-any
        if (!obj) return

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
            parsed.objects = parsed.objects.filter(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (o: any) => o.data?.type !== 'outline' && o.data?.type !== 'preview'
            )
          }
          await canvas.loadFromJSON(parsed)
          canvas.requestRenderAll()
        } catch { /* ignore */ }
      }
      if (breiteM && laengeM) updateOutline(breiteM, laengeM)
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
        if (!ev.ctrlKey && !ev.metaKey) {
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
        <div className="fixed z-50 rounded-xl shadow-2xl py-1 w-44"
          style={{ left: contextMenu.x, top: contextMenu.y, background: C.sidebar, border: `1px solid ${C.border}` }}
          onClick={e => e.stopPropagation()}>
          {[
            { label: 'Duplizieren',       fn: duplicateSelected, red: false },
            { label: 'Ebene nach vorne',  fn: bringForward,      red: false },
            { label: 'Ebene nach hinten', fn: sendBackward,      red: false },
          ].map(({ label, fn, red }) => (
            <button key={label} type="button" onClick={fn}
              className={`w-full text-left px-3 py-2 text-xs transition-colors ${red ? 'text-red-400 hover:text-red-300' : ''}`}
              style={{ color: red ? undefined : C.textMd }}
              onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              {label}
            </button>
          ))}
          <div className="my-1" style={{ borderTop: `1px solid ${C.border}` }} />
          <button type="button" onClick={() => {
            const c = fabricRef.current; if (!c) return
            c.remove(contextMenu.target); setSelectedProps(null)
            pushHistory(); triggerAutoSave(); updateObjCount(); c.requestRenderAll(); setContextMenu(null)
          }} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:text-red-300 transition-colors"
            onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            Löschen
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
        <div className="w-56 flex flex-col overflow-hidden shrink-0"
          style={{ background: C.sidebar, borderRight: `1px solid ${C.border}` }}>
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
                <MoebelGrid symbols={filteredMoebel} fabricRef={fabricRef} placeMoebel={placeMoebel} colors={C} />
              </div>
            ) : (
              <div>
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
                        <MoebelGrid symbols={group.items} fabricRef={fabricRef} placeMoebel={placeMoebel} colors={C} />
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
                      <div className="px-2 py-2">
                        <MoebelGrid symbols={sonstige} fabricRef={fabricRef} placeMoebel={placeMoebel} colors={C} />
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
                {[
                  { label: 'Position', fields: [{ l:'X', v:`${selectedProps.x} px` }, { l:'Y', v:`${selectedProps.y} px` }] },
                  { label: 'Größe',    fields: [{ l:'Breite', v:`${Math.round(selectedProps.w)} px` }, { l:'Tiefe', v:`${Math.round(selectedProps.h)} px` }] },
                  { label: 'Rotation', fields: [{ l:'Winkel', v:`${selectedProps.angle}°` }] },
                ].map(sec => (
                  <div key={sec.label} className="px-3 py-3" style={{ borderBottom: `1px solid ${C.border}20` }}>
                    <p className="text-[9px] uppercase tracking-wider font-semibold mb-2" style={{ color: `${C.textLt}60` }}>{sec.label}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {sec.fields.map(f => <PropField key={f.l} label={f.l} value={f.v} colors={C} />)}
                    </div>
                  </div>
                ))}
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
                <div className="px-3 py-3">
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Status-Bar ── */}
      <div className="flex items-center justify-between px-4 py-1.5 shrink-0 h-8"
        style={{ background: C.toolbar, borderTop: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-4 text-[10px] font-mono" style={{ color: `${C.textLt}60` }}>
          <span>X {mousePos.x.toFixed(2)} m</span>
          <span>Y {mousePos.y.toFixed(2)} m</span>
        </div>
        <div className="flex items-center gap-3 text-[10px]" style={{ color: `${C.textLt}60` }}>
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

function MoebelGrid({ symbols, fabricRef, placeMoebel, colors }: {
  symbols: MoebelSymbol[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fabricRef: React.MutableRefObject<any>
  placeMoebel: (s: MoebelSymbol, x: number, y: number) => void
  colors: { hover: string; textLt: string; border: string }
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
          className="rounded-lg p-1.5 cursor-grab active:cursor-grabbing transition-all select-none"
          style={{ background: 'rgba(0,0,0,0.15)', border: `1px solid rgba(74,99,80,0.2)` }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = colors.hover; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(68,92,73,0.5)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.15)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(74,99,80,0.2)' }}
          title={`${symbol.name} – ${symbol.breite_cm}×${symbol.tiefe_cm}cm`}>
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

// ── PropField ─────────────────────────────────────────────────

function PropField({ label, value, colors }: { label: string; value: string; colors: { textLt: string; input: string; border: string } }) {
  return (
    <div>
      <p className="text-[9px] mb-0.5" style={{ color: `${colors.textLt}60` }}>{label}</p>
      <div className="text-[11px] rounded-lg px-2 py-1 font-mono truncate"
        style={{ background: colors.input, border: `1px solid ${colors.border}20`, color: colors.textLt }}>
        {value}
      </div>
    </div>
  )
}
