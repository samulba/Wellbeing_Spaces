'use client'

import { useState, useTransition } from 'react'
import { tokenGenerieren, tokenDeaktivieren } from '@/app/actions/freigabe-token'

interface Props {
  projektId: string
  initialToken: { id: string; token: string } | null
}

export default function FreigabeLinkKarte({ projektId, initialToken }: Props) {
  const [tokenData, setTokenData] = useState(initialToken)
  const [kopiert, setKopiert] = useState(false)
  const [isPending, startTransition] = useTransition()

  const freigabeUrl = tokenData
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/freigabe/${tokenData.token}`
    : null

  function handleGenerieren() {
    startTransition(async () => {
      const result = await tokenGenerieren(projektId)
      if ('token' in result) {
        // Token-ID holen für Deaktivierung – vorerst nur token speichern
        setTokenData({ id: '', token: result.token })
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

  return (
    <div className="bg-white border border-stone-100 rounded-xl p-5">
      <h2 className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-4">
        Kunden-Freigabelink
      </h2>

      {!tokenData ? (
        <div>
          <p className="text-sm text-stone-500 mb-3">
            Erstellen Sie einen Link, den Sie an Ihren Kunden senden können.
            Der Kunde sieht alle Produkte und kann sie freigeben oder Änderungen anfordern.
          </p>
          <button
            onClick={handleGenerieren}
            disabled={isPending}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 disabled:bg-stone-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isPending ? 'Wird erstellt…' : 'Freigabelink erstellen'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={freigabeUrl ?? ''}
              className="flex-1 px-3 py-2 text-xs text-stone-600 bg-stone-50 border border-stone-200 rounded-lg font-mono truncate focus:outline-none"
            />
            <button
              onClick={handleKopieren}
              className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                kopiert
                  ? 'bg-green-50 text-green-600 border-green-200'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
              }`}
            >
              {kopiert ? '✓ Kopiert' : 'Kopieren'}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={freigabeUrl ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-stone-500 hover:text-stone-700 underline underline-offset-2 transition-colors"
            >
              Vorschau öffnen ↗
            </a>
            {tokenData.id && (
              <button
                onClick={handleDeaktivieren}
                disabled={isPending}
                className="text-xs text-red-400 hover:text-red-600 transition-colors"
              >
                Link deaktivieren
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
