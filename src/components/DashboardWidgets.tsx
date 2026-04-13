'use client'

import Link from 'next/link'
import { ArrowRight, Calendar, Clock, TrendingUp, AlertCircle, CheckCircle2, PhoneCall, Mail, Users, MessageSquare } from 'lucide-react'

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

export interface FollowUpEintrag {
  id: string
  kundeId: string
  kundenName: string
  typ: string
  betreff: string | null
  follow_up_datum: string
  tageVerbleibend: number
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

const statusFarbe: Record<string, string> = {
  offen:          'bg-gray-100 text-gray-600',
  in_bearbeitung: 'bg-blue-50 text-blue-700',
  freigegeben:    'bg-emerald-50 text-emerald-700',
  abgeschlossen:  'bg-gray-100 text-gray-500',
}
const statusLabel: Record<string, string> = {
  offen:          'Offen',
  in_bearbeitung: 'In Bearbeitung',
  freigegeben:    'Freigegeben',
  abgeschlossen:  'Abgeschlossen',
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

// ── Nächste Deadlines ─────────────────────────────────────────

export function NaechsteDeadlines({ projekte }: { projekte: DeadlineProjekt[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
      <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-500" />
          <h2 className="text-sm font-semibold text-gray-900">Nächste Deadlines</h2>
        </div>
        <Link href="/dashboard/projekte" className="text-xs text-wellbeing-green hover:text-wellbeing-green-dark transition-colors font-medium">
          Alle →
        </Link>
      </div>

      {projekte.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-xs text-gray-400">Keine anstehenden Deadlines.</p>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {projekte.map((p) => {
            const farbe = deadlineFarbe(p.tageVerbleibend)
            return (
              <li key={p.id}>
                <Link
                  href={`/dashboard/projekte/${p.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate group-hover:text-wellbeing-green transition-colors">
                      {p.name}
                    </p>
                    {p.kundenName && (
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">{p.kundenName}</p>
                    )}
                  </div>
                  <span className={`shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full border ${farbe}`}>
                    {deadlineLabel(p.tageVerbleibend)}
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
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-gray-400">Noch keine Projekte vorhanden.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-widest">Projekt</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-widest">Kunde</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-widest">Status</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-widest">Deadline</th>
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-widest">Budget</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {projekte.map((p) => {
                const dl = p.deadline ? Math.floor((new Date(p.deadline).getTime() - Date.now()) / 86_400_000) : null
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
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusFarbe[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {statusLabel[p.status] ?? p.status}
                      </span>
                    </td>
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
