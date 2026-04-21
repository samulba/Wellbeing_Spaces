'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Check, X } from 'lucide-react'
import { syncAlleProdukteImRaum } from '@/app/actions/produkte'

type SyncResult = {
  anzahl: number
  events_erstellt: number
  events_aktualisiert: number
  events_geloescht: number
  events_uebersprungen: number
  error?: string
  details?: string
}

export default function TimelineSyncButton({
  raumId,
  projektId,
}: {
  raumId:    string
  projektId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<SyncResult | null>(null)

  function handleClick() {
    setResult(null)
    startTransition(async () => {
      const res = await syncAlleProdukteImRaum(raumId, projektId)
      setResult(res)
      router.refresh()
    })
  }

  const kurzStatus = result
    ? `${result.anzahl} Produkt${result.anzahl === 1 ? '' : 'e'} · ${result.events_erstellt} neu · ${result.events_aktualisiert} geupdated · ${result.events_geloescht} gelöscht`
    : null

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 rounded-lg transition-colors disabled:opacity-50"
        title="Alle Produkte dieses Raums mit der Timeline synchronisieren"
      >
        <RefreshCw className={`w-3 h-3 ${isPending ? 'animate-spin' : ''}`} />
        {isPending ? 'Synchronisiere…' : 'Timeline neu laden'}
      </button>

      {result && !result.error && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-md bg-emerald-600 text-white text-sm px-4 py-3 rounded-xl shadow-2xl flex items-start gap-2">
          <Check className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-medium">{kurzStatus}</p>
            {result.details && (
              <details className="mt-1">
                <summary className="text-[11px] text-white/70 cursor-pointer">Details</summary>
                <p className="text-[11px] text-white/80 mt-1 break-words">{result.details}</p>
              </details>
            )}
          </div>
          <button
            onClick={() => setResult(null)}
            className="text-white/70 hover:text-white shrink-0"
            aria-label="Schließen"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {result?.error && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-lg bg-red-600 text-white text-sm px-4 py-3 rounded-xl shadow-2xl flex items-start gap-2">
          <X className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="font-medium mb-1">Sync-Fehler</p>
            <p className="text-[12px] break-words">{result.error}</p>
            {result.details && (
              <p className="text-[11px] text-white/70 mt-2 break-words">{result.details}</p>
            )}
          </div>
          <button
            onClick={() => setResult(null)}
            className="text-white/70 hover:text-white shrink-0"
            aria-label="Schließen"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  )
}
