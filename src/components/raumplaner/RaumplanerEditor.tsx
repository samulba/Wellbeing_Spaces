'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  MousePointer2, Minus, Plus, Grid3x3, Save,
  RotateCcw, RotateCw, Search, ChevronLeft, Pencil,
  Eraser, CheckCircle, DoorOpen, AppWindow, Ruler,
  HelpCircle, X, Maximize2, ChevronDown, ChevronRight,
  AlertCircle, Trash2,
} from 'lucide-react'
import { grundrissSpeichern, raumMasseAktualisieren } from '@/app/actions/raumplaner'
import type { MoebelSymbol } from '@/lib/supabase/types'

// ── Konstanten ────────────────────────────────────────────────

const SCALE          = 100   // px pro Meter
const WALL_THICKNESS = 15    // px
const MIN_ZOOM       = 0.15
const MAX_ZOOM       = 5
const AUTOSAVE_DELAY = 3000

// ── Wellbeing-Green Farben (dunkles UI) ───────────────────────
// bg-wb-900  = #2d3e31   (Toolbar / Sidebars)
// bg-wb-950  = #1a2e1e   (tiefster Hintergrund)
// bg-wb-800  = #3a5240   (Hover, Inputs)
// border-wb  = #445c49/40
// text-wb-lt = #94c1a4   (heller Text)
// text-wb-md = #c8dbc9   (mittelheller Text)

type Tool = 'select' | 'wall' | 'door' | 'window' | 'measure' | 'eraser'
type GridSize = 10 | 25 | 50

const MOEBEL_GRUPPEN: { name: string; keys: string[] }[] = [
  { name: 'Wohnzimmer',   keys: ['Sofa', 'Sessel', 'Couchtisch', 'Sideboard', 'Regal'] },
  { name: 'Schlafzimmer', keys: ['Doppelbett', 'Einzelbett', 'Nachttisch', 'Kleiderschrank'] },
  { name: 'Büro',         keys: ['Schreibtisch', 'Stuhl', 'Barhocker'] },
  { name: 'Küche',        keys: ['Küchenzeile', 'Herd', 'Esstisch'] },
  { name: 'Bad',          keys: ['Badewanne', 'Dusche', 'Waschbecken', 'Toilette'] },
]

interface SelectedProps {
  x: number; y: number; w: number; h: number
  angle: number; name: string; objType?: string
}

