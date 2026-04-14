'use client'

import { format, isToday, isTomorrow } from 'date-fns'
import { de } from 'date-fns/locale'
import { Calendar, Flag, Truck, Clock, Layers, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import type { TimelineEvent, TimelineEventTyp, TimelineEventStatus } from '@/lib/supabase/types'

// ── Typ-Konfiguration (spiegelt TimelineView.tsx) ─────────────
const TYP_CONFIG: Record<TimelineEventTyp, {
  label: string
  farbe: string
  bgFarbe: string
  Icon: React.ComponentType<{ className?: string }>
}> = {
  meilenstein: { label: 'Meilenstein', farbe: 'text-purple-600', bgFarbe: 'bg-purple-50',   Icon: Flag   },
  lieferung:   { label: 'Lieferung',   farbe: 'text-blue-600',   bgFarbe: 'bg-blue-50',     Icon: Truck  },
  termin:      { label: 'Termin',      farbe: 'text-emerald-600',bgFarbe: 'bg-emerald-50',  Icon: Clock  },
  phase:       { label: 'Phase',       farbe: 'text-gray-500',   bgFarbe: 'bg-gray-100',    Icon: Layers },
}

const STATUS_CONFIG: Record<TimelineEventStatus, { label: string; klasse: string }> = {
  geplant:       { label: 'Geplant',       klasse: 'bg-gray-100 text-gray-600'     },
  in_arbeit:     { label: 'In Arbeit',     klasse: 'bg-blue-50 text-blue-700'      },
  abgeschlossen: { label: 'Abgeschlossen', klasse: 'bg-emerald-50 text-emerald-700'},
  verspaetet:    { label: 'Verspätet',     klasse: 'bg-red-50 text-red-700'        },
}

function datumLabel(d: string): string {
  const dt = new Date(d + 'T00:00:00')
  if (isToday(dt))    return 'Heute'
  if (isTomorrow(dt)) return 'Morgen'
  return format(dt, 'EEEE, d. MMMM yyyy', { locale: de })
}

function istUeberfaellig(ev: TimelineEvent): boolean {
  if (ev.status === 'abgeschlossen') return false
  const ref = ev.end_datum ?? ev.start_datum
  return ref < new Date().toISOString().split('T')[0]
}

interface TimelineProps {
  events: (TimelineEvent & { raum?: { id: string; name: string } | null })[]
  showRaumBadge?: boolean
  /** Link zur vollen Timeline-Seite */
  alleLink?: string
  /** Max. Einträge anzeigen (ohne Limitierung = alle) */
  limit?: number
}

export function Timeline({ events, showRaumBadge = false, alleLink, limit }: TimelineProps) {
  const angezeigt = limit ? events.slice(0, limit) : events

  if (angezeigt.length === 0) {
    return (
      <div className="py-6 text-center">
        <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
        <p className="text-sm text-gray-400">Noch keine Timeline-Ereignisse</p>
        {alleLink && (
          <Link href={alleLink} className="mt-2 inline-block text-xs text-wellbeing-green hover:underline">
            Zur Timeline →
          </Link>
        )}
      </div>
    )
  }

  // Nach start_datum gruppieren
  const gruppen: Record<string, typeof angezeigt> = {}
  for (const ev of angezeigt) {
    const key = ev.start_datum ?? 'undatiert'
    if (!gruppen[key]) gruppen[key] = []
    gruppen[key].push(ev)
  }

  const sortierteDaten = Object.keys(gruppen).sort((a, b) => {
    if (a === 'undatiert') return 1
    if (b === 'undatiert') return -1
    return a.localeCompare(b) // chronologisch aufsteigend
  })

  return (
    <div className="relative">
      {/* Vertikale Linie */}
      <div className="absolute left-[15px] top-3 bottom-3 w-px bg-gray-200" />

      {sortierteDaten.map((datum) => (
        <div key={datum} className="mb-5 last:mb-0">
          {/* Datum-Header */}
          <div className="flex items-center gap-3 mb-2.5">
            <div className="w-[30px] h-[30px] rounded-full bg-[#445c49] flex items-center justify-center z-10 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              {datum === 'undatiert' ? 'Ohne Datum' : datumLabel(datum)}
            </span>
          </div>

          {/* Events */}
          <div className="ml-[42px] space-y-2">
            {gruppen[datum].map((ev) => {
              const cfg   = TYP_CONFIG[ev.typ] ?? TYP_CONFIG.termin
              const stCfg = STATUS_CONFIG[ev.status] ?? STATUS_CONFIG.geplant
              const Icon  = cfg.Icon
              const ueberfaellig = istUeberfaellig(ev)

              return (
                <div
                  key={ev.id}
                  className={`p-3 bg-white rounded-lg border transition-all ${
                    ueberfaellig
                      ? 'border-red-200 bg-red-50/30'
                      : 'border-gray-200 hover:border-[#445c49]/30 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Typ-Icon */}
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${cfg.bgFarbe}`}>
                      <Icon className={`w-3.5 h-3.5 ${cfg.farbe}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium text-gray-900 truncate">{ev.titel}</span>

                        {/* Status-Badge */}
                        <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${stCfg.klasse}`}>
                          {stCfg.label}
                        </span>

                        {/* Überfällig-Badge */}
                        {ueberfaellig && (
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-red-600 shrink-0">
                            <AlertTriangle className="w-3 h-3" />
                            Überfällig
                          </span>
                        )}

                        {/* Raum-Badge */}
                        {showRaumBadge && ev.raum && (
                          <span className="text-[11px] px-1.5 py-0.5 bg-[#445c49]/10 text-[#445c49] rounded-full shrink-0 font-medium">
                            {ev.raum.name}
                          </span>
                        )}
                      </div>

                      {ev.beschreibung && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ev.beschreibung}</p>
                      )}

                      {/* Enddatum falls abweichend */}
                      {ev.end_datum && ev.end_datum !== ev.start_datum && (
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          bis {format(new Date(ev.end_datum + 'T00:00:00'), 'd. MMM yyyy', { locale: de })}
                        </p>
                      )}
                    </div>

                    {/* Farb-Dot */}
                    {ev.farbe && (
                      <div
                        className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                        style={{ backgroundColor: ev.farbe }}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Link zur vollen Timeline */}
      {alleLink && (
        <div className="ml-[42px] mt-3">
          <Link href={alleLink} className="text-xs text-wellbeing-green hover:underline">
            Alle Ereignisse anzeigen →
          </Link>
        </div>
      )}
    </div>
  )
}
