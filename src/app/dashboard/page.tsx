import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Users, FolderOpen, ReceiptText, TrendingUp } from 'lucide-react'
import type { ProjektMitKunde } from '@/lib/supabase/types'
import {
  KpiKarte,
  NaechsteDeadlines,
  OffeneFollowUps,
  BudgetUebersicht,
  LetzteAktivitaeten,
  LetzteProjekte,
  type DeadlineProjekt,
  type FollowUpEintrag,
  type BudgetProjekt,
  type AktivitaetsEintrag,
  type LetzesProjekt,
} from '@/components/DashboardWidgets'

// ── Hilfsfunktionen ───────────────────────────────────────────

const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

function tageDiff(isoDate: string): number {
  return Math.floor((new Date(isoDate).getTime() - Date.now()) / 86_400_000)
}

// ── Datenabruf ────────────────────────────────────────────────

async function getDashboardData() {
  const supabase = await createClient()

  // Aktueller Monatsanfang
  const now = new Date()
  const monatsStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Deadline in 60 Tagen
  const in60Tagen = new Date()
  in60Tagen.setDate(in60Tagen.getDate() + 60)

  // Follow-up in 7 Tagen
  const in7Tagen = new Date()
  in7Tagen.setDate(in7Tagen.getDate() + 7)
  const in7TagenStr = in7Tagen.toISOString().slice(0, 10)

  const [
    { count: aktiveKunden },
    { count: laufendeProjekte },
    { data: deadlineProjekte },
    { data: letzteProjekteRaw },
    { data: produkteKostenRaw },
    { data: aktivProjekteBudget },
  ] = await Promise.all([
    // ROW 1 KPIs
    supabase.from('kunden').select('*', { count: 'exact', head: true }).eq('status', 'aktiv').is('deleted_at', null),
    supabase.from('projekte').select('*', { count: 'exact', head: true }).in('status', ['offen', 'in_bearbeitung']).is('deleted_at', null).eq('archiviert', false),

    // ROW 2: Deadlines
    supabase
      .from('projekte')
      .select('id, name, deadline, kunden(name)')
      .is('deleted_at', null)
      .eq('archiviert', false)
      .in('status', ['offen', 'in_bearbeitung'])
      .not('deadline', 'is', null)
      .lte('deadline', in60Tagen.toISOString().slice(0, 10))
      .order('deadline', { ascending: true })
      .limit(6),

    // ROW 4: Letzte Projekte
    supabase
      .from('projekte')
      .select('*, kunden(id, name)')
      .is('deleted_at', null)
      .eq('archiviert', false)
      .order('created_at', { ascending: false })
      .limit(8),

    // ROW 3 Budget: Ist-Kosten aus raum_produkte
    supabase
      .from('raum_produkte')
      .select('menge, verkaufspreis_override, raeume!inner(projekt_id), produkte!inner(verkaufspreis)'),

    // Aktive Projekte mit Budget für Übersicht
    supabase
      .from('projekte')
      .select('id, name, gesamtbudget')
      .is('deleted_at', null)
      .eq('archiviert', false)
      .in('status', ['offen', 'in_bearbeitung'])
      .not('gesamtbudget', 'is', null)
      .order('gesamtbudget', { ascending: false })
      .limit(5),
  ])

  // Angebote-Daten (graceful: Tabelle existiert möglicherweise noch nicht)
  let offeneAngebote = 0
  let monatsumsatz = 0
  try {
    const [{ count: angeboteCount }, { data: monatsDaten }] = await Promise.all([
      supabase.from('angebote').select('*', { count: 'exact', head: true }).in('status', ['entwurf', 'gesendet']),
      supabase.from('angebote').select('brutto_summe').eq('status', 'angenommen').gte('created_at', monatsStart),
    ])
    offeneAngebote = angeboteCount ?? 0
    monatsumsatz = (monatsDaten ?? []).reduce(
      (sum, a) => sum + ((a as { brutto_summe: number | null }).brutto_summe ?? 0),
      0
    )
  } catch { /* angebote-Tabelle noch nicht migriert */ }

  // Follow-ups (graceful: tabelle existiert vielleicht noch nicht)
  let followUpEintraege: FollowUpEintrag[] = []
  try {
    const { data: followUps } = await supabase
      .from('kommunikation')
      .select('id, typ, betreff, follow_up_datum, kunden!inner(id, name)')
      .eq('erledigt', false)
      .not('follow_up_datum', 'is', null)
      .lte('follow_up_datum', in7TagenStr)
      .order('follow_up_datum', { ascending: true })
      .limit(8)

    type FollowUpRaw = {
      id: string
      typ: string
      betreff: string | null
      follow_up_datum: string
      kunden: { id: string; name: string } | null
    }

    followUpEintraege = ((followUps ?? []) as unknown as FollowUpRaw[]).map((e) => ({
      id: e.id,
      kundeId: e.kunden?.id ?? '',
      kundenName: e.kunden?.name ?? '–',
      typ: e.typ,
      betreff: e.betreff,
      follow_up_datum: e.follow_up_datum,
      tageVerbleibend: Math.floor((new Date(e.follow_up_datum).getTime() - Date.now()) / 86_400_000),
    }))
  } catch { /* tabelle existiert noch nicht */ }

  // Letzte Aktivitäten (graceful)
  let aktivitaeten: AktivitaetsEintrag[] = []
  try {
    const { data: logDaten } = await supabase
      .from('audit_log')
      .select('id, aktion, tabelle, created_at')
      .order('created_at', { ascending: false })
      .limit(8)
    aktivitaeten = (logDaten ?? []) as AktivitaetsEintrag[]
  } catch { /* tabelle existiert noch nicht */ }

  // ── Berechnungen ───────────────────────────────────────────

  // Deadlines aufbereiten
  type DeadlineRaw = { id: string; name: string; deadline: string; kunden: { name: string } | null }
  const naechsteDeadlines: DeadlineProjekt[] = ((deadlineProjekte ?? []) as unknown as DeadlineRaw[]).map((p) => ({
    id: p.id,
    name: p.name,
    kundenName: p.kunden?.name ?? null,
    deadline: p.deadline,
    tageVerbleibend: tageDiff(p.deadline),
  }))

  // Budget Ist-Kosten berechnen
  type KostenRaw = {
    menge: number
    verkaufspreis_override: number | null
    raeume: { projekt_id: string } | null
    produkte: { verkaufspreis: number | null } | null
  }
  const kostenByProjekt = new Map<string, number>()
  for (const e of (produkteKostenRaw ?? []) as unknown as KostenRaw[]) {
    if (!e.raeume) continue
    const ep = e.verkaufspreis_override ?? e.produkte?.verkaufspreis ?? 0
    const kosten = ep * e.menge
    const prev = kostenByProjekt.get(e.raeume.projekt_id) ?? 0
    kostenByProjekt.set(e.raeume.projekt_id, prev + kosten)
  }

  const budgetProjekte: BudgetProjekt[] = (aktivProjekteBudget ?? [])
    .filter((p) => (p.gesamtbudget ?? 0) > 0)
    .map((p) => {
      const ist = Math.round((kostenByProjekt.get(p.id) ?? 0) * 100) / 100
      const budget = p.gesamtbudget ?? 0
      return {
        id: p.id,
        name: p.name,
        budget,
        istKosten: ist,
        prozent: budget > 0 ? Math.min(Math.round((ist / budget) * 100), 999) : 0,
      }
    })

  // Letzte Projekte
  const letzteProjekte: LetzesProjekt[] = ((letzteProjekteRaw ?? []) as ProjektMitKunde[]).map((p) => ({
    id: p.id,
    name: p.name,
    kundenName: p.kunden?.name ?? null,
    status: p.status,
    gesamtbudget: p.gesamtbudget ?? null,
    deadline: p.deadline ?? null,
    created_at: p.created_at,
  }))

  return {
    aktiveKunden:     aktiveKunden    ?? 0,
    laufendeProjekte: laufendeProjekte ?? 0,
    offeneAngebote:   offeneAngebote  ?? 0,
    monatsumsatz,
    naechsteDeadlines,
    followUpEintraege,
    budgetProjekte,
    aktivitaeten,
    letzteProjekte,
  }
}

