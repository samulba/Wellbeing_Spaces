'use client'

/**
 * MoodboardVorschau – kleine read-only Mini-Vorschau eines Moodboards.
 * Wird in der Uebersicht und auf Detailseiten als Card-Thumbnail genutzt.
 * Rendert den canvas_json mit auto-fit auf den verfuegbaren Bereich.
 */

import { useEffect, useRef, useState } from 'react'

interface Props {
  canvasJson: Record<string, unknown> | null
  /** Hoehe der Vorschau in px (default 200) */
  hoehe?: number
  className?: string
}

export default function MoodboardVorschau({
  canvasJson, hoehe = 200, className = '',
}: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [istLeer, setIstLeer]     = useState(false)

  useEffect(() => {
    const el = canvasRef.current
    const cont = containerRef.current
    if (!el || !cont) return
    let disposed = false

    if (!canvasJson) {
      setIstLeer(true); setIsLoading(false)
      return
    }

    import('fabric').then(async (fabric) => {
      if (disposed || !canvasRef.current) return
      const { Canvas } = fabric

      const w = cont.clientWidth || 320
      el.width  = w
      el.height = hoehe

      const canvas = new Canvas(el, {
        width: w, height: hoehe,
        selection: false, interactive: false,
        renderOnAddRemove: false,
        backgroundColor: '#fafaf7',
      })

      try {
        await canvas.loadFromJSON(canvasJson)
      } catch { /* noop */ }

      // Alle Objekte nicht interaktiv setzen
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvas.getObjects().forEach((o: any) => {
        o.selectable = false; o.evented = false; o.hoverCursor = 'default'
      })

      // Fit-to-View
      const allObjs = canvas.getObjects()
      if (allObjs.length === 0) {
        if (!disposed) { setIstLeer(true); setIsLoading(false) }
        canvas.dispose()
        return
      }

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      allObjs.forEach((o: any) => {
        const b = o.getBoundingRect()
        minX = Math.min(minX, b.left)
        minY = Math.min(minY, b.top)
        maxX = Math.max(maxX, b.left + b.width)
        maxY = Math.max(maxY, b.top + b.height)
      })
      const pad = 16
      const contentW = maxX - minX || 1
      const contentH = maxY - minY || 1
      const scaleX = (w - pad * 2) / contentW
      const scaleY = (hoehe - pad * 2) / contentH
      const z = Math.min(scaleX, scaleY, 1)
      const cx = (minX + maxX) / 2
      const cy = (minY + maxY) / 2
      canvas.setViewportTransform([
        z, 0, 0, z,
        w / 2 - cx * z,
        hoehe / 2 - cy * z,
      ])
      canvas.requestRenderAll()
      if (!disposed) setIsLoading(false)

      return () => { disposed = true; canvas.dispose() }
    })

    return () => { disposed = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasJson, hoehe])

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width: '100%', height: hoehe, background: '#fafaf7' }}
    >
      {isLoading && !istLeer && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-wellbeing-green/20 border-t-wellbeing-green rounded-full animate-spin" />
        </div>
      )}
      {istLeer && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
          <div className="w-8 h-8 rounded-lg bg-wellbeing-cream flex items-center justify-center mb-1.5">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-wellbeing-green/60" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-4.96-4.49-9-10-9zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 8 6.5 8 8 8.67 8 9.5 7.33 11 6.5 11zm3-4C8.67 7 8 6.33 8 5.5S8.67 4 9.5 4s1.5.67 1.5 1.5S10.33 7 9.5 7zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 4 14.5 4s1.5.67 1.5 1.5S15.33 7 14.5 7zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 8 17.5 8s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
            </svg>
          </div>
          <span className="text-[10px] uppercase tracking-wider">Leer</span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={isLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}
        style={{ display: 'block' }}
      />
    </div>
  )
}
