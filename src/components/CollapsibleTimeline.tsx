'use client'

import { useState } from 'react'
import { Clock, ChevronDown, ChevronUp } from 'lucide-react'

/**
 * Klappt die Raum-Timeline ein: standardmäßig nur ein schmaler Button,
 * der keinen Platz wegnimmt. Erst auf Klick wird die volle Timeline-Karte
 * (als children übergeben) eingeblendet. Migration-frei, reine UI.
 */
export default function CollapsibleTimeline({
  count,
  children,
}: {
  count: number
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <div className="mb-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-gray-300 hover:text-gray-700 transition-colors"
        >
          <Clock className="w-3.5 h-3.5" />
          Timeline anzeigen
          {count > 0 && (
            <span className="text-[10px] tabular-nums bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5">{count}</span>
          )}
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="mb-6">
      <div className="flex justify-end mb-1.5">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Timeline ausblenden
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>
      {children}
    </div>
  )
}
