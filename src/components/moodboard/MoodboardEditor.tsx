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
  RotateCcw, Share2, Copy, Check, MessageCircle,
} from 'lucide-react'
import QRCode from 'react-qr-code'
import {
  moodboardSpeichern, moodboardBildHochladen,
  moodboardVersionSpeichern, getMoodboardVersionen,
  moodboardVersionLoeschen, moodboardVersionWiederherstellen,
  moodboardFreigabeAktualisieren,
} from '@/app/actions/moodboard'
import type { MoodboardVersion } from '@/lib/supabase/types'
import MoodboardWelcome from './MoodboardWelcome'
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
  produkte: Array<{
    id: string
    name: string
    kategorie: string | null
    bild_url: string | null
    verkaufspreis: number | null
  }>
}

type Tool = 'select' | 'text' | 'rect' | 'circle'

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

export default function MoodboardEditor({
  moodboardId, raumId, projektId, raumName, boardName,
  initialCanvasJson, produkte,
  freigabeAktiv: initialFreigabeAktiv,
  freigabeKommentareAktiv: initialFreigabeKommentareAktiv,
  freigabeToken,
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
  const [istLeer, setIstLeer] = useState(true)
  const [hintGeschlossen, setHintGeschlossen] = useState(false)

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
        backgroundColor: '#f5f5f0',
      })
      fabricRef.current = canvas
      canvas.selectionColor       = 'rgba(68,92,73,0.08)'
      canvas.selectionBorderColor = '#445c49'
      canvas.selectionLineWidth   = 1.5

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

        // Tool-spezifische Aktionen
        const t = toolRef.current
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
          cont.style.cursor = 'default'
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
      canvas.on('object:modified', () => { pushHistory(); scheduleSave(); bumpObjVersion() })
      canvas.on('object:added',    () => { if (!skipHistoryRef.current) { pushHistory(); scheduleSave() } updateLeer() })
      canvas.on('object:removed',  () => { if (!skipHistoryRef.current) { pushHistory(); scheduleSave() } updateLeer() })

      // ── Selection-Events fuer rechte Sidebar ─────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.on('selection:created', (e: any) => setActiveObj(e.selected?.[0] ?? canvas.getActiveObject() ?? null))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.on('selection:updated', (e: any) => setActiveObj(e.selected?.[0] ?? canvas.getActiveObject() ?? null))
      canvas.on('selection:cleared', () => setActiveObj(null))
      canvas.on('object:scaling',  () => bumpObjVersion())
      canvas.on('object:moving',   () => bumpObjVersion())
      canvas.on('object:rotating', () => bumpObjVersion())

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

  // ── Bild-Upload ────────────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('bild', file)
    const r = await moodboardBildHochladen(raumId, fd)
    setUploading(false)
    e.target.value = ''
    if (r.fehler || !r.url) { alert(r.fehler ?? 'Upload fehlgeschlagen.'); return }
    addImageToCanvas(r.url)
  }

  function addImageToCanvas(url: string) {
    const canvas = fabricRef.current
    const fabric = fabricImportRef.current
    if (!canvas || !fabric) return
    fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((img: any) => {
        const max = 320
        const scale = Math.min(max / (img.width || max), max / (img.height || max), 1)
        img.set({
          left: -((img.width || 0) * scale) / 2 + canvas.getWidth() / 2,
          top:  -((img.height || 0) * scale) / 2 + canvas.getHeight() / 2,
          scaleX: scale, scaleY: scale,
        })
        canvas.add(img)
        canvas.setActiveObject(img)
        canvas.requestRenderAll()
        pushHistory()
        scheduleSave()
      })
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
  async function handleFreigabeSpeichern(neuAktiv: boolean, neuKommentare: boolean) {
    setFreigabeSaving(true)
    const r = await moodboardFreigabeAktualisieren(moodboardId, neuAktiv, neuKommentare)
    setFreigabeSaving(false)
    if (r.fehler) { alert(r.fehler); return }
    setFreigabeAktiv(neuAktiv)
    setFreigabeKommentare(neuKommentare)
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
      <div className="flex items-center gap-2 px-3 h-14 border-b border-[#1f3a25] bg-[#1a2e1e] shrink-0">
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
            <ToolBtn onClick={oeffneVersionenModal} title="Versionen">
              <History className="w-[18px] h-[18px]" />
            </ToolBtn>
            <ToolBtn onClick={exportPng} title="Als PNG exportieren">
              <Download className="w-[18px] h-[18px]" />
            </ToolBtn>
          </ToolGroup>
        </div>

        {/* Rechts: Save-Status + Zoom + Freigabe */}
        <div className="flex items-center gap-2">
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
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Hauptbereich: Sidebar + Canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Linke Sidebar */}
        <aside className="w-72 shrink-0 bg-[#1a2e1e] border-r border-[#1f3a25] flex flex-col">
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
        <div className="flex-1 relative overflow-hidden" ref={containerRef}>
          <canvas ref={canvasElRef} />

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

          {/* Status-Bar (dezenter) */}
          <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-black/50 text-[10px] text-[#c8dbc9]/80 backdrop-blur-sm flex items-center gap-2">
            <span className="uppercase tracking-wider">{tool}</span>
            <span className="text-[#94c1a4]/40">·</span>
            <span>Space + Drag zum Verschieben · Mausrad zum Zoomen</span>
          </div>
        </div>

        {/* Rechte Sidebar – nur wenn etwas selektiert ist */}
        {activeObj && (
          <PropertiesPanel
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            obj={activeObj as any}
            objVersion={objVersion}
            onSet={setObjProp}
            onDuplicate={duplicateActive}
            onDelete={deleteActive}
            onForward={bringForward}
            onBackward={sendBackwards}
          />
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
                </div>
              )}
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
}

function PropertiesPanel({
  obj, objVersion, onSet, onDuplicate, onDelete, onForward, onBackward,
}: PropPanelProps) {
  // objVersion erzwingt Re-Render bei Drag/Resize
  void objVersion

  const isText = obj.type === 'i-text' || obj.type === 'IText' || obj.type === 'text'
  const isShape = obj.type === 'rect' || obj.type === 'Rect' || obj.type === 'circle' || obj.type === 'Circle'
  const isImage = obj.type === 'image' || obj.type === 'Image' || obj.type === 'FabricImage'

  const left = Math.round(obj.left ?? 0)
  const top  = Math.round(obj.top ?? 0)
  const width  = Math.round((obj.width ?? 0) * (obj.scaleX ?? 1))
  const height = Math.round((obj.height ?? 0) * (obj.scaleY ?? 1))
  const angle = Math.round(obj.angle ?? 0)
  const opacity = Math.round((obj.opacity ?? 1) * 100)

  return (
    <aside className="w-64 shrink-0 bg-[#2d3e31] border-l border-[#445c49]/30 flex flex-col overflow-y-auto">
      <div className="px-3 py-2 border-b border-[#445c49]/30 flex items-center justify-between">
        <span className="text-xs text-white font-medium">Eigenschaften</span>
        <span className="text-[10px] text-[#94c1a4] uppercase">{obj.type}</span>
      </div>

      <div className="p-3 space-y-4">
        {/* Position + Größe */}
        <div>
          <label className="block text-[10px] text-[#94c1a4] uppercase tracking-wide mb-1.5">Position</label>
          <div className="grid grid-cols-2 gap-2">
            <NumInput label="X"      value={left}   onChange={(v) => onSet('left', v)} />
            <NumInput label="Y"      value={top}    onChange={(v) => onSet('top', v)} />
          </div>
        </div>

        {!isImage && (
          <div>
            <label className="block text-[10px] text-[#94c1a4] uppercase tracking-wide mb-1.5">Größe</label>
            <div className="grid grid-cols-2 gap-2">
              <NumInput label="B" value={width}  onChange={(v) => {
                if ((obj.width ?? 0) > 0) onSet('scaleX', v / obj.width)
              }} />
              <NumInput label="H" value={height} onChange={(v) => {
                if ((obj.height ?? 0) > 0) onSet('scaleY', v / obj.height)
              }} />
            </div>
          </div>
        )}

        {/* Rotation + Deckkraft */}
        <div>
          <label className="block text-[10px] text-[#94c1a4] uppercase tracking-wide mb-1.5">Rotation</label>
          <input
            type="range" min={-180} max={180} value={angle}
            onChange={(e) => onSet('angle', Number(e.target.value))}
            className="w-full accent-[#94c1a4]"
          />
          <div className="text-[11px] text-[#c8dbc9] text-right">{angle}°</div>
        </div>

        <div>
          <label className="block text-[10px] text-[#94c1a4] uppercase tracking-wide mb-1.5">Deckkraft</label>
          <input
            type="range" min={0} max={100} value={opacity}
            onChange={(e) => onSet('opacity', Number(e.target.value) / 100)}
            className="w-full accent-[#94c1a4]"
          />
          <div className="text-[11px] text-[#c8dbc9] text-right">{opacity}%</div>
        </div>

        {/* Farbe (Shape oder Text) */}
        {(isShape || isText) && (
          <div>
            <label className="block text-[10px] text-[#94c1a4] uppercase tracking-wide mb-1.5">
              {isText ? 'Textfarbe' : 'Füllung'}
            </label>
            <div className="grid grid-cols-6 gap-1.5 mb-2">
              {PROP_SWATCHES.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => onSet('fill', hex)}
                  title={hex}
                  className="aspect-square rounded border border-black/10 hover:scale-110 transition-transform"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
            <input
              type="color"
              value={typeof obj.fill === 'string' ? obj.fill : '#000000'}
              onChange={(e) => onSet('fill', e.target.value)}
              className="w-full h-8 rounded border-0 bg-transparent cursor-pointer"
            />
          </div>
        )}

        {/* Text-spezifisch */}
        {isText && (
          <>
            <div>
              <label className="block text-[10px] text-[#94c1a4] uppercase tracking-wide mb-1.5">Schriftgröße</label>
              <input
                type="range" min={10} max={96} value={obj.fontSize ?? 24}
                onChange={(e) => onSet('fontSize', Number(e.target.value))}
                className="w-full accent-[#94c1a4]"
              />
              <div className="text-[11px] text-[#c8dbc9] text-right">{obj.fontSize ?? 24} px</div>
            </div>
            <div>
              <label className="block text-[10px] text-[#94c1a4] uppercase tracking-wide mb-1.5">Stil</label>
              <div className="flex gap-1">
                <StyleBtn active={obj.fontWeight === 'bold'} onClick={() =>
                  onSet('fontWeight', obj.fontWeight === 'bold' ? 'normal' : 'bold')
                }>
                  <strong>B</strong>
                </StyleBtn>
                <StyleBtn active={obj.fontStyle === 'italic'} onClick={() =>
                  onSet('fontStyle', obj.fontStyle === 'italic' ? 'normal' : 'italic')
                }>
                  <em>I</em>
                </StyleBtn>
                <StyleBtn active={obj.underline === true} onClick={() =>
                  onSet('underline', !obj.underline)
                }>
                  <u>U</u>
                </StyleBtn>
              </div>
            </div>
          </>
        )}

        {/* Shape: Kontur */}
        {isShape && (
          <div>
            <label className="block text-[10px] text-[#94c1a4] uppercase tracking-wide mb-1.5">Konturbreite</label>
            <input
              type="range" min={0} max={12} value={obj.strokeWidth ?? 0}
              onChange={(e) => onSet('strokeWidth', Number(e.target.value))}
              className="w-full accent-[#94c1a4]"
            />
            <div className="text-[11px] text-[#c8dbc9] text-right">{obj.strokeWidth ?? 0} px</div>
          </div>
        )}

        {/* Layer + Aktionen */}
        <div className="pt-3 border-t border-[#445c49]/30">
          <div className="grid grid-cols-2 gap-1.5 mb-1.5">
            <PanelBtn onClick={onForward}>Eine Ebene vor</PanelBtn>
            <PanelBtn onClick={onBackward}>Eine Ebene zurück</PanelBtn>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <PanelBtn onClick={onDuplicate}>Duplizieren</PanelBtn>
            <PanelBtn onClick={onDelete} danger>Löschen</PanelBtn>
          </div>
        </div>

        {/* Produkt-Info wenn verknuepft */}
        {obj.data?.produkt_name && (
          <div className="pt-3 border-t border-[#445c49]/30">
            <label className="block text-[10px] text-[#94c1a4] uppercase tracking-wide mb-1.5">Verknüpftes Produkt</label>
            <div className="text-xs text-white">{obj.data.produkt_name}</div>
          </div>
        )}
      </div>
    </aside>
  )
}

function NumInput({
  label, value, onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="text-[10px] text-[#94c1a4] mb-0.5">{label}</div>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (!Number.isNaN(n)) onChange(n)
        }}
        className="w-full px-2 py-1 text-xs bg-[#1a2e1e] border border-[#445c49]/40 rounded text-[#c8dbc9] focus:outline-none focus:border-[#94c1a4]"
      />
    </div>
  )
}

function StyleBtn({
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
        w-9 h-9 rounded text-sm transition-colors
        ${active ? 'bg-[#445c49] text-white' : 'bg-[#1a2e1e] text-[#c8dbc9] hover:bg-[#3a5240]'}
      `}
    >
      {children}
    </button>
  )
}

function PanelBtn({
  children, onClick, danger,
}: {
  children: React.ReactNode
  onClick?: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        px-2 py-1.5 text-[11px] rounded transition-colors
        ${danger
          ? 'bg-red-900/30 text-red-300 hover:bg-red-900/50'
          : 'bg-[#1a2e1e] text-[#c8dbc9] hover:bg-[#3a5240]'}
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
