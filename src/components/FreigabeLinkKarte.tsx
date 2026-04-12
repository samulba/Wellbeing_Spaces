'use client'

import { useState, useTransition } from 'react'
import { tokenGenerieren, tokenDeaktivieren, tokenErneuern } from '@/app/actions/freigabe-token'
import { RefreshCw, Clock } from 'lucide-react'

interface Props {
  projektId: string
  initialToken: { id: string; token: string; gueltig_bis: string | null } | null
}

function restlaufzeit(gueltigBis: string | null): { tage: number; text: string; farbe: string } | null {
  if (!gueltigBis) return null
  const diff = new Date(gueltigBis).getTime() - Date.now()
  if (diff <= 0) return { tage: 0, text: 'Abgelaufen', farbe: 'text-red-500' }
  const tage = Math.ceil(diff / 86_400_000)
  const text = tage === 1 ? 'noch 1 Tag' : `noch ${tage} Tage`
  const farbe = tage <= 3 ? 'text-red-500' : tage <= 7 ? 'text-amber-600' : 'text-emerald-600'
  return { tage, text, farbe }
}

export default function FreigabeLinkKarte({ projektId, initialToken }: Props) {
  const [tokenData, setTokenData] = useState(initialToken)
  const [kopiert, setKopiert] = useState(false)
  const [isPending, startTransition] = useTransition()

  const freigabeUrl = tokenData
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/freigabe/${tokenData.token}`
    : null

  const laufzeit = tokenData ? restlaufzeit(tokenData.gueltig_bis) : null

  function handleGenerieren() {
    startTransition(async () => {
      const result = await tokenGenerieren(projektId)
      if ('token' in result) {
        setTokenData({ id: '', token: result.token, gueltig_bis: null })
      }
    })
  }

  async function handleKopieren() {
    if (!freigabeUrl) return
    await navigator.clipboard.writeText(freigabeUrl)
    setKopiert(true)
    setTimeout(() => setKopiert(false), 2000)
  }

  function handleDeaktivieren() {
    if (!tokenData?.id || !confirm('Freigabe-Link wirklich deaktivieren? Der Link wird ungültig.')) return
    startTransition(async () => {
      await tokenDeaktivieren(tokenData.id, projektId)
      setTokenData(null)
    })
  }

  function handleErneuern() {
    if (!tokenData?.id || !confirm('Neuen Freigabelink erstellen? Der alte Link wird ungültig.')) return
    startTransition(async () => {
      const result = await tokenErneuern(projektId, tokenData.id)
      if ('token' in result) {
        setTokenData({ id: '', token: result.token, gueltig_bis: null })
      }
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <h2 className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-4">
        Kunden-Freigabelink
      </h2>

      {!tokenData ? (
        <div>
          <p className="text-sm text-gray-500 mb-4 leading-relaxed">
            Erstellen Sie einen Link, den Sie an Ihren Kunden senden können.
            Der Kunde sieht alle Produkte und kann sie freigeben oder Änderungen anfordern.
          </p>
          <button
            onClick={handleGenerieren}
            disabled={isPending}
            className="px-4 py-2.5 bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
          >
            {isPending ? 'Wird erstellt…' : 'Freigabelink erstellen'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* URL + Kopieren */}
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={freigabeUrl ?? ''}
              className="flex-1 px-3 py-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg font-mono truncate focus:outline-none"
            />
            <button
              onClick={handleKopieren}
              className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                kopiert
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {kopiert ? '✓ Kopiert' : 'Kopieren'}
            </button>
          </div>

          {/* Restlaufzeit */}
          {laufzeit && (
            <div className={`flex items-center gap-1.5 text-xs ${laufzeit.farbe}`}>
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="font-medium">{laufzeit.text}</span>
            </div>
          )}

          {/* Aktionen */}
          <div className="flex items-center gap-3 flex-wrap">
            <a
              href={freigabeUrl ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-wellbeing-green underline underline-offset-2 transition-colors"
            >
              Vorschau öffnen ↗
            </a>
            {tokenData.id && (
              <>
                <button
                  onClick={handleErneuern}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 text-xs text-wellbeing-green hover:text-wellbeing-green-dark transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Erneuern
                </button>
                <button
                  onClick={handleDeaktivieren}
                  disabled={isPending}
                  className="text-xs text-red-400/60 hover:text-red-500 transition-colors"
                >
                  Deaktivieren
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
