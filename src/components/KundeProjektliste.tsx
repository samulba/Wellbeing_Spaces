import Link from 'next/link'
import { FolderOpen, Calendar, AlertTriangle, Layers, Archive } from 'lucide-react'
import type { KundeProjektMitStats } from '@/app/actions/kunden'

const STATUS_CONFIG: Record<string, { label: string; punkt: string; text: string }> = {
  offen:          { label: 'Offen',          punkt: 'bg-gray-300',    text: 'text-gray-600' },
  in_bearbeitung: { label: 'In Bearbeitung', punkt: 'bg-amber-400',   text: 'text-amber-700' },
  freigegeben:    { label: 'Freigegeben',    punkt: 'bg-blue-400',    text: 'text-blue-700' },
  abgeschlossen:  { label: 'Abgeschlossen',  punkt: 'bg-emerald-400', text: 'text-emerald-700' },
}

function istUeberfaellig(deadline: string | null, status: string): boolean {
  if (!deadline || status === 'abgeschlossen') return false
  return deadline < new Date().toISOString().split('T')[0]
}

function deadlineLabel(deadline: string): string {
  const d = new Date(deadline + 'T00:00:00')
  const heute = new Date(); heute.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - heute.getTime()) / 86_400_000)
  if (diff === 0)  return 'Heute'
  if (diff === 1)  return 'Morgen'
  if (diff === -1) return 'Gestern'
  if (diff > 0 && diff <= 14)  return `in ${diff} Tg.`
  if (diff < 0 && diff >= -30) return `${Math.abs(diff)} Tg. überfällig`
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: '2-digit' })
}

function eurKurz(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')} Mio €`
  if (n >= 10_000)    return `${Math.round(n / 1000)} T€`
  return `${n.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €`
}

/**
 * Projekt-Liste auf der Kunden-Detailseite mit Mini-Stats pro Projekt:
 * Status-Punkt, Deadline-Countdown, Freigabe-Progress-Balken, Budget-Summe.
 */
export default function KundeProjektliste({
  projekte,
  neuesProjektHref,
}: {
  projekte: KundeProjektMitStats[]
  neuesProjektHref: string
}) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-gray-400" />
          Projekte
          <span className="text-xs font-normal text-gray-400 tabular-nums">({projekte.length})</span>
        </h2>
        <Link
          href={neuesProjektHref}
          className="text-xs font-medium text-wellbeing-green hover:text-wellbeing-green-dark transition-colors"
        >
          + Neues Projekt
        </Link>
      </div>

      {projekte.length === 0 ? (
        <div className="py-10 text-center">
          <Layers className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Noch kein Projekt für diesen Kunden.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {projekte.map((p) => {
            const status = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.offen
            const ueberfaellig = istUeberfaellig(p.deadline, p.status)
            const fs = p.stats.freigabeStats
            const freigabeProzent = fs.gesamt > 0 ? Math.round((fs.freigegeben / fs.gesamt) * 100) : 0
            return (
              <Link
                key={p.id}
                href={`/dashboard/projekte/${p.id}`}
                className={`block px-5 py-3 hover:bg-gray-50 transition-colors group ${p.archiviert ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Status-Punkt */}
                  <div className={`w-2 h-2 rounded-full shrink-0 ${status.punkt}`} title={status.label} />

                  {/* Name + Archiviert-Badge */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-wellbeing-green transition-colors">
                        {p.name}
                      </p>
                      {p.archiviert && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
                          <Archive className="w-2.5 h-2.5" /> Archiviert
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] ${status.text}`}>
                      {status.label}
                      {p.stats.anzahlRaeume > 0 && ` · ${p.stats.anzahlRaeume} ${p.stats.anzahlRaeume === 1 ? 'Raum' : 'Räume'}`}
                      {fs.gesamt > 0 && ` · ${fs.gesamt} ${fs.gesamt === 1 ? 'Produkt' : 'Produkte'}`}
                    </p>
                  </div>

                  {/* Freigabe-Progress (nur wenn Produkte vorhanden) */}
                  {fs.gesamt > 0 && (
                    <div className="hidden sm:flex flex-col items-end shrink-0 min-w-[90px]">
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 transition-all"
                            style={{ width: `${freigabeProzent}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-medium text-gray-500 tabular-nums">{freigabeProzent}%</span>
                      </div>
                      <p className="text-[10px] text-gray-400 tabular-nums mt-0.5">
                        {fs.freigegeben}/{fs.gesamt} freigegeben
                      </p>
                    </div>
                  )}

                  {/* Budget */}
                  {p.stats.budget.vpNetto > 0 && (
                    <div className="hidden md:flex flex-col items-end shrink-0 min-w-[70px]">
                      <p className="text-xs font-semibold text-gray-700 tabular-nums">{eurKurz(p.stats.budget.vpNetto)}</p>
                      <p className="text-[10px] text-gray-400">VP netto</p>
                    </div>
                  )}

                  {/* Deadline */}
                  {p.deadline && (
                    <div className="shrink-0 flex items-center gap-1">
                      {ueberfaellig
                        ? <AlertTriangle className="w-3 h-3 text-red-500" />
                        : <Calendar className="w-3 h-3 text-gray-400" />}
                      <span className={`text-[11px] tabular-nums ${ueberfaellig ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {deadlineLabel(p.deadline)}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
