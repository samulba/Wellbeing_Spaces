'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowRight, Calendar, Clock, TrendingUp, AlertCircle, CheckCircle2, PhoneCall, Mail, Users, MessageSquare, FolderOpen, ReceiptText, Flag, Truck, Layers, Info, ShoppingCart, AlertTriangle, Package, ListChecks, Check, Plus } from 'lucide-react'
import { aufgabeStatusAendern, type AufgabePickerOptionen } from '@/app/actions/aufgaben'
import { useRouter } from 'next/navigation'
import { differenceInCalendarDays } from 'date-fns'
import AufgabeAnlegenModal from '@/components/AufgabeAnlegenModal'

// ── Typen ─────────────────────────────────────────────────────

export interface KpiDaten {
  label: string
  wert: string | number
  href: string
  icon: React.ElementType
  farbe: string
  bg: string
  subLabel?: string
}

export interface DeadlineProjekt {
  id: string
  name: string
  kundenName: string | null
  deadline: string
  tageVerbleibend: number
}

export type DeadlineEventTyp = 'meilenstein' | 'lieferung' | 'termin' | 'phase'

export interface DeadlineEvent {
  id: string
  titel: string
  projektId: string
  projektName: string | null
  typ: DeadlineEventTyp
  start_datum: string
  tageVerbleibend: number
  istUeberfaellig: boolean
}

export interface FollowUpEintrag {
  id: string
  kundeId: string
  kundenName: string
  typ: string
  betreff: string | null
  follow_up_datum: string
  tageVerbleibend: number
}

export interface MeineAufgabe {
  id:           string
  titel:        string
  status:       'backlog' | 'in_arbeit' | 'review' | 'erledigt'
  prioritaet:   'niedrig' | 'normal' | 'hoch' | 'dringend'
  faellig_am:   string | null
  projektName?: string | null
  kundeName?:   string | null
  tageVerbleibend: number   // 0 = heute, <0 = ueberfaellig
}

export interface BudgetProjekt {
  id: string
  name: string
  budget: number
  istKosten: number
  prozent: number
}

export interface AktivitaetsEintrag {
  id: string
  aktion: string
  tabelle: string
  created_at: string
}

export interface LetzesProjekt {
  id: string
  name: string
  kundenName: string | null
  status: string
  gesamtbudget: number | null
  deadline: string | null
  created_at: string
}

// ── Hilfsfunktionen ───────────────────────────────────────────

const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

/** Kalendertage bis zu einem Date-only-String (lokal, nicht UTC) — heute = 0. */
function tageBis(isoDate: string): number {
  const d = isoDate.length === 10 ? new Date(`${isoDate}T00:00:00`) : new Date(isoDate)
  return differenceInCalendarDays(d, new Date())
}


const typIcon: Record<string, React.ElementType> = {
  email:     Mail,
  anruf:     PhoneCall,
  meeting:   Users,
  notiz:     MessageSquare,
  sms:       MessageSquare,
  sonstiges: MessageSquare,
}

function deadlineFarbe(tage: number) {
  if (tage < 0)  return 'text-red-600 bg-red-50 border-red-200'
  if (tage <= 7) return 'text-amber-700 bg-amber-50 border-amber-200'
  if (tage <= 30) return 'text-blue-700 bg-blue-50 border-blue-200'
  return 'text-gray-600 bg-gray-50 border-gray-200'
}

function deadlineLabel(tage: number) {
  if (tage < 0)  return `${Math.abs(tage)}d überfällig`
  if (tage === 0) return 'Heute'
  if (tage === 1) return 'Morgen'
  return `${tage}d`
}

// ── KPI-Karten ────────────────────────────────────────────────

