'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  MousePointer2, Minus, Plus, Grid3x3, Save, Trash2,
  RotateCcw, RotateCw, Search, ChevronLeft, Pencil,
  Eraser, CheckCircle, DoorOpen, AppWindow, Ruler,
  HelpCircle, X,
} from 'lucide-react'
import { grundrissSpeichern, raumMasseAktualisieren } from '@/app/actions/raumplaner'
import type { MoebelSymbol } from '@/lib/supabase/types'

// ── Konstanten ────────────────────────────────────────────────

const SCALE           = 100   // px pro Meter
const WALL_THICKNESS  = 15    // px (15cm)
const MIN_ZOOM        = 0.20
const MAX_ZOOM        = 5
const AUTOSAVE_DELAY  = 3000  // ms

type Tool = 'select' | 'wall' | 'door' | 'window' | 'measure' | 'eraser'
type GridOption = 10 | 25 | 50 | 100

interface SelectedProps {
  x: number; y: number; w: number; h: number
  angle: number; fill: string; name: string
  objType?: string
}

interface Props {
  raumId: string
  projektId: string
  raumName: string
  breiteM: number | null
  laengeM: number | null
  hoeheM: number | null
  initialCanvasJson: string | null
  moebelSymbole: MoebelSymbol[]
  produkte: Array<{ id: string; name: string; kategorie: string | null }>
}

// ── Kleines SVG-Preview für Möbel-Kacheln ────────────────────

function MoebelPreview({ symbol }: { symbol: MoebelSymbol }) {
  // Normalisierter viewport: Path ist in 100x100 Einheiten
  // Box-Aspect aus tatsächlichen Maßen
  const aspect = symbol.tiefe_cm / symbol.breite_cm
  const vH = Math.round(100 * aspect)
  return (
    <svg
      viewBox={`0 0 100 ${vH}`}
      className="w-full"
      style={{ maxHeight: 56 }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d={symbol.svg_path}
        fill={symbol.farbe + 'cc'}
        stroke={symbol.farbe}
        strokeWidth="3"
        strokeLinejoin="round"
        transform={vH !== 100 ? `scale(1,${vH / 100})` : undefined}
      />
    </svg>
  )
}

// ── Loading Screen ────────────────────────────────────────────

function LoadingScreen({ visible }: { visible: boolean }) {
  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-950 transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-wellbeing-green/20 border border-wellbeing-green/30 flex items-center justify-center">
          <svg viewBox="0 0 32 32" className="w-8 h-8 text-wellbeing-green-light" fill="currentColor">
            <rect x="2" y="2" width="12" height="12" rx="2"/>
            <rect x="18" y="2" width="12" height="12" rx="2" opacity=".6"/>
            <rect x="2" y="18" width="12" height="12" rx="2" opacity=".6"/>
            <rect x="18" y="18" width="12" height="12" rx="2" opacity=".3"/>
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-200">Raumplaner wird geladen…</p>
          <p className="text-xs text-gray-500 mt-1">Fabric.js Canvas initialisiert</p>
        </div>
        {/* Spinner */}
        <div className="w-48 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-wellbeing-green rounded-full animate-[loading_1.4s_ease-in-out_infinite]" style={{ width: '60%' }} />
        </div>
      </div>
      <style>{`
        @keyframes loading {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(280%); }
        }
      `}</style>
    </div>
  )
}

// ── Shortcut-Overlay ──────────────────────────────────────────

