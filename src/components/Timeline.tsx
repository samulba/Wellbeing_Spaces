'use client'

import { useState } from 'react'
import { format, isToday, isTomorrow } from 'date-fns'
import { de } from 'date-fns/locale'
import { Calendar, Flag, Truck, Clock, Layers, AlertTriangle, History } from 'lucide-react'
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
  abgeschlossen: { label: 'Erledigt',      klasse: 'bg-emerald-50 text-emerald-700'},
  verspaetet:    { label: 'Verspätet',     klasse: 'bg-red-50 text-red-700'        },
}

function datumKurz(d: string): string {
  const dt = new Date(d + 'T00:00:00')
  if (isToday(dt))    return 'Heute'
  if (isTomorrow(dt)) return 'Morgen'
  return format(dt, 'd. MMM', { locale: de })
}

function istUeberfaellig(ev: TimelineEvent): boolean {
  if (ev.status === 'abgeschlossen') return false
  const ref = ev.end_datum ?? ev.start_datum
  return ref < new Date().toISOString().split('T')[0]
}

function istVergangen(ev: TimelineEvent): boolean {
  if (ev.status !== 'abgeschlossen') return false
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
  /** Max-Höhe des Scroll-Containers (default 360px) */
  maxHoehe?: string
  /** Ob vergangene abgeschlossene Events default ausgeblendet sind */
  vergangenAusgeblendetDefault?: boolean
}

export function Timeline({
  events,
  showRaumBadge = false,
  alleLink,
  limit,
  maxHoehe = '380px',
  vergangenAusgeblendetDefault = true,
}: TimelineProps) {
  const [vergangenVerstecken, setVergangenVerstecken] = useState(vergangenAusgeblendetDefault)

  if (events.length === 0) {
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

  const vergangenCount = events.filter(istVergangen).length
  const sichtbar = vergangenVerstecken ? events.filter((e) => !istVergangen(e)) : events
  const angezeigt = limit ? sichtbar.slice(0, limit) : sichtbar

  return (
    <div>
      {/* Toggle für vergangene Events */}
      {vergangenCount > 0 && (
        <div className="flex items-center justify-end mb-2">
          <button
            type="button"
            onClick={() => setVergangenVerstecken((v) => !v)}
            className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-700 transition-colors"
          >
            <History className="w-3 h-3" />
            {vergangenVerstecken
              ? `+ ${vergangenCount} vergangene anzeigen`
              : 'Vergangene ausblenden'}
          </button>
        </div>
      )}

      {/* Liste (scrollbar) */}
      {angezeigt.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-xs text-gray-400">Keine anstehenden Ereignisse</p>
        </div>
      ) : (
        <div className="overflow-y-auto pr-1" style={{ maxHeight: maxHoehe }}>
          <div className="space-y-0.5">
            {angezeigt.map((ev) => {
              const cfg   = TYP_CONFIG[ev.typ] ?? TYP_CONFIG.termin
              const stCfg = STATUS_CONFIG[ev.status] ?? STATUS_CONFIG.geplant
              const Icon  = cfg.Icon
              const ueberfaellig = istUeberfaellig(ev)

              return (
                <div
                  key={ev.id}
                  className={`flex items-center gap-3 px-2 py-2 rounded-lg transition-colors ${
                    ueberfaellig
                      ? 'bg-red-50/30 hover:bg-red-50/50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Typ-Icon */}
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${cfg.bgFarbe}`}>
                    <Icon className={`w-3.5 h-3.5 ${cfg.farbe}`} />
                  </div>

                  {/* Titel + Raum-Badge */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-gray-900 truncate">{ev.titel}</span>
                      {showRaumBadge && ev.raum && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-wellbeing-green/10 text-wellbeing-green rounded shrink-0 font-medium">
                          {ev.raum.name}
                        </span>
                      )}
                    </div>
                    {ev.beschreibung && (
                      <p className="text-[11px] text-gray-500 truncate">{ev.beschreibung}</p>
                    )}
                  </div>

                  {/* Rechts: Status + Datum */}
                  <div className="flex items-center gap-2 shrink-0">
                    {ueberfaellig && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-red-600">
                        <AlertTriangle className="w-3 h-3" />
                      </span>
                    )}
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${stCfg.klasse}`}>
                      {stCfg.label}
                    </span>
                    <span className="text-[11px] text-gray-400 tabular-nums min-w-[48px] text-right">
                      {datumKurz(ev.start_datum)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Link zur vollen Timeline */}
      {alleLink && (
        <div className="mt-2">
          <Link href={alleLink} className="text-xs text-wellbeing-green hover:underline">
            Alle Ereignisse anzeigen →
          </Link>
        </div>
      )}
    </div>
  )
}
