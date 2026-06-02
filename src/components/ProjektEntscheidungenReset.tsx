'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw } from 'lucide-react'
import { ConfirmModal } from '@/components/ConfirmModal'
import { projektKundenEntscheidungenZuruecksetzen } from '@/app/actions/freigaben'

/**
 * Setzt projektweit alle Kundenentscheidungen zurück (Status „offen", Kommentare,
 * gewählte Alternativen, Wunschmengen). Für Test-Aufräumen — Belege bleiben erhalten.
 */
export default function ProjektEntscheidungenReset({ projektId }: { projektId: string }) {
  const router = useRouter()
  const [offen, setOffen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [fehler, setFehler] = useState<string | null>(null)

  function reset() {
    startTransition(async () => {
      const res = await projektKundenEntscheidungenZuruecksetzen(projektId)
      setOffen(false)
      if (res?.fehler) { setFehler(res.fehler); setTimeout(() => setFehler(null), 5000); return }
      router.refresh()
    })
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {fehler && <span className="text-xs text-red-500">{fehler}</span>}
      <button
        type="button"
        onClick={() => { setFehler(null); setOffen(true) }}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-red-600 transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" /> Alle Kundenentscheidungen zurücksetzen
      </button>
      <ConfirmModal
        isOpen={offen}
        onClose={() => { if (!isPending) setOffen(false) }}
        onConfirm={reset}
        title="Alle Kundenentscheidungen zurücksetzen?"
        message="Setzt für ALLE Produkte dieses Projekts den Freigabe-Status auf „offen“ und entfernt Kundenwünsche, gewählte Alternativen und Wunschmengen. Bereits verbindlich abgesendete Belege bleiben als Nachweis erhalten. Eure Empfehlungen (Favoriten) bleiben unberührt."
        confirmText="Zurücksetzen"
        cancelText="Abbrechen"
        variant="warning"
        isLoading={isPending}
      />
    </div>
  )
}