export function KpiKarte({ label, wert, href, icon: Icon, farbe, bg, subLabel }: KpiDaten) {
  return (
    <Link
      href={href}
      className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-gray-300 transition-all duration-200 group flex items-center gap-4"
    >
      <div className={`${bg} p-2.5 rounded-xl shrink-0`}>
        <Icon className={`w-5 h-5 ${farbe}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-3xl font-bold text-gray-900 leading-none">{wert}</p>
        <p className="text-xs text-gray-500 font-medium mt-1">{label}</p>
        {subLabel && <p className="text-[10px] text-gray-400 mt-0.5">{subLabel}</p>}
      </div>
      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all ml-auto shrink-0" />
    </Link>
  )
}

// ── KPI-Kacheln-Reihe (Wrapper – Icons bleiben client-seitig) ──
// Server Components dürfen keine React-Komponenten (Functions) als Props übergeben.
// Deshalb übernimmt dieser Client-Wrapper die Icon-Zuweisung komplett.

export function KpiKartenReihe({ aktiveKunden, laufendeProjekte, offeneAngebote, monatsumsatz }: {
  aktiveKunden: number
  laufendeProjekte: number
  offeneAngebote: number
  monatsumsatz: number
}) {
  const kpis: KpiDaten[] = [
    { label: 'Aktive Kunden',      wert: aktiveKunden,                                    href: '/dashboard/kunden',   icon: Users,       farbe: 'text-wellbeing-green', bg: 'bg-wellbeing-cream' },
    { label: 'Laufende Projekte',  wert: laufendeProjekte,                                href: '/dashboard/projekte', icon: FolderOpen,  farbe: 'text-[#445c49]',       bg: 'bg-wellbeing-cream' },
    { label: 'Offene Angebote',    wert: offeneAngebote,                                  href: '/dashboard/projekte', icon: ReceiptText, farbe: 'text-violet-600',      bg: 'bg-violet-50'       },
    { label: 'Monatsumsatz',       wert: monatsumsatz > 0 ? eur(monatsumsatz) : '–',     href: '/dashboard/projekte', icon: TrendingUp,  farbe: 'text-emerald-600',     bg: 'bg-emerald-50',
      subLabel: 'Angenommene Angebote' },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => <KpiKarte key={kpi.label} {...kpi} />)}
    </div>
  )
}

// ── Bestell-KPI-Reihe ─────────────────────────────────────────
export function BestellKpiReihe({ zuBestellen, unterwegs, anstehend7Tage, ueberfaellig, offeneReklamationen }: {
  zuBestellen:          number
  unterwegs:            number
  anstehend7Tage:       number
  ueberfaellig:         number
  offeneReklamationen:  number
}) {
  const kpis: KpiDaten[] = [
    { label: 'Zu bestellen',    wert: zuBestellen,    href: '/dashboard/bestellungen?tab=zu_bestellen',  icon: ShoppingCart,   farbe: 'text-blue-600',    bg: 'bg-blue-50',
      subLabel: 'Freigegeben + ausstehend' },
    { label: 'Unterwegs',       wert: unterwegs,      href: '/dashboard/bestellungen?tab=unterwegs',     icon: Truck,          farbe: 'text-indigo-600',  bg: 'bg-indigo-50',
      subLabel: 'Aktive Bestellungen' },
    { label: 'Diese Woche',     wert: anstehend7Tage, href: '/dashboard/bestellungen?tab=anstehend',     icon: Package,        farbe: 'text-amber-600',   bg: 'bg-amber-50',
      subLabel: 'Lieferung erwartet' },
    { label: 'Überfällig',      wert: ueberfaellig,   href: '/dashboard/bestellungen?tab=ueberfaellig',  icon: Clock,          farbe: 'text-red-600',     bg: 'bg-red-50',
      subLabel: ueberfaellig > 0 ? 'Termin überschritten' : 'Alles im Plan' },
    { label: 'Reklamationen',   wert: offeneReklamationen, href: '/dashboard/bestellungen?tab=reklamationen', icon: AlertTriangle, farbe: 'text-orange-600', bg: 'bg-orange-50',
      subLabel: offeneReklamationen > 0 ? 'Offen' : 'Keine offenen' },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {kpis.map((kpi) => <KpiKarte key={kpi.label} {...kpi} />)}
    </div>
  )
}

// ── Nächste Deadlines ─────────────────────────────────────────

const EVENT_ICON: Record<DeadlineEventTyp, React.ElementType> = {
  meilenstein: Flag,
  lieferung:   Truck,
  termin:      Clock,
  phase:       Layers,
}
const EVENT_COLOR: Record<DeadlineEventTyp, string> = {
  meilenstein: 'text-purple-500 bg-purple-50',
  lieferung:   'text-blue-500 bg-blue-50',
  termin:      'text-emerald-500 bg-emerald-50',
  phase:       'text-gray-500 bg-gray-50',
}

// ── Info-Tooltip ──────────────────────────────────────────────
function InfoHinweis({
  titel,
  beschreibung,
  anlegenHinweis,
  anlegenLink,
  anlegenLinkLabel,
}: {
  titel: string
  beschreibung: string
  anlegenHinweis: string
  anlegenLink?: string
  anlegenLinkLabel?: string
}) {
  const [offen, setOffen] = useState(false)
  return (
    <div
      className="relative"
      onMouseEnter={() => setOffen(true)}
      onMouseLeave={() => setOffen(false)}
    >
      <button
        type="button"
        onClick={() => setOffen((v) => !v)}
        className="w-4 h-4 flex items-center justify-center text-gray-300 hover:text-gray-500 transition-colors rounded-full"
        aria-label="Was ist das?"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {offen && (
        <div
          className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 bg-gray-900 text-white text-xs rounded-xl shadow-xl p-3 z-50 leading-relaxed animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Pfeil nach oben */}
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-900 rotate-45" />
          <p className="font-semibold text-white mb-1">{titel}</p>
          <p className="text-gray-300 mb-2">{beschreibung}</p>
          <p className="text-gray-300 mb-2">{anlegenHinweis}</p>
          {anlegenLink && (
            <Link
              href={anlegenLink}
              className="inline-flex items-center gap-1 text-[11px] text-wellbeing-green-light hover:text-white font-medium"
            >
              {anlegenLinkLabel ?? 'Dorthin →'}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

export function NaechsteDeadlines({
  projekte,
  events = [],
}: {
  projekte: DeadlineProjekt[]
  events?: DeadlineEvent[]
}) {
  type Eintrag =
    | { kind: 'projekt'; data: DeadlineProjekt; tage: number }
    | { kind: 'event';   data: DeadlineEvent;   tage: number }

  const eintraege: Eintrag[] = [
    ...projekte.map((p) => ({ kind: 'projekt' as const, data: p, tage: p.tageVerbleibend })),
    ...events.map((e) => ({ kind: 'event' as const,   data: e, tage: e.tageVerbleibend })),
  ].sort((a, b) => a.tage - b.tage)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
      <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-500" />
          <h2 className="text-sm font-semibold text-gray-900">Anstehende Deadlines</h2>
          <InfoHinweis
            titel="Anstehende Deadlines"
            beschreibung="Hier siehst du alle Projekt-Deadlines und Timeline-Events (Lieferungen, Meilensteine, Termine, Phasen), die in den nächsten Tagen fällig werden oder bereits überfällig sind."
            anlegenHinweis="Neue Deadlines setzt du im Projekt: Projekt öffnen → Deadline-Feld oder Timeline öffnen und Event anlegen."
            anlegenLink="/dashboard/projekte"
            anlegenLinkLabel="Zu den Projekten"
          />
        </div>
        <Link href="/dashboard/projekte" className="text-xs text-wellbeing-green hover:text-wellbeing-green-dark transition-colors font-medium">
          Alle →
        </Link>
      </div>

      {eintraege.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-xs text-gray-400">Keine anstehenden Deadlines.</p>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {eintraege.map((e) => {
            const farbe = deadlineFarbe(e.tage)
            if (e.kind === 'projekt') {
              const p = e.data
              return (
                <li key={`p-${p.id}`}>
                  <Link
                    href={`/dashboard/projekte/${p.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="shrink-0 w-7 h-7 rounded-lg bg-gray-50 text-gray-500 flex items-center justify-center">
                      <FolderOpen className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate group-hover:text-wellbeing-green transition-colors">
                        {p.name}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">
                        Projekt-Deadline{p.kundenName ? ` · ${p.kundenName}` : ''}
                      </p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full border ${farbe}`}>
                      {deadlineLabel(p.tageVerbleibend)}
                    </span>
                  </Link>
                </li>
              )
            }
            const ev   = e.data
            const Icon = EVENT_ICON[ev.typ]
            const col  = EVENT_COLOR[ev.typ]
            return (
              <li key={`e-${ev.id}`}>
                <Link
                  href={`/dashboard/projekte/${ev.projektId}/timeline`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group"
                >
                  <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${col}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate group-hover:text-wellbeing-green transition-colors">
                      {ev.titel}
                    </p>
                    {ev.projektName && (
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">{ev.projektName}</p>
                    )}
                  </div>
                  <span className={`shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full border ${farbe}`}>
                    {deadlineLabel(ev.tageVerbleibend)}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ── Offene Follow-ups ─────────────────────────────────────────

export function OffeneFollowUps({ eintraege }: { eintraege: FollowUpEintrag[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
      <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-gray-900">
            Offene Follow-ups
            {eintraege.length > 0 && (
              <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                {eintraege.length}
              </span>
            )}
          </h2>
          <InfoHinweis
            titel="Offene Follow-ups"
            beschreibung="Alle Kommunikations-Einträge (Anrufe, E-Mails, Meetings, Notizen), bei denen du dir ein Follow-up-Datum gesetzt hast und das in den nächsten 7 Tagen fällig oder bereits überfällig ist."
            anlegenHinweis="Follow-ups legst du beim Kunden an: Kunde öffnen → Block „Kommunikation“ → „+ Neuer Eintrag“ → Follow-up-Datum setzen. Erledigen via Haken-Icon am Eintrag."
            anlegenLink="/dashboard/kunden"
            anlegenLinkLabel="Zu den Kunden"
          />
        </div>
        <Link href="/dashboard/kunden" className="text-xs text-wellbeing-green hover:text-wellbeing-green-dark transition-colors font-medium">
          Kunden →
        </Link>
      </div>

      {eintraege.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-xs text-gray-400">Keine offenen Follow-ups.</p>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {eintraege.map((e) => {
            const Icon = typIcon[e.typ] ?? MessageSquare
            const ueberfaellig = e.tageVerbleibend < 0
            return (
              <li key={e.id}>
                <Link
                  href={`/dashboard/kunden/${e.kundeId}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group"
                >
                  <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${ueberfaellig ? 'bg-red-50' : 'bg-amber-50'}`}>
                    <Icon className={`w-3.5 h-3.5 ${ueberfaellig ? 'text-red-500' : 'text-amber-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate group-hover:text-wellbeing-green transition-colors">
                      {e.betreff ?? e.typ}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">{e.kundenName}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-semibold ${ueberfaellig ? 'text-red-500' : 'text-amber-600'}`}>
                    {ueberfaellig ? `${Math.abs(e.tageVerbleibend)}d überfällig` : e.tageVerbleibend === 0 ? 'Heute' : `${e.tageVerbleibend}d`}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ── Budget-Übersicht ──────────────────────────────────────────

export function BudgetUebersicht({ projekte }: { projekte: BudgetProjekt[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
      <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Budget-Übersicht</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">Aktive Projekte mit gesetztem Budget</p>
        </div>
        <Link href="/dashboard/projekte" className="text-xs text-wellbeing-green hover:text-wellbeing-green-dark transition-colors font-medium">
          Alle →
        </Link>
      </div>

      {projekte.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8">
          <TrendingUp className="w-7 h-7 text-gray-200" />
          <p className="text-xs text-gray-400">Kein Budget hinterlegt.</p>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {projekte.map((p) => {
            const ueberschritten = p.prozent > 100
            return (
              <li key={p.id} className="px-5 py-3">
                <Link href={`/dashboard/projekte/${p.id}`} className="block group">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-medium text-gray-900 truncate max-w-[55%] group-hover:text-wellbeing-green transition-colors">{p.name}</p>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={`text-xs font-semibold ${ueberschritten ? 'text-red-500' : 'text-gray-500'}`}>
                        {p.prozent}%
                      </span>
                      <span className="text-[11px] text-gray-400">{eur(p.istKosten)} / {eur(p.budget)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${ueberschritten ? 'bg-red-400' : p.prozent > 80 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                      style={{ width: `${Math.min(p.prozent, 100)}%` }}
                    />
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ── Letzte Aktivitäten ────────────────────────────────────────

const tabelleLabel: Record<string, string> = {
  kunden:     'Kunde',
  projekte:   'Projekt',
  angebote:   'Angebot',
  vertraege:  'Vertrag',
  raeume:     'Raum',
  produkte:   'Produkt',
  partner:    'Partner',
  kommunikation: 'Kommunikation',
}

function aktionFarbe(aktion: string): string {
  if (aktion.includes('insert') || aktion.includes('create')) return 'bg-emerald-50 text-emerald-700'
  if (aktion.includes('update')) return 'bg-blue-50 text-blue-700'
  if (aktion.includes('delete')) return 'bg-red-50 text-red-600'
  return 'bg-gray-100 text-gray-600'
}

function aktionLabel(aktion: string): string {
  if (aktion.includes('insert') || aktion.includes('create')) return 'Erstellt'
  if (aktion.includes('update')) return 'Geändert'
  if (aktion.includes('delete')) return 'Gelöscht'
  return aktion
}

function zeitDiff(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  const std = Math.floor(min / 60)
  const tag = Math.floor(std / 24)
  if (min < 1)   return 'Gerade eben'
  if (min < 60)  return `vor ${min} Min.`
  if (std < 24)  return `vor ${std} Std.`
  if (tag < 7)   return `vor ${tag} Tag${tag !== 1 ? 'en' : ''}`
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

export function LetzteAktivitaeten({ eintraege }: { eintraege: AktivitaetsEintrag[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
      <div className="shrink-0 px-5 py-3.5 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Letzte Aktivitäten</h2>
        <p className="text-[11px] text-gray-400 mt-0.5">Änderungen in der Organisation</p>
      </div>

      {eintraege.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8">
          <AlertCircle className="w-7 h-7 text-gray-200" />
          <p className="text-xs text-gray-400">Noch keine Aktivitäten erfasst.</p>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {eintraege.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-5 py-2.5">
              <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded ${aktionFarbe(e.aktion)}`}>
                {aktionLabel(e.aktion)}
              </span>
              <p className="text-xs text-gray-600 flex-1 truncate">
                {tabelleLabel[e.tabelle] ?? e.tabelle}
              </p>
              <span className="text-[10px] text-gray-400 shrink-0">{zeitDiff(e.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Letzte Projekte ───────────────────────────────────────────

export function LetzteProjekte({ projekte }: { projekte: LetzesProjekt[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
      <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">
          Letzte Projekte
          <span className="ml-2 text-gray-400 font-normal text-xs">({projekte.length})</span>
        </h2>
        <Link href="/dashboard/projekte" className="text-xs text-wellbeing-green hover:text-wellbeing-green-dark transition-colors font-medium">
          Alle anzeigen →
        </Link>
      </div>

      {projekte.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-12 px-6 text-center min-h-[180px]">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-500">Noch keine Projekte vorhanden</p>
          <p className="text-xs text-gray-400">Leg dein erstes Projekt an, um loszulegen.</p>
          <Link href="/dashboard/projekte/neu" className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-wellbeing-green hover:bg-wellbeing-green-dark text-white text-xs font-medium rounded-lg transition-colors">
            Projekt anlegen →
          </Link>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-widest">Projekt</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-widest">Kunde</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-widest">Deadline</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-widest">Budget</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {projekte.map((p) => {
                const dl = p.deadline ? tageBis(p.deadline) : null
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/projekte/${p.id}`}
                        className="font-medium text-gray-900 group-hover:text-wellbeing-green transition-colors text-xs"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{p.kundenName ?? '–'}</td>
                    <td className="px-5 py-3">
                      {dl !== null ? (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${dl < 0 ? 'text-red-600 bg-red-50' : dl <= 7 ? 'text-amber-700 bg-amber-50' : 'text-gray-500 bg-gray-50'}`}>
                          {dl < 0 ? `${Math.abs(dl)}d überfällig` : dl === 0 ? 'Heute' : `${dl}d`}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">–</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500 font-mono">
                      {p.gesamtbudget != null ? eur(p.gesamtbudget) : '–'}
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/dashboard/projekte/${p.id}`}
                        className="text-xs text-gray-300 group-hover:text-wellbeing-green transition-colors"
                      >
                        →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Meine Aufgaben (Migration 102) ────────────────────────────

const PRIO_PUNKT: Record<MeineAufgabe['prioritaet'], string> = {
  niedrig:  'bg-gray-300',
  normal:   'bg-blue-400',
  hoch:     'bg-amber-500',
  dringend: 'bg-red-500',
}

export function MeineAufgabenWidget({
  meineAufgaben,
  alleAufgaben,
  pickerOptionen,
}: {
  meineAufgaben: MeineAufgabe[]
  alleAufgaben:  MeineAufgabe[]
  pickerOptionen?: AufgabePickerOptionen
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [erledigtIds, setErledigtIds] = useState<Set<string>>(new Set())
  const [anlegenOffen, setAnlegenOffen] = useState(false)
  const [filter, setFilter] = useState<'meine' | 'alle'>('meine')

  const quelle = filter === 'meine' ? meineAufgaben : alleAufgaben
  const sichtbar = quelle.filter((a) => !erledigtIds.has(a.id))

  function abhaken(id: string) {
    setErledigtIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
    startTransition(async () => {
      const res = await aufgabeStatusAendern(id, 'erledigt')
      if (res.fehler) {
        // Rollback
        setErledigtIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
      <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-gray-100 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-wellbeing-green" />
          <h2 className="text-sm font-semibold text-gray-900">Aufgaben</h2>
          {sichtbar.length > 0 && (
            <span className="text-xs text-gray-400 tabular-nums">({sichtbar.length})</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Filter-Toggle: Meine / Alle */}
          <div className="inline-flex items-center border border-gray-200 rounded-md overflow-hidden text-[11px] font-medium">
            <button
              type="button"
              onClick={() => setFilter('meine')}
              className={`px-2.5 py-1 transition-colors ${
                filter === 'meine'
                  ? 'bg-wellbeing-green text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              Meine
              {meineAufgaben.length > 0 && (
                <span className={`ml-1.5 tabular-nums ${filter === 'meine' ? 'text-white/80' : 'text-gray-400'}`}>
                  {meineAufgaben.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setFilter('alle')}
              className={`px-2.5 py-1 border-l border-gray-200 transition-colors ${
                filter === 'alle'
                  ? 'bg-wellbeing-green text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}
            >
              Alle
              {alleAufgaben.length > 0 && (
                <span className={`ml-1.5 tabular-nums ${filter === 'alle' ? 'text-white/80' : 'text-gray-400'}`}>
                  {alleAufgaben.length}
                </span>
              )}
            </button>
          </div>
          {pickerOptionen && (
            <button
              onClick={() => setAnlegenOffen(true)}
              aria-label="Neue Aufgabe"
              className="text-gray-400 hover:text-wellbeing-green p-1 rounded hover:bg-gray-50"
            >
              <Plus size={16} />
            </button>
          )}
          <Link
            href="/dashboard/aufgaben"
            className="text-xs text-wellbeing-green hover:text-wellbeing-green-dark transition-colors font-medium"
          >Board →</Link>
        </div>
      </div>
      {sichtbar.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          {filter === 'meine' ? (
            <>
              <p className="text-xs text-gray-400">Du hast keine offenen Aufgaben.</p>
              {alleAufgaben.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFilter('alle')}
                  className="text-[11px] text-wellbeing-green hover:underline"
                >
                  {alleAufgaben.length} offene Aufgabe{alleAufgaben.length === 1 ? '' : 'n'} im Team anzeigen →
                </button>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-400">Keine offenen Aufgaben im Team.</p>
          )}
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {sichtbar.map((a) => {
            const dl = a.tageVerbleibend
            const tagLabel =
              a.faellig_am == null ? null
              : dl < 0 ? `${Math.abs(dl)}d überfällig`
              : dl === 0 ? 'Heute'
              : `${dl}d`
            return (
              <li key={a.id} className="px-5 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3 group">
                <button
                  onClick={() => abhaken(a.id)}
                  disabled={pending}
                  aria-label="Aufgabe erledigen"
                  className="mt-0.5 w-5 h-5 rounded border border-gray-300 hover:border-wellbeing-green flex items-center justify-center text-transparent hover:text-wellbeing-green disabled:opacity-50"
                >
                  <Check size={14} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIO_PUNKT[a.prioritaet]}`} aria-hidden />
                    <Link
                      href="/dashboard/aufgaben"
                      className="text-xs font-medium text-gray-900 group-hover:text-wellbeing-green truncate"
                    >{a.titel}</Link>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                    {a.projektName && <span>{a.projektName}</span>}
                    {a.projektName && a.kundeName && ' · '}
                    {a.kundeName}
                  </p>
                </div>
                {tagLabel && (
                  <span className={
                    'text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ' +
                    (dl < 0 ? 'text-red-600 bg-red-50' : dl === 0 ? 'text-amber-700 bg-amber-50' : 'text-gray-500 bg-gray-50')
                  }>{tagLabel}</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {pickerOptionen && (
        <AufgabeAnlegenModal
          open={anlegenOffen}
          onClose={() => setAnlegenOffen(false)}
          pickerOptionen={pickerOptionen}
        />
      )}
    </div>
  )
}
