'use client'

/**
 * Markierungs-Overlay: rendert pro markiertem Canvas-Objekt ein
 * kleines Eck-Badge mit Emoji + Border-Akzent. Mitfliegend mit Zoom + Pan.
 */

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  objects: any[]
  reloadKey: number
  worldToScreen: (wx: number, wy: number) => { x: number; y: number } | null
}

const MARKIERUNGEN_MAP: Record<string, { emoji: string; farbe: string; bg: string }> = {
  favorit:     { emoji: '⭐', farbe: '#d97706', bg: '#fef3c7' },
  gefaellt:    { emoji: '👍', farbe: '#059669', bg: '#dcfce7' },
  passt_nicht: { emoji: '👎', farbe: '#dc2626', bg: '#fee2e2' },
  final:       { emoji: '✅', farbe: '#0d9488', bg: '#ccfbf1' },
  unsicher:    { emoji: '❓', farbe: '#9333ea', bg: '#f3e8ff' },
}

export default function MoodboardMarkierungOverlay({
  objects, reloadKey, worldToScreen,
}: Props) {
  void reloadKey

  if (!Array.isArray(objects)) return null

  return (
    <>
      {objects.map((obj, i) => {
        try {
          if (!obj || typeof obj !== 'object') return null
          const id = obj?.data?.markierung as string | undefined
          if (!id) return null
          const m = MARKIERUNGEN_MAP[id]
          if (!m) return null
          if (typeof obj.getBoundingRect !== 'function') return null
          const r = obj.getBoundingRect()
          if (!r || typeof r.left !== 'number' || typeof r.top !== 'number') return null
          const screen = worldToScreen(r.left + r.width, r.top)
          if (!screen) return null
          return (
            <div
              key={i}
              className="absolute pointer-events-none z-20"
              style={{ left: screen.x, top: screen.y, transform: 'translate(-50%, -50%)' }}
            >
              <div
                className="w-7 h-7 rounded-full shadow-md flex items-center justify-center text-sm border-2 border-white"
                style={{ background: m.bg, color: m.farbe }}
                title={id}
              >
                {m.emoji}
              </div>
            </div>
          )
        } catch {
          return null
        }
      })}
    </>
  )
}
