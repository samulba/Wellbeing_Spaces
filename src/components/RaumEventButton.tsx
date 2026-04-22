'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { EventModal } from '@/app/dashboard/projekte/[id]/timeline/TimelineView'

/**
 * Button "Event hinzufügen" auf der Raum-Detailseite. Öffnet dasselbe große
 * Event-Modal wie die Projekt-Timeline — mit Beschreibung, Status, Farbe,
 * Verantwortlich und Erinnerung. raum_id wird vorausgefüllt, damit das Event
 * diesem Raum zugeordnet wird.
 */
export default function RaumEventButton({
  projektId,
  raumId,
}: {
  projektId: string
  raumId: string
}) {
  const [offen, setOffen] = useState(false)
  const router = useRouter()

  return (
    <>
      <button
        type="button"
        onClick={() => setOffen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-wellbeing-green/30 text-wellbeing-green hover:bg-wellbeing-green/10 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Event hinzufügen
      </button>

      {offen && (
        <EventModal
          projektId={projektId}
          event={null}
          alleEvents={[]}
          defaultRaumId={raumId}
          onClose={() => setOffen(false)}
          onSave={() => {
            setOffen(false)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
