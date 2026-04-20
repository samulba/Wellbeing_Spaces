'use client'

import { useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import type { ChangelogEntry } from '@/lib/changelog'

const SEEN_KEY = 'changelog-last-seen'

/**
 * Zeigt den kompletten Changelog aus CHANGELOG.md.
 * Setzt beim Öffnen des Tabs localStorage "changelog-last-seen" auf das
 * neueste Datum — damit verschwindet das Badge im Dashboard/NavSidebar.
 */
export default function ChangelogTab({ eintraege }: { eintraege: ChangelogEntry[] }) {
  useEffect(() => {
    if (eintraege.length === 0) return
    const neuestes = eintraege[0].datum
    try {
      localStorage.setItem(SEEN_KEY, neuestes)
      // Event für Badge-Komponenten (NavSidebar) damit sie sofort re-rendern
      window.dispatchEvent(new CustomEvent('changelog:seen'))
    } catch { /* ignore */ }
  }, [eintraege])

  if (eintraege.length === 0) {
    return (
      <div className="text-center py-16">
        <Sparkles className="w-10 h-10 text-gray-200 mx-auto mb-3" />
        <p className="text-sm text-gray-400">Noch keine Änderungen dokumentiert.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-4 h-4 text-wellbeing-green" />
        <h2 className="text-sm font-semibold text-gray-900">Was ist neu?</h2>
        <span className="text-xs text-gray-400">Automatisch bei jedem Update gepflegt.</span>
      </div>

      <div className="space-y-8">
        {eintraege.map((eintrag) => (
          <section key={eintrag.datum}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              {formatDatum(eintrag.datum)}
            </h3>

            <div className="space-y-5">
              {eintrag.sektionen.map((sek, idx) => (
                <div key={idx}>
                  {sek.titel && (
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">{sek.titel}</h4>
                  )}
                  <ul className="space-y-1.5">
                    {sek.punkte.map((p, i) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-600 leading-relaxed">
                        <span className="text-wellbeing-green shrink-0 mt-[7px] text-[9px]">●</span>
                        <span>
                          {p.fett && <span className="font-semibold text-gray-800">{p.fett}</span>}
                          {p.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function formatDatum(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('de-DE', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}