interface ContextMenuState { x: number; y: number; target: any } // eslint-disable-line @typescript-eslint/no-explicit-any

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
    <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#1a2e1e] transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="flex flex-col items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-wellbeing-green/20 border border-wellbeing-green/30 flex items-center justify-center">
          <svg viewBox="0 0 32 32" className="w-8 h-8 text-wellbeing-green-light" fill="currentColor">
            <rect x="2" y="2" width="12" height="12" rx="2"/>
            <rect x="18" y="2" width="12" height="12" rx="2" opacity=".6"/>
            <rect x="2" y="18" width="12" height="12" rx="2" opacity=".6"/>
            <rect x="18" y="18" width="12" height="12" rx="2" opacity=".3"/>
          </svg>
        </div>
        <p className="text-sm font-medium text-[#c8dbc9]">Raumplaner wird geladen…</p>
        <div className="w-48 h-1 bg-[#3a5240] rounded-full overflow-hidden">
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
    { keys: ['V'],          desc: 'Auswahl' },
    { keys: ['W'],          desc: 'Wand zeichnen' },
    { keys: ['D'],          desc: 'Tür platzieren' },
    { keys: ['F'],          desc: 'Fenster platzieren' },
    { keys: ['M'],          desc: 'Bemaßung' },
    { keys: ['E'],          desc: 'Radierer' },
    { keys: ['Esc'],        desc: 'Abbrechen / Auswahl' },
    { keys: ['Ctrl','Z'],   desc: 'Rückgängig' },
    { keys: ['Ctrl','Y'],   desc: 'Wiederholen' },
    { keys: ['Ctrl','S'],   desc: 'Speichern' },
    { keys: ['Del'],        desc: 'Löschen' },
    { keys: ['Space','↖'],  desc: 'Pan (Verschieben)' },
    { keys: ['Scroll'],     desc: 'Zoom' },
    { keys: ['?'],          desc: 'Shortcuts' },
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#2d3e31] border border-[#445c49]/40 rounded-2xl p-6 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#c8dbc9]">Tastaturkürzel</h3>
          <button type="button" onClick={onClose} className="text-[#94c1a4]/60 hover:text-[#94c1a4] transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-2">
          {shortcuts.map(s => (
            <div key={s.desc} className="flex items-center justify-between">
              <span className="text-xs text-[#94c1a4]">{s.desc}</span>
              <div className="flex items-center gap-1">
                {s.keys.map(k => (
                  <kbd key={k} className="px-1.5 py-0.5 text-[10px] font-mono bg-[#3a5240] border border-[#445c49]/40 rounded text-[#c8dbc9]">{k}</kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Haupt-Editor ──────────────────────────────────────────────

export default function RaumplanerEditor({
  raumId, projektId, raumName,
  breiteM, laengeM, hoeheM,
  initialCanvasJson, moebelSymbole,
}: Props) {
  const canvasRef      = useRef<HTMLCanvasElement>(null)
  const containerRef   = useRef<HTMLDivElement>(null)
  const fabricRef      = useRef<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any
  const fabricImports  = useRef<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any

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

  // Refs
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
  const wallPreviewRef   = useRef<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any
  const wallStartRef     = useRef<{ x: number; y: number } | null>(null)
  const measureStartRef  = useRef<{ x: number; y: number } | null>(null)
  const measurePreviewRef = useRef<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any
  const outlineRef       = useRef<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any

  // ── Ref-Sync ──────────────────────────────────────────────

  useEffect(() => { activeToolRef.current = activeTool }, [activeTool])
  useEffect(() => { showGridRef.current = showGrid; fabricRef.current?.requestRenderAll() }, [showGrid])
  useEffect(() => { gridSizeRef.current = gridSize; fabricRef.current?.requestRenderAll() }, [gridSize])
  useEffect(() => { doorWidthRef.current = doorWidth }, [doorWidth])
  useEffect(() => { windowWidthRef.current = windowWidth }, [windowWidth])

  // ── Grid zeichnen (after:render) ─────────────────────────

  function drawGrid(ctx: CanvasRenderingContext2D, vpt: number[], cW: number, cH: number, gridPx: number, show: boolean) {
    if (!show) return
    const z = vpt[0], ox = vpt[4], oy = vpt[5]
    const minor = gridPx * z, major = SCALE * z
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0)
    if (minor > 3) {
      ctx.strokeStyle = 'rgba(180,200,180,0.25)'; ctx.lineWidth = 0.5; ctx.beginPath()
      const sx = ((ox % minor) + minor) % minor, sy = ((oy % minor) + minor) % minor
      for (let x = sx; x <= cW; x += minor) { ctx.moveTo(x, 0); ctx.lineTo(x, cH) }
      for (let y = sy; y <= cH; y += minor) { ctx.moveTo(0, y); ctx.lineTo(cW, y) }
      ctx.stroke()
    }
    if (major > 8) {
      ctx.strokeStyle = 'rgba(148,193,164,0.35)'; ctx.lineWidth = 1; ctx.beginPath()
      const mx = ((ox % major) + major) % major, my = ((oy % major) + major) % major
      for (let x = mx; x <= cW; x += major) { ctx.moveTo(x, 0); ctx.lineTo(x, cH) }
      for (let y = my; y <= cH; y += major) { ctx.moveTo(0, y); ctx.lineTo(cW, y) }
      ctx.stroke()
    }
    ctx.restore()
  }

  // ── Canvas-JSON (ohne Outline/Preview) ───────────────────

  const getCanvasJson = useCallback(() => {
    const canvas = fabricRef.current; if (!canvas) return '{}'
    const full = canvas.toJSON(['data', 'name'])
    full.objects = (full.objects ?? []).filter(
      (o: any) => o.data?.type !== 'outline' && o.data?.type !== 'preview' // eslint-disable-line @typescript-eslint/no-explicit-any
    )
    return JSON.stringify(full)
  }, [])

  const updateObjCount = useCallback(() => {
    const canvas = fabricRef.current; if (!canvas) return
    const count = canvas.getObjects().filter(
      (o: any) => o.data?.type !== 'outline' && o.data?.type !== 'preview' // eslint-disable-line @typescript-eslint/no-explicit-any
    ).length
    setObjCount(count)
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

  const undo = useCallback(async () => {
    const canvas = fabricRef.current
    if (!canvas || historyIdxRef.current <= 0) return
    historyIdxRef.current--
    canvas.clear()
    await canvas.loadFromJSON(JSON.parse(historyRef.current[historyIdxRef.current]))
    if (breiteM && laengeM) { outlineRef.current = null; updateOutline(breiteM, laengeM) }
    canvas.requestRenderAll(); updateObjCount()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breiteM, laengeM, updateObjCount])

  const redo = useCallback(async () => {
    const canvas = fabricRef.current
    if (!canvas || historyIdxRef.current >= historyRef.current.length - 1) return
    historyIdxRef.current++
    canvas.clear()
    await canvas.loadFromJSON(JSON.parse(historyRef.current[historyIdxRef.current]))
    if (breiteM && laengeM) { outlineRef.current = null; updateOutline(breiteM, laengeM) }
    canvas.requestRenderAll(); updateObjCount()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breiteM, laengeM, updateObjCount])

  const saveNow = useCallback(async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSaveStatus('saving')
    const res = await grundrissSpeichern(raumId, getCanvasJson())
    setSaveStatus(res.fehler ? 'error' : 'saved')
  }, [raumId, getCanvasJson])

  // ── Raum-Umriss ──────────────────────────────────────────

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const updateOutline = useCallback((breite: number | null, laenge: number | null) => {
    const canvas = fabricRef.current, imp = fabricImports.current
    if (!canvas || !imp || !breite || !laenge) return
    const { Rect } = imp
    if (outlineRef.current) canvas.remove(outlineRef.current)
    const outline = new Rect({
      left: 0, top: 0, width: breite * SCALE, height: laenge * SCALE,
      fill: 'rgba(255,255,255,0.02)', stroke: '#374151', strokeWidth: 20,
      selectable: false, evented: false, data: { type: 'outline' }, name: 'Raumumriss',
    })
    outlineRef.current = outline
    canvas.add(outline); canvas.sendObjectToBack(outline); canvas.requestRenderAll()
  }, [])

  // ── Wand-Tool stoppen ─────────────────────────────────────

  const stopWallTool = useCallback(() => {
    const canvas = fabricRef.current; if (!canvas) return
    if (wallPreviewRef.current) { canvas.remove(wallPreviewRef.current); wallPreviewRef.current = null }
    wallStartRef.current = null
    canvas.requestRenderAll()
    switchToolRef.current('select')
  }, [])

  const stopMeasureTool = useCallback(() => {
    const canvas = fabricRef.current; if (!canvas) return
    if (measurePreviewRef.current) { canvas.remove(measurePreviewRef.current); measurePreviewRef.current = null }
    measureStartRef.current = null
    canvas.requestRenderAll()
    switchToolRef.current('select')
  }, [])

  // ── Möbel ─────────────────────────────────────────────────

  const placeMoebel = useCallback((symbol: MoebelSymbol, canvasX: number, canvasY: number) => {
    const canvas = fabricRef.current, imp = fabricImports.current
    if (!canvas || !imp) return
    const { Rect, Text, Group } = imp
    const w = symbol.breite_cm, h = symbol.tiefe_cm
    const bg = new Rect({ width: w, height: h, fill: symbol.farbe || '#94c1a4',
      stroke: '#1f2937', strokeWidth: 1.5, rx: 3, ry: 3, originX: 'left', originY: 'top' })
    const label = new Text(symbol.name, {
      fontSize: Math.max(7, Math.min(11, w / Math.max(symbol.name.length, 4) * 1.4)),
      fill: '#1f2937', textAlign: 'center', originX: 'center', originY: 'center',
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
    const { Line } = imp
    const { x: x1, y: y1 } = wallStartRef.current
    if (wallPreviewRef.current) { canvas.remove(wallPreviewRef.current); wallPreviewRef.current = null }
    if (Math.abs(x2 - x1) < 3 && Math.abs(y2 - y1) < 3) return
    canvas.add(new Line([x1, y1, x2, y2], {
      stroke: '#1f2937', strokeWidth: WALL_THICKNESS, strokeLineCap: 'square',
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
    const group = new Group([
      new Rect({ left: 0, top: 0, width: w, height: thick, fill: '#f9fafb', stroke: '#6b7280', strokeWidth: 1 }),
      new Path(`M 0,${thick} A ${w},${w} 0 0 1 ${w},${thick + w} L ${w},${thick} Z`,
        { fill: 'transparent', stroke: '#445c49', strokeWidth: 1.5, strokeDashArray: [4, 3] }),
    ], { left: x - w / 2, top: y - thick / 2, data: { type: 'door', breite: w }, name: 'Tür' })
    canvas.add(group); canvas.setActiveObject(group); canvas.requestRenderAll()
    pushHistory(); triggerAutoSave(); updateObjCount()
  }, [pushHistory, triggerAutoSave, updateObjCount])

  // ── Fenster ───────────────────────────────────────────────

  const placeWindow = useCallback((x: number, y: number) => {
    const canvas = fabricRef.current, imp = fabricImports.current
    if (!canvas || !imp) return
    const { Group, Rect, Line } = imp
    const w = windowWidthRef.current, thick = WALL_THICKNESS
    const group = new Group([
      new Rect({ left: 0, top: 0, width: w, height: thick, fill: '#e0f2fe', stroke: '#6b7280', strokeWidth: 1 }),
      new Line([w * 0.33, 2, w * 0.33, thick - 2], { stroke: '#94c1a4', strokeWidth: 1.5 }),
      new Line([w * 0.66, 2, w * 0.66, thick - 2], { stroke: '#94c1a4', strokeWidth: 1.5 }),
    ], { left: x - w / 2, top: y - thick / 2, data: { type: 'window', breite: w }, name: 'Fenster' })
    canvas.add(group); canvas.setActiveObject(group); canvas.requestRenderAll()
    pushHistory(); triggerAutoSave(); updateObjCount()
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
        backgroundColor: 'rgba(26,46,30,0.85)', originX: 'center', originY: 'center',
        angle: angle > 90 || angle < -90 ? angle + 180 : angle, selectable: false,
      }),
    ], { selectable: true, data: { type: 'measure', distM }, name: `Maß ${label}` }))
    canvas.requestRenderAll(); pushHistory(); triggerAutoSave(); updateObjCount()
    measureStartRef.current = null
  }, [pushHistory, triggerAutoSave, updateObjCount])

  // ── extractObjProps ───────────────────────────────────────

  function extractObjProps(obj: any): SelectedProps { // eslint-disable-line @typescript-eslint/no-explicit-any
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
        allowTouchScrolling: false,
      })
      fabricRef.current = canvas

      // Selektion in Wellbeing-Green
      canvas.selectionColor       = 'rgba(68,92,73,0.08)'
      canvas.selectionBorderColor = '#445c49'
      canvas.selectionLineWidth   = 1.5

      // Resize
      function resizeCanvas() {
        canvas.setWidth(cont.clientWidth); canvas.setHeight(cont.clientHeight); canvas.requestRenderAll()
      }
      resizeCanvas()
      const ro = new ResizeObserver(resizeCanvas); ro.observe(cont)

      // Grid
      canvas.on('after:render', ({ ctx }: { ctx: CanvasRenderingContext2D }) => {
        drawGrid(ctx, canvas.viewportTransform ?? [1,0,0,1,0,0],
          canvas.getWidth(), canvas.getHeight(), gridSizeRef.current, showGridRef.current)
      })

      // Mausrad-Zoom (nur ohne Modifier, Ctrl+Scroll verhindert Browser-Zoom)
      canvas.on('mouse:wheel', (opt: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const e = opt.e as WheelEvent
        e.preventDefault(); e.stopPropagation()
        // Ctrl+Scroll: Browser-Zoom verhindern, aber kein Canvas-Zoom
        if (e.ctrlKey || e.metaKey) return
        let z = canvas.getZoom()
        z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * (e.deltaY > 0 ? 0.92 : 1.08)))
        canvas.zoomToPoint(new Point(e.offsetX, e.offsetY), z)
        setZoom(Math.round(z * 100) / 100)
      })

      // Maus-Bewegung
      canvas.on('mouse:move', (opt: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const e = opt.e as MouseEvent
        const p = canvas.getPointer(e)
        setMousePos({ x: Math.round(p.x / SCALE * 100) / 100, y: Math.round(p.y / SCALE * 100) / 100 })

        // Pan
        if (isPanningRef.current) {
          canvas.relativePan(new Point(
            e.clientX - lastPanPosRef.current.x,
            e.clientY - lastPanPosRef.current.y
          ))
          lastPanPosRef.current = { x: e.clientX, y: e.clientY }
          canvas.requestRenderAll(); return
        }

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

      // Maus-Down
      canvas.on('mouse:down', (opt: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const e = opt.e as MouseEvent
        setContextMenu(null)

        // Rechtsklick
        if (e.button === 2) {
          // Wand- oder Bemaßungs-Tool sofort stoppen
          const tool = activeToolRef.current
          if (tool === 'wall') { stopWallTool(); return }
          if (tool === 'measure') { stopMeasureTool(); return }
          // Objekt-Kontextmenü
          if (opt.target && opt.target.data?.type !== 'outline') {
            canvas.setActiveObject(opt.target)
            setContextMenu({ x: e.clientX, y: e.clientY, target: opt.target })
          }
          return
        }

        // Mittlere Maustaste ODER Space+LMB → Pan starten
        if (e.button === 1 || (isSpaceRef.current && e.button === 0)) {
          isPanningRef.current = true
          lastPanPosRef.current = { x: e.clientX, y: e.clientY }
          canvas.selection = false; canvas.setCursor('grabbing')
          canvas.discardActiveObject(); canvas.requestRenderAll(); return
        }

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
              selectable: false, evented: false, opacity: 0.5, data: { type: 'preview' },
            })
            wallPreviewRef.current = prev; canvas.add(prev); canvas.requestRenderAll()
          } else {
            finishWall(snapped.x, snapped.y)
            wallStartRef.current = snapped
            const prev = new Line([snapped.x, snapped.y, snapped.x, snapped.y], {
              stroke: '#445c49', strokeWidth: WALL_THICKNESS, strokeLineCap: 'square',
              selectable: false, evented: false, opacity: 0.5, data: { type: 'preview' },
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
          } else {
            finishMeasure(snapped.x, snapped.y); switchToolRef.current('select')
          }
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

      canvas.on('mouse:up', (opt: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const e = opt.e as MouseEvent
        if (isPanningRef.current && (e.button === 1 || e.button === 0)) {
          isPanningRef.current = false
          canvas.selection = activeToolRef.current === 'select'
          canvas.setCursor(activeToolRef.current === 'select' ? 'default' : 'crosshair')
        }
      })

      canvas.on('selection:created', (e: any) => { const obj = e.selected?.[0]; if (obj) setSelectedProps(extractObjProps(obj)) }) // eslint-disable-line @typescript-eslint/no-explicit-any
      canvas.on('selection:updated', (e: any) => { const obj = e.selected?.[0]; if (obj) setSelectedProps(extractObjProps(obj)) }) // eslint-disable-line @typescript-eslint/no-explicit-any
      canvas.on('selection:cleared', () => setSelectedProps(null))
      canvas.on('object:modified', () => { pushHistory(); triggerAutoSave() })

      // Drag & Drop
      cont.addEventListener('dragover', (e: DragEvent) => e.preventDefault())
      cont.addEventListener('drop', (e: DragEvent) => {
        e.preventDefault()
        const symbolJson = e.dataTransfer?.getData('application/moebel-symbol'); if (!symbolJson) return
        const symbol: MoebelSymbol = JSON.parse(symbolJson)
        const rect = cont.getBoundingClientRect()
        const p = canvas.getPointer({ offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top } as MouseEvent)
        placeMoebel(symbol, p.x, p.y)
      })

      // Ctrl+Scroll auf Window-Ebene abfangen (verhindert Browser-Zoom)
      const preventBrowserZoom = (e: WheelEvent) => {
        if (e.ctrlKey || e.metaKey) e.preventDefault()
      }
      window.addEventListener('wheel', preventBrowserZoom, { passive: false })

      // ── LADEN (KRITISCH) ──
      if (initialCanvasJson) {
        try {
          const parsed = JSON.parse(initialCanvasJson)
          if (parsed.objects) {
            parsed.objects = parsed.objects.filter(
              (o: any) => o.data?.type !== 'outline' && o.data?.type !== 'preview' // eslint-disable-line @typescript-eslint/no-explicit-any
            )
          }
          await canvas.loadFromJSON(parsed)
          canvas.requestRenderAll()
        } catch { /* ignore */ }
      }

      // Raum-Umriss IMMER aus Raummaßen neu erzeugen
      if (breiteM && laengeM) updateOutline(breiteM, laengeM)

      canvas.requestRenderAll(); pushHistory(); updateObjCount()
      setLoading(false)

      // Tastatur
      function handleKeyDown(ev: KeyboardEvent) {
        const tag = (ev.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return

        // Escape → laufendes Zeichen-Tool beenden
        if (ev.key === 'Escape') {
          const tool = activeToolRef.current
          if (tool === 'wall')    { stopWallTool();    return }
          if (tool === 'measure') { stopMeasureTool(); return }
          switchToolRef.current('select'); return
        }

        if (ev.code === 'Space') { isSpaceRef.current = true; canvas.setCursor('grab'); ev.preventDefault(); return }
        if (ev.key === '?') { setShowShortcuts(v => !v); return }

        if ((ev.key === 'Delete' || ev.key === 'Backspace') && !ev.repeat) {
          const obj = canvas.getActiveObject()
          if (obj && (obj as any).data?.type !== 'outline') { // eslint-disable-line @typescript-eslint/no-explicit-any
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
          if (!isPanningRef.current) {
            canvas.setCursor(activeToolRef.current === 'select' ? 'default' : 'crosshair')
          }
        }
      }
      window.addEventListener('keydown', handleKeyDown)
      window.addEventListener('keyup', handleKeyUp)

      return () => {
        disposed = true
        window.removeEventListener('keydown', handleKeyDown)
        window.removeEventListener('keyup', handleKeyUp)
        window.removeEventListener('wheel', preventBrowserZoom)
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

  function zoomIn()    { const c = fabricRef.current; if (!c) return; const z = Math.min(MAX_ZOOM, c.getZoom() * 1.2); c.zoomToPoint({ x: c.getWidth() / 2, y: c.getHeight() / 2 }, z); setZoom(Math.round(z * 100) / 100) }
  function zoomOut()   { const c = fabricRef.current; if (!c) return; const z = Math.max(MIN_ZOOM, c.getZoom() / 1.2); c.zoomToPoint({ x: c.getWidth() / 2, y: c.getHeight() / 2 }, z); setZoom(Math.round(z * 100) / 100) }
  function zoomReset() { const c = fabricRef.current; if (!c) return; c.setViewportTransform([1,0,0,1,0,0]); setZoom(1); c.requestRenderAll() }

  // ── Fit to View ───────────────────────────────────────────

  function fitToView() {
    const canvas = fabricRef.current; if (!canvas) return
    const objs = canvas.getObjects().filter((o: any) => o.data?.type !== 'outline' && o.data?.type !== 'preview') // eslint-disable-line @typescript-eslint/no-explicit-any
    const targets = objs.length > 0 ? objs : canvas.getObjects()
    if (!targets.length) { zoomReset(); return }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    targets.forEach((o: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const b = o.getBoundingRect()
      minX = Math.min(minX, b.left); minY = Math.min(minY, b.top)
      maxX = Math.max(maxX, b.left + b.width); maxY = Math.max(maxY, b.top + b.height)
    })
    const pad = 60
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(
      (canvas.getWidth() - pad * 2) / (maxX - minX),
      (canvas.getHeight() - pad * 2) / (maxY - minY)
    )))
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
    canvas.setViewportTransform([z, 0, 0, z, canvas.getWidth() / 2 - cx * z, canvas.getHeight() / 2 - cy * z])
    setZoom(Math.round(z * 100) / 100); canvas.requestRenderAll()
  }

  // ── Alle löschen ──────────────────────────────────────────

  function clearAll() {
    if (!confirm('Alle Objekte löschen?')) return
    const canvas = fabricRef.current; if (!canvas) return
    canvas.getObjects().filter((o: any) => o.data?.type !== 'outline').forEach((o: any) => canvas.remove(o)) // eslint-disable-line @typescript-eslint/no-explicit-any
    setSelectedProps(null); pushHistory(); triggerAutoSave(); updateObjCount(); canvas.requestRenderAll()
  }

  // ── Löschen ───────────────────────────────────────────────

  function deleteSelected() {
    const c = fabricRef.current; if (!c) return
    const obj = c.getActiveObject()
    if (!obj || (obj as any).data?.type === 'outline') return // eslint-disable-line @typescript-eslint/no-explicit-any
    c.remove(obj); setSelectedProps(null); pushHistory(); triggerAutoSave(); updateObjCount(); c.requestRenderAll()
  }

  // ── Duplizieren ───────────────────────────────────────────

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

  // ── Raum-Maße speichern ───────────────────────────────────

  async function saveRaumMasse() {
    const b = parseFloat(raumBreite) || null
    const l = parseFloat(raumLaenge) || null
    const h = parseFloat(raumHoehe) || null
    await raumMasseAktualisieren(raumId, b, l, h, projektId)
    updateOutline(b, l)
  }

  // ── Tool-Definitionen ─────────────────────────────────────

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

  // ── Button-Klasse Helpers ────────────────────────────────

  const tbBtn = 'w-9 h-9 flex items-center justify-center rounded-lg transition-all text-[#94c1a4] hover:text-white hover:bg-[#3a5240]'
  const tbBtnActive = 'bg-wellbeing-green text-white shadow-sm ring-1 ring-wellbeing-green/50'
  const tbSep = 'w-px h-6 bg-[#445c49]/30 mx-1'

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="flex flex-col text-[#c8dbc9]" style={{ height: '100vh', background: '#1a2e1e' }}
      onClick={() => setContextMenu(null)}>

      <LoadingScreen visible={loading} />
      {showShortcuts && <ShortcutOverlay onClose={() => setShowShortcuts(false)} />}

      {/* Kontext-Menü */}
      {contextMenu && (
        <div className="fixed z-50 bg-[#2d3e31] border border-[#445c49]/40 rounded-xl shadow-2xl py-1 w-44"
          style={{ left: contextMenu.x, top: contextMenu.y }} onClick={e => e.stopPropagation()}>
          {[
            { label: 'Duplizieren',       action: duplicateSelected,  cls: '' },
            { label: 'Ebene nach vorne',  action: bringForward,       cls: '' },
            { label: 'Ebene nach hinten', action: sendBackward,       cls: '' },
          ].map(({ label, action, cls }) => (
            <button key={label} type="button" onClick={action}
              className={`w-full text-left px-3 py-2 text-xs text-[#c8dbc9] hover:bg-[#3a5240] hover:text-white transition-colors ${cls}`}>
              {label}
            </button>
          ))}
          <div className="border-t border-[#445c49]/30 my-1" />
          <button type="button" onClick={() => {
            const c = fabricRef.current; if (!c) return
            c.remove(contextMenu.target); setSelectedProps(null)
            pushHistory(); triggerAutoSave(); updateObjCount(); c.requestRenderAll(); setContextMenu(null)
          }} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-[#3a5240] hover:text-red-300 transition-colors">
            Löschen
          </button>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex items-center h-12 px-3 bg-[#2d3e31] border-b border-[#445c49]/30 shrink-0 gap-1.5">

        {/* Zurück */}
        <Link href={`/dashboard/projekte/${projektId}/raeume/${raumId}`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#94c1a4] hover:text-white hover:bg-[#3a5240] rounded-lg transition-colors whitespace-nowrap mr-1">
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="font-medium">{raumName}</span>
        </Link>

        <div className={tbSep} />

        {/* Tool-Gruppen */}
        {toolGroups.map((group, gi) => (
          <div key={gi} className="flex items-center gap-0.5">
            {group.map(({ key, Icon, label, shortcut }) => (
              <button key={key} type="button" title={`${label} (${shortcut})`}
                onClick={() => switchTool(key)}
                className={`${tbBtn} ${activeTool === key ? tbBtnActive : ''}`}>
                <Icon className="w-4 h-4" />
              </button>
            ))}
            {gi < toolGroups.length - 1 && <div className={tbSep} />}
          </div>
        ))}

        <div className={tbSep} />

        {/* Undo/Redo */}
        <button type="button" title="Rückgängig (Ctrl+Z)" onClick={undo} className={tbBtn}><RotateCcw className="w-4 h-4" /></button>
        <button type="button" title="Wiederholen (Ctrl+Y)" onClick={redo} className={tbBtn}><RotateCw className="w-4 h-4" /></button>

        <div className={tbSep} />

        {/* Fit + Clear */}
        <button type="button" title="Auf Fläche einpassen" onClick={fitToView} className={tbBtn}><Maximize2 className="w-4 h-4" /></button>
        <button type="button" title="Alle löschen" onClick={clearAll}
          className="w-9 h-9 flex items-center justify-center rounded-lg transition-all text-[#94c1a4] hover:text-red-300 hover:bg-[#3a5240]">
          <Trash2 className="w-4 h-4" />
        </button>

        <div className={tbSep} />

        {/* Grid */}
        <button type="button" title="Raster an/aus" onClick={() => setShowGrid(g => !g)}
          className={`${tbBtn} ${showGrid ? 'bg-wellbeing-green/20 text-wellbeing-green-light ring-1 ring-wellbeing-green/30' : ''}`}>
          <Grid3x3 className="w-4 h-4" />
        </button>
        {/* Grid-Größe Toggle (kein Dropdown) */}
        <div className="flex items-center gap-0.5 bg-[#1a2e1e] rounded-lg p-0.5">
          {([10, 25, 50] as GridSize[]).map(v => (
            <button key={v} type="button" onClick={() => { setGridSize(v); gridSizeRef.current = v; fabricRef.current?.requestRenderAll() }}
              className={`px-2 py-1 text-[11px] font-medium rounded-md transition-all ${gridSize === v ? 'bg-wellbeing-green text-white' : 'text-[#94c1a4] hover:text-white hover:bg-[#3a5240]'}`}>
              {v}
            </button>
          ))}
          <span className="text-[10px] text-[#94c1a4]/60 px-1">cm</span>
        </div>

        <div className="flex-1" />

        {/* Zoom */}
        <button type="button" onClick={zoomOut} className={tbBtn}><Minus className="w-3.5 h-3.5" /></button>
        <button type="button" onClick={zoomReset}
          className="min-w-[48px] h-9 text-center text-xs text-[#94c1a4] hover:text-white hover:bg-[#3a5240] rounded-lg px-2 transition-colors font-mono">
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" onClick={zoomIn} className={tbBtn}><Plus className="w-3.5 h-3.5" /></button>

        <div className={tbSep} />

        {/* Speichern */}
        <button type="button" onClick={saveNow}
          className={`flex items-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-lg transition-all ${
            saveStatus === 'saved'   ? 'text-[#94c1a4] hover:text-white hover:bg-[#3a5240]' :
            saveStatus === 'saving'  ? 'text-[#94c1a4]/60 cursor-wait' :
            saveStatus === 'error'   ? 'text-red-400 bg-red-500/10 ring-1 ring-red-500/30' :
            'text-white bg-wellbeing-green ring-1 ring-wellbeing-green/50 hover:bg-wellbeing-green-dark'
          }`}>
          {saveStatus === 'saved'  ? <><CheckCircle className="w-3.5 h-3.5" /> Gespeichert</> :
           saveStatus === 'saving' ? <><Save className="w-3.5 h-3.5 animate-pulse" /> Speichern…</> :
           saveStatus === 'error'  ? <><AlertCircle className="w-3.5 h-3.5" /> Fehler</> :
                                     <><Save className="w-3.5 h-3.5" /> Speichern</>}
        </button>

        <button type="button" title="Tastaturkürzel (?)" onClick={() => setShowShortcuts(true)}
          className={`${tbBtn} ml-0.5`}>
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {/* ── Hauptbereich ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Linke Sidebar ── */}
        <div className="w-56 bg-[#2d3e31] border-r border-[#445c49]/30 flex flex-col overflow-hidden shrink-0">
          <div className="px-2 py-2 border-b border-[#445c49]/30">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#94c1a4]/50" />
              <input type="text" placeholder="Möbel suchen…" value={moebelSuche}
                onChange={e => setMoebelSuche(e.target.value)}
                className="w-full bg-[#1a2e1e] border border-[#445c49]/30 text-[#c8dbc9] text-[11px] rounded-lg pl-7 pr-2 py-1.5 placeholder-[#94c1a4]/40 focus:outline-none focus:border-wellbeing-green/60 focus:ring-1 focus:ring-wellbeing-green/20" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isSearching ? (
              <div className="px-2 py-2">
                <p className="text-[9px] text-[#94c1a4]/60 uppercase tracking-wider font-semibold px-1 mb-2">{filteredMoebel.length} Treffer</p>
                <MoebelGrid symbols={filteredMoebel} fabricRef={fabricRef} placeMoebel={placeMoebel} />
              </div>
            ) : (
              <div>
                {groupedMoebel.map(group => (
                  <div key={group.name}>
                    <button type="button" onClick={() => setOpenGroups(prev => { const n = new Set(prev); if (n.has(group.name)) n.delete(group.name); else n.add(group.name); return n })}
                      className="w-full flex items-center justify-between px-3 py-2 text-[10px] text-[#94c1a4] hover:text-white hover:bg-[#3a5240]/50 transition-colors border-b border-[#445c49]/20">
                      <span className="uppercase tracking-wider font-semibold">{group.name}</span>
                      {openGroups.has(group.name) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </button>
                    {openGroups.has(group.name) && (
                      <div className="px-2 py-2 border-b border-[#445c49]/10">
                        <MoebelGrid symbols={group.items} fabricRef={fabricRef} placeMoebel={placeMoebel} />
                      </div>
                    )}
                  </div>
                ))}
                {sonstige.length > 0 && (
                  <div>
                    <button type="button" onClick={() => setOpenGroups(prev => { const n = new Set(prev); if (n.has('Sonstige')) n.delete('Sonstige'); else n.add('Sonstige'); return n })}
                      className="w-full flex items-center justify-between px-3 py-2 text-[10px] text-[#94c1a4] hover:text-white hover:bg-[#3a5240]/50 transition-colors border-b border-[#445c49]/20">
                      <span className="uppercase tracking-wider font-semibold">Sonstige</span>
                      {openGroups.has('Sonstige') ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </button>
                    {openGroups.has('Sonstige') && (
                      <div className="px-2 py-2">
                        <MoebelGrid symbols={sonstige} fabricRef={fabricRef} placeMoebel={placeMoebel} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Canvas ── */}
        <div ref={containerRef} className="flex-1 relative overflow-hidden"
          style={{ background: '#e8ede9', cursor: activeTool === 'select' ? 'default' : 'crosshair' }}>
          <canvas ref={canvasRef} className="absolute inset-0 z-10" />
        </div>

        {/* ── Rechte Sidebar ── */}
        <div className="w-60 bg-[#2d3e31] border-l border-[#445c49]/30 flex flex-col overflow-hidden shrink-0">
          <div className="flex-1 overflow-y-auto">
            {selectedProps ? (
              <div>
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#445c49]/30">
                  <div>
                    <p className="text-[10px] text-[#94c1a4]/60 uppercase tracking-wider">
                      {selectedProps.objType === 'wall' ? 'Wand' : selectedProps.objType === 'door' ? 'Tür' :
                       selectedProps.objType === 'window' ? 'Fenster' : selectedProps.objType === 'measure' ? 'Bemaßung' :
                       selectedProps.objType === 'moebel' ? 'Möbel' : 'Objekt'}
                    </p>
                    <p className="text-xs font-medium text-white truncate max-w-[140px]">{selectedProps.name || '–'}</p>
                  </div>
                  <button type="button" onClick={deleteSelected}
                    className="p-1.5 text-[#94c1a4]/60 hover:text-red-400 hover:bg-[#3a5240] rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="px-3 py-3 border-b border-[#445c49]/20">
                  <p className="text-[9px] text-[#94c1a4]/60 uppercase tracking-wider font-semibold mb-2">Position</p>
                  <div className="grid grid-cols-2 gap-2">
                    <PropField label="X" value={`${selectedProps.x} px`} />
                    <PropField label="Y" value={`${selectedProps.y} px`} />
                  </div>
                </div>
                <div className="px-3 py-3 border-b border-[#445c49]/20">
                  <p className="text-[9px] text-[#94c1a4]/60 uppercase tracking-wider font-semibold mb-2">Größe</p>
                  <div className="grid grid-cols-2 gap-2">
                    <PropField label="Breite" value={`${Math.round(selectedProps.w)} px`} />
                    <PropField label="Tiefe"  value={`${Math.round(selectedProps.h)} px`} />
                  </div>
                </div>
                <div className="px-3 py-3 border-b border-[#445c49]/20">
                  <p className="text-[9px] text-[#94c1a4]/60 uppercase tracking-wider font-semibold mb-2">Rotation</p>
                  <PropField label="Winkel" value={`${selectedProps.angle}°`} />
                </div>
                {selectedProps.objType === 'door' && (
                  <div className="px-3 py-3 border-b border-[#445c49]/20">
                    <p className="text-[9px] text-[#94c1a4]/60 uppercase tracking-wider font-semibold mb-2">Tür-Breite</p>
                    <select value={doorWidth} onChange={e => setDoorWidth(Number(e.target.value))}
                      className="w-full bg-[#1a2e1e] border border-[#445c49]/30 text-[#c8dbc9] text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-wellbeing-green">
                      {[60,70,80,90,100].map(v => <option key={v} value={v}>{v} cm</option>)}
                    </select>
                  </div>
                )}
                {selectedProps.objType === 'window' && (
                  <div className="px-3 py-3 border-b border-[#445c49]/20">
                    <p className="text-[9px] text-[#94c1a4]/60 uppercase tracking-wider font-semibold mb-2">Fenster-Breite</p>
                    <div className="flex items-center gap-2">
                      <input type="number" value={windowWidth} onChange={e => setWindowWidth(Number(e.target.value))}
                        min={60} max={300} step={10}
                        className="w-full bg-[#1a2e1e] border border-[#445c49]/30 text-[#c8dbc9] text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-wellbeing-green" />
                      <span className="text-[10px] text-[#94c1a4]/60 shrink-0">cm</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="px-3 py-2.5 border-b border-[#445c49]/30">
                  <p className="text-[10px] text-[#94c1a4]/60 uppercase tracking-wider">Kein Objekt gewählt</p>
                  <p className="text-xs font-medium text-white">Raum-Einstellungen</p>
                </div>
                <div className="px-3 py-3 border-b border-[#445c49]/20">
                  <p className="text-[9px] text-[#94c1a4]/60 uppercase tracking-wider font-semibold mb-3">Raummaße</p>
                  <div className="space-y-2.5">
                    {[
                      { label: 'Breite (m)', val: raumBreite, set: setRaumBreite },
                      { label: 'Länge (m)',  val: raumLaenge, set: setRaumLaenge },
                      { label: 'Höhe (m)',   val: raumHoehe,  set: setRaumHoehe },
                    ].map(({ label, val, set }) => (
                      <div key={label}>
                        <label className="text-[10px] text-[#94c1a4]/70 block mb-1">{label}</label>
                        <input type="number" step="0.1" min="0.5" max="50" value={val}
                          onChange={e => set(e.target.value)} onBlur={saveRaumMasse}
                          className="w-full bg-[#1a2e1e] border border-[#445c49]/30 text-[#c8dbc9] text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-wellbeing-green/60 focus:ring-1 focus:ring-wellbeing-green/20" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="px-3 py-3 border-b border-[#445c49]/20">
                  <p className="text-[9px] text-[#94c1a4]/60 uppercase tracking-wider font-semibold mb-2">Standard-Maße</p>
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[10px] text-[#94c1a4]/70 block mb-1">Tür-Breite</label>
                      <select value={doorWidth} onChange={e => setDoorWidth(Number(e.target.value))}
                        className="w-full bg-[#1a2e1e] border border-[#445c49]/30 text-[#c8dbc9] text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-wellbeing-green/60">
                        {[60,70,80,90,100].map(v => <option key={v} value={v}>{v} cm</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-[#94c1a4]/70 block mb-1">Fenster-Breite</label>
                      <div className="flex items-center gap-2">
                        <input type="number" value={windowWidth} min={60} max={300} step={10}
                          onChange={e => setWindowWidth(Number(e.target.value))}
                          className="w-full bg-[#1a2e1e] border border-[#445c49]/30 text-[#c8dbc9] text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-wellbeing-green/60" />
                        <span className="text-[10px] text-[#94c1a4]/60 shrink-0">cm</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-3 py-3">
                  <p className="text-[9px] text-[#94c1a4]/50 leading-relaxed">
                    Klicke Möbel an oder ziehe es auf die Fläche.<br />
                    <span className="text-[#94c1a4]/30">? = Shortcuts · Esc = Abbrechen</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Status-Bar ── */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#2d3e31] border-t border-[#445c49]/30 shrink-0 h-8">
        <div className="flex items-center gap-4 text-[10px] text-[#94c1a4]/60 font-mono">
          <span>X {mousePos.x.toFixed(2)} m</span>
          <span>Y {mousePos.y.toFixed(2)} m</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-[#94c1a4]/60">
          <span className={
            activeTool === 'wall'    ? 'text-amber-400' :
            activeTool === 'eraser'  ? 'text-red-400' :
            activeTool === 'door'    ? 'text-blue-400' :
            activeTool === 'window'  ? 'text-sky-400' :
            activeTool === 'measure' ? 'text-amber-400' :
            'text-[#94c1a4]'
          }>{allTools.find(t => t.key === activeTool)?.label}</span>
          <span>Raster {gridSize}cm</span>
          <span>{objCount} Objekte</span>
          <span>{Math.round(zoom * 100)}%</span>
        </div>
      </div>
    </div>
  )
}

// ── MoebelGrid ────────────────────────────────────────────────

function MoebelGrid({ symbols, fabricRef, placeMoebel }: {
  symbols: MoebelSymbol[]
  fabricRef: React.MutableRefObject<any> // eslint-disable-line @typescript-eslint/no-explicit-any
  placeMoebel: (s: MoebelSymbol, x: number, y: number) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {symbols.map(symbol => (
        <div key={symbol.id} draggable
          onDragStart={e => { e.dataTransfer.setData('application/moebel-symbol', JSON.stringify(symbol)); e.dataTransfer.effectAllowed = 'copy' }}
          onClick={() => {
            const canvas = fabricRef.current; if (!canvas) return
            const vpt = canvas.viewportTransform ?? [1,0,0,1,0,0]
            placeMoebel(symbol, (canvas.getWidth() / 2 - vpt[4]) / vpt[0], (canvas.getHeight() / 2 - vpt[5]) / vpt[3])
          }}
          className="group bg-[#1a2e1e]/60 hover:bg-[#3a5240]/60 border border-[#445c49]/20 hover:border-wellbeing-green/40 rounded-lg p-1.5 cursor-grab active:cursor-grabbing transition-all select-none"
          title={`${symbol.name} – ${symbol.breite_cm}×${symbol.tiefe_cm}cm`}>
          <div className="w-full rounded-md mb-1.5 overflow-hidden flex items-center justify-center p-1 bg-white/5" style={{ minHeight: 36 }}>
            <MoebelPreview symbol={symbol} />
          </div>
          <p className="text-[10px] text-[#94c1a4] group-hover:text-white font-medium leading-tight truncate transition-colors">{symbol.name}</p>
          <p className="text-[9px] text-[#94c1a4]/40 leading-tight">{symbol.breite_cm}×{symbol.tiefe_cm}cm</p>
        </div>
      ))}
    </div>
  )
}

// ── PropField ─────────────────────────────────────────────────

function PropField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] text-[#94c1a4]/60 mb-0.5">{label}</p>
      <div className="bg-[#1a2e1e] border border-[#445c49]/20 text-[#94c1a4] text-[11px] rounded-lg px-2 py-1 font-mono truncate">{value}</div>
    </div>
  )
}