function ShortcutOverlay({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { keys: ['V'],             desc: 'Auswahl' },
    { keys: ['W'],             desc: 'Wand zeichnen' },
    { keys: ['D'],             desc: 'Tür platzieren' },
    { keys: ['F'],             desc: 'Fenster platzieren' },
    { keys: ['M'],             desc: 'Bemaßung' },
    { keys: ['E'],             desc: 'Radierer' },
    { keys: ['Ctrl', 'Z'],    desc: 'Rückgängig' },
    { keys: ['Ctrl', 'Y'],    desc: 'Wiederholen' },
    { keys: ['Ctrl', 'S'],    desc: 'Speichern' },
    { keys: ['Del'],           desc: 'Auswahl löschen' },
    { keys: ['Space', 'Drag'], desc: 'Verschieben' },
    { keys: ['Scroll'],        desc: 'Zoom' },
    { keys: ['?'],             desc: 'Dieses Fenster' },
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-80 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-200">Tastaturkürzel</h3>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2">
          {shortcuts.map((s) => (
            <div key={s.desc} className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{s.desc}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k) => (
                  <kbd key={k} className="px-1.5 py-0.5 text-[10px] font-mono bg-gray-800 border border-gray-600 rounded text-gray-300">
                    {k}
                  </kbd>
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
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fabricRef    = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fabricImports = useRef<any>(null)

  const [loading,      setLoading]      = useState(true)
  const [activeTool,   setActiveTool]   = useState<Tool>('select')
  const [showGrid,     setShowGrid]     = useState(true)
  const [gridSize,     setGridSize]     = useState<GridOption>(25)
  const [zoom,         setZoom]         = useState(1)
  const [mousePos,     setMousePos]     = useState({ x: 0, y: 0 })
  const [saveStatus,   setSaveStatus]   = useState<'saved'|'unsaved'|'saving'>('saved')
  const [moebelSuche,  setMoebelSuche]  = useState('')
  const [selectedProps,setSelectedProps]= useState<SelectedProps | null>(null)
  const [showShortcuts,setShowShortcuts]= useState(false)
  const [doorWidth,    setDoorWidth]    = useState(80)
  const [windowWidth,  setWindowWidth]  = useState(100)

  const [raumBreite, setRaumBreite] = useState(breiteM?.toString() ?? '')
  const [raumLaenge, setRaumLaenge] = useState(laengeM?.toString() ?? '')
  const [raumHoehe,  setRaumHoehe]  = useState(hoeheM?.toString() ?? '2.50')

  // Refs (kein re-render bei Änderung nötig)
  const activeToolRef   = useRef<Tool>('select')
  const showGridRef     = useRef(true)
  const gridSizeRef     = useRef<number>(25)
  const saveTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSpaceRef      = useRef(false)
  const isPanningRef    = useRef(false)
  const lastPanPosRef   = useRef({ x: 0, y: 0 })
  const historyRef      = useRef<string[]>([])
  const historyIdxRef   = useRef(-1)
  const doorWidthRef    = useRef(80)
  const windowWidthRef  = useRef(100)
  // Wall state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wallPreviewRef  = useRef<any>(null)
  const wallStartRef    = useRef<{ x: number; y: number } | null>(null)
  // Measure state
  const measureStartRef = useRef<{ x: number; y: number } | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const measurePreviewRef = useRef<any>(null)
  // Outline Rect
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const outlineRef      = useRef<any>(null)

  // ── Sync Refs ──────────────────────────────────────────────

  useEffect(() => { activeToolRef.current = activeTool }, [activeTool])
  useEffect(() => { showGridRef.current = showGrid; fabricRef.current?.requestRenderAll() }, [showGrid])
  useEffect(() => { gridSizeRef.current = gridSize; fabricRef.current?.requestRenderAll() }, [gridSize])
  useEffect(() => { doorWidthRef.current = doorWidth }, [doorWidth])
  useEffect(() => { windowWidthRef.current = windowWidth }, [windowWidth])

  // ── Grid zeichnen (after:render) ──────────────────────────

  function drawGrid(
    ctx: CanvasRenderingContext2D,
    vpt: number[], canvasW: number, canvasH: number,
    gridPx: number, show: boolean
  ) {
    if (!show) return
    const z = vpt[0], ox = vpt[4], oy = vpt[5]
    const minor = gridPx * z
    const major = SCALE * z
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    if (minor > 4) {
      ctx.strokeStyle = 'rgba(209,213,219,0.35)'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      const sx = ((ox % minor) + minor) % minor
      const sy = ((oy % minor) + minor) % minor
      for (let x = sx; x <= canvasW; x += minor) { ctx.moveTo(x, 0); ctx.lineTo(x, canvasH) }
      for (let y = sy; y <= canvasH; y += minor) { ctx.moveTo(0, y); ctx.lineTo(canvasW, y) }
      ctx.stroke()
    }
    if (major > 10) {
      ctx.strokeStyle = 'rgba(156,163,175,0.55)'
      ctx.lineWidth = 1
      ctx.beginPath()
      const mx = ((ox % major) + major) % major
      const my = ((oy % major) + major) % major
      for (let x = mx; x <= canvasW; x += major) { ctx.moveTo(x, 0); ctx.lineTo(x, canvasH) }
      for (let y = my; y <= canvasH; y += major) { ctx.moveTo(0, y); ctx.lineTo(canvasW, y) }
      ctx.stroke()
    }
    ctx.restore()
  }

  // ── Auto-Save ─────────────────────────────────────────────

  const triggerAutoSave = useCallback(() => {
    setSaveStatus('unsaved')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      const canvas = fabricRef.current
      if (!canvas) return
      setSaveStatus('saving')
      const json = JSON.stringify(canvas.toJSON(['data', 'name']))
      await grundrissSpeichern(raumId, json)
      setSaveStatus('saved')
    }, AUTOSAVE_DELAY)
  }, [raumId])

  // ── History ───────────────────────────────────────────────

  const pushHistory = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    const json = JSON.stringify(canvas.toJSON(['data', 'name']))
    historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1)
    historyRef.current.push(json)
    historyIdxRef.current = historyRef.current.length - 1
    if (historyRef.current.length > 50) {
      historyRef.current.shift()
      historyIdxRef.current--
    }
  }, [])

  const undo = useCallback(async () => {
    const canvas = fabricRef.current
    if (!canvas || historyIdxRef.current <= 0) return
    historyIdxRef.current--
    const json = historyRef.current[historyIdxRef.current]
    canvas.clear()
    await canvas.loadFromJSON(JSON.parse(json))
    canvas.requestRenderAll()
  }, [])

  const redo = useCallback(async () => {
    const canvas = fabricRef.current
    if (!canvas || historyIdxRef.current >= historyRef.current.length - 1) return
    historyIdxRef.current++
    const json = historyRef.current[historyIdxRef.current]
    canvas.clear()
    await canvas.loadFromJSON(JSON.parse(json))
    canvas.requestRenderAll()
  }, [])

  const saveNow = useCallback(async () => {
    const canvas = fabricRef.current
    if (!canvas) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSaveStatus('saving')
    const json = JSON.stringify(canvas.toJSON(['data', 'name']))
    await grundrissSpeichern(raumId, json)
    setSaveStatus('saved')
  }, [raumId])

  // ── Raum-Umriss zeichnen/aktualisieren ───────────────────

  const updateOutline = useCallback((breite: number | null, laenge: number | null) => {
    const canvas = fabricRef.current
    const imp = fabricImports.current
    if (!canvas || !imp || !breite || !laenge) return
    const { Rect } = imp
    const w = breite * SCALE
    const h = laenge * SCALE
    if (outlineRef.current) canvas.remove(outlineRef.current)
    const outline = new Rect({
      left: 0, top: 0, width: w, height: h,
      fill: 'transparent',
      stroke: '#374151', strokeWidth: 20,
      strokeUniform: false,
      selectable: false, evented: false,
      data: { type: 'outline' },
      name: 'Raumumriss',
    })
    outlineRef.current = outline
    canvas.add(outline)
    canvas.sendObjectToBack(outline)
    canvas.requestRenderAll()
  }, [])

  // ── Möbel platzieren ──────────────────────────────────────

  const placeMoebel = useCallback((symbol: MoebelSymbol, canvasX: number, canvasY: number) => {
    const canvas = fabricRef.current
    const imp = fabricImports.current
    if (!canvas || !imp) return
    const { Rect, Text, Group } = imp
    const w = symbol.breite_cm, h = symbol.tiefe_cm
    const bg = new Rect({
      width: w, height: h,
      fill: symbol.farbe || '#94c1a4',
      stroke: '#374151', strokeWidth: 1.5,
      rx: 3, ry: 3,
      originX: 'left', originY: 'top',
    })
    const label = new Text(symbol.name, {
      fontSize: Math.max(7, Math.min(11, w / Math.max(symbol.name.length, 4) * 1.4)),
      fill: '#1f2937',
      textAlign: 'center',
      originX: 'center', originY: 'center',
      left: w / 2, top: h / 2,
      fontFamily: 'system-ui, sans-serif',
    })
    const group = new Group([bg, label], {
      left: canvasX - w / 2, top: canvasY - h / 2,
      data: { type: 'moebel', symbolId: symbol.id, name: symbol.name },
      name: symbol.name,
    })
    canvas.add(group)
    canvas.setActiveObject(group)
    canvas.requestRenderAll()
    pushHistory()
    triggerAutoSave()
  }, [pushHistory, triggerAutoSave])

  // ── Wand platzieren ───────────────────────────────────────

  const finishWall = useCallback((x2: number, y2: number) => {
    const canvas = fabricRef.current
    const imp = fabricImports.current
    if (!canvas || !imp || !wallStartRef.current) return
    const { Line } = imp
    const { x: x1, y: y1 } = wallStartRef.current
    if (wallPreviewRef.current) { canvas.remove(wallPreviewRef.current); wallPreviewRef.current = null }
    if (Math.abs(x2 - x1) < 3 && Math.abs(y2 - y1) < 3) return
    const wall = new Line([x1, y1, x2, y2], {
      stroke: '#1f2937', strokeWidth: WALL_THICKNESS, strokeLineCap: 'square',
      selectable: true, data: { type: 'wall' }, name: 'Wand',
    })
    canvas.add(wall)
    pushHistory()
    triggerAutoSave()
    canvas.requestRenderAll()
  }, [pushHistory, triggerAutoSave])

  // ── Tür platzieren ────────────────────────────────────────

  const placeDoor = useCallback((x: number, y: number) => {
    const canvas = fabricRef.current
    const imp = fabricImports.current
    if (!canvas || !imp) return
    const { Group, Rect, Path } = imp
    const w = doorWidthRef.current
    const thick = WALL_THICKNESS

    // Rahmen (Lücke in der Wand symbolisiert, Hintergrund)
    const frame = new Rect({
      left: 0, top: 0, width: w, height: thick,
      fill: '#f9fafb', stroke: '#6b7280', strokeWidth: 1,
    })
    // Bogen (Viertelkreis) - vereinfacht als Path
    const arcPath = `M 0,${thick} A ${w},${w} 0 0 1 ${w},${thick + w} L ${w},${thick} Z`
    const arc = new Path(arcPath, {
      fill: 'transparent', stroke: '#445c49', strokeWidth: 1.5, strokeDashArray: [4, 3],
    })
    const group = new Group([frame, arc], {
      left: x - w / 2, top: y - thick / 2,
      data: { type: 'door', breite: w }, name: 'Tür',
    })
    canvas.add(group)
    canvas.setActiveObject(group)
    canvas.requestRenderAll()
    pushHistory()
    triggerAutoSave()
  }, [pushHistory, triggerAutoSave])

  // ── Fenster platzieren ────────────────────────────────────

  const placeWindow = useCallback((x: number, y: number) => {
    const canvas = fabricRef.current
    const imp = fabricImports.current
    if (!canvas || !imp) return
    const { Group, Rect, Line } = imp
    const w = windowWidthRef.current
    const thick = WALL_THICKNESS

    // Rahmen
    const frame = new Rect({
      left: 0, top: 0, width: w, height: thick,
      fill: '#e0f2fe', stroke: '#6b7280', strokeWidth: 1,
    })
    // 2 Glaslinien
    const l1 = new Line([w * 0.33, 2, w * 0.33, thick - 2], { stroke: '#94c1a4', strokeWidth: 1.5 })
    const l2 = new Line([w * 0.66, 2, w * 0.66, thick - 2], { stroke: '#94c1a4', strokeWidth: 1.5 })

    const group = new Group([frame, l1, l2], {
      left: x - w / 2, top: y - thick / 2,
      data: { type: 'window', breite: w }, name: 'Fenster',
    })
    canvas.add(group)
    canvas.setActiveObject(group)
    canvas.requestRenderAll()
    pushHistory()
    triggerAutoSave()
  }, [pushHistory, triggerAutoSave])

  // ── Bemaßung platzieren ───────────────────────────────────

  const finishMeasure = useCallback((x2: number, y2: number) => {
    const canvas = fabricRef.current
    const imp = fabricImports.current
    if (!canvas || !imp || !measureStartRef.current) return
    const { Group, Line, Text } = imp
    const { x: x1, y: y1 } = measureStartRef.current
    if (measurePreviewRef.current) { canvas.remove(measurePreviewRef.current); measurePreviewRef.current = null }

    const dx = x2 - x1, dy = y2 - y1
    const distPx = Math.sqrt(dx * dx + dy * dy)
    if (distPx < 5) { measureStartRef.current = null; return }

    const distM = distPx / SCALE
    const label = distM >= 1
      ? `${distM.toFixed(2)} m`
      : `${Math.round(distM * 100)} cm`

    const angle = (Math.atan2(dy, dx) * 180) / Math.PI
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2

    const mainLine = new Line([x1, y1, x2, y2], { stroke: '#f59e0b', strokeWidth: 1.5, selectable: false })
    // Endpunkt-Ticks
    const tickLen = 6
    const norm = { x: -dy / distPx, y: dx / distPx }
    const t1a = new Line([x1 - norm.x * tickLen, y1 - norm.y * tickLen, x1 + norm.x * tickLen, y1 + norm.y * tickLen],
      { stroke: '#f59e0b', strokeWidth: 1.5, selectable: false })
    const t2a = new Line([x2 - norm.x * tickLen, y2 - norm.y * tickLen, x2 + norm.x * tickLen, y2 + norm.y * tickLen],
      { stroke: '#f59e0b', strokeWidth: 1.5, selectable: false })
    const txt = new Text(label, {
      left: mx, top: my,
      fontSize: 11, fill: '#f59e0b', fontFamily: 'system-ui, sans-serif',
      backgroundColor: 'rgba(17,24,39,0.8)',
      originX: 'center', originY: 'center',
      angle: angle > 90 || angle < -90 ? angle + 180 : angle,
      selectable: false,
    })

    const group = new Group([mainLine, t1a, t2a, txt], {
      selectable: true, data: { type: 'measure', distM }, name: `Maß ${label}`,
    })
    canvas.add(group)
    canvas.requestRenderAll()
    pushHistory()
    triggerAutoSave()
    measureStartRef.current = null
  }, [pushHistory, triggerAutoSave])

  // ── extractObjProps (Hilfsfunktion) ──────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function extractObjProps(obj: any): SelectedProps {
    return {
      x: Math.round((obj.left ?? 0) * 10) / 10,
      y: Math.round((obj.top ?? 0) * 10) / 10,
      w: Math.round((obj.getScaledWidth?.() ?? 0) * 10) / 10,
      h: Math.round((obj.getScaledHeight?.() ?? 0) * 10) / 10,
      angle: Math.round(obj.angle ?? 0),
      fill: typeof obj.fill === 'string' ? obj.fill : '#94c1a4',
      name: obj.name ?? '',
      objType: obj.data?.type ?? '',
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
        selection: true,
        preserveObjectStacking: true,
        stopContextMenu: true,
        fireRightClick: true,
        renderOnAddRemove: false,  // Performance
      })
      fabricRef.current = canvas

      // Resize
      function resizeCanvas() {
        const w = cont.clientWidth, h = cont.clientHeight
        canvas.setWidth(w); canvas.setHeight(h)
        canvas.requestRenderAll()
      }
      resizeCanvas()
      const ro = new ResizeObserver(resizeCanvas)
      ro.observe(cont)

      // Grid after:render
      canvas.on('after:render', ({ ctx }: { ctx: CanvasRenderingContext2D }) => {
        drawGrid(ctx, canvas.viewportTransform ?? [1,0,0,1,0,0],
          canvas.getWidth(), canvas.getHeight(), gridSizeRef.current, showGridRef.current)
      })

      // Mausrad-Zoom
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.on('mouse:wheel', (opt: any) => {
        const e = opt.e as WheelEvent
        let z = canvas.getZoom()
        z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * (e.deltaY > 0 ? 0.94 : 1.06)))
        canvas.zoomToPoint(new Point(e.offsetX, e.offsetY), z)
        setZoom(z)
        e.preventDefault(); e.stopPropagation()
      })

      // Maus-Bewegung
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.on('mouse:move', (opt: any) => {
        const e = opt.e as MouseEvent
        const p = canvas.getPointer(e)
        setMousePos({ x: Math.round(p.x / SCALE * 100) / 100, y: Math.round(p.y / SCALE * 100) / 100 })

        if (isPanningRef.current) {
          const dx = e.clientX - lastPanPosRef.current.x
          const dy = e.clientY - lastPanPosRef.current.y
          canvas.relativePan(new Point(dx, dy))
          lastPanPosRef.current = { x: e.clientX, y: e.clientY }
          return
        }

        const tool = activeToolRef.current
        const grid = gridSizeRef.current
        const snapped = { x: Math.round(p.x / grid) * grid, y: Math.round(p.y / grid) * grid }

        if (tool === 'wall' && wallStartRef.current && wallPreviewRef.current) {
          wallPreviewRef.current.set({ x2: snapped.x, y2: snapped.y })
          canvas.requestRenderAll()
        }
        if (tool === 'measure' && measureStartRef.current && measurePreviewRef.current) {
          measurePreviewRef.current.set({ x2: snapped.x, y2: snapped.y })
          canvas.requestRenderAll()
        }
      })

      // Maus-Klick
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.on('mouse:down', (opt: any) => {
        const e = opt.e as MouseEvent
        const tool = activeToolRef.current

        if (isSpaceRef.current || e.button === 1) {
          isPanningRef.current = true
          lastPanPosRef.current = { x: e.clientX, y: e.clientY }
          canvas.selection = false
          canvas.setCursor('grabbing')
          canvas.discardActiveObject()
          canvas.requestRenderAll()
          return
        }

        const p = canvas.getPointer(e)
        const grid = gridSizeRef.current
        const snapped = { x: Math.round(p.x / grid) * grid, y: Math.round(p.y / grid) * grid }

        if (tool === 'wall') {
          if (e.detail === 2) {
            if (wallPreviewRef.current) { canvas.remove(wallPreviewRef.current); wallPreviewRef.current = null }
            wallStartRef.current = null
            setActiveTool('select'); activeToolRef.current = 'select'
            canvas.requestRenderAll(); return
          }
          if (!wallStartRef.current) {
            wallStartRef.current = snapped
            const prev = new Line([snapped.x, snapped.y, snapped.x, snapped.y], {
              stroke: '#445c49', strokeWidth: WALL_THICKNESS, strokeLineCap: 'square',
              selectable: false, evented: false, opacity: 0.45, data: { type: 'preview' },
            })
            wallPreviewRef.current = prev
            canvas.add(prev); canvas.requestRenderAll()
          } else {
            finishWall(snapped.x, snapped.y)
            wallStartRef.current = snapped
            const prev = new Line([snapped.x, snapped.y, snapped.x, snapped.y], {
              stroke: '#445c49', strokeWidth: WALL_THICKNESS, strokeLineCap: 'square',
              selectable: false, evented: false, opacity: 0.45, data: { type: 'preview' },
            })
            wallPreviewRef.current = prev
            canvas.add(prev); canvas.requestRenderAll()
          }
          return
        }

        if (tool === 'door') {
          placeDoor(snapped.x, snapped.y)
          setActiveTool('select'); activeToolRef.current = 'select'
          return
        }

        if (tool === 'window') {
          placeWindow(snapped.x, snapped.y)
          setActiveTool('select'); activeToolRef.current = 'select'
          return
        }

        if (tool === 'measure') {
          if (!measureStartRef.current) {
            measureStartRef.current = snapped
            const prev = new Line([snapped.x, snapped.y, snapped.x, snapped.y], {
              stroke: '#f59e0b', strokeWidth: 1.5, strokeDashArray: [5, 4],
              selectable: false, evented: false, data: { type: 'preview' },
            })
            measurePreviewRef.current = prev
            canvas.add(prev); canvas.requestRenderAll()
          } else {
            finishMeasure(snapped.x, snapped.y)
            setActiveTool('select'); activeToolRef.current = 'select'
          }
          return
        }

        if (tool === 'eraser') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const target = opt.target as any
          if (target && target.selectable !== false && target.data?.type !== 'outline') {
            canvas.remove(target)
            setSelectedProps(null)
            pushHistory(); triggerAutoSave()
            canvas.requestRenderAll()
          }
        }
      })

      canvas.on('mouse:up', () => {
        if (isPanningRef.current) {
          isPanningRef.current = false
          canvas.selection = activeToolRef.current === 'select'
          canvas.setCursor(activeToolRef.current === 'select' ? 'default' : 'crosshair')
        }
      })

      canvas.on('selection:created', (e: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const obj = e.selected?.[0]; if (obj) setSelectedProps(extractObjProps(obj))
      })
      canvas.on('selection:updated', (e: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const obj = e.selected?.[0]; if (obj) setSelectedProps(extractObjProps(obj))
      })
      canvas.on('selection:cleared', () => setSelectedProps(null))
      canvas.on('object:modified', () => { pushHistory(); triggerAutoSave() })

      // Drop Möbel
      const dropTarget = cont
      dropTarget.addEventListener('dragover', (e: DragEvent) => e.preventDefault())
      dropTarget.addEventListener('drop', (e: DragEvent) => {
        e.preventDefault()
        const symbolJson = e.dataTransfer?.getData('application/moebel-symbol')
        if (!symbolJson) return
        const symbol: MoebelSymbol = JSON.parse(symbolJson)
        const rect = cont.getBoundingClientRect()
        const p = canvas.getPointer({ offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top } as MouseEvent)
        placeMoebel(symbol, p.x, p.y)
      })

      // Canvas laden
      if (initialCanvasJson) {
        try {
          await canvas.loadFromJSON(JSON.parse(initialCanvasJson))
        } catch { /* ignore */ }
      }

      // Raum-Umriss (nur wenn noch kein outline im gespeicherten State)
      const b = breiteM, l = laengeM
      if (b && l) {
        const existing = canvas.getObjects().find((o: any) => o.data?.type === 'outline') // eslint-disable-line @typescript-eslint/no-explicit-any
        if (!existing) updateOutline(b, l)
        else { outlineRef.current = existing; canvas.sendObjectToBack(existing) }
      }

      canvas.requestRenderAll()
      pushHistory()

      // Lade-Screen ausblenden
      setLoading(false)

      // Tastatur
      function handleKeyDown(ev: KeyboardEvent) {
        const tag = (ev.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        if (ev.code === 'Space') { isSpaceRef.current = true; canvas.setCursor('grab'); ev.preventDefault() }
        if (ev.key === '?') { setShowShortcuts((v) => !v); return }
        if ((ev.key === 'Delete' || ev.key === 'Backspace') && !ev.repeat) {
          const obj = canvas.getActiveObject()
          if (obj && (obj as any).data?.type !== 'outline') { // eslint-disable-line @typescript-eslint/no-explicit-any
            canvas.remove(obj); setSelectedProps(null)
            pushHistory(); triggerAutoSave(); canvas.requestRenderAll()
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
          canvas.setCursor(activeToolRef.current === 'select' ? 'default' : 'crosshair')
        }
      }
      window.addEventListener('keydown', handleKeyDown)
      window.addEventListener('keyup', handleKeyUp)

      return () => {
        disposed = true
        window.removeEventListener('keydown', handleKeyDown)
        window.removeEventListener('keyup', handleKeyUp)
        ro.disconnect(); canvas.dispose()
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // switchTool als ref damit keyboard-handler nicht veraltet
  const switchToolRef = useRef<(t: Tool) => void>(() => {})

  function switchTool(tool: Tool) {
    setActiveTool(tool); activeToolRef.current = tool
    const canvas = fabricRef.current
    if (!canvas) return
    if (wallPreviewRef.current)    { canvas.remove(wallPreviewRef.current);    wallPreviewRef.current = null }
    if (measurePreviewRef.current) { canvas.remove(measurePreviewRef.current); measurePreviewRef.current = null }
    wallStartRef.current = null; measureStartRef.current = null
    canvas.selection = tool === 'select'
    canvas.setCursor(tool === 'select' ? 'default' : 'crosshair')
    if (tool !== 'select') canvas.discardActiveObject()
    canvas.requestRenderAll()
  }
  switchToolRef.current = switchTool

  function zoomIn() {
    const c = fabricRef.current; if (!c) return
    const z = Math.min(MAX_ZOOM, c.getZoom() * 1.2)
    c.zoomToPoint({ x: c.getWidth() / 2, y: c.getHeight() / 2 }, z); setZoom(z)
  }
  function zoomOut() {
    const c = fabricRef.current; if (!c) return
    const z = Math.max(MIN_ZOOM, c.getZoom() / 1.2)
    c.zoomToPoint({ x: c.getWidth() / 2, y: c.getHeight() / 2 }, z); setZoom(z)
  }
  function zoomReset() {
    const c = fabricRef.current; if (!c) return
    c.setViewportTransform([1,0,0,1,0,0]); setZoom(1); c.requestRenderAll()
  }

  function deleteSelected() {
    const c = fabricRef.current; if (!c) return
    const obj = c.getActiveObject()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!obj || (obj as any).data?.type === 'outline') return
    c.remove(obj); setSelectedProps(null)
    pushHistory(); triggerAutoSave(); c.requestRenderAll()
  }

  async function saveRaumMasse() {
    const b = parseFloat(raumBreite) || null
    const l = parseFloat(raumLaenge) || null
    const h = parseFloat(raumHoehe) || null
    await raumMasseAktualisieren(raumId, b, l, h, projektId)
    updateOutline(b, l)
  }

  const tools: { key: Tool; Icon: React.FC<{ className?: string }>; label: string; shortcut: string }[] = [
    { key: 'select',  Icon: MousePointer2, label: 'Auswahl',   shortcut: 'V' },
    { key: 'wall',    Icon: Pencil,        label: 'Wand',      shortcut: 'W' },
    { key: 'door',    Icon: DoorOpen,      label: 'Tür',       shortcut: 'D' },
    { key: 'window',  Icon: AppWindow,     label: 'Fenster',   shortcut: 'F' },
    { key: 'measure', Icon: Ruler,         label: 'Bemaßung',  shortcut: 'M' },
    { key: 'eraser',  Icon: Eraser,        label: 'Radierer',  shortcut: 'E' },
  ]

  const filteredMoebel = moebelSymbole.filter((s) =>
    s.name.toLowerCase().includes(moebelSuche.toLowerCase())
  )

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="flex flex-col bg-gray-950 text-gray-200" style={{ height: '100vh' }}>

      {/* Loading */}
      <LoadingScreen visible={loading} />

      {/* Shortcuts */}
      {showShortcuts && <ShortcutOverlay onClose={() => setShowShortcuts(false)} />}

      {/* ── Toolbar ── */}
      <div className="flex items-center h-10 px-2 bg-gray-900 border-b border-gray-800 shrink-0 gap-1">

        {/* Zurück */}
        <Link
          href={`/dashboard/projekte/${projektId}/raeume/${raumId}`}
          className="flex items-center gap-1 px-2 py-1 text-[11px] text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-md transition-colors"
        >
          <ChevronLeft className="w-3 h-3" /> {raumName}
        </Link>

        <div className="w-px h-5 bg-gray-800 mx-1" />

        {/* Tools */}
        <div className="flex items-center gap-0.5">
          {tools.map(({ key, Icon, label, shortcut }) => (
            <button
              key={key}
              type="button"
              title={`${label} (${shortcut})`}
              onClick={() => switchTool(key)}
              className={`relative flex items-center justify-center w-8 h-8 rounded-md transition-all ${
                activeTool === key
                  ? 'bg-wellbeing-green/20 text-wellbeing-green-light ring-1 ring-wellbeing-green/50'
                  : 'text-gray-500 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {activeTool === key && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-wellbeing-green" />
              )}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-gray-800 mx-1" />

        {/* Undo / Redo */}
        <button type="button" title="Rückgängig (Ctrl+Z)" onClick={undo}
          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded-md transition-colors">
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button type="button" title="Wiederholen (Ctrl+Y)" onClick={redo}
          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded-md transition-colors">
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-5 bg-gray-800 mx-1" />

        {/* Grid */}
        <button type="button" title="Raster" onClick={() => setShowGrid((g) => !g)}
          className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${showGrid ? 'text-wellbeing-green-light bg-wellbeing-green/15' : 'text-gray-600 hover:text-gray-300 hover:bg-gray-800'}`}>
          <Grid3x3 className="w-3.5 h-3.5" />
        </button>
        <select
          value={gridSize}
          onChange={(e) => setGridSize(Number(e.target.value) as GridOption)}
          className="text-[10px] bg-gray-800 border border-gray-700 text-gray-400 rounded-md px-1.5 py-1 focus:outline-none focus:border-wellbeing-green h-7"
        >
          <option value={10}>10cm</option>
          <option value={25}>25cm</option>
          <option value={50}>50cm</option>
          <option value={100}>1m</option>
        </select>

        <div className="flex-1" />

        {/* Zoom */}
        <button type="button" onClick={zoomOut}
          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded-md transition-colors">
          <Minus className="w-3 h-3" />
        </button>
        <button type="button" onClick={zoomReset}
          className="min-w-[44px] h-7 text-center text-[11px] text-gray-400 hover:text-gray-100 hover:bg-gray-800 rounded-md px-1.5 transition-colors font-mono">
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" onClick={zoomIn}
          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded-md transition-colors">
          <Plus className="w-3 h-3" />
        </button>

        <div className="w-px h-5 bg-gray-800 mx-1" />

        {/* Speichern */}
        <button type="button" onClick={saveNow}
          className={`flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-medium rounded-md transition-all ${
            saveStatus === 'saved'   ? 'text-gray-500 hover:text-gray-200 hover:bg-gray-800' :
            saveStatus === 'saving'  ? 'text-gray-600 cursor-wait' :
            'text-wellbeing-green-light bg-wellbeing-green/15 ring-1 ring-wellbeing-green/30 hover:bg-wellbeing-green/25'
          }`}>
          {saveStatus === 'saved'  ? <><CheckCircle className="w-3 h-3" /> Gespeichert</> :
           saveStatus === 'saving' ? <><Save className="w-3 h-3 animate-pulse" /> Speichern…</> :
                                     <><Save className="w-3 h-3" /> Speichern</>}
        </button>

        <button type="button" title="Tastaturkürzel (?)" onClick={() => setShowShortcuts(true)}
          className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-gray-300 hover:bg-gray-800 rounded-md transition-colors">
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Hauptbereich ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Linke Sidebar ── */}
        <div className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col overflow-hidden shrink-0">
          {/* Suche */}
          <div className="px-2 py-2 border-b border-gray-800">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-600" />
              <input
                type="text"
                placeholder="Möbel suchen…"
                value={moebelSuche}
                onChange={(e) => setMoebelSuche(e.target.value)}
                className="w-full bg-gray-800 border border-gray-750 text-gray-300 text-[11px] rounded-md pl-7 pr-2 py-1.5 placeholder-gray-600 focus:outline-none focus:border-wellbeing-green/60 focus:ring-1 focus:ring-wellbeing-green/20"
              />
            </div>
          </div>

          {/* Möbel */}
          <div className="flex-1 overflow-y-auto px-2 py-2">
            <p className="text-[9px] text-gray-600 uppercase tracking-wider font-semibold px-1 mb-2">
              Bibliothek · {filteredMoebel.length}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {filteredMoebel.map((symbol) => (
                <div
                  key={symbol.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/moebel-symbol', JSON.stringify(symbol))
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  onClick={() => {
                    const canvas = fabricRef.current; if (!canvas) return
                    const vpt = canvas.viewportTransform ?? [1,0,0,1,0,0]
                    const px = (canvas.getWidth() / 2 - vpt[4]) / vpt[0]
                    const py = (canvas.getHeight() / 2 - vpt[5]) / vpt[3]
                    placeMoebel(symbol, px, py)
                  }}
                  className="group bg-gray-850 hover:bg-gray-800 border border-gray-750 hover:border-wellbeing-green/40 rounded-lg p-1.5 cursor-grab active:cursor-grabbing transition-all select-none"
                  title={`${symbol.name} – ${symbol.breite_cm}×${symbol.tiefe_cm}cm`}
                >
                  {/* SVG Preview */}
                  <div className="w-full bg-white/5 rounded-md mb-1.5 overflow-hidden flex items-center justify-center p-1" style={{ minHeight: 36 }}>
                    <MoebelPreview symbol={symbol} />
                  </div>
                  <p className="text-[10px] text-gray-400 group-hover:text-gray-200 font-medium leading-tight truncate transition-colors">
                    {symbol.name}
                  </p>
                  <p className="text-[9px] text-gray-600 leading-tight">
                    {symbol.breite_cm}×{symbol.tiefe_cm}cm
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Canvas ── */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-gray-300"
          style={{ cursor: activeTool === 'select' ? 'default' : 'crosshair' }}
        >
          {/* Subtiler Schatten um den Canvas-Bereich */}
          <div className="absolute inset-4 pointer-events-none rounded shadow-[0_0_40px_rgba(0,0,0,0.4)] z-0" />
          <canvas ref={canvasRef} className="absolute inset-0 z-10" />
        </div>

        {/* ── Rechte Sidebar ── */}
        <div className="w-60 bg-gray-900 border-l border-gray-800 flex flex-col overflow-hidden shrink-0">
          <div className="flex-1 overflow-y-auto">

            {selectedProps ? (
              /* ── Objekt-Eigenschaften ── */
              <div>
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-800">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                      {selectedProps.objType === 'wall' ? 'Wand' :
                       selectedProps.objType === 'door' ? 'Tür' :
                       selectedProps.objType === 'window' ? 'Fenster' :
                       selectedProps.objType === 'measure' ? 'Bemaßung' :
                       selectedProps.objType === 'moebel' ? 'Möbel' : 'Objekt'}
                    </p>
                    <p className="text-xs font-medium text-gray-200 truncate max-w-[140px]">
                      {selectedProps.name || '–'}
                    </p>
                  </div>
                  <button type="button" onClick={deleteSelected}
                    className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-gray-800 rounded-md transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Position */}
                <div className="px-3 py-3 border-b border-gray-800">
                  <p className="text-[9px] text-gray-600 uppercase tracking-wider font-semibold mb-2">Position</p>
                  <div className="grid grid-cols-2 gap-2">
                    <PropField label="X" value={`${selectedProps.x} px`} />
                    <PropField label="Y" value={`${selectedProps.y} px`} />
                  </div>
                </div>

                {/* Größe */}
                <div className="px-3 py-3 border-b border-gray-800">
                  <p className="text-[9px] text-gray-600 uppercase tracking-wider font-semibold mb-2">Größe</p>
                  <div className="grid grid-cols-2 gap-2">
                    <PropField label="Breite" value={`${Math.round(selectedProps.w)} px`} />
                    <PropField label="Tiefe" value={`${Math.round(selectedProps.h)} px`} />
                  </div>
                </div>

                {/* Rotation */}
                <div className="px-3 py-3 border-b border-gray-800">
                  <p className="text-[9px] text-gray-600 uppercase tracking-wider font-semibold mb-2">Rotation</p>
                  <PropField label="Winkel" value={`${selectedProps.angle}°`} />
                </div>

                {/* Tool-spezifisch: Tür/Fenster Breite */}
                {(selectedProps.objType === 'door') && (
                  <div className="px-3 py-3 border-b border-gray-800">
                    <p className="text-[9px] text-gray-600 uppercase tracking-wider font-semibold mb-2">Tür-Breite</p>
                    <select
                      value={doorWidth}
                      onChange={(e) => setDoorWidth(Number(e.target.value))}
                      className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:border-wellbeing-green"
                    >
                      {[60,70,80,90,100].map(v => <option key={v} value={v}>{v} cm</option>)}
                    </select>
                  </div>
                )}
                {(selectedProps.objType === 'window') && (
                  <div className="px-3 py-3 border-b border-gray-800">
                    <p className="text-[9px] text-gray-600 uppercase tracking-wider font-semibold mb-2">Fenster-Breite</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={windowWidth}
                        onChange={(e) => setWindowWidth(Number(e.target.value))}
                        min={60} max={300} step={10}
                        className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:border-wellbeing-green"
                      />
                      <span className="text-[10px] text-gray-500 shrink-0">cm</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ── Raum-Eigenschaften ── */
              <div>
                <div className="px-3 py-2.5 border-b border-gray-800">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Kein Objekt gewählt</p>
                  <p className="text-xs font-medium text-gray-200">Raum-Einstellungen</p>
                </div>

                <div className="px-3 py-3 border-b border-gray-800">
                  <p className="text-[9px] text-gray-600 uppercase tracking-wider font-semibold mb-3">Raummaße</p>
                  <div className="space-y-2.5">
                    {[
                      { label: 'Breite (m)', val: raumBreite, set: setRaumBreite },
                      { label: 'Länge (m)',  val: raumLaenge, set: setRaumLaenge },
                      { label: 'Höhe (m)',   val: raumHoehe,  set: setRaumHoehe },
                    ].map(({ label, val, set }) => (
                      <div key={label}>
                        <label className="text-[10px] text-gray-500 block mb-1">{label}</label>
                        <input
                          type="number" step="0.1" min="0.5" max="50"
                          value={val}
                          onChange={(e) => set(e.target.value)}
                          onBlur={saveRaumMasse}
                          className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-wellbeing-green/60 focus:ring-1 focus:ring-wellbeing-green/20"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="px-3 py-3">
                  <p className="text-[9px] text-gray-600 uppercase tracking-wider font-semibold mb-2">Tür / Fenster</p>
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">Standard Tür-Breite</label>
                      <select value={doorWidth} onChange={(e) => setDoorWidth(Number(e.target.value))}
                        className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-wellbeing-green/60">
                        {[60,70,80,90,100].map(v => <option key={v} value={v}>{v} cm</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">Standard Fenster-Breite</label>
                      <div className="flex items-center gap-2">
                        <input type="number" value={windowWidth} min={60} max={300} step={10}
                          onChange={(e) => setWindowWidth(Number(e.target.value))}
                          className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-wellbeing-green/60" />
                        <span className="text-[10px] text-gray-500 shrink-0">cm</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-3 py-3 border-t border-gray-800">
                  <p className="text-[9px] text-gray-600 leading-relaxed">
                    Klicke ein Möbel an oder ziehe es auf die Fläche.<br />
                    <span className="text-gray-700">? = Shortcuts · Space+Drag = Pan</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Status-Bar ── */}
      <div className="flex items-center justify-between px-4 py-1 bg-gray-900 border-t border-gray-800 shrink-0 h-7">
        <div className="flex items-center gap-4 text-[10px] text-gray-600 font-mono">
          <span>X {mousePos.x.toFixed(2)} m</span>
          <span>Y {mousePos.y.toFixed(2)} m</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-gray-600">
          <span>1m = {SCALE}px</span>
          <span className={
            activeTool === 'wall'    ? 'text-amber-500' :
            activeTool === 'eraser'  ? 'text-red-400' :
            activeTool === 'door'    ? 'text-blue-400' :
            activeTool === 'window'  ? 'text-sky-400' :
            activeTool === 'measure' ? 'text-amber-400' :
            'text-wellbeing-green-light'
          }>
            {tools.find(t => t.key === activeTool)?.label}
          </span>
          <span className="text-gray-700">{Math.round(zoom * 100)}%</span>
        </div>
      </div>
    </div>
  )
}

// ── PropField ─────────────────────────────────────────────────

function PropField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] text-gray-600 mb-0.5">{label}</p>
      <div className="bg-gray-800 border border-gray-750 text-gray-400 text-[11px] rounded-md px-2 py-1 font-mono truncate">
        {value}
      </div>
    </div>
  )
}
