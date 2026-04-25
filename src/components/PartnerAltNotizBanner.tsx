'use client'

import { useState, useTransition } from 'react'
import { ArchiveRestore, Check } from 'lucide-react'
import { partnerAltNotizUebernehmen } from '@/app/actions/partner'

export default function PartnerAltNotizBanner({
  partnerId,
  inhalt,
}: {
  partnerId: string
  inhalt:    string
}) {
  const [isPending, startTransition] = useTransition()
  const [erfolg, setErfolg]          = useState(false)
  const [fehler, setFehler]          = useState<string | null>(null)

  function uebernehmen() {
    setFehler(null)
    startTransition(async () => {
      const r = await partnerAltNotizUebernehmen(partnerId)
      if (r.fehler) setFehler(r.fehler)
      else          setErfolg(true)
    })
  }

  if (erfolg) return null

  return (
    <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 mb-3">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-xs font-semibold text-amber-800">Notiz aus dem alten Freitext-Feld</p>
          <p className="text-[11px] text-amber-700/80 mt-0.5">
            Dieses Feld wurde durch den Notizen-Block ersetzt. Übernimm den Inhalt hier oder kopiere ihn manuell — danach verschwindet der Hinweis.
          </p>
        </div>
        <button
          onClick={uebernehmen}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg shrink-0 transition-colors"
        >
          {isPending ? (
            <>Übernehmen…</>
          ) : (
            <>
              <ArchiveRestore className="w-3.5 h-3.5" />
              In Notizen-Block übernehmen
              <Check className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
      <p className="text-sm text-amber-900/90 whitespace-pre-wrap leading-relaxed bg-white/60 border border-amber-200 rounded-lg p-3">
        {inhalt}
      </p>
      {fehler && <p className="text-xs text-red-600 mt-2">{fehler}</p>}
    </div>
  )
}
