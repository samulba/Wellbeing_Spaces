'use client'

/**
 * MoodboardEditor – Fabric.js Canvas mit unbegrenztem Workspace.
 *
 * Schritt 2 (dieser Commit): Canvas + Zoom/Pan + Basis-Toolbar (Select/Text/Rect/Circle/
 * Bild-Upload/Delete/Undo-Redo) + AutoSave alle 3s.
 * Folgeschritte: Sidebars (Produkte/Farben), Versionen, Freigabe, Export.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, MousePointer2, Type as TypeIcon, Square, Circle as CircleIcon,
  Image as ImageIcon, Trash2, Undo2, Redo2, Save, Maximize2,
  Search, Package, Palette, Upload, History, Download, X, Plus,
  RotateCcw, Share2, Copy, Check, MessageCircle, Link as LinkIcon,
  StickyNote, Loader2, Magnet, AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  Lock, Unlock, BoxSelect, Layers, MessageSquare, FileText, Presentation, Minimize2,
  Clock, Grid3X3, ChevronUp, ChevronDown,
} from 'lucide-react'
import QRCode from 'react-qr-code'
import {
  moodboardSpeichern, moodboardBildHochladen,
  moodboardVersionSpeichern, getMoodboardVersionen,
  moodboardVersionLoeschen, moodboardVersionWiederherstellen,
  moodboardFreigabeAktualisieren,
  moodboardStatusAendern,
  getMoodboardKommentare, moodboardKommentarAnlegen,
  moodboardKommentarAntworten, moodboardKommentarErledigen,
  moodboardKommentarLoeschen,
} from '@/app/actions/moodboard'
import type { MoodboardVersion, MoodboardKommentar, MoodboardStatus } from '@/lib/supabase/types'
import MoodboardWelcome from './MoodboardWelcome'
import MoodboardLayers from './MoodboardLayers'
import MoodboardPinOverlay from './MoodboardPinOverlay'
import MoodboardMarkierungOverlay from './MoodboardMarkierungOverlay'
import MoodboardGridLayer from './MoodboardGridLayer'
import MoodboardErrorBoundary from './MoodboardErrorBoundary'
import type { MoodboardTemplate } from '@/lib/moodboard-templates'

interface Props {
  moodboardId: string
  raumId: string
  projektId: string
  raumName: string
  boardName: string
  beschreibung: string | null
  initialCanvasJson: Record<string, unknown> | null
  freigabeAktiv: boolean
  freigabeKommentareAktiv: boolean
  freigabeToken: string | null
  freigabePasswortGesetzt?: boolean
  freigabeAblauf?: string | null
  status?: MoodboardStatus
  produkte: Array<{
    id: string
    name: string
    kategorie: string | null
    bild_url: string | null
    verkaufspreis: number | null
  }>
}

type Tool = 'select' | 'text' | 'rect' | 'circle' | 'note' | 'comment'

// Voting-/Markierungs-Optionen pro Element
type Markierung = 'favorit' | 'gefaellt' | 'passt_nicht' | 'final' | 'unsicher'
const MARKIERUNGEN: Array<{ id: Markierung; emoji: string; label: string; farbe: string; bg: string }> = [
  { id: 'favorit',     emoji: '⭐', label: 'Favorit',     farbe: '#d97706', bg: '#fef3c7' },
  { id: 'gefaellt',    emoji: '👍', label: 'Gefällt mir', farbe: '#059669', bg: '#dcfce7' },
  { id: 'passt_nicht', emoji: '👎', label: 'Passt nicht', farbe: '#dc2626', bg: '#fee2e2' },
  { id: 'final',       emoji: '✅', label: 'Final',       farbe: '#0d9488', bg: '#ccfbf1' },
  { id: 'unsicher',    emoji: '❓', label: 'Unsicher',    farbe: '#9333ea', bg: '#f3e8ff' },
]

// Sticky-Note Farben (Pastell)
const NOTE_FARBEN = [
  { bg: '#fef3c7', border: '#fbbf24', label: 'Gelb' },
  { bg: '#fef2f2', border: '#fb7185', label: 'Rosa' },
  { bg: '#dcfce7', border: '#34d399', label: 'Grün' },
  { bg: '#dbeafe', border: '#60a5fa', label: 'Blau' },
  { bg: '#f6ede2', border: '#cba178', label: 'Cream' },
]

const MIN_ZOOM = 0.1
const MAX_ZOOM = 5

// ── Color-Palette (Designer-Standards + Wellbeing-Farben) ──────
const COLOR_PALETTE = [
  // Wellbeing
  '#445c49', '#94c1a4', '#2d3e31', '#f6ede2', '#823509', '#cba178',
  // Neutrals
  '#ffffff', '#f5f5f0', '#e5e7eb', '#9ca3af', '#374151', '#000000',
  // Wood/Earth
  '#8b6f47', '#a78b66', '#6b4423', '#3e2c1a', '#d4b896', '#bea27e',
  // Pastels
  '#fde2e4', '#fad2e1', '#cddafd', '#a3c9a8', '#dcedc1', '#ffd8be',
  // Bolds
  '#1e3a5f', '#7d3c98', '#c0392b', '#d35400', '#16a085', '#2c3e50',
]

// Status-Konfiguration (Workflow-Phasen)
const STATUS_CONFIG: Record<MoodboardStatus, { label: string; dot: string; bg: string; text: string }> = {
  entwurf:     { label: 'Entwurf',       dot: '#9ca3af', bg: 'bg-gray-100',     text: 'text-gray-700' },
  abstimmung:  { label: 'In Abstimmung', dot: '#f59e0b', bg: 'bg-amber-100',    text: 'text-amber-800' },
  freigegeben: { label: 'Freigegeben',   dot: '#059669', bg: 'bg-emerald-100',  text: 'text-emerald-800' },
  archiviert:  { label: 'Archiviert',    dot: '#6b7280', bg: 'bg-slate-200',    text: 'text-slate-600' },
}

export default function MoodboardEditor({
  moodboardId, raumId, projektId, raumName, boardName,
  initialCanvasJson, produkte,
  freigabeAktiv: initialFreigabeAktiv,
  freigabeKommentareAktiv: initialFreigabeKommentareAktiv,
  freigabeToken,
  freigabePasswortGesetzt = false,
  freigabeAblauf: initialAblauf = null,
  status: initialStatus = 'entwurf',
}: Props) {
  const canvasElRef    = useRef<HTMLCanvasElement | null>(null)
  const containerRef   = useRef<HTMLDivElement | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fabricRef      = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fabricImportRef = useRef<any>(null)
  const fileInputRef   = useRef<HTMLInputElement | null>(null)
  const undoStackRef   = useRef<string[]>([])
  const redoStackRef   = useRef<string[]>([])
  const skipHistoryRef = useRef(false)
  const initialLoadedRef = useRef(false)

  const [tool, setTool] = useState<Tool>('select')
  const toolRef = useRef<Tool>('select')
  useEffect(() => { toolRef.current = tool }, [tool])

  const [zoom, setZoom] = useState(1)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [uploading, setUploading] = useState(false)
  // istLeer initial aus initialCanvasJson ableiten — verhindert Welcome-Flash beim Laden
  const [istLeer, setIstLeer] = useState(() => {
    if (!initialCanvasJson) return true
    const objs = (initialCanvasJson as { objects?: unknown }).objects
    return !Array.isArray(objs) || objs.length === 0
  })
  // Hint geschlossen: bei vorhandenem Inhalt sofort, sonst false (zeigt Welcome)
  const [hintGeschlossen, setHintGeschlossen] = useState(() => {
    if (!initialCanvasJson) return false
    const objs = (initialCanvasJson as { objects?: unknown }).objects
    return Array.isArray(objs) && objs.length > 0
  })
  const [raumAlertMsg, setRaumAlertMsg] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  // Link-Modal
  const [linkOffen, setLinkOffen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkLaedt, setLinkLaedt] = useState(false)
  const [linkFehler, setLinkFehler] = useState<string | null>(null)

  // Sticky-Note Farb-Picker
  const [notePickerOffen, setNotePickerOffen] = useState(false)

  // Layer-Panel
  const [layerPanelOffen, setLayerPanelOffen] = useState(false)
  const [layerReloadKey, setLayerReloadKey] = useState(0)

  // Kommentar-Pins
  const [pins, setPins] = useState<MoodboardKommentar[]>([])
  const [pinsRefreshKey, setPinsRefreshKey] = useState(0)
  const [aktiverPinId, setAktiverPinId] = useState<string | null>(null)
  const [pinEntwurf, setPinEntwurf] = useState<{ x: number; y: number } | null>(null)
  const [pinEntwurfText, setPinEntwurfText] = useState('')
  // Re-Render bei Viewport-Aenderung damit Pins korrekt mitfliegen
  const [viewportTick, setViewportTick] = useState(0)
  const viewportPendingRef = useRef(false)

  // Presentation-Mode (Vollbild ohne UI)
  const [presentationMode, setPresentationMode] = useState(false)

  // Workflow-Status
  const [status, setStatus] = useState<MoodboardStatus>(initialStatus)
  const [statusDropdownOffen, setStatusDropdownOffen] = useState(false)

  async function handleStatusAendern(neu: MoodboardStatus) {
    setStatusDropdownOffen(false)
    if (neu === status) return
    const r = await moodboardStatusAendern(moodboardId, neu)
    if (r.fehler) { setRaumAlertMsg(r.fehler); return }
    setStatus(neu)
    setRaumAlertMsg(`Status: ${STATUS_CONFIG[neu].label}`)
  }

  // Snap & Smart-Guides
  const [snapToGrid, setSnapToGrid] = useState(false)
  const snapToGridRef = useRef(false)
  useEffect(() => { snapToGridRef.current = snapToGrid }, [snapToGrid])
  const [snapEnabled, setSnapEnabled] = useState(true)
  const snapEnabledRef = useRef(true)
  useEffect(() => { snapEnabledRef.current = snapEnabled }, [snapEnabled])

  // Sichtbares Grid (0 = aus, sonst Pixel-Groesse)
  const [gridSize, setGridSize] = useState(0)
  const [gridDropdownOffen, setGridDropdownOffen] = useState(false)

  // ESC verlässt Presentation-Mode
  useEffect(() => {
    if (!presentationMode) return
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setPresentationMode(false)
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [presentationMode])

  // Pins laden
  useEffect(() => {
    let cancelled = false
    getMoodboardKommentare(moodboardId).then((k) => {
      if (!cancelled) setPins(k)
    })
    return () => { cancelled = true }
  }, [moodboardId, pinsRefreshKey])

  // Toast nach 3.5s automatisch ausblenden
  useEffect(() => {
    if (!raumAlertMsg) return
    const t = setTimeout(() => setRaumAlertMsg(null), 3500)
    return () => clearTimeout(t)
  }, [raumAlertMsg])

  // Aktiv ausgewaehltes Objekt fuer Eigenschaften-Panel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activeObj, setActiveObj] = useState<any>(null)
  const [objVersion, setObjVersion] = useState(0)
  const bumpObjVersion = useCallback(() => setObjVersion((v) => v + 1), [])

  // Freigabe-Modal
  const [freigabeOffen, setFreigabeOffen] = useState(false)
  const [freigabeAktiv, setFreigabeAktiv] = useState(initialFreigabeAktiv)
  const [freigabeKommentare, setFreigabeKommentare] = useState(initialFreigabeKommentareAktiv)
  const [freigabeSaving, setFreigabeSaving] = useState(false)
  const [linkKopiert, setLinkKopiert] = useState(false)
  // Erweiterte Freigabe-Optionen (Step 8)
  const [passwortGesetzt, setPasswortGesetzt] = useState(freigabePasswortGesetzt)
  const [neuesPasswort, setNeuesPasswort] = useState('')
  const [ablauf, setAblauf] = useState<string | null>(initialAblauf)

  // Versionen-Modal
  const [versionenOffen, setVersionenOffen] = useState(false)
  const [versionen, setVersionen] = useState<MoodboardVersion[]>([])
  const [versionenLaden, setVersionenLaden] = useState(false)
  const [neueVersionName, setNeueVersionName] = useState('')
  const [neueVersionBeschr, setNeueVersionBeschr] = useState('')
  const [versionSaving, setVersionSaving] = useState(false)
  const [versionFehler, setVersionFehler] = useState<string | null>(null)

  // Linke Sidebar: aktiver Tab + Suche
  const [sidebarTab, setSidebarTab] = useState<'produkte' | 'farben' | 'upload'>('produkte')
  const [produktSuche, setProduktSuche] = useState('')
  const produkteGefiltert = useMemo(() => {
    const q = produktSuche.trim().toLowerCase()
    if (!q) return produkte
    return produkte.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.kategorie && p.kategorie.toLowerCase().includes(q)),
    )
  }, [produkte, produktSuche])

  // ── AutoSave (debounced 3s) ───────────────────────────────────
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSaveStatus('saving')
    saveTimerRef.current = setTimeout(async () => {
      const canvas = fabricRef.current
      if (!canvas) return
      const json = (canvas as unknown as { toJSON: (props?: string[]) => Record<string, unknown> }).toJSON(['data']) as Record<string, unknown>
      const r = await moodboardSpeichern(moodboardId, json)
      setSaveStatus(r.fehler ? 'error' : 'saved')
      if (!r.fehler) setTimeout(() => setSaveStatus('idle'), 1200)
    }, 3000)
  }, [moodboardId])

  // ── History ────────────────────────────────────────────────────
  const pushHistory = useCallback(() => {
    if (skipHistoryRef.current) return
    const canvas = fabricRef.current
    if (!canvas) return
    const json = JSON.stringify((canvas as unknown as { toJSON: (props?: string[]) => Record<string, unknown> }).toJSON(['data']))
    undoStackRef.current.push(json)
    if (undoStackRef.current.length > 50) undoStackRef.current.shift()
    redoStackRef.current = []
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function loadFromJson(canvas: any, jsonStr: string) {
    skipHistoryRef.current = true
    canvas.loadFromJSON(jsonStr, () => {
      canvas.requestRenderAll()
      skipHistoryRef.current = false
    })
  }

  function handleUndo() {
    const canvas = fabricRef.current
    if (!canvas || undoStackRef.current.length < 2) return
    const cur = undoStackRef.current.pop()!
    redoStackRef.current.push(cur)
    const prev = undoStackRef.current[undoStackRef.current.length - 1]
    loadFromJson(canvas, prev)
    scheduleSave()
  }
  function handleRedo() {
    const canvas = fabricRef.current
    if (!canvas || redoStackRef.current.length === 0) return
    const next = redoStackRef.current.pop()!
    undoStackRef.current.push(next)
    loadFromJson(canvas, next)
    scheduleSave()
  }

  // ── Canvas Init ────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasElRef.current || !containerRef.current) return
    let disposed = false

    import('fabric').then((fabric) => {
      if (disposed || !canvasElRef.current) return
      fabricImportRef.current = fabric
      const { Canvas, Point } = fabric
      const cont = containerRef.current!

      const canvas = new Canvas(canvasElRef.current!, {
        selection: true,
        preserveObjectStacking: true,
        stopContextMenu: true,
        fireRightClick: true,
        // Container haelt den BG-Color, Canvas selbst transparent damit Grid sichtbar wird
        backgroundColor: 'transparent',
      })
      fabricRef.current = canvas
      canvas.selectionColor       = 'rgba(68,92,73,0.08)'
      canvas.selectionBorderColor = '#445c49'
      canvas.selectionLineWidth   = 1.5
      // Cursor auf leerem Canvas zeigt Hand → User weiss er kann pannen
      canvas.defaultCursor = 'grab'
      canvas.hoverCursor   = 'move'

      function resize() {
        canvas.setWidth(cont.clientWidth)
        canvas.setHeight(cont.clientHeight)
        canvas.requestRenderAll()
      }
      resize()
      const ro = new ResizeObserver(resize); ro.observe(cont)

      // ── ZOOM (Mausrad + Pinch) ────────────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.on('mouse:wheel', (opt: any) => {
        const e = opt.e as WheelEvent
        e.preventDefault(); e.stopPropagation()
        let z = canvas.getZoom()
        if (e.ctrlKey || e.metaKey) {
          z *= 0.99 ** e.deltaY
        } else {
          z *= 0.999 ** e.deltaY
        }
        z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))
        canvas.zoomToPoint(new Point(e.offsetX, e.offsetY), z)
        setZoom(Math.round(z * 100) / 100)
      })

      // ── PAN: Mittlere Maustaste oder Space+Drag ───────────────
      let isPanning = false
      let lastX = 0, lastY = 0
      let spaceDown = false

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.on('mouse:down', (opt: any) => {
        const e = opt.e as MouseEvent
        if (e.button === 1 || (spaceDown && e.button === 0)) {
          isPanning = true
          canvas.selection = false
          lastX = e.clientX; lastY = e.clientY
          cont.style.cursor = 'grabbing'
          return
        }

        // NEU: Linksklick auf LEEREN Bereich im Select-Mode → pannen
        // (Standardverhalten in Miro / Figma / Apple Freeform)
        const t = toolRef.current
        if (t === 'select' && e.button === 0 && !opt.target) {
          isPanning = true
          canvas.selection = false
          lastX = e.clientX; lastY = e.clientY
          cont.style.cursor = 'grabbing'
          return
        }

        // Tool-spezifische Aktionen (anderer Tool als select)
        if (t === 'rect' || t === 'circle' || t === 'text') {
          const p = canvas.getPointer(e)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let obj: any = null
          if (t === 'rect') {
            obj = new fabric.Rect({
              left: p.x - 60, top: p.y - 40,
              width: 120, height: 80,
              fill: '#94c1a4', stroke: '#445c49', strokeWidth: 1,
              rx: 4, ry: 4,
            })
          } else if (t === 'circle') {
            obj = new fabric.Circle({
              left: p.x - 50, top: p.y - 50,
              radius: 50,
              fill: '#cba178', stroke: '#823509', strokeWidth: 1,
            })
          } else if (t === 'text') {
            obj = new fabric.IText('Doppelklick zum Bearbeiten', {
              left: p.x, top: p.y,
              fontSize: 24, fill: '#2d3e31', fontFamily: 'Inter, sans-serif',
            })
          }
          if (obj) {
            canvas.add(obj)
            canvas.setActiveObject(obj)
            canvas.requestRenderAll()
            setTool('select')
            pushHistory()
            scheduleSave()
          }
        }

        // Pin-Tool: Klick aufs Canvas oeffnet einen Pin-Entwurf
        if (t === 'comment') {
          const p = canvas.getPointer(e)
          setPinEntwurf({ x: p.x, y: p.y })
          setPinEntwurfText('')
          setAktiverPinId(null)
        }
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.on('mouse:move', (opt: any) => {
        if (!isPanning) return
        const e = opt.e as MouseEvent
        const dx = e.clientX - lastX
        const dy = e.clientY - lastY
        canvas.relativePan(new Point(dx, dy))
        lastX = e.clientX; lastY = e.clientY
      })

      canvas.on('mouse:up', () => {
        if (isPanning) {
          isPanning = false
          canvas.selection = true
          cont.style.cursor = 'grab'
        }
      })

      // ── Keyboard ───────────────────────────────────────────────
      function onKeyDown(e: KeyboardEvent) {
        if (e.code === 'Space') { spaceDown = true; cont.style.cursor = 'grab'; return }
        const target = e.target as HTMLElement
        if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return
        if (e.key === 'Delete' || e.key === 'Backspace') {
          const active = canvas.getActiveObjects()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const activeObj = canvas.getActiveObject() as any
          if (active.length > 0 && !activeObj?.isEditing) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            active.forEach((o: any) => canvas.remove(o))
            canvas.discardActiveObject()
            canvas.requestRenderAll()
            pushHistory()
            scheduleSave()
            e.preventDefault()
          }
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo() }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); handleRedo() }
      }
      function onKeyUp(e: KeyboardEvent) {
        if (e.code === 'Space') { spaceDown = false; cont.style.cursor = 'default' }
      }
      window.addEventListener('keydown', onKeyDown)
      window.addEventListener('keyup', onKeyUp)

      // ── Object-Events fuer History + AutoSave ─────────────────
      function updateLeer() {
        setIstLeer(canvas.getObjects().length === 0)
      }
      canvas.on('object:modified', () => { pushHistory(); scheduleSave(); bumpObjVersion(); setLayerReloadKey((k) => k + 1) })
      canvas.on('object:added',    () => { if (!skipHistoryRef.current) { pushHistory(); scheduleSave() } updateLeer(); setLayerReloadKey((k) => k + 1) })
      canvas.on('object:removed',  () => { if (!skipHistoryRef.current) { pushHistory(); scheduleSave() } updateLeer(); setLayerReloadKey((k) => k + 1) })

      // ── Selection-Events fuer rechte Sidebar ─────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.on('selection:created', (e: any) => setActiveObj(e.selected?.[0] ?? canvas.getActiveObject() ?? null))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.on('selection:updated', (e: any) => setActiveObj(e.selected?.[0] ?? canvas.getActiveObject() ?? null))
      canvas.on('selection:cleared', () => setActiveObj(null))
      // Viewport-Aenderung → Pins neu positionieren
      canvas.on('after:render', () => {
        // Throttle ueber rAF damit wir nicht jeden Frame ein Re-Render triggern
        if (!viewportPendingRef.current) {
          viewportPendingRef.current = true
          requestAnimationFrame(() => {
            viewportPendingRef.current = false
            setViewportTick((t) => t + 1)
          })
        }
      })
      canvas.on('object:scaling',  () => bumpObjVersion())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.on('object:moving',   (opt: any) => {
        bumpObjVersion()
        handleSnapAndGuides(opt)
      })
      canvas.on('object:rotating', () => bumpObjVersion())
      // Smart-Guides nach dem Move ausblenden
      canvas.on('mouse:up', () => {
        clearSmartGuides()
      })

      // ── Smart-Guides + Snap-Logik ─────────────────────────────
      const SMART_GUIDE_KEY = 'smart_guide'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function clearSmartGuides() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lines = canvas.getObjects().filter((o: any) => o?.data?.type === SMART_GUIDE_KEY)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lines.forEach((l: any) => canvas.remove(l))
        if (lines.length > 0) canvas.requestRenderAll()
      }
      function drawSmartLine(x1: number, y1: number, x2: number, y2: number) {
        const line = new fabric.Line([x1, y1, x2, y2], {
          stroke: '#ef4444',
          strokeWidth: 1,
          strokeDashArray: [4, 3],
          selectable: false,
          evented: false,
          excludeFromExport: true,
          objectCaching: false,
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(line as any).data = { type: SMART_GUIDE_KEY }
        canvas.add(line)
        // Nach vorne bringen
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        canvas.bringObjectToFront(line as any)
      }
      const SNAP_TOLERANCE = 6
      const GRID_SIZE = 20
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function handleSnapAndGuides(opt: any) {
        clearSmartGuides()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const obj = opt.target as any
        if (!obj) return

        // Snap-to-Grid
        if (snapToGridRef.current) {
          obj.left = Math.round(obj.left / GRID_SIZE) * GRID_SIZE
          obj.top  = Math.round(obj.top  / GRID_SIZE) * GRID_SIZE
        }

        if (!snapEnabledRef.current) return

        // Bounding-Box des aktiven Objekts (Welt-Koordinaten)
        const objR = obj.getBoundingRect()
        const objL = objR.left,            objT = objR.top
        const objR2 = objL + objR.width,   objB = objT + objR.height
        const objCx = objL + objR.width/2, objCy = objT + objR.height/2

        // Alle anderen Objekte (ohne self, ohne Guides)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const others = canvas.getObjects().filter((o: any) =>
          o !== obj && o?.data?.type !== SMART_GUIDE_KEY,
        )

        let bestDxAdjust: number | null = null
        let bestDxLine: { x: number; y1: number; y2: number } | null = null
        let bestDyAdjust: number | null = null
        let bestDyLine: { y: number; x1: number; x2: number } | null = null

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const o of others) {
          const r = o.getBoundingRect()
          const oL = r.left,           oT = r.top
          const oR = oL + r.width,     oB = oT + r.height
          const oCx = oL + r.width/2,  oCy = oT + r.height/2

          // Vertikale Linien (X-Snap): left/center/right zu left/center/right
          const xCandidates: Array<[number, number]> = [
            [objL, oL], [objL, oCx], [objL, oR],
            [objCx, oL], [objCx, oCx], [objCx, oR],
            [objR2, oL], [objR2, oCx], [objR2, oR],
          ]
          for (const [a, b] of xCandidates) {
            const diff = b - a
            if (Math.abs(diff) < SNAP_TOLERANCE) {
              if (bestDxAdjust === null || Math.abs(diff) < Math.abs(bestDxAdjust)) {
                bestDxAdjust = diff
                bestDxLine = {
                  x: b,
                  y1: Math.min(objT, oT) - 12,
                  y2: Math.max(objB, oB) + 12,
                }
              }
            }
          }

          // Horizontale Linien (Y-Snap)
          const yCandidates: Array<[number, number]> = [
            [objT, oT], [objT, oCy], [objT, oB],
            [objCy, oT], [objCy, oCy], [objCy, oB],
            [objB, oT], [objB, oCy], [objB, oB],
          ]
          for (const [a, b] of yCandidates) {
            const diff = b - a
            if (Math.abs(diff) < SNAP_TOLERANCE) {
              if (bestDyAdjust === null || Math.abs(diff) < Math.abs(bestDyAdjust)) {
                bestDyAdjust = diff
                bestDyLine = {
                  y: b,
                  x1: Math.min(objL, oL) - 12,
                  x2: Math.max(objR2, oR) + 12,
                }
              }
            }
          }
        }

        if (bestDxAdjust !== null) {
          obj.left = obj.left + bestDxAdjust
          if (bestDxLine) drawSmartLine(bestDxLine.x, bestDxLine.y1, bestDxLine.x, bestDxLine.y2)
        }
        if (bestDyAdjust !== null) {
          obj.top = obj.top + bestDyAdjust
          if (bestDyLine) drawSmartLine(bestDyLine.x1, bestDyLine.y, bestDyLine.x2, bestDyLine.y)
        }
        obj.setCoords()
      }

      // Initial-State laden
      if (initialCanvasJson && Object.keys(initialCanvasJson).length > 0) {
        skipHistoryRef.current = true
        canvas.loadFromJSON(initialCanvasJson, () => {
          canvas.requestRenderAll()
          skipHistoryRef.current = false
          // Initial-Snapshot fuer Undo-Stack
          undoStackRef.current.push(JSON.stringify((canvas as unknown as { toJSON: (props?: string[]) => Record<string, unknown> }).toJSON(['data'])))
          initialLoadedRef.current = true
          updateLeer()
        })
      } else {
        undoStackRef.current.push(JSON.stringify((canvas as unknown as { toJSON: (props?: string[]) => Record<string, unknown> }).toJSON(['data'])))
        initialLoadedRef.current = true
        updateLeer()
      }

      return () => {
        ro.disconnect()
        window.removeEventListener('keydown', onKeyDown)
        window.removeEventListener('keyup', onKeyUp)
      }
    })

    return () => {
      disposed = true
      const c = fabricRef.current
      if (c) { try { c.dispose() } catch { /* noop */ } }
      fabricRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Drag & Drop + Paste-Listener (Window-Level) ────────────────
  useEffect(() => {
    const cont = containerRef.current
    if (!cont) return

    function isFileDrag(e: DragEvent) {
      return Array.from(e.dataTransfer?.types ?? []).includes('Files')
    }

    function onDragEnter(e: DragEvent) {
      if (!isFileDrag(e)) return
      e.preventDefault()
      setDragActive(true)
    }
    function onDragOver(e: DragEvent) {
      if (!isFileDrag(e)) return
      e.preventDefault()
      e.dataTransfer!.dropEffect = 'copy'
    }
    function onDragLeave(e: DragEvent) {
      if (!isFileDrag(e)) return
      // Nur wenn wir den Container wirklich verlassen (nicht nur ein Kind betreten)
      if (e.relatedTarget && cont!.contains(e.relatedTarget as Node)) return
      setDragActive(false)
    }
    function onDrop(e: DragEvent) {
      if (!isFileDrag(e)) return
      e.preventDefault()
      setDragActive(false)
      const files = Array.from(e.dataTransfer?.files ?? [])
      if (files.length === 0) return
      const rect = cont!.getBoundingClientRect()
      uploadFiles(files, { x: e.clientX - rect.left, y: e.clientY - rect.top })
    }

    function onPaste(e: ClipboardEvent) {
      // Nicht auslosen, wenn User in einem Input/Textarea pasted
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      const items = Array.from(e.clipboardData?.items ?? [])
      const bilder = items
        .filter((it) => it.type.startsWith('image/'))
        .map((it) => it.getAsFile())
        .filter((f): f is File => f !== null)
      if (bilder.length === 0) return
      e.preventDefault()
      uploadFiles(bilder)
    }

    cont.addEventListener('dragenter', onDragEnter)
    cont.addEventListener('dragover',  onDragOver)
    cont.addEventListener('dragleave', onDragLeave)
    cont.addEventListener('drop',      onDrop)
    window.addEventListener('paste',   onPaste)
    return () => {
      cont.removeEventListener('dragenter', onDragEnter)
      cont.removeEventListener('dragover',  onDragOver)
      cont.removeEventListener('dragleave', onDragLeave)
      cont.removeEventListener('drop',      onDrop)
      window.removeEventListener('paste',   onPaste)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raumId])

  // ── Bild-Upload (Multi-File + Drag-Drop + Paste) ───────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    await uploadFiles(files)
  }

  /**
   * Laedt eine oder mehrere Dateien hoch und platziert sie versetzt aufs Canvas.
   * Akzeptiert nur image/* — nicht-Bilder werden uebersprungen.
   */
  async function uploadFiles(files: File[], dropPosition?: { x: number; y: number }) {
    const bilder = files.filter((f) => f.type.startsWith('image/'))
    if (bilder.length === 0) {
      if (files.length > 0) setRaumAlertMsg('Nur Bilder werden unterstützt.')
      return
    }
    setUploading(true)
    setHintGeschlossen(true) // Welcome-Modal schliessen falls noch offen
    let erfolg = 0
    let fehler = 0
    for (let i = 0; i < bilder.length; i++) {
      const file = bilder[i]
      const fd = new FormData()
      fd.append('bild', file)
      const r = await moodboardBildHochladen(raumId, fd)
      if (r.fehler || !r.url) { fehler++; continue }
      erfolg++
      // Versatz pro Bild im Stack
      const offset = i * 24
      addImageToCanvas(r.url, dropPosition ? {
        x: dropPosition.x + offset,
        y: dropPosition.y + offset,
      } : undefined)
    }
    setUploading(false)
    if (fehler > 0) {
      setRaumAlertMsg(
        erfolg > 0
          ? `${erfolg} Bild${erfolg === 1 ? '' : 'er'} hochgeladen, ${fehler} fehlgeschlagen.`
          : 'Upload fehlgeschlagen.'
      )
    }
  }

  function addImageToCanvas(url: string, position?: { x: number; y: number }) {
    const canvas = fabricRef.current
    const fabric = fabricImportRef.current
    if (!canvas || !fabric) return
    fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((img: any) => {
        const max = 320
        const scale = Math.min(max / (img.width || max), max / (img.height || max), 1)
        // World-Koordinaten: wenn dropPosition Screen-Punkt → Inverse Viewport
        if (position) {
          const vpt = canvas.viewportTransform
          const wx = (position.x - vpt[4]) / vpt[0]
          const wy = (position.y - vpt[5]) / vpt[3]
          img.set({
            left: wx - ((img.width || 0) * scale) / 2,
            top:  wy - ((img.height || 0) * scale) / 2,
            scaleX: scale, scaleY: scale,
          })
        } else {
          img.set({
            left: -((img.width || 0) * scale) / 2 + canvas.getWidth() / 2,
            top:  -((img.height || 0) * scale) / 2 + canvas.getHeight() / 2,
            scaleX: scale, scaleY: scale,
          })
        }
        canvas.add(img)
        canvas.setActiveObject(img)
        canvas.requestRenderAll()
        pushHistory()
        scheduleSave()
      })
  }

  // ── Markierung pro Element ────────────────────────────────────
  function setMarkierung(id: Markierung | null) {
    const c = fabricRef.current
    if (!c || !activeObj) return
    activeObj.data = { ...(activeObj.data ?? {}), markierung: id ?? undefined }
    c.requestRenderAll()
    bumpObjVersion()
    pushHistory()
    scheduleSave()
    setLayerReloadKey((k) => k + 1)
  }

  // ── Pins: World → Screen ──────────────────────────────────────
  function worldToScreen(wx: number, wy: number): { x: number; y: number } | null {
    const c = fabricRef.current
    if (!c) return null
    const vpt = c.viewportTransform
    if (!Array.isArray(vpt) || vpt.length < 6) return null
    const a = Number(vpt[0]); const d = Number(vpt[3])
    const tx = Number(vpt[4]); const ty = Number(vpt[5])
    if (!Number.isFinite(a) || !Number.isFinite(d)) return null
    return { x: a * wx + tx, y: d * wy + ty }
  }

  // Pin anlegen (vom Entwurf)
  async function pinSpeichern() {
    if (!pinEntwurf) return
    const text = pinEntwurfText.trim()
    if (!text) { setRaumAlertMsg('Kommentar darf nicht leer sein.'); return }
    const r = await moodboardKommentarAnlegen({
      moodboardId,
      posX: pinEntwurf.x,
      posY: pinEntwurf.y,
      inhalt: text,
    })
    if (r.fehler) { setRaumAlertMsg(r.fehler); return }
    setPinEntwurf(null)
    setPinEntwurfText('')
    setTool('select')
    setPinsRefreshKey((k) => k + 1)
  }

  async function pinAntworten(parentId: string, inhalt: string): Promise<boolean> {
    const r = await moodboardKommentarAntworten({ parentId, inhalt })
    if (r.fehler) { setRaumAlertMsg(r.fehler); return false }
    setPinsRefreshKey((k) => k + 1)
    return true
  }

  async function pinErledigt(id: string, erledigt: boolean) {
    const r = await moodboardKommentarErledigen(id, erledigt)
    if (r.fehler) { setRaumAlertMsg(r.fehler); return }
    setPinsRefreshKey((k) => k + 1)
  }

  async function pinLoeschen(id: string) {
    const r = await moodboardKommentarLoeschen(id)
    if (r.fehler) { setRaumAlertMsg(r.fehler); return }
    if (aktiverPinId === id) setAktiverPinId(null)
    setPinsRefreshKey((k) => k + 1)
  }

  // ── Sektion aufs Board ────────────────────────────────────────
  function addSection() {
    const canvas = fabricRef.current
    const fabric = fabricImportRef.current
    if (!canvas || !fabric) return
    const cx = canvas.getWidth() / 2
    const cy = canvas.getHeight() / 2
    const W = 480, H = 320

    // Sektion = ungesperrtes Rect + Header-Streifen + Titel-Text — als 3 separate Objekte,
    // damit der User Inhalte rein-/rausziehen kann (kein Group).
    const headerH = 36
    const bg = new fabric.Rect({
      left: cx - W / 2, top: cy - H / 2,
      width: W, height: H,
      fill: 'rgba(255,255,255,0.6)',
      stroke: '#e5e7eb', strokeWidth: 1,
      strokeDashArray: [6, 4],
      rx: 12, ry: 12,
      data: { type: 'section_bg' },
    })
    const headerBar = new fabric.Rect({
      left: cx - W / 2, top: cy - H / 2,
      width: W, height: headerH,
      fill: '#445c49',
      rx: 12, ry: 12,
      // nur oben rounded — Fabric kann das nicht direkt, daher decken wir mit zweitem Rect ab
      data: { type: 'section_header' },
    })
    const headerCover = new fabric.Rect({
      left: cx - W / 2, top: cy - H / 2 + headerH - 12,
      width: W, height: 12,
      fill: '#445c49',
      data: { type: 'section_header' },
    })
    const titel = new fabric.IText('SEKTION', {
      left: cx - W / 2 + 14, top: cy - H / 2 + 9,
      fontSize: 11,
      fill: '#ffffff',
      fontFamily: 'Inter, sans-serif',
      fontWeight: '600',
      charSpacing: 250,
      data: { type: 'section_title' },
    })

    canvas.add(bg)
    canvas.add(headerBar)
    canvas.add(headerCover)
    canvas.add(titel)
    // Sektion in den Hintergrund (damit andere Objekte drauf liegen können)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas.sendObjectToBack(bg as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvas.sendObjectToBack(headerBar as any)
    canvas.requestRenderAll()
    pushHistory()
    scheduleSave()
    setHintGeschlossen(true)
  }

  // ── Lock-Toggle ───────────────────────────────────────────────
  function toggleLockActive() {
    const c = fabricRef.current
    if (!c || !activeObj) return
    const istLocked = activeObj.lockMovementX === true
    const neu = !istLocked
    activeObj.lockMovementX = neu
    activeObj.lockMovementY = neu
    activeObj.lockScalingX = neu
    activeObj.lockScalingY = neu
    activeObj.lockRotation = neu
    activeObj.hasControls = !neu
    activeObj.hoverCursor = neu ? 'not-allowed' : 'move'
    c.requestRenderAll()
    bumpObjVersion()
    pushHistory()
    scheduleSave()
  }

  // ── Sticky-Note aufs Board ────────────────────────────────────
  function addStickyNote(farbeIdx = 0) {
    const canvas = fabricRef.current
    const fabric = fabricImportRef.current
    if (!canvas || !fabric) return
    const farbe = NOTE_FARBEN[farbeIdx] ?? NOTE_FARBEN[0]
    const cx = canvas.getWidth() / 2
    const cy = canvas.getHeight() / 2

    const group = new fabric.Group([
      new fabric.Rect({
        left: 0, top: 0, width: 200, height: 200,
        fill: farbe.bg,
        stroke: farbe.border,
        strokeWidth: 1,
        rx: 4, ry: 4,
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.10)', blur: 12, offsetX: 2, offsetY: 4 }),
      }),
      // Eckabriss-Effekt (Dreieck oben links)
      new fabric.Polygon(
        [
          { x: 0,  y: 0 },
          { x: 18, y: 0 },
          { x: 0,  y: 18 },
        ],
        {
          fill: 'rgba(0,0,0,0.06)',
          left: 0, top: 0,
          selectable: false,
        },
      ),
      new fabric.Textbox('Notiz hinzufügen…', {
        left: 14, top: 18,
        width: 172,
        fontSize: 14,
        fill: '#374151',
        fontFamily: 'Inter, sans-serif',
        editable: true,
      }),
    ], {
      left: cx - 100, top: cy - 100,
      data: { type: 'sticky_note', farbe: farbeIdx },
      angle: Math.random() * 4 - 2, // leicht schief
    })
    canvas.add(group)
    canvas.setActiveObject(group)
    canvas.requestRenderAll()
    pushHistory()
    scheduleSave()
    setHintGeschlossen(true)
    setTool('select')
  }

  // ── Link-Card aufs Board ──────────────────────────────────────
  async function addLinkCard(url: string) {
    setLinkFehler(null)
    setLinkLaedt(true)
    try {
      const resp = await fetch('/api/scrape-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        setLinkFehler(data?.fehler ?? 'URL konnte nicht geladen werden.')
        setLinkLaedt(false)
        return
      }
      const fabric = fabricImportRef.current
      const canvas = fabricRef.current
      if (!fabric || !canvas) { setLinkLaedt(false); return }

      const W = 280, H = 180
      const cx = canvas.getWidth() / 2 - W / 2
      const cy = canvas.getHeight() / 2 - H / 2

      const elemente: unknown[] = [
        // Karten-Hintergrund
        new fabric.Rect({
          left: 0, top: 0, width: W, height: H,
          fill: '#ffffff',
          stroke: '#e5e7eb', strokeWidth: 1,
          rx: 10, ry: 10,
          shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.10)', blur: 14, offsetX: 0, offsetY: 4 }),
        }),
        // Domain-Footer
        new fabric.Rect({
          left: 0, top: H - 28, width: W, height: 28,
          fill: '#f9fafb',
          rx: 0, ry: 0,
        }),
        new fabric.Textbox(data.domain ?? '', {
          left: 12, top: H - 22,
          width: W - 24,
          fontSize: 11,
          fill: '#6b7280',
          fontFamily: 'Inter, sans-serif',
          editable: false,
        }),
      ]

      // Bild-Bereich (oben, falls vorhanden)
      const hasImage = !!data.image
      const headerH = hasImage ? 100 : 16
      if (hasImage) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const img: any = await fabric.FabricImage.fromURL(data.image, { crossOrigin: 'anonymous' })
          const sx = W / (img.width || W)
          const sy = headerH / (img.height || headerH)
          const s = Math.max(sx, sy)
          img.set({
            left: 0, top: 0,
            scaleX: s, scaleY: s,
            clipPath: new fabric.Rect({
              left: -((img.width || 0) * s) / 2,
              top:  -((img.height || 0) * s) / 2,
              width: W, height: headerH,
              originX: 'center', originY: 'center', absolutePositioned: false,
            }),
          })
          elemente.push(img)
        } catch { /* Bild-Fehler ignorieren */ }
      }

      // Titel
      elemente.push(
        new fabric.Textbox(data.title ?? data.url, {
          left: 12,
          top: hasImage ? headerH + 10 : 14,
          width: W - 24,
          fontSize: 14,
          fontWeight: '600',
          fill: '#111827',
          fontFamily: 'Inter, sans-serif',
          editable: false,
          splitByGrapheme: false,
        }),
      )
      // Description
      if (data.description) {
        elemente.push(
          new fabric.Textbox(data.description, {
            left: 12,
            top: hasImage ? headerH + 32 : 36,
            width: W - 24,
            fontSize: 11,
            fill: '#6b7280',
            fontFamily: 'Inter, sans-serif',
            editable: false,
          }),
        )
      }

      const group = new fabric.Group(elemente, {
        left: cx, top: cy,
        data: { type: 'link_card', url: data.url, domain: data.domain },
        subTargetCheck: false,
      })
      canvas.add(group)
      canvas.setActiveObject(group)
      canvas.requestRenderAll()
      pushHistory()
      scheduleSave()

      setLinkLaedt(false)
      setLinkOffen(false)
      setLinkUrl('')
      setHintGeschlossen(true)
    } catch (e) {
      setLinkLaedt(false)
      setLinkFehler('Verbindung fehlgeschlagen.')
      void e
    }
  }

  // ── Color-Swatch / Produkt aufs Board ─────────────────────────
  function addColorSwatch(hex: string) {
    const canvas = fabricRef.current
    const fabric = fabricImportRef.current
    if (!canvas || !fabric) return
    const cx = canvas.getWidth() / 2
    const cy = canvas.getHeight() / 2
    const rect = new fabric.Rect({
      left: cx - 60, top: cy - 60,
      width: 120, height: 120,
      fill: hex,
      stroke: '#0000001a', strokeWidth: 1,
      rx: 8, ry: 8,
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.10)', blur: 12, offsetX: 0, offsetY: 4 }),
    })
    canvas.add(rect)
    canvas.setActiveObject(rect)
    canvas.requestRenderAll()
    pushHistory()
    scheduleSave()
  }

  function addProduktAufBoard(p: { id: string; name: string; bild_url: string | null }) {
    if (p.bild_url) {
      // Wenn Bild vorhanden: als Image hinzufuegen mit data.produkt_id-Verknuepfung
      const fabric = fabricImportRef.current
      const canvas = fabricRef.current
      if (!fabric || !canvas) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fabric.FabricImage.fromURL(p.bild_url, { crossOrigin: 'anonymous' }).then((img: any) => {
        const max = 280
        const scale = Math.min(max / (img.width || max), max / (img.height || max), 1)
        img.set({
          left: -((img.width || 0) * scale) / 2 + canvas.getWidth() / 2,
          top:  -((img.height || 0) * scale) / 2 + canvas.getHeight() / 2,
          scaleX: scale, scaleY: scale,
          data: { produkt_id: p.id, produkt_name: p.name },
        })
        canvas.add(img)
        canvas.setActiveObject(img)
        canvas.requestRenderAll()
        pushHistory()
        scheduleSave()
      })
    } else {
      // Kein Bild → moderne Karte mit Initialen
      const fabric = fabricImportRef.current
      const canvas = fabricRef.current
      if (!fabric || !canvas) return
      const initialen = p.name
        .split(/\s+/).filter(Boolean).slice(0, 2)
        .map((w: string) => w[0]?.toUpperCase() ?? '').join('')

      const group = new fabric.Group([
        // Karten-Hintergrund (weiss mit Schatten)
        new fabric.Rect({
          left: 0, top: 0, width: 220, height: 140,
          fill: '#ffffff', stroke: '#e5e7eb', strokeWidth: 1,
          rx: 10, ry: 10,
          shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.08)', blur: 14, offsetX: 0, offsetY: 4 }),
        }),
        // Initialen-Tile links
        new fabric.Rect({
          left: 12, top: 12, width: 48, height: 48,
          fill: '#445c49', rx: 8, ry: 8,
        }),
        new fabric.IText(initialen || '·', {
          left: 36, top: 36,
          fontSize: 18, fill: '#ffffff', fontFamily: 'Inter, sans-serif',
          fontWeight: '600',
          originX: 'center', originY: 'center',
        }),
        // Produktname
        new fabric.Textbox(p.name, {
          left: 72, top: 18,
          width: 132,
          fontSize: 13, fill: '#111827', fontFamily: 'Inter, sans-serif',
          fontWeight: '500',
          editable: false,
        }),
        // Label
        new fabric.IText('PRODUKT', {
          left: 72, top: 54,
          fontSize: 9, fill: '#9ca3af', fontFamily: 'Inter, sans-serif',
          charSpacing: 200, fontWeight: '600',
        }),
      ], {
        left: canvas.getWidth() / 2 - 110,
        top:  canvas.getHeight() / 2 - 70,
        data: { produkt_id: p.id, produkt_name: p.name },
      })
      canvas.add(group)
      canvas.setActiveObject(group)
      canvas.requestRenderAll()
      pushHistory()
      scheduleSave()
    }
  }

  // ── Objekt-Eigenschaften ────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function setObjProp(prop: string, value: any) {
    const c = fabricRef.current
    if (!c || !activeObj) return
    activeObj.set(prop, value)
    activeObj.setCoords()
    c.requestRenderAll()
    bumpObjVersion()
    pushHistory()
    scheduleSave()
  }

  function bringForward() {
    const c = fabricRef.current
    if (!c || !activeObj) return
    c.bringObjectForward(activeObj)
    c.requestRenderAll()
    pushHistory(); scheduleSave()
  }
  function sendBackwards() {
    const c = fabricRef.current
    if (!c || !activeObj) return
    c.sendObjectBackwards(activeObj)
    c.requestRenderAll()
    pushHistory(); scheduleSave()
  }
  async function duplicateActive() {
    const c = fabricRef.current
    if (!c || !activeObj) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cloned = await (activeObj as any).clone()
    cloned.set({ left: (activeObj.left ?? 0) + 20, top: (activeObj.top ?? 0) + 20 })
    c.add(cloned)
    c.setActiveObject(cloned)
    c.requestRenderAll()
    pushHistory(); scheduleSave()
  }
  // ── Align / Distribute (nur bei Mehrfach-Selektion) ───────────
  type AlignDir = 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom'
  function alignActive(dir: AlignDir) {
    const c = fabricRef.current
    if (!c) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sel = c.getActiveObject() as any
    // ActiveSelection hat _objects-Array
    if (!sel || !sel._objects || sel._objects.length < 2) return

    // BoundingBox der ActiveSelection
    const selRect = sel.getBoundingRect()
    const selL = selRect.left
    const selR = selRect.left + selRect.width
    const selT = selRect.top
    const selB = selRect.top + selRect.height
    const selCx = selL + selRect.width / 2
    const selCy = selT + selRect.height / 2

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sel._objects.forEach((o: any) => {
      const r = o.getBoundingRect()
      const w = r.width, h = r.height
      // Position innerhalb der ActiveSelection ist relativ — rechnen mit getBoundingRect (welt)
      const dx = (() => {
        if (dir === 'left')    return selL - r.left
        if (dir === 'right')   return selR - (r.left + w)
        if (dir === 'centerH') return selCx - (r.left + w / 2)
        return 0
      })()
      const dy = (() => {
        if (dir === 'top')     return selT - r.top
        if (dir === 'bottom')  return selB - (r.top + h)
        if (dir === 'centerV') return selCy - (r.top + h / 2)
        return 0
      })()
      o.left = (o.left ?? 0) + dx
      o.top  = (o.top  ?? 0) + dy
      o.setCoords()
    })
    // ActiveSelection neu positionieren
    sel.addWithUpdate?.()
    c.requestRenderAll()
    pushHistory()
    scheduleSave()
  }

  function distributeActive(dir: 'h' | 'v') {
    const c = fabricRef.current
    if (!c) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sel = c.getActiveObject() as any
    if (!sel || !sel._objects || sel._objects.length < 3) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const objs = [...sel._objects] as any[]
    if (dir === 'h') {
      objs.sort((a, b) => a.getBoundingRect().left - b.getBoundingRect().left)
      const first = objs[0].getBoundingRect()
      const last  = objs[objs.length - 1].getBoundingRect()
      const start = first.left + first.width
      const end   = last.left
      const innerCount = objs.length - 2
      if (innerCount < 1) return
      const totalInnerWidth = objs.slice(1, -1).reduce((s, o) => s + o.getBoundingRect().width, 0)
      const gap = (end - start - totalInnerWidth) / (innerCount + 1)
      let cursor = start + gap
      for (let i = 1; i < objs.length - 1; i++) {
        const r = objs[i].getBoundingRect()
        const dx = cursor - r.left
        objs[i].left = (objs[i].left ?? 0) + dx
        objs[i].setCoords()
        cursor += r.width + gap
      }
    } else {
      objs.sort((a, b) => a.getBoundingRect().top - b.getBoundingRect().top)
      const first = objs[0].getBoundingRect()
      const last  = objs[objs.length - 1].getBoundingRect()
      const start = first.top + first.height
      const end   = last.top
      const innerCount = objs.length - 2
      if (innerCount < 1) return
      const totalInnerHeight = objs.slice(1, -1).reduce((s, o) => s + o.getBoundingRect().height, 0)
      const gap = (end - start - totalInnerHeight) / (innerCount + 1)
      let cursor = start + gap
      for (let i = 1; i < objs.length - 1; i++) {
        const r = objs[i].getBoundingRect()
        const dy = cursor - r.top
        objs[i].top = (objs[i].top ?? 0) + dy
        objs[i].setCoords()
        cursor += r.height + gap
      }
    }
    sel.addWithUpdate?.()
    c.requestRenderAll()
    pushHistory()
    scheduleSave()
  }

  function deleteActive() {
    const c = fabricRef.current
    if (!c || !activeObj) return
    c.remove(activeObj)
    c.discardActiveObject()
    setActiveObj(null)
    c.requestRenderAll()
    pushHistory(); scheduleSave()
  }

  // ── UI-Aktionen ────────────────────────────────────────────────
  function handleZoomIn() {
    const c = fabricRef.current; if (!c) return
    const fabric = fabricImportRef.current
    let z = c.getZoom() * 1.2
    z = Math.min(MAX_ZOOM, z)
    c.zoomToPoint(new fabric.Point(c.getWidth()/2, c.getHeight()/2), z)
    setZoom(Math.round(z * 100) / 100)
  }
  function handleZoomOut() {
    const c = fabricRef.current; if (!c) return
    const fabric = fabricImportRef.current
    let z = c.getZoom() / 1.2
    z = Math.max(MIN_ZOOM, z)
    c.zoomToPoint(new fabric.Point(c.getWidth()/2, c.getHeight()/2), z)
    setZoom(Math.round(z * 100) / 100)
  }
  function handleZoomReset() {
    const c = fabricRef.current; if (!c) return
    c.setViewportTransform([1, 0, 0, 1, 0, 0])
    setZoom(1)
  }

  // ── Template laden ─────────────────────────────────────────────
  function ladeTemplate(template: MoodboardTemplate) {
    const canvas = fabricRef.current
    if (!canvas) return
    skipHistoryRef.current = true
    canvas.loadFromJSON(template.canvasJson, () => {
      canvas.requestRenderAll()
      skipHistoryRef.current = false
      undoStackRef.current.push(JSON.stringify((canvas as unknown as { toJSON: (props?: string[]) => Record<string, unknown> }).toJSON(['data'])))
      setIstLeer(false)
      setHintGeschlossen(true)
      scheduleSave()
    })
  }

  // ── Versionen ──────────────────────────────────────────────────
  async function ladeVersionen() {
    setVersionenLaden(true)
    const v = await getMoodboardVersionen(moodboardId)
    setVersionen(v)
    setVersionenLaden(false)
  }

  function oeffneVersionenModal() {
    setVersionenOffen(true)
    setVersionFehler(null)
    setNeueVersionName('')
    setNeueVersionBeschr('')
    ladeVersionen()
  }

  async function speichereNeueVersion() {
    if (!neueVersionName.trim()) {
      setVersionFehler('Name ist erforderlich.')
      return
    }
    setVersionSaving(true); setVersionFehler(null)

    // Erst aktuellen Stand committen, damit die Version den neuesten State enthaelt
    const canvas = fabricRef.current
    if (canvas) {
      const json = (canvas as unknown as { toJSON: (props?: string[]) => Record<string, unknown> }).toJSON(['data'])
      await moodboardSpeichern(moodboardId, json)
    }

    const r = await moodboardVersionSpeichern(moodboardId, neueVersionName.trim(), neueVersionBeschr.trim() || null)
    setVersionSaving(false)
    if (r.fehler) { setVersionFehler(r.fehler); return }
    setNeueVersionName(''); setNeueVersionBeschr('')
    ladeVersionen()
  }

  async function loescheVersion(versionId: string) {
    if (!confirm('Diese Version wirklich löschen? Dieser Vorgang kann nicht rückgängig gemacht werden.')) return
    const r = await moodboardVersionLoeschen(versionId)
    if (r.fehler) { alert(r.fehler); return }
    ladeVersionen()
  }

  async function stelleVersionWiederHer(versionId: string) {
    if (!confirm('Den aktuellen Stand mit dieser Version überschreiben?')) return
    const r = await moodboardVersionWiederherstellen(moodboardId, versionId)
    if (r.fehler) { alert(r.fehler); return }
    // Canvas neu laden
    const canvas = fabricRef.current
    if (!canvas) { setVersionenOffen(false); return }
    const ver = versionen.find((v) => v.id === versionId)
    if (ver?.canvas_json) {
      skipHistoryRef.current = true
      canvas.loadFromJSON(ver.canvas_json, () => {
        canvas.requestRenderAll()
        skipHistoryRef.current = false
        undoStackRef.current.push(JSON.stringify((canvas as unknown as { toJSON: (props?: string[]) => Record<string, unknown> }).toJSON(['data'])))
      })
    }
    setVersionenOffen(false)
  }

  // ── Freigabe ───────────────────────────────────────────────────
  async function handleFreigabeSpeichern(
    neuAktiv: boolean,
    neuKommentare: boolean,
    options?: { passwort?: string | null; ablauf?: string | null },
  ) {
    setFreigabeSaving(true)
    const r = await moodboardFreigabeAktualisieren(moodboardId, neuAktiv, neuKommentare, options)
    setFreigabeSaving(false)
    if (r.fehler) { setRaumAlertMsg(r.fehler); return }
    setFreigabeAktiv(neuAktiv)
    setFreigabeKommentare(neuKommentare)
    setRaumAlertMsg('Freigabe-Einstellungen aktualisiert.')
  }

  async function handlePasswortSetzen() {
    if (!neuesPasswort.trim()) return
    setFreigabeSaving(true)
    const r = await moodboardFreigabeAktualisieren(moodboardId, freigabeAktiv, freigabeKommentare, {
      passwort: neuesPasswort,
    })
    setFreigabeSaving(false)
    if (r.fehler) { setRaumAlertMsg(r.fehler); return }
    setPasswortGesetzt(true)
    setNeuesPasswort('')
    setRaumAlertMsg('Passwort gesetzt.')
  }

  async function handlePasswortEntfernen() {
    setFreigabeSaving(true)
    const r = await moodboardFreigabeAktualisieren(moodboardId, freigabeAktiv, freigabeKommentare, {
      passwort: null,
    })
    setFreigabeSaving(false)
    if (r.fehler) { setRaumAlertMsg(r.fehler); return }
    setPasswortGesetzt(false)
    setRaumAlertMsg('Passwort entfernt.')
  }

  async function handleAblaufSetzen(neuerAblauf: string | null) {
    setFreigabeSaving(true)
    const r = await moodboardFreigabeAktualisieren(moodboardId, freigabeAktiv, freigabeKommentare, {
      ablauf: neuerAblauf,
    })
    setFreigabeSaving(false)
    if (r.fehler) { setRaumAlertMsg(r.fehler); return }
    setAblauf(neuerAblauf)
  }

  const freigabeUrl = typeof window !== 'undefined' && freigabeToken
    ? `${window.location.origin}/moodboard/${freigabeToken}`
    : ''

  async function kopiereFreigabeLink() {
    if (!freigabeUrl) return
    try {
      await navigator.clipboard.writeText(freigabeUrl)
      setLinkKopiert(true)
      setTimeout(() => setLinkKopiert(false), 1500)
    } catch {
      // Fallback noop
    }
  }

  // ── PDF-Export ────────────────────────────────────────────────
  async function exportPdf() {
    const canvas = fabricRef.current
    if (!canvas) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const objs = canvas.getObjects() as any[]
    if (objs.length === 0) {
      setRaumAlertMsg('Das Board ist leer.')
      return
    }
    setRaumAlertMsg('PDF wird erzeugt…')

    // Bounding-Box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    objs.forEach((o) => {
      const r = o.getBoundingRect()
      minX = Math.min(minX, r.left)
      minY = Math.min(minY, r.top)
      maxX = Math.max(maxX, r.left + r.width)
      maxY = Math.max(maxY, r.top + r.height)
    })
    const PAD = 40
    const w = maxX - minX + 2 * PAD
    const h = maxY - minY + 2 * PAD

    // Viewport temporaer
    const oldVp = canvas.viewportTransform.slice()
    const oldZoom = canvas.getZoom()
    canvas.setViewportTransform([1, 0, 0, 1, -minX + PAD, -minY + PAD])
    const dataUrl = canvas.toDataURL({
      format: 'png',
      multiplier: 2,
      left: 0, top: 0, width: w, height: h,
    })
    canvas.setViewportTransform(oldVp)
    canvas.setZoom(oldZoom)
    canvas.requestRenderAll()

    try {
      const { default: jsPDF } = await import('jspdf')
      const aspect = w / h
      const isLandscape = aspect > 1
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
      })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()

      // Header
      pdf.setFillColor(68, 92, 73) // wellbeing-green
      pdf.rect(0, 0, pageW, 18, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text(boardName, 12, 12)
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`${raumName}`, pageW - 12, 12, { align: 'right' })

      // Bild platzieren
      const margin = 12
      const headerH = 22
      const footerH = 12
      const availW = pageW - margin * 2
      const availH = pageH - headerH - footerH
      const scale = Math.min(availW / (w / 4), availH / (h / 4))  // /4 weil multiplier=2 + 96dpi
      const imgW = (w / 4) * scale
      const imgH = (h / 4) * scale
      const imgX = (pageW - imgW) / 2
      const imgY = headerH + (availH - imgH) / 2
      pdf.addImage(dataUrl, 'PNG', imgX, imgY, imgW, imgH)

      // Footer
      pdf.setFontSize(8)
      pdf.setTextColor(150, 150, 150)
      pdf.text(
        `Erstellt mit Wellbeing Spaces · ${new Date().toLocaleDateString('de-DE')}`,
        margin, pageH - 6,
      )

      pdf.save(`moodboard-${raumName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`)
      setRaumAlertMsg('PDF heruntergeladen.')
    } catch (e) {
      setRaumAlertMsg('Fehler beim PDF-Export.')
      void e
    }
  }

  // ── PNG-Export ────────────────────────────────────────────────
  function exportPng() {
    const canvas = fabricRef.current
    if (!canvas) return

    // Bounding-Box aller Objekte ermitteln
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const objs = canvas.getObjects() as any[]
    if (objs.length === 0) {
      alert('Das Board ist leer.')
      return
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    objs.forEach((o) => {
      const r = o.getBoundingRect()
      minX = Math.min(minX, r.left)
      minY = Math.min(minY, r.top)
      maxX = Math.max(maxX, r.left + r.width)
      maxY = Math.max(maxY, r.top + r.height)
    })

    const PAD = 40
    const w = maxX - minX + 2 * PAD
    const h = maxY - minY + 2 * PAD

    // Aktuellen Viewport sichern
    const oldVp = canvas.viewportTransform.slice()
    const oldZoom = canvas.getZoom()
    canvas.setViewportTransform([1, 0, 0, 1, -minX + PAD, -minY + PAD])

    const dataUrl = canvas.toDataURL({
      format: 'png',
      multiplier: 2,
      left: 0, top: 0, width: w, height: h,
    })

    // Viewport wiederherstellen
    canvas.setViewportTransform(oldVp)
    canvas.setZoom(oldZoom)
    canvas.requestRenderAll()

    // Download
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `moodboard-${raumName.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  async function handleManualSave() {
    const canvas = fabricRef.current; if (!canvas) return
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null }
    setSaveStatus('saving')
    const json = (canvas as unknown as { toJSON: (props?: string[]) => Record<string, unknown> }).toJSON(['data']) as Record<string, unknown>
    const r = await moodboardSpeichern(moodboardId, json)
    setSaveStatus(r.fehler ? 'error' : 'saved')
    if (!r.fehler) setTimeout(() => setSaveStatus('idle'), 1200)
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[#0f1f13] text-[#c8dbc9]">
      {/* Top-Bar: Brand + Titel + Toolbar in einer Reihe (Figma-Style) */}
      <div className={`${presentationMode ? 'hidden' : 'flex'} items-center gap-2 px-3 h-14 border-b border-[#1f3a25] bg-[#1a2e1e] shrink-0`}>
        {/* Links: Zurueck + Branding */}
        <Link
          href={`/dashboard/projekte/${projektId}/raeume/${raumId}`}
          className="flex items-center gap-1.5 px-2 py-1.5 text-[#94c1a4] hover:text-white hover:bg-white/5 rounded-md text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Zurück</span>
        </Link>
        <div className="h-6 w-px bg-[#1f3a25]" />
        <div className="min-w-0 max-w-[200px]">
          <div className="text-sm font-medium text-white leading-tight truncate">{boardName}</div>
          <div className="text-[11px] text-[#94c1a4] leading-tight truncate">{raumName}</div>
        </div>

        {/* Mitte: Tools (Hauptaktionen) */}
        <div className="flex-1 flex items-center justify-center gap-0.5">
          <ToolGroup>
            <ToolBtn active={tool === 'select'} onClick={() => setTool('select')} title="Auswahl (V)">
              <MousePointer2 className="w-[18px] h-[18px]" />
            </ToolBtn>
            <ToolBtn active={tool === 'text'}   onClick={() => setTool('text')}   title="Text (T)">
              <TypeIcon className="w-[18px] h-[18px]" />
            </ToolBtn>
            <ToolBtn active={tool === 'rect'}   onClick={() => setTool('rect')}   title="Rechteck (R)">
              <Square className="w-[18px] h-[18px]" />
            </ToolBtn>
            <ToolBtn active={tool === 'circle'} onClick={() => setTool('circle')} title="Kreis (C)">
              <CircleIcon className="w-[18px] h-[18px]" />
            </ToolBtn>
            <ToolBtn onClick={() => fileInputRef.current?.click()} title="Bild hochladen" loading={uploading}>
              <ImageIcon className="w-[18px] h-[18px]" />
            </ToolBtn>
            <div className="relative">
              <ToolBtn
                onClick={() => setNotePickerOffen((v) => !v)}
                title="Notiz hinzufügen"
                active={notePickerOffen}
              >
                <StickyNote className="w-[18px] h-[18px]" />
              </ToolBtn>
              {notePickerOffen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50 bg-[#0f1f13] border border-[#1f3a25] rounded-lg shadow-xl p-1.5 flex gap-1">
                  {NOTE_FARBEN.map((f, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { addStickyNote(i); setNotePickerOffen(false) }}
                      title={f.label}
                      className="w-7 h-7 rounded border border-white/10 hover:scale-110 hover:ring-2 hover:ring-white/40 transition-all"
                      style={{ background: f.bg }}
                    />
                  ))}
                </div>
              )}
            </div>
            <ToolBtn onClick={() => setLinkOffen(true)} title="Link einfügen">
              <LinkIcon className="w-[18px] h-[18px]" />
            </ToolBtn>
            <ToolBtn onClick={addSection} title="Sektion einfügen">
              <BoxSelect className="w-[18px] h-[18px]" />
            </ToolBtn>
            <ToolBtn
              active={tool === 'comment'}
              onClick={() => setTool(tool === 'comment' ? 'select' : 'comment')}
              title="Kommentar-Pin (klick auf Canvas)"
            >
              <MessageSquare className="w-[18px] h-[18px]" />
            </ToolBtn>
          </ToolGroup>

          <ToolDivider />

          <ToolGroup>
            <ToolBtn onClick={handleUndo} title="Rückgängig (Ctrl+Z)">
              <Undo2 className="w-[18px] h-[18px]" />
            </ToolBtn>
            <ToolBtn onClick={handleRedo} title="Wiederholen (Ctrl+Y)">
              <Redo2 className="w-[18px] h-[18px]" />
            </ToolBtn>
            <ToolBtn onClick={() => {
              const c = fabricRef.current; if (!c) return
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const active = c.getActiveObjects() as any[]
              if (active.length === 0) return
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              active.forEach((o: any) => c.remove(o))
              c.discardActiveObject()
              c.requestRenderAll()
              pushHistory()
              scheduleSave()
            }} title="Löschen (Entf)">
              <Trash2 className="w-[18px] h-[18px]" />
            </ToolBtn>
          </ToolGroup>

          <ToolDivider />

          <ToolGroup>
            <ToolBtn
              onClick={() => setSnapEnabled((v) => !v)}
              title={snapEnabled ? 'Smart-Guides aktiv (klick zum Deaktivieren)' : 'Smart-Guides aktivieren'}
              active={snapEnabled}
            >
              <Magnet className="w-[18px] h-[18px]" />
            </ToolBtn>
            <ToolBtn
              onClick={() => setSnapToGrid((v) => !v)}
              title={snapToGrid ? 'Snap-to-Grid aktiv' : 'An Raster ausrichten'}
              active={snapToGrid}
            >
              <span className="text-[10px] font-bold leading-none">⌗</span>
            </ToolBtn>
            {/* Grid-Sichtbarkeit Dropdown */}
            <div className="relative">
              <ToolBtn
                onClick={() => setGridDropdownOffen((v) => !v)}
                title="Raster anzeigen"
                active={gridSize > 0}
              >
                <Grid3X3 className="w-[18px] h-[18px]" />
              </ToolBtn>
              {gridDropdownOffen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setGridDropdownOffen(false)}
                  />
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 w-32 bg-[#0f1f13] border border-[#1f3a25] rounded-lg shadow-xl overflow-hidden">
                    {[
                      { v: 0,  label: 'Aus' },
                      { v: 20, label: 'Klein' },
                      { v: 40, label: 'Mittel' },
                      { v: 80, label: 'Groß' },
                    ].map((opt) => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => { setGridSize(opt.v); setGridDropdownOffen(false) }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-[11px] text-left hover:bg-white/5 transition-colors ${
                          gridSize === opt.v ? 'text-white bg-white/5' : 'text-[#94c1a4]'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {opt.v > 0 && <span className="text-[9px] opacity-50">{opt.v}px</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <ToolBtn
              onClick={() => setLayerPanelOffen((v) => !v)}
              title={layerPanelOffen ? 'Ebenen schließen' : 'Ebenen anzeigen'}
              active={layerPanelOffen}
            >
              <Layers className="w-[18px] h-[18px]" />
            </ToolBtn>
          </ToolGroup>

          <ToolDivider />

          <ToolGroup>
            <ToolBtn onClick={oeffneVersionenModal} title="Versionen">
              <History className="w-[18px] h-[18px]" />
            </ToolBtn>
            <ToolBtn onClick={exportPng} title="Als PNG exportieren">
              <Download className="w-[18px] h-[18px]" />
            </ToolBtn>
            <ToolBtn onClick={exportPdf} title="Als PDF exportieren">
              <FileText className="w-[18px] h-[18px]" />
            </ToolBtn>
            <ToolBtn
              onClick={() => setPresentationMode(true)}
              title="Präsentations-Modus (Vollbild ohne UI)"
            >
              <Presentation className="w-[18px] h-[18px]" />
            </ToolBtn>
          </ToolGroup>
        </div>

        {/* Rechts: Save-Status + Zoom + Freigabe */}
        <div className="flex items-center gap-2">
          {/* Status-Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setStatusDropdownOffen((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium ${STATUS_CONFIG[status].bg} ${STATUS_CONFIG[status].text} hover:opacity-90 transition-opacity`}
              title="Status ändern"
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: STATUS_CONFIG[status].dot }}
              />
              {STATUS_CONFIG[status].label}
              <span className="text-[8px] opacity-60">▼</span>
            </button>
            {statusDropdownOffen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setStatusDropdownOffen(false)}
                />
                <div className="absolute top-full right-0 mt-1 z-50 w-44 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                  {(Object.keys(STATUS_CONFIG) as MoodboardStatus[]).map((s) => {
                    const cfg = STATUS_CONFIG[s]
                    const aktiv = s === status
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleStatusAendern(s)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 text-left ${aktiv ? 'bg-gray-50 font-medium' : ''}`}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: cfg.dot }}
                        />
                        <span className="text-gray-700">{cfg.label}</span>
                        {aktiv && <Check className="w-3 h-3 ml-auto text-wellbeing-green" />}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          <SaveBadge status={saveStatus} />

          <ToolDivider />

          <div className="flex items-center gap-0.5 px-1 bg-black/20 rounded-md">
            <ToolBtn onClick={handleZoomOut} title="Verkleinern" small>
              <span className="text-[15px] leading-none">−</span>
            </ToolBtn>
            <button
              onClick={handleZoomReset}
              className="text-[11px] text-[#c8dbc9] hover:text-white px-1.5 min-w-[42px] tabular-nums"
              title="Zurücksetzen"
            >
              {Math.round(zoom * 100)}%
            </button>
            <ToolBtn onClick={handleZoomIn} title="Vergrößern" small>
              <span className="text-[15px] leading-none">+</span>
            </ToolBtn>
            <ToolBtn onClick={handleZoomReset} title="Einpassen" small>
              <Maximize2 className="w-[14px] h-[14px]" />
            </ToolBtn>
          </div>

          <ToolDivider />

          <button
            type="button"
            onClick={handleManualSave}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#c8dbc9] hover:bg-white/5 rounded-md transition-colors"
            title="Speichern (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Speichern</span>
          </button>

          <button
            type="button"
            onClick={() => setFreigabeOffen(true)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors
              ${freigabeAktiv
                ? 'bg-wellbeing-green hover:bg-wellbeing-green/90 text-white'
                : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'}
            `}
            title="Freigabe für Kunden"
          >
            <Share2 className="w-3.5 h-3.5" />
            {freigabeAktiv ? 'Freigegeben' : 'Teilen'}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Hauptbereich: Sidebar + Canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Linke Sidebar */}
        <aside className={`${presentationMode ? 'hidden' : 'flex'} w-72 shrink-0 bg-[#1a2e1e] border-r border-[#1f3a25] flex-col`}>
          {/* Tab-Switcher (Underline-Indicator) */}
          <div className="flex shrink-0 border-b border-[#1f3a25]">
            <SidebarTab active={sidebarTab === 'produkte'} onClick={() => setSidebarTab('produkte')}>
              <Package className="w-3.5 h-3.5" /> Produkte
            </SidebarTab>
            <SidebarTab active={sidebarTab === 'farben'} onClick={() => setSidebarTab('farben')}>
              <Palette className="w-3.5 h-3.5" /> Farben
            </SidebarTab>
            <SidebarTab active={sidebarTab === 'upload'} onClick={() => setSidebarTab('upload')}>
              <Upload className="w-3.5 h-3.5" /> Bilder
            </SidebarTab>
          </div>

          {/* Tab-Inhalt */}
          <div className="flex-1 overflow-y-auto">
            {sidebarTab === 'produkte' && (
              <div className="p-4">
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94c1a4]" />
                  <input
                    type="text"
                    value={produktSuche}
                    onChange={(e) => setProduktSuche(e.target.value)}
                    placeholder="Suchen…"
                    className="w-full pl-8 pr-2 py-2 text-xs bg-black/30 border border-[#1f3a25] rounded-md text-white placeholder-[#94c1a4]/60 focus:outline-none focus:border-wellbeing-green focus:ring-1 focus:ring-wellbeing-green/30 transition-colors"
                  />
                </div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#94c1a4]/70 font-medium">
                    {produkteGefiltert.length} {produkteGefiltert.length === 1 ? 'Produkt' : 'Produkte'}
                  </span>
                  <span className="text-[10px] text-[#94c1a4]/50">Klick zum Hinzufügen</span>
                </div>
                {produkteGefiltert.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-black/30 flex items-center justify-center">
                      <Package className="w-5 h-5 text-[#94c1a4]/40" />
                    </div>
                    <p className="text-[11px] text-[#94c1a4]">
                      {produkte.length === 0
                        ? 'Keine Produkte vorhanden.'
                        : 'Keine Treffer.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {produkteGefiltert.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addProduktAufBoard(p)}
                        className="group flex flex-col items-stretch bg-black/20 border border-[#1f3a25] rounded-lg overflow-hidden hover:border-wellbeing-green/60 hover:bg-black/30 transition-all text-left"
                      >
                        <div className="aspect-square bg-black/40 overflow-hidden flex items-center justify-center relative">
                          {p.bild_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.bild_url}
                              alt=""
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <ProduktInitial name={p.name} />
                          )}
                        </div>
                        <div className="px-2 py-1.5 min-w-0">
                          <div className="text-[11px] text-white truncate font-medium">{p.name}</div>
                          {p.kategorie && (
                            <div className="text-[9px] text-[#94c1a4] truncate uppercase tracking-wide">{p.kategorie}</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {sidebarTab === 'farben' && (
              <div className="p-4">
                <h4 className="text-[10px] uppercase tracking-wider text-[#94c1a4]/70 font-medium mb-3 px-1">
                  Wellbeing & Designer-Töne
                </h4>
                <div className="grid grid-cols-6 gap-1.5">
                  {COLOR_PALETTE.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => addColorSwatch(hex)}
                      title={hex}
                      className="aspect-square rounded-md border border-white/10 hover:scale-110 hover:ring-2 hover:ring-white/40 transition-all shadow-sm"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
                <h4 className="text-[10px] uppercase tracking-wider text-[#94c1a4]/70 font-medium mt-5 mb-2 px-1">
                  Eigene Farbe
                </h4>
                <div className="bg-black/20 border border-[#1f3a25] rounded-lg p-2.5 flex items-center gap-2">
                  <input
                    type="color"
                    onChange={(e) => addColorSwatch(e.target.value)}
                    className="w-10 h-9 rounded border-0 bg-transparent cursor-pointer shrink-0"
                  />
                  <span className="text-[11px] text-[#94c1a4]">
                    Wähle einen Farbton — wird sofort als Swatch platziert.
                  </span>
                </div>
              </div>
            )}

            {sidebarTab === 'upload' && (
              <div className="p-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 px-3 py-8 border-2 border-dashed border-[#1f3a25] rounded-xl text-[#94c1a4] hover:border-wellbeing-green hover:text-white hover:bg-black/20 transition-colors group"
                >
                  <div className="w-12 h-12 rounded-xl bg-black/30 flex items-center justify-center group-hover:bg-wellbeing-green/20 transition-colors">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium">Bild hochladen</span>
                  <span className="text-[10px] text-[#94c1a4]/60">JPG / PNG · max 50 MB</span>
                </button>
                {uploading && (
                  <p className="text-[11px] text-amber-400 text-center mt-3 flex items-center justify-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Lädt hoch…
                  </p>
                )}
                <div className="mt-4 p-3 rounded-lg bg-black/20 border border-[#1f3a25]">
                  <p className="text-[10px] uppercase tracking-wider text-[#94c1a4]/60 font-medium mb-1">Tipp</p>
                  <p className="text-[11px] text-[#c8dbc9]/80 leading-relaxed">
                    Lade Inspirationsbilder, Materialfotos oder Stoff-Swatches hoch — alles wird sicher in deinem Workspace abgelegt.
                  </p>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Canvas-Bereich */}
        <div
          className="flex-1 relative overflow-hidden"
          ref={containerRef}
          style={{ background: '#f5f5f0' }}
        >
          {/* Grid-Layer (hinter Canvas) — folgt Pan/Zoom via viewportTick */}
          <MoodboardErrorBoundary name="GridLayer">
            <MoodboardGridLayer
              gridSize={gridSize}
              viewportTick={viewportTick}
              fabricRef={fabricRef}
            />
          </MoodboardErrorBoundary>

          <canvas ref={canvasElRef} className="relative" />

          {/* Welcome-Modal (Templates + Schnellstart) */}
          {istLeer && !hintGeschlossen && (
            <MoodboardWelcome
              onLeer={() => setHintGeschlossen(true)}
              onTemplateWaehlen={ladeTemplate}
              onBildHochladen={() => {
                setHintGeschlossen(true)
                fileInputRef.current?.click()
              }}
              onSchliessen={() => setHintGeschlossen(true)}
            />
          )}

          {/* Pin-Overlay (auch fuer viewportTick re-render) */}
          {/* eslint-disable-next-line @typescript-eslint/no-unused-expressions */}
          {void viewportTick}
          <MoodboardErrorBoundary name="PinOverlay">
            <MoodboardPinOverlay
              pins={pins}
              worldToScreen={worldToScreen}
              aktiverPinId={aktiverPinId}
              setAktiverPinId={setAktiverPinId}
              onAntworten={pinAntworten}
              onErledigen={pinErledigt}
              onLoeschen={pinLoeschen}
            />
          </MoodboardErrorBoundary>

          {/* Markierungs-Overlay */}
          <MoodboardErrorBoundary name="MarkierungOverlay">
            {(() => {
              try {
                const c = fabricRef.current
                if (!c || typeof c.getObjects !== 'function') return null
                return (
                  <MoodboardMarkierungOverlay
                    objects={c.getObjects()}
                    reloadKey={layerReloadKey + objVersion}
                    worldToScreen={worldToScreen}
                  />
                )
              } catch {
                return null
              }
            })()}
          </MoodboardErrorBoundary>

          {/* Pin-Entwurf-Bubble */}
          {pinEntwurf && (() => {
            const pos = worldToScreen(pinEntwurf.x, pinEntwurf.y)
            if (!pos) return null
            return (
              <div
                className="absolute z-40"
                style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -100%)' }}
              >
                <div className="w-72 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
                  <div className="px-3 py-2 bg-wellbeing-green text-white flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium">Neuer Kommentar-Pin</span>
                  </div>
                  <div className="p-2.5">
                    <textarea
                      autoFocus
                      value={pinEntwurfText}
                      onChange={(e) => setPinEntwurfText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) pinSpeichern()
                        if (e.key === 'Escape') { setPinEntwurf(null); setTool('select') }
                      }}
                      placeholder="Kommentar schreiben…"
                      rows={3}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded resize-none focus:outline-none focus:border-wellbeing-green focus:ring-1 focus:ring-wellbeing-green/30 text-gray-700"
                    />
                    <div className="flex justify-between items-center mt-1.5">
                      <span className="text-[10px] text-gray-400">⌘/Ctrl + Enter</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => { setPinEntwurf(null); setTool('select') }}
                          className="px-2 py-1 text-[11px] text-gray-500 hover:text-gray-700"
                        >
                          Abbrechen
                        </button>
                        <button
                          type="button"
                          onClick={pinSpeichern}
                          disabled={!pinEntwurfText.trim()}
                          className="px-2.5 py-1 bg-wellbeing-green hover:bg-wellbeing-green-dark text-white text-[11px] font-medium rounded disabled:opacity-50"
                        >
                          Pin setzen
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Status-Bar (dezenter) */}
          {!presentationMode && (
            <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-black/50 text-[10px] text-[#c8dbc9]/80 backdrop-blur-sm flex items-center gap-2">
              <span className="uppercase tracking-wider">{tool}</span>
              <span className="text-[#94c1a4]/40">·</span>
              <span>Drag&Drop · Strg+V · Space+Drag · Mausrad zoomt</span>
            </div>
          )}

          {/* Presentation-Mode Exit-Button */}
          {presentationMode && (
            <button
              type="button"
              onClick={() => setPresentationMode(false)}
              className="absolute top-4 right-4 z-50 inline-flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-sm shadow-lg border border-gray-200 rounded-lg text-gray-700 hover:bg-white text-xs font-medium transition-all"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              Präsentation beenden (ESC)
            </button>
          )}

          {/* Drop-Overlay (zeigt sich beim File-Hover) */}
          {dragActive && (
            <div className="pointer-events-none absolute inset-2 z-40 border-2 border-dashed border-wellbeing-green-light rounded-2xl bg-wellbeing-green/15 backdrop-blur-[1px] flex items-center justify-center">
              <div className="bg-white/95 px-5 py-3 rounded-xl shadow-lg border border-wellbeing-green/30 flex items-center gap-2.5">
                <Upload className="w-5 h-5 text-wellbeing-green" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Bilder hier ablegen</div>
                  <div className="text-[11px] text-gray-500">Mehrere gleichzeitig möglich</div>
                </div>
              </div>
            </div>
          )}

          {/* Toast (Errors / Status-Meldungen) */}
          {raumAlertMsg && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg animate-fadeIn">
              {raumAlertMsg}
            </div>
          )}
        </div>

        {/* Layer-Panel */}
        {!presentationMode && layerPanelOffen && fabricRef.current && typeof fabricRef.current.getObjects === 'function' && (
          <MoodboardErrorBoundary name="LayerPanel">
          <MoodboardLayers
            objects={fabricRef.current.getObjects()}
            activeObj={activeObj}
            reloadKey={layerReloadKey}
            onSelect={(o) => {
              const c = fabricRef.current
              if (!c) return
              c.setActiveObject(o)
              c.requestRenderAll()
              setActiveObj(o)
            }}
            onToggleVis={(o) => {
              const c = fabricRef.current
              if (!c) return
              o.visible = !o.visible
              c.requestRenderAll()
              setLayerReloadKey((k) => k + 1)
              scheduleSave()
            }}
            onToggleLock={(o) => {
              const c = fabricRef.current
              if (!c) return
              const neu = !(o.lockMovementX === true)
              o.lockMovementX = neu
              o.lockMovementY = neu
              o.lockScalingX  = neu
              o.lockScalingY  = neu
              o.lockRotation  = neu
              o.hasControls   = !neu
              o.hoverCursor   = neu ? 'not-allowed' : 'move'
              c.requestRenderAll()
              setLayerReloadKey((k) => k + 1)
              scheduleSave()
            }}
            onForward={(o) => {
              const c = fabricRef.current
              if (!c) return
              c.bringObjectForward(o)
              c.requestRenderAll()
              setLayerReloadKey((k) => k + 1)
              scheduleSave()
            }}
            onBackward={(o) => {
              const c = fabricRef.current
              if (!c) return
              c.sendObjectBackwards(o)
              c.requestRenderAll()
              setLayerReloadKey((k) => k + 1)
              scheduleSave()
            }}
            onClose={() => setLayerPanelOffen(false)}
          />
          </MoodboardErrorBoundary>
        )}

        {/* Rechte Sidebar – nur wenn etwas selektiert ist */}
        {!presentationMode && activeObj && (
          <MoodboardErrorBoundary name="PropertiesPanel">
            <PropertiesPanel
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              obj={activeObj as any}
              objVersion={objVersion}
              onSet={setObjProp}
              onDuplicate={duplicateActive}
              onDelete={deleteActive}
              onForward={bringForward}
              onBackward={sendBackwards}
              onAlign={alignActive}
              onDistribute={distributeActive}
              onToggleLock={toggleLockActive}
              onSetMarkierung={setMarkierung}
            />
          </MoodboardErrorBoundary>
        )}
      </div>

      {/* Freigabe-Modal */}
      {freigabeOffen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setFreigabeOffen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col text-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-wellbeing-green" />
                <h2 className="text-base font-medium">Kunden-Freigabe</h2>
              </div>
              <button
                type="button"
                onClick={() => setFreigabeOffen(false)}
                className="p-1 hover:bg-gray-100 rounded"
                aria-label="Schließen"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Toggle: Freigabe aktiv */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={freigabeAktiv}
                  onChange={(e) => handleFreigabeSpeichern(e.target.checked, freigabeKommentare)}
                  disabled={freigabeSaving}
                  className="mt-0.5 w-4 h-4 accent-wellbeing-green"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">Freigabe aktiv</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Wenn aktiv, kann der Kunde das Moodboard über den Link unten ansehen.
                  </div>
                </div>
              </label>

              {/* Toggle: Kommentare aktiv */}
              <label className={`flex items-start gap-3 cursor-pointer ${!freigabeAktiv ? 'opacity-50' : ''}`}>
                <input
                  type="checkbox"
                  checked={freigabeKommentare}
                  onChange={(e) => handleFreigabeSpeichern(freigabeAktiv, e.target.checked)}
                  disabled={freigabeSaving || !freigabeAktiv}
                  className="mt-0.5 w-4 h-4 accent-wellbeing-green"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5" /> Kommentare erlauben
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Kunden können Pins mit Kommentaren auf das Board setzen (nur lesen, wenn deaktiviert).
                  </div>
                </div>
              </label>

              {/* Link + QR */}
              {freigabeAktiv && freigabeUrl && (
                <div className="pt-3 border-t border-gray-200 space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Freigabe-Link</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={freigabeUrl}
                        readOnly
                        className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded bg-gray-50 font-mono"
                      />
                      <button
                        type="button"
                        onClick={kopiereFreigabeLink}
                        className="px-3 py-1.5 bg-wellbeing-green hover:bg-wellbeing-green-dark text-white text-xs rounded transition-colors flex items-center gap-1"
                      >
                        {linkKopiert ? (
                          <><Check className="w-3 h-3" /> Kopiert</>
                        ) : (
                          <><Copy className="w-3 h-3" /> Kopieren</>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-center pt-1">
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <QRCode value={freigabeUrl} size={140} />
                    </div>
                  </div>

                  <a
                    href={freigabeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center text-xs text-wellbeing-green hover:underline"
                  >
                    Vorschau in neuem Tab öffnen ↗
                  </a>

                  {/* Passwort-Schutz */}
                  <div className="pt-3 border-t border-gray-200">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                      <Lock className="w-3 h-3" /> Passwort-Schutz
                    </label>
                    {passwortGesetzt ? (
                      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded">
                        <span className="text-[11px] text-emerald-800 inline-flex items-center gap-1">
                          <Check className="w-3 h-3" /> Passwort ist aktiv
                        </span>
                        <button
                          type="button"
                          onClick={handlePasswortEntfernen}
                          disabled={freigabeSaving}
                          className="text-[11px] text-red-600 hover:underline"
                        >
                          Entfernen
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <input
                          type="password"
                          value={neuesPasswort}
                          onChange={(e) => setNeuesPasswort(e.target.value)}
                          placeholder="Optional — Passwort setzen"
                          className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-wellbeing-green focus:ring-1 focus:ring-wellbeing-green/30"
                        />
                        <button
                          type="button"
                          onClick={handlePasswortSetzen}
                          disabled={!neuesPasswort.trim() || freigabeSaving}
                          className="px-2 py-1 text-[11px] bg-wellbeing-green hover:bg-wellbeing-green-dark text-white rounded disabled:opacity-50"
                        >
                          Setzen
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Ablaufdatum */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> Ablaufdatum
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="date"
                        value={ablauf ? ablauf.slice(0, 10) : ''}
                        onChange={(e) => {
                          const v = e.target.value
                          if (!v) handleAblaufSetzen(null)
                          else {
                            // Setze Ende des Tages
                            const d = new Date(v + 'T23:59:59')
                            handleAblaufSetzen(d.toISOString())
                          }
                        }}
                        className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-wellbeing-green focus:ring-1 focus:ring-wellbeing-green/30"
                      />
                      {ablauf && (
                        <button
                          type="button"
                          onClick={() => handleAblaufSetzen(null)}
                          className="px-2 py-1 text-[11px] text-red-600 hover:underline"
                        >
                          Entfernen
                        </button>
                      )}
                    </div>
                    {ablauf && (
                      <p className="text-[10px] text-gray-500 mt-1">
                        Link läuft am {new Date(ablauf).toLocaleDateString('de-DE')} ab
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Link-Modal */}
      {linkOffen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => { setLinkOffen(false); setLinkFehler(null); setLinkUrl('') }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col text-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-wellbeing-green" />
                <h2 className="text-base font-medium">Link einfügen</h2>
              </div>
              <button
                type="button"
                onClick={() => { setLinkOffen(false); setLinkFehler(null); setLinkUrl('') }}
                className="p-1 hover:bg-gray-100 rounded"
                aria-label="Schließen"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              <p className="text-xs text-gray-500 mb-2">
                URL einfügen — Titel, Beschreibung und Vorschaubild werden automatisch geladen.
              </p>
              <input
                type="url"
                autoFocus
                value={linkUrl}
                onChange={(e) => { setLinkUrl(e.target.value); setLinkFehler(null) }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && linkUrl.trim() && !linkLaedt) addLinkCard(linkUrl.trim())
                }}
                placeholder="https://..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-wellbeing-green focus:ring-2 focus:ring-wellbeing-green/20"
              />
              {linkFehler && (
                <p className="text-xs text-red-600 mt-2">{linkFehler}</p>
              )}
              <button
                type="button"
                onClick={() => addLinkCard(linkUrl.trim())}
                disabled={!linkUrl.trim() || linkLaedt}
                className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-wellbeing-green hover:bg-wellbeing-green-dark text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {linkLaedt ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Lade Vorschau…</>
                ) : (
                  <>Link hinzufügen</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Versionen-Modal */}
      {versionenOffen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setVersionenOffen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col text-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-wellbeing-green" />
                <h2 className="text-base font-medium">Versionen</h2>
              </div>
              <button
                type="button"
                onClick={() => setVersionenOffen(false)}
                className="p-1 hover:bg-gray-100 rounded"
                aria-label="Schließen"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* Neue Version anlegen */}
              <div className="mb-5 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Plus className="w-4 h-4 text-wellbeing-green" />
                  <h3 className="text-sm font-medium">Neue Version speichern</h3>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={neueVersionName}
                    onChange={(e) => setNeueVersionName(e.target.value)}
                    placeholder={'Versionsname (z. B. „Entwurf 1")'}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-wellbeing-green"
                  />
                  <textarea
                    value={neueVersionBeschr}
                    onChange={(e) => setNeueVersionBeschr(e.target.value)}
                    placeholder="Optionale Beschreibung"
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-wellbeing-green resize-none"
                  />
                  {versionFehler && (
                    <p className="text-xs text-red-600">{versionFehler}</p>
                  )}
                  <button
                    type="button"
                    onClick={speichereNeueVersion}
                    disabled={versionSaving || !neueVersionName.trim()}
                    className="px-3 py-1.5 bg-wellbeing-green hover:bg-wellbeing-green-dark text-white text-xs font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {versionSaving ? 'Speichere…' : 'Version speichern'}
                  </button>
                </div>
              </div>

              {/* Liste */}
              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Gespeicherte Versionen
                  {versionen.length > 0 && <span className="ml-1 text-gray-400">({versionen.length})</span>}
                </h3>
                {versionenLaden ? (
                  <p className="text-sm text-gray-500 py-4 text-center">Lade…</p>
                ) : versionen.length === 0 ? (
                  <p className="text-sm text-gray-500 py-6 text-center">
                    Noch keine Versionen gespeichert.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {versionen.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-wellbeing-green/40 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-800 truncate">{v.name}</div>
                          {v.beschreibung && (
                            <div className="text-xs text-gray-500 mt-0.5">{v.beschreibung}</div>
                          )}
                          <div className="text-[11px] text-gray-400 mt-1">
                            {new Date(v.created_at).toLocaleString('de-DE')}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => stelleVersionWiederHer(v.id)}
                            title="Wiederherstellen"
                            className="p-1.5 text-wellbeing-green hover:bg-wellbeing-green/10 rounded"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => loescheVersion(v.id)}
                            title="Löschen"
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helper-Komponente ────────────────────────────────────────────
function SidebarTab({
  children, onClick, active,
}: {
  children: React.ReactNode
  onClick?: () => void
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative flex-1 flex items-center justify-center gap-1.5 px-2 py-3 text-[11px] font-medium transition-colors
        ${active ? 'text-white' : 'text-[#94c1a4] hover:text-white'}
      `}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-wellbeing-green" />
      )}
    </button>
  )
}

function ProduktInitial({ name }: { name: string }) {
  // Einfacher Hash → konstante Farbe pro Produktname
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 360
  const initialen = name.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '').join('') || '·'
  return (
    <div
      className="w-full h-full flex items-center justify-center text-white text-base font-semibold"
      style={{
        background: `linear-gradient(135deg, hsl(${hash},35%,38%) 0%, hsl(${(hash + 30) % 360},40%,28%) 100%)`,
      }}
    >
      {initialen}
    </div>
  )
}

// ── Properties Panel (rechts) ───────────────────────────────────
const PROP_SWATCHES = [
  '#445c49', '#94c1a4', '#2d3e31', '#f6ede2', '#cba178', '#823509',
  '#ffffff', '#000000', '#9ca3af', '#374151', '#dc2626', '#1d4ed8',
]

interface PropPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj: any
  objVersion: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSet: (prop: string, value: any) => void
  onDuplicate: () => void
  onDelete: () => void
  onForward: () => void
  onBackward: () => void
  onAlign: (dir: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom') => void
  onDistribute: (dir: 'h' | 'v') => void
  onToggleLock: () => void
  onSetMarkierung: (m: Markierung | null) => void
}

function PropertiesPanel({
  obj, objVersion, onSet, onDuplicate, onDelete, onForward, onBackward,
  onAlign, onDistribute, onToggleLock, onSetMarkierung,
}: PropPanelProps) {
  // objVersion erzwingt Re-Render bei Drag/Resize
  void objVersion

  const isText = obj.type === 'i-text' || obj.type === 'IText' || obj.type === 'text'
  const isShape = obj.type === 'rect' || obj.type === 'Rect' || obj.type === 'circle' || obj.type === 'Circle'
  const isImage = obj.type === 'image' || obj.type === 'Image' || obj.type === 'FabricImage'
  const isMulti = obj.type === 'activeselection' || obj.type === 'ActiveSelection'
  const multiCount = isMulti && Array.isArray(obj._objects) ? obj._objects.length : 0

  // Bei Multi-Selektion zeigen wir ein anderes Panel: Align + Distribute
  if (isMulti) {
    return (
      <aside className="w-72 shrink-0 bg-[#0f1f13] border-l border-[#1f3a25] flex flex-col overflow-y-auto">
        <PanelHeader
          title={`${multiCount} Objekte`}
          subtitle="Mehrfachauswahl"
        />
        <div className="p-4 space-y-5">
          <PanelSection label="Horizontal">
            <div className="grid grid-cols-3 gap-1">
              <IconBtn onClick={() => onAlign('left')}    title="Links"><AlignStartHorizontal  className="w-4 h-4" /></IconBtn>
              <IconBtn onClick={() => onAlign('centerH')} title="Mittig"><AlignCenterHorizontal className="w-4 h-4" /></IconBtn>
              <IconBtn onClick={() => onAlign('right')}   title="Rechts"><AlignEndHorizontal    className="w-4 h-4" /></IconBtn>
            </div>
          </PanelSection>
          <PanelSection label="Vertikal">
            <div className="grid grid-cols-3 gap-1">
              <IconBtn onClick={() => onAlign('top')}     title="Oben"><AlignStartVertical  className="w-4 h-4" /></IconBtn>
              <IconBtn onClick={() => onAlign('centerV')} title="Mittig"><AlignCenterVertical className="w-4 h-4" /></IconBtn>
              <IconBtn onClick={() => onAlign('bottom')}  title="Unten"><AlignEndVertical    className="w-4 h-4" /></IconBtn>
            </div>
          </PanelSection>
          {multiCount >= 3 && (
            <PanelSection label="Verteilen">
              <div className="grid grid-cols-2 gap-1">
                <IconBtn onClick={() => onDistribute('h')} title="Horizontal verteilen">
                  <AlignHorizontalDistributeCenter className="w-4 h-4" />
                </IconBtn>
                <IconBtn onClick={() => onDistribute('v')} title="Vertikal verteilen">
                  <AlignVerticalDistributeCenter className="w-4 h-4" />
                </IconBtn>
              </div>
            </PanelSection>
          )}
          <PanelSection label="Aktionen" divider>
            <div className="grid grid-cols-2 gap-1">
              <IconBtn onClick={onDuplicate} title="Duplizieren"><Copy className="w-4 h-4" /></IconBtn>
              <IconBtn onClick={onDelete} title="Alle löschen" danger><Trash2 className="w-4 h-4" /></IconBtn>
            </div>
          </PanelSection>
        </div>
      </aside>
    )
  }

  const left = Math.round(obj.left ?? 0)
  const top  = Math.round(obj.top ?? 0)
  const width  = Math.round((obj.width ?? 0) * (obj.scaleX ?? 1))
  const height = Math.round((obj.height ?? 0) * (obj.scaleY ?? 1))
  const angle = Math.round(obj.angle ?? 0)
  const opacity = Math.round((obj.opacity ?? 1) * 100)
  const fontSize = obj.fontSize ?? 24
  const strokeWidth = obj.strokeWidth ?? 0
  const aktiveMarkierung = obj.data?.markierung as string | undefined

  // Schöner Object-Type-Label
  const typeLabel = (() => {
    if (isText) return 'Text'
    if (isImage) return 'Bild'
    if (obj.type === 'rect' || obj.type === 'Rect') return 'Rechteck'
    if (obj.type === 'circle' || obj.type === 'Circle') return 'Kreis'
    if (obj.type === 'group' || obj.type === 'Group') return 'Gruppe'
    return obj.type
  })()

  return (
    <aside className="w-72 shrink-0 bg-[#0f1f13] border-l border-[#1f3a25] flex flex-col overflow-y-auto">
      <PanelHeader
        title="Eigenschaften"
        subtitle={typeLabel}
        markierung={aktiveMarkierung}
      />

      <div className="p-4 space-y-5">
        {/* Position & Größe */}
        <div className="space-y-2.5">
          <PanelLabel>Position</PanelLabel>
          <div className="grid grid-cols-2 gap-2">
            <CompactInput label="X" value={left} onChange={(v) => onSet('left', v)} />
            <CompactInput label="Y" value={top}  onChange={(v) => onSet('top', v)} />
          </div>
          {!isImage && (
            <div className="grid grid-cols-2 gap-2">
              <CompactInput label="W" value={width}  onChange={(v) => {
                if ((obj.width ?? 0) > 0) onSet('scaleX', v / obj.width)
              }} />
              <CompactInput label="H" value={height} onChange={(v) => {
                if ((obj.height ?? 0) > 0) onSet('scaleY', v / obj.height)
              }} />
            </div>
          )}
        </div>

        {/* Rotation + Deckkraft als Slim-Slider */}
        <div className="space-y-3">
          <SlimSlider
            label="Rotation"
            min={-180}
            max={180}
            value={angle}
            unit="°"
            onChange={(v) => onSet('angle', v)}
          />
          <SlimSlider
            label="Deckkraft"
            min={0}
            max={100}
            value={opacity}
            unit="%"
            onChange={(v) => onSet('opacity', v / 100)}
          />
        </div>

        {/* Farbe (Shape oder Text) */}
        {(isShape || isText) && (
          <PanelSection label={isText ? 'Textfarbe' : 'Füllung'} divider>
            <div className="grid grid-cols-6 gap-1.5 mb-2">
              {PROP_SWATCHES.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => onSet('fill', hex)}
                  title={hex}
                  className={`aspect-square rounded-md border border-white/10 transition-all hover:scale-110 ${
                    obj.fill === hex ? 'ring-2 ring-white' : ''
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
            <ColorPickerRow
              value={typeof obj.fill === 'string' ? obj.fill : '#000000'}
              onChange={(v) => onSet('fill', v)}
            />
          </PanelSection>
        )}

        {/* Text-spezifisch */}
        {isText && (
          <PanelSection label="Typografie" divider>
            <SlimSlider
              label="Größe"
              min={10}
              max={96}
              value={fontSize}
              unit="px"
              onChange={(v) => onSet('fontSize', v)}
            />
            <div className="flex gap-1 mt-2.5">
              <ToggleBtn active={obj.fontWeight === 'bold'} onClick={() =>
                onSet('fontWeight', obj.fontWeight === 'bold' ? 'normal' : 'bold')
              } title="Fett">
                <strong className="text-sm">B</strong>
              </ToggleBtn>
              <ToggleBtn active={obj.fontStyle === 'italic'} onClick={() =>
                onSet('fontStyle', obj.fontStyle === 'italic' ? 'normal' : 'italic')
              } title="Kursiv">
                <em className="text-sm">I</em>
              </ToggleBtn>
              <ToggleBtn active={obj.underline === true} onClick={() =>
                onSet('underline', !obj.underline)
              } title="Unterstrichen">
                <u className="text-sm">U</u>
              </ToggleBtn>
            </div>
          </PanelSection>
        )}

        {/* Shape: Kontur */}
        {isShape && (
          <PanelSection label="Kontur" divider>
            <SlimSlider
              label="Stärke"
              min={0}
              max={12}
              value={strokeWidth}
              unit="px"
              onChange={(v) => onSet('strokeWidth', v)}
            />
          </PanelSection>
        )}

        {/* Markierung (Voting) als Emoji-Bar */}
        <PanelSection label="Markierung" divider>
          <div className="flex gap-1">
            {MARKIERUNGEN.map((m) => {
              const aktiv = aktiveMarkierung === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSetMarkierung(aktiv ? null : m.id)}
                  title={m.label}
                  className={`
                    flex-1 aspect-square rounded-md text-lg flex items-center justify-center transition-all
                    ${aktiv
                      ? 'bg-white/10 ring-2 ring-white scale-105'
                      : 'bg-black/20 hover:bg-white/5 hover:scale-105'}
                  `}
                >
                  {m.emoji}
                </button>
              )
            })}
          </div>
          {aktiveMarkierung && (
            <p className="text-[10px] text-[#94c1a4] mt-2 text-center">
              {MARKIERUNGEN.find((m) => m.id === aktiveMarkierung)?.label}
              {' · '}
              <button
                type="button"
                onClick={() => onSetMarkierung(null)}
                className="hover:text-white underline underline-offset-2"
              >
                entfernen
              </button>
            </p>
          )}
        </PanelSection>

        {/* Layer + Aktionen — kompakter Icon-Strip */}
        <PanelSection label="Aktionen" divider>
          {/* Lock-Toggle (full-width, breiter Akzent) */}
          <button
            type="button"
            onClick={onToggleLock}
            className={`
              w-full flex items-center justify-center gap-1.5 px-2 py-2 text-[11px] font-medium rounded-md transition-colors mb-2
              ${obj.lockMovementX
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-black/20 text-[#c8dbc9] border border-transparent hover:bg-white/5'}
            `}
          >
            {obj.lockMovementX ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            {obj.lockMovementX ? 'Entsperren' : 'Sperren'}
          </button>
          {/* Icon-Strip: Layer + Aktionen */}
          <div className="grid grid-cols-4 gap-1">
            <IconBtn onClick={onForward}   title="Eine Ebene vor"><ChevronUp     className="w-4 h-4" /></IconBtn>
            <IconBtn onClick={onBackward}  title="Eine Ebene zurück"><ChevronDown className="w-4 h-4" /></IconBtn>
            <IconBtn onClick={onDuplicate} title="Duplizieren"><Copy className="w-4 h-4" /></IconBtn>
            <IconBtn onClick={onDelete}    title="Löschen" danger><Trash2 className="w-4 h-4" /></IconBtn>
          </div>
        </PanelSection>

        {/* Produkt-Info wenn verknuepft */}
        {obj.data?.produkt_name && (
          <PanelSection label="Verknüpftes Produkt" divider>
            <div className="bg-black/20 border border-[#1f3a25] rounded-md px-2.5 py-2 flex items-center gap-2">
              <Package className="w-3.5 h-3.5 text-[#94c1a4] shrink-0" />
              <span className="text-xs text-white truncate">{obj.data.produkt_name}</span>
            </div>
          </PanelSection>
        )}
      </div>
    </aside>
  )
}

// ── Properties-Panel: moderne Helper-Komponenten ─────────────────

const MARKIERUNG_EMOJI: Record<string, string> = {
  favorit: '⭐', gefaellt: '👍', passt_nicht: '👎', final: '✅', unsicher: '❓',
}

function PanelHeader({
  title, subtitle, markierung,
}: {
  title:    string
  subtitle?: string
  markierung?: string
}) {
  return (
    <div className="px-4 pt-4 pb-3 border-b border-[#1f3a25]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[#94c1a4]/70 font-semibold">
            {title}
          </div>
          {subtitle && (
            <div className="text-sm text-white font-medium mt-0.5 truncate">{subtitle}</div>
          )}
        </div>
        {markierung && (
          <div
            className="w-7 h-7 rounded-full bg-white/10 ring-2 ring-white/20 flex items-center justify-center text-base shrink-0"
            title="Markierung gesetzt"
          >
            {MARKIERUNG_EMOJI[markierung] ?? '•'}
          </div>
        )}
      </div>
    </div>
  )
}

function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.15em] text-[#94c1a4]/70 font-semibold">
      {children}
    </div>
  )
}

function PanelSection({
  label, children, divider,
}: {
  label: string
  children: React.ReactNode
  divider?: boolean
}) {
  return (
    <div className={divider ? 'pt-4 border-t border-white/[0.06]' : ''}>
      <PanelLabel>{label}</PanelLabel>
      <div className="mt-2.5">{children}</div>
    </div>
  )
}

/** Kompakter Number-Input für Position/Größe — Label inline links, weniger Whitespace */
function CompactInput({
  label, value, onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center bg-black/30 border border-[#1f3a25] rounded-md focus-within:border-wellbeing-green-light focus-within:ring-1 focus-within:ring-wellbeing-green-light/30 transition-colors">
      <span className="text-[10px] text-[#94c1a4]/70 font-semibold pl-2 pr-1.5 select-none">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (!Number.isNaN(n)) onChange(n)
        }}
        className="w-full bg-transparent py-1.5 pr-2 text-xs text-white focus:outline-none tabular-nums"
      />
    </div>
  )
}

/** Schlanker Slider mit Track + Wert inline rechts (Figma/Linear-Stil) */
function SlimSlider({
  label, min, max, value, unit, onChange,
}: {
  label:  string
  min:    number
  max:    number
  value:  number
  unit?:  string
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <PanelLabel>{label}</PanelLabel>
        <span className="text-[11px] text-white tabular-nums">
          {value}{unit ?? ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="moodboard-slider w-full"
      />
    </div>
  )
}

/** Color-Picker mit aktueller Farbe + HEX-Anzeige (kompakt) */
function ColorPickerRow({
  value, onChange,
}: {
  value:  string
  onChange: (v: string) => void
}) {
  return (
    <label className="flex items-center gap-2 bg-black/30 border border-[#1f3a25] rounded-md px-2 py-1.5 cursor-pointer hover:border-wellbeing-green-light transition-colors">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-5 h-5 rounded border-0 cursor-pointer bg-transparent appearance-none"
        style={{ padding: 0 }}
      />
      <span className="text-[11px] text-white tabular-nums uppercase">{value}</span>
      <span className="text-[10px] text-[#94c1a4]/60 ml-auto">Eigene Farbe</span>
    </label>
  )
}

/** Modern Toggle-Button (B/I/U) */
function ToggleBtn({
  children, onClick, active, title,
}: {
  children: React.ReactNode
  onClick?: () => void
  active?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`
        flex-1 h-9 rounded-md flex items-center justify-center transition-all
        ${active
          ? 'bg-white text-[#0f1f13] shadow-sm'
          : 'bg-black/20 text-[#c8dbc9] hover:bg-white/5 hover:text-white'}
      `}
    >
      {children}
    </button>
  )
}

/** Kompakter Icon-Button (für Layer-Strip + Align/Distribute) */
function IconBtn({
  children, onClick, title, danger,
}: {
  children: React.ReactNode
  onClick?: () => void
  title?: string
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`
        flex items-center justify-center h-9 rounded-md transition-colors
        ${danger
          ? 'bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200'
          : 'bg-black/20 text-[#c8dbc9] hover:bg-white/5 hover:text-white'}
      `}
    >
      {children}
    </button>
  )
}

function ToolGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-0.5 bg-black/20 rounded-md p-0.5">
      {children}
    </div>
  )
}

function ToolDivider() {
  return <div className="h-6 w-px bg-[#1f3a25]" />
}

function SaveBadge({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (status === 'idle') {
    return (
      <span className="hidden lg:inline-flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase tracking-wider text-[#94c1a4]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#94c1a4]/40" />
        Auto-Save
      </span>
    )
  }
  if (status === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase tracking-wider text-[#94c1a4]">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        Speichere
      </span>
    )
  }
  if (status === 'saved') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase tracking-wider text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Gespeichert
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase tracking-wider text-red-400">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
      Fehler
    </span>
  )
}

function ToolBtn({
  children, onClick, active, title, small, loading,
}: {
  children: React.ReactNode
  onClick?: () => void
  active?: boolean
  title?: string
  small?: boolean
  loading?: boolean
}) {
  const size = small ? 'w-7 h-7' : 'w-8 h-8'
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`
        relative flex items-center justify-center ${size} rounded transition-colors
        ${active
          ? 'bg-wellbeing-green text-white shadow-sm'
          : 'text-[#c8dbc9] hover:bg-white/5 hover:text-white'}
      `}
    >
      {children}
      {loading && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
      )}
    </button>
  )
}
