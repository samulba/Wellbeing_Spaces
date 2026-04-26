'use client'

/**
 * Grid-Layer fuer das Moodboard. Rendert ein Punkt-Raster hinter dem Canvas,
 * das mit Pan + Zoom mitfliegt.
 *
 * IMPLEMENTATION-DETAIL: Wir nutzen einen ref-Lookup pro Render statt
 * fabricRef.current direkt im Editor — defensiver gegen null/undefined,
 * blendet sich bei screenSize<6px aus (Moire-Schutz).
 */

import { useEffect, useState } from 'react'

interface Props {
  /** Pixel-Groesse des Grids in Welt-Koordinaten (0 = aus). */
  gridSize: number
  /** Counter der bei jedem after:render Hochzaehlt → erzwingt Re-Render. */
  viewportTick: number
  /** Ref auf das Fabric-Canvas. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fabricRef: { current: any | null }
}

export default function MoodboardGridLayer({ gridSize, viewportTick, fabricRef }: Props) {
  // Mit useState + useEffect erzwingen wir, dass wir das Ref erst NACH dem
  // ersten Render lesen — vermeidet Hydration-Probleme.
  const [, force] = useState(0)
  useEffect(() => {
    void viewportTick
    force((n) => n + 1)
  }, [viewportTick])

  if (gridSize <= 0) return null

  const canvas = fabricRef.current
  if (!canvas) return null

  // viewportTransform sicher auslesen
  const vpt = canvas.viewportTransform
  if (!Array.isArray(vpt) || vpt.length < 6) return null

  const z = Number(vpt[0]) || 1
  const screenSize = gridSize * z
  if (!Number.isFinite(screenSize) || screenSize < 6) return null

  const tx = Number(vpt[4]) || 0
  const ty = Number(vpt[5]) || 0
  const offX = tx % screenSize
  const offY = ty % screenSize

  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage:
          'radial-gradient(circle, rgba(0,0,0,0.18) 1px, transparent 1.4px)',
        backgroundSize: `${screenSize}px ${screenSize}px`,
        backgroundPosition: `${offX}px ${offY}px`,
      }}
    />
  )
}