// ── Seite ─────────────────────────────────────────────────────

export default async function DashboardPage() {
  const {
    aktiveKunden, laufendeProjekte, offeneAngebote, monatsumsatz,
    naechsteDeadlines, followUpEintraege,
    budgetProjekte, aktivitaeten,
    letzteProjekte,
  } = await getDashboardData()

  const kpis = [
    {
      label:    'Aktive Kunden',
      wert:     aktiveKunden,
      href:     '/dashboard/kunden',
      icon:     Users,
      farbe:    'text-wellbeing-green',
      bg:       'bg-wellbeing-cream',
    },
    {
      label:    'Laufende Projekte',
      wert:     laufendeProjekte,
      href:     '/dashboard/projekte',
      icon:     FolderOpen,
      farbe:    'text-blue-600',
      bg:       'bg-blue-50',
    },
    {
      label:    'Offene Angebote',
      wert:     offeneAngebote,
      href:     '/dashboard/projekte',
      icon:     ReceiptText,
      farbe:    'text-violet-600',
      bg:       'bg-violet-50',
    },
    {
      label:    'Monatsumsatz',
      wert:     monatsumsatz > 0 ? eur(monatsumsatz) : '–',
      subLabel: 'Angenommene Angebote',
      href:     '/dashboard/projekte',
      icon:     TrendingUp,
      farbe:    'text-emerald-600',
      bg:       'bg-emerald-50',
    },
  ]

  return (
    <div className="h-full overflow-y-auto px-6 py-5 space-y-4 animate-fadeIn">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-syne text-[28px] font-bold text-gray-900 leading-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Willkommen im Wellbeing Spaces Studio.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard/kunden/neu"
            className="text-sm px-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900 rounded-lg font-medium transition-colors"
          >
            + Kunde
          </Link>
          <Link
            href="/dashboard/projekte/neu"
            className="text-sm px-5 py-2.5 bg-wellbeing-green hover:bg-wellbeing-green-dark text-white rounded-lg font-semibold transition-colors min-w-[140px] text-center"
          >
            + Neues Projekt
          </Link>
        </div>
      </div>

      {/* ROW 1: KPI-Kacheln */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <KpiKarte key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* ROW 2: Deadlines + Follow-ups */}
      <div className="grid grid-cols-2 gap-4 min-h-[220px]">
        <NaechsteDeadlines projekte={naechsteDeadlines} />
        <OffeneFollowUps eintraege={followUpEintraege} />
      </div>

      {/* ROW 3: Budget-Übersicht + Letzte Aktivitäten */}
      <div className="grid grid-cols-2 gap-4 min-h-[220px]">
        <BudgetUebersicht projekte={budgetProjekte} />
        <LetzteAktivitaeten eintraege={aktivitaeten} />
      </div>

      {/* ROW 4: Letzte Projekte */}
      <div className="min-h-[280px]">
        <LetzteProjekte projekte={letzteProjekte} />
      </div>

    </div>
  )
}
