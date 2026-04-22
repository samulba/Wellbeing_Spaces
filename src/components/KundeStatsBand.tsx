'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  FolderOpen, FileText, FileCheck2, MessageSquareText,
  PhoneCall, Mail, Users, StickyNote, Headset, MoreHorizontal,
} from 'lucide-react'
import type { KundeStatsResult } from '@/app/actions/kunden'
import type { KommunikationTyp } from '@/lib/supabase/types'

const KOMM_ICON: Record<KommunikationTyp, React.ComponentType<{ className?: string }>> = {
  email:     Mail,
  anruf:     PhoneCall,
  meeting:   Users,
  notiz:     StickyNote,
  chat:      MessageSquareText,
  vor_ort:   Headset,
  sonstiges: MoreHorizontal,
}

const KOMM_LABEL: Record<KommunikationTyp, string> = {
  email:     'E-Mail',
  anruf:     'Anruf',
  meeting:   'Meeting',
  notiz:     'Notiz',
  chat:      'Chat',
  vor_ort:   'Vor Ort',
  sonstiges: 'Sonstiges',
}

function eurKurz(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')} Mio €`
  if (n >= 10_000)    return `${Math.round(n / 1000)} T€`
  return `${n.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €`
}

/**
 * 4 KPI-Karten oben auf der Kunden-Detailseite.
 * Weiß/hell (kein Gradient) damit's zum Rest der Admin-Oberfläche passt.
 */
export default function KundeStatsBand({
  stats,
  onScrollToKommunikation,
}: {
  stats: KundeStatsResult
  /** Optional: Callback der zum Kommunikations-Block scrollt bei Klick auf „Letzter Kontakt" */
  onScrollToKommunikation?: () => void
}) {
  const kontakt = stats.letzterKontakt
  const KommIcon = kontakt ? KOMM_ICON[kontakt.typ] : MessageSquareText

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Projekte */}
      <StatKarte
        icon={<FolderOpen className="w-4 h-4" />}
        iconBg="bg-blue-50"
        iconText="text-blue-600"
        label="Projekte"
        wert={stats.projekte.total}
        subLabel={
          stats.projekte.total === 0
            ? 'Noch kein Projekt'
            : `${stats.projekte.aktiv} aktiv · ${stats.projekte.abgeschlossen} fertig`
        }
      />

      {/* Angebote */}
      <StatKarte
        icon={<FileText className="w-4 h-4" />}
        iconBg="bg-amber-50"
        iconText="text-amber-600"
        label="Angebote offen"
        wert={stats.angebote.offen}
        subLabel={
          stats.angebote.offen === 0
            ? `${stats.angebote.angenommen} angenommen`
            : `${eurKurz(stats.angebote.offen_summe)} offen · ${stats.angebote.angenommen} angenommen`
        }
      />

      {/* Verträge */}
      <StatKarte
        icon={<FileCheck2 className="w-4 h-4" />}
        iconBg="bg-emerald-50"
        iconText="text-emerald-600"
        label="Verträge aktiv"
        wert={stats.vertraege.aktiv}
        subLabel={
          stats.vertraege.total === 0
            ? 'Kein Vertrag'
            : stats.vertraege.abgelaufen > 0
              ? `${stats.vertraege.abgelaufen} abgelaufen`
              : `${stats.vertraege.total} gesamt`
        }
      />

      {/* Letzter Kontakt */}
      {kontakt ? (
        <button
          type="button"
          onClick={onScrollToKommunikation}
          className="text-left bg-white border border-gray-200 hover:border-wellbeing-green/40 hover:shadow rounded-xl px-4 py-3 flex items-center gap-3 transition-all"
        >
          <div className="w-9 h-9 rounded-lg bg-gray-50 text-gray-600 flex items-center justify-center shrink-0">
            <KommIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider leading-none">Letzter Kontakt</p>
            <p className="text-sm font-semibold text-gray-900 mt-1 truncate">
              {formatDistanceToNow(new Date(kontakt.datum), { locale: de, addSuffix: true })}
            </p>
            <p className="text-[11px] text-gray-500 truncate">
              {KOMM_LABEL[kontakt.typ]}{kontakt.betreff ? ` · ${kontakt.betreff}` : ''}
            </p>
          </div>
        </button>
      ) : (
        <StatKarte
          icon={<MessageSquareText className="w-4 h-4" />}
          iconBg="bg-gray-100"
          iconText="text-gray-400"
          label="Letzter Kontakt"
          wert="—"
          subLabel="Noch kein Eintrag"
        />
      )}
    </div>
  )
}

function StatKarte({
  icon, iconBg, iconText, label, wert, subLabel, href,
}: {
  icon: React.ReactNode
  iconBg: string
  iconText: string
  label: string
  wert: number | string
  subLabel: string
  href?: string
}) {
  const Inhalt = (
    <div className="bg-white border border-gray-200 hover:border-wellbeing-green/40 hover:shadow rounded-xl px-4 py-3 flex items-center gap-3 transition-all">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg} ${iconText}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider leading-none">{label}</p>
        <p className="text-2xl font-semibold text-gray-900 leading-tight mt-1 tabular-nums">{wert}</p>
        <p className="text-[11px] text-gray-500 truncate">{subLabel}</p>
      </div>
    </div>
  )
  return href ? <Link href={href}>{Inhalt}</Link> : Inhalt
}
