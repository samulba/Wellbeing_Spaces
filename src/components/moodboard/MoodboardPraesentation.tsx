'use client'

/**
 * MoodboardPraesentation – Read-only Fabric.js Canvas fuer die oeffentliche
 * Kunden-Freigabe-Seite. Auto-Fit beim Laden, Zoom (Mausrad/Pinch) + Pan,
 * keine Auswahl/Bearbeitung.
 */

import { useEffect, useRef, useState } from 'react'
import { ZoomIn, ZoomOut, Maximize2, Download } from 'lucide-react'

interface Props {
  canvasJson: Record<string, unknown> | null
  name: string
}

const MIN_ZOOM = 0.1
const MAX_ZOOM = 5

export default function MoodboardPraesentation({ canvasJson, name }: Props) {
  const canvasElRef  = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fabricRef    = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fabricImpRef = useRef<any>(null)
  const fitRef       = useRef<() => void>(() => {})
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    if (!canvasElRef.current || !containerRef.current) return
    let disposed = false

    import('fabric').then((fabric) => {
      if (disposed || !canvasElRef.current) return
      fabricImpRef.current = fabric
      const { Canvas, Point } = fabric
      const cont = containerRef.current!

      const canvas = new Canvas(canvasElRef.current!, {
        selection: false,
        preserveObjectStacking: true,
        backgroundColor: '#f5f5f0',
        stopContextMenu: true,
      })
      fabricRef.current = canvas

      function resize() {
        canvas.setWidth(cont.clientWidth)
        canvas.setHeight(cont.clientHeight)
        canvas.requestRenderAll()
      }
      resize()
      const ro = new ResizeObserver(() => { resize(); fitRef.current() })
      ro.observe(cont)

      // Zoom (Mausrad + Pinch)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.on('mouse:wheel', (opt: any) => {
        const e = opt.e as WheelEvent
        e.preventDefault(); e.stopPropagation()
        let z = canvas.getZoom()
        z *= (e.ctrlKey || e.metaKey) ? 0.99 ** e.deltaY : 0.999 ** e.deltaY
        z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))
        canvas.zoomToPoint(new Point(e.offsetX, e.offsetY), z)
        setZoom(Math.round(z * 100) / 100)
      })

      // Pan via Drag (linke Maustaste, da kein Select)
      let isPanning = false
      let lastX = 0, lastY = 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.on('mouse:down', (opt: any) => {
        const e = opt.e as MouseEvent
        isPanning = true
        lastX = e.clientX; lastY = e.clientY
        cont.style.cursor = 'grabbing'
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.on('mouse:move', (opt: any) => {
        if (!isPanning) return
        const e = opt.e as MouseEvent
        canvas.relativePan(new Point(e.clientX - lastX, e.clientY - lastY))
        lastX = e.clientX; lastY = e.clientY
      })
      canvas.on('mouse:up', () => {
        isPanning = false
        cont.style.cursor = 'grab'
      })

      cont.style.cursor = 'grab'

      // Fit-to-view
      function fitToView() {
        const objs = canvas.getObjects()
        if (objs.length === 0) return
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        objs.forEach((o: any) => {
          const r = o.getBoundingRect()
          minX = Math.min(minX, r.left)
          minY = Math.min(minY, r.top)
          maxX = Math.max(maxX, r.left + r.width)
          maxY = Math.max(maxY, r.top + r.height)
        })
        const PAD = 40
        const w = maxX - minX + 2 * PAD
        const h = maxY - minY + 2 * PAD
        const cw = canvas.getWidth(), ch = canvas.getHeight()
        const scale = Math.min(cw / w, ch / h, 1)
        canvas.setViewportTransform([
          scale, 0, 0, scale,
          (cw - (maxX + minX) * scale) / 2,
          (ch - (maxY + minY) * scale) / 2,
        ])
        setZoom(Math.round(scale * 100) / 100)
        canvas.requestRenderAll()
      }
      fitRef.current = fitToView

      if (canvasJson) {
        canvas.loadFromJSON(canvasJson, () => {
          // Disable interaction on each object
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          canvas.getObjects().forEach((o: any) => {
            o.selectable = false
            o.evented = false
            o.hasControls = false
          })
          canvas.requestRenderAll()
          setTimeout(fitToView, 100)
        })
      }

      return () => {
        ro.disconnect()
      }
    })

    return () => {
      disposed = true
      const c = fabricRef.current
      if (c) { try { c.dispose() } catch { /* noop */ } }
      fabricRef.current = null
    }
  }, [canvasJson])

  function handleZoomIn() {
    const c = fabricRef.current; if (!c) return
    const fabric = fabricImpRef.current
    const z = Math.min(MAX_ZOOM, c.getZoom() * 1.2)
    c.zoomToPoint(new fabric.Point(c.getWidth()/2, c.getHeight()/2), z)
    setZoom(Math.round(z * 100) / 100)
  }
  function handleZoomOut() {
    const c = fabricRef.current; if (!c) return
    const fabric = fabricImpRef.current
    const z = Math.max(MIN_ZOOM, c.getZoom() / 1.2)
    c.zoomToPoint(new fabric.Point(c.getWidth()/2, c.getHeight()/2), z)
    setZoom(Math.round(z * 100) / 100)
  }

  function exportPng() {
    const canvas = fabricRef.current
    if (!canvas) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const objs = canvas.getObjects() as any[]
    if (objs.length === 0) return
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    objs.forEach((o) => {
      const r = o.getBoundingRect()
      minX = Math.min(minX, r.left); minY = Math.min(minY, r.top)
      maxX = Math.max(maxX, r.left + r.width); maxY = Math.max(maxY, r.top + r.height)
    })
    const PAD = 40
    const w = maxX - minX + 2 * PAD
    const h = maxY - minY + 2 * PAD
    const oldVp = canvas.viewportTransform.slice()
    canvas.setViewportTransform([1, 0, 0, 1, -minX + PAD, -minY + PAD])
    const dataUrl = canvas.toDataURL({
      format: 'png', multiplier: 2,
      left: 0, top: 0, width: w, height: h,
    })
    canvas.setViewportTransform(oldVp)
    canvas.requestRenderAll()
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `moodboard-${name.replace(/\s+/g, '-')}.png`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 relative overflow-hidden bg-[#f5f5f0]" ref={containerRef}>
        <canvas ref={canvasElRef} />

        {/* Zoom-Controls */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-sm px-1 py-1">
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 rounded"
            title="Verkleinern"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-600 px-2 min-w-[44px] text-center tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 rounded"
            title="Vergrößern"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-gray-200 mx-0.5" />
          <button
            type="button"
            onClick={() => fitRef.current()}
            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 rounded"
            title="Einpassen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={exportPng}
            className="w-8 h-8 flex items-center justify-center text-wellbeing-green hover:bg-wellbeing-green/10 rounded"
            title="Als PNG herunterladen"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
