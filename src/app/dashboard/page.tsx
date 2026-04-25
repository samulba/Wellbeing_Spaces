import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { ProjektMitKunde } from '@/lib/supabase/types'
import {
  KpiKartenReihe,
  NaechsteDeadlines,
  OffeneFollowUps,
  BudgetUebersicht,
  LetzteProjekte,
  type DeadlineProjekt,
  type DeadlineEvent,
  type DeadlineEventTyp,
  type FollowUpEintrag,
  type BudgetProjekt,
  type LetzesProjekt,
} from '@/components/DashboardWidgets'

// ── Hilfsfunktionen ───────────────────────────────────────────

function tageDiff(isoDate: string): number {
  return Math.floor((new Date(isoDate).getTime() - Date.now()) / 86_400_000)
}

/** Führt einen Supabase-Query sicher aus und gibt null zurück wenn er fehlschlägt. */
async function safeQuery<T>(
  queryFn: () => PromiseLike<{ data: T | null; error: unknown; count?: number | null }>
): Promise<{ data: T | null; count: number | null }> {
  try {
    const result = await queryFn()
    if (result.error) return { data: null, count: null }
    return { data: result.data, count: result.count ?? null }
  } catch {
    return { data: null, count: null }
  }
}

// ── Datenabruf ────────────────────────────────────────────────

async function getDashboardData() {
  const supabase = await createClient()

  const now         = new Date()
  const monatsStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const in60Tagen   = new Date(now); in60Tagen.setDate(now.getDate() + 60)
  const in7Tagen    = new Date(now); in7Tagen.setDate(now.getDate() + 7)
  const in7TagenStr = in7Tagen.toISOString().slice(0, 10)
  const in60Str     = in60Tagen.toISOString().slice(0, 10)

  // Alle Kern-Queries parallel, jeder mit eigenem Fehler-Schutz
  const [
    aktiveKundenResult,
    laufendeProjekteResult,
    deadlineProjekteResult,
    letzteProjekteResult,
    produkteKostenResult,
    aktivProjekteBudgetResult,
  ] = await Promise.all([

    // Aktive Kunden – ohne status-Filter als Fallback falls Spalte fehlt
    safeQuery(() =>
      supabase
        .from('kunden')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
    ),

    // Laufende Projekte – alle nicht abgeschlossenen / nicht archivierten Projekte
    // (offen, in_bearbeitung, freigegeben = "Warten auf Kunde" sind laufend)
    safeQuery(() =>
      supabase
        .from('projekte')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'abgeschlossen')
        .is('deleted_at', null)
        .eq('archiviert', false)
    ),

    // Nächste Deadlines
    safeQuery(() =>
      supabase
        .from('projekte')
        .select('id, name, deadline, kunden(name)')
        .is('deleted_at', null)
        .eq('archiviert', false)
        .neq('status', 'abgeschlossen')
        .not('deadline', 'is', null)
        .lte('deadline', in60Str)
        .order('deadline', { ascending: true })
        .limit(6)
    ),

    // Letzte Projekte
    safeQuery(() =>
      supabase
        .from('projekte')
        .select('*, kunden(id, name)')
        .is('deleted_at', null)
        .eq('archiviert', false)
        .order('created_at', { ascending: false })
        .limit(8)
    ),

    // Budget: Ist-Kosten aus raum_produkte
    safeQuery(() =>
      supabase
        .from('raum_produkte')
        .select('menge, verkaufspreis_override, raeume!inner(projekt_id), produkte!inner(verkaufspreis)')
    ),

    // Aktive Projekte mit Budget
    safeQuery(() =>
      supabase
        .from('projekte')
        .select('id, name, gesamtbudget')
        .is('deleted_at', null)
        .eq('archiviert', false)
        .neq('status', 'abgeschlossen')
        .not('gesamtbudget', 'is', null)
        .order('gesamtbudget', { ascending: false })
        .limit(5)
    ),
  ])

  // Angebote (eigene try/catch – Tabelle evtl. nicht migriert)
  let offeneAngebote = 0
  let monatsumsatz   = 0
  try {
    const [r1, r2] = await Promise.all([
      safeQuery(() =>
        supabase
          .from('angebote')
          .select('*', { count: 'exact', head: true })
          .in('status', ['entwurf', 'gesendet'])
      ),
      safeQuery(() =>
        supabase
          .from('angebote')
          .select('brutto_summe')
          .eq('status', 'angenommen')
          .gte('created_at', monatsStart)
      ),
    ])
    offeneAngebote = r1.count ?? 0
    monatsumsatz   = ((r2.data ?? []) as { brutto_summe: number | null }[])
      .reduce((sum, a) => sum + (a.brutto_summe ?? 0), 0)
  } catch { /* angebote-Tabelle noch nicht migriert */ }

  // Timeline-Events (eigene try/catch – Tabelle evtl. nicht migriert)
  // Anzeige: status != abgeschlossen UND start_datum <= heute + max(erinnerung_tage, 7)
  // Da die Tage-Fenstergröße variabel ist, laden wir 30 Tage als Obergrenze
  // und filtern danach im Code per erinnerung_tage || 7.
  let anstehendeEvents: DeadlineEvent[] = []
  try {
    const in30Str = new Date(now.getTime() + 30 * 86_400_000).toISOString().slice(0, 10)
    const vor7Str = new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10)
    const r = await safeQuery(() =>
      supabase
        .from('timeline_events')
        .select('id, titel, typ, start_datum, erinnerung_tage, projekt_id, projekte(id, name)')
        .neq('status', 'abgeschlossen')
        .gte('start_datum', vor7Str)
        .lte('start_datum', in30Str)
        .order('start_datum', { ascending: true })
        .limit(20)
    )
    type EventRaw = {
      id: string
      titel: string
      typ: string
      start_datum: string
      erinnerung_tage: number | null
      projekt_id: string
      projekte: { id: string; name: string } | null
    }
    anstehendeEvents = ((r.data ?? []) as unknown as EventRaw[])
      .map((e) => {
        const tage = tageDiff(e.start_datum)
        return {
          id:              e.id,
          titel:           e.titel,
          projektId:       e.projekt_id,
          projektName:     e.projekte?.name ?? null,
          typ:             (['meilenstein', 'lieferung', 'termin', 'phase'].includes(e.typ) ? e.typ : 'termin') as DeadlineEventTyp,
          start_datum:     e.start_datum,
          tageVerbleibend: tage,
          istUeberfaellig: tage < 0,
          _fenster:        e.erinnerung_tage ?? 7,
        }
      })
      .filter((e) => e.tageVerbleibend <= e._fenster) // innerhalb der Erinnerungs-Frist
      .map(({ _fenster, ...e }) => { void _fenster; return e })
      .slice(0, 8)
  } catch { /* timeline_events evtl. nicht migriert */ }

  // Follow-ups (eigene try/catch – Tabelle evtl. nicht migriert)
  let followUpEintraege: FollowUpEintrag[] = []
  try {
    const r = await safeQuery(() =>
      supabase
        .from('kommunikation')
        .select('id, typ, betreff, follow_up_datum, kunden!inner(id, name)')
        .eq('erledigt', false)
        .not('follow_up_datum', 'is', null)
        .lte('follow_up_datum', in7TagenStr)
        .order('follow_up_datum', { ascending: true })
        .limit(8)
    )

    type FollowUpRaw = {
      id: string
      typ: string
      betreff: string | null
      follow_up_datum: string
      kunden: { id: string; name: string } | null
    }

    followUpEintraege = ((r.data ?? []) as unknown as FollowUpRaw[]).map((e) => ({
      id:              e.id,
      kundeId:         e.kunden?.id ?? '',
      kundenName:      e.kunden?.name ?? '–',
      typ:             e.typ,
      betreff:         e.betreff,
      follow_up_datum: e.follow_up_datum,
      tageVerbleibend: Math.floor((new Date(e.follow_up_datum).getTime() - Date.now()) / 86_400_000),
    }))
  } catch { /* tabelle existiert noch nicht */ }

  // ── Berechnungen ───────────────────────────────────────────

  type DeadlineRaw = { id: string; name: string; deadline: string; kunden: { name: string } | null }
  const naechsteDeadlines: DeadlineProjekt[] = (
    (deadlineProjekteResult.data ?? []) as unknown as DeadlineRaw[]
  ).map((p) => ({
    id:              p.id,
    name:            p.name,
    kundenName:      p.kunden?.name ?? null,
    deadline:        p.deadline,
    tageVerbleibend: tageDiff(p.deadline),
  }))

  type KostenRaw = {
    menge: number
    verkaufspreis_override: number | null
    raeume:   { projekt_id: string } | null
    produkte: { verkaufspreis: number | null } | null
  }
  const kostenByProjekt = new Map<string, number>()
  for (const e of (produkteKostenResult.data ?? []) as unknown as KostenRaw[]) {
    if (!e.raeume) continue
    const ep    = e.verkaufspreis_override ?? e.produkte?.verkaufspreis ?? 0
    const prev  = kostenByProjekt.get(e.raeume.projekt_id) ?? 0
    kostenByProjekt.set(e.raeume.projekt_id, prev + ep * e.menge)
  }

  const budgetProjekte: BudgetProjekt[] = (
    (aktivProjekteBudgetResult.data ?? []) as { id: string; name: string; gesamtbudget: number | null }[]
  )
    .filter((p) => (p.gesamtbudget ?? 0) > 0)
    .map((p) => {
      const ist    = Math.round((kostenByProjekt.get(p.id) ?? 0) * 100) / 100
      const budget = p.gesamtbudget ?? 0
      return {
        id:        p.id,
        name:      p.name,
        budget,
        istKosten: ist,
        prozent:   budget > 0 ? Math.min(Math.round((ist / budget) * 100), 999) : 0,
      }
    })

  const letzteProjekte: LetzesProjekt[] = (
    (letzteProjekteResult.data ?? []) as ProjektMitKunde[]
  ).map((p) => ({
    id:           p.id,
    name:         p.name,
    kundenName:   p.kunden?.name ?? null,
    status:       p.status,
    gesamtbudget: p.gesamtbudget ?? null,
    deadline:     p.deadline ?? null,
    created_at:   p.created_at,
  }))

  return {
    aktiveKunden:     aktiveKundenResult.count     ?? 0,
    laufendeProjekte: laufendeProjekteResult.count ?? 0,
    offeneAngebote,
    monatsumsatz,
    naechsteDeadlines,
    anstehendeEvents,
    followUpEintraege,
    budgetProjekte,
    letzteProjekte,
  }
}

// ── Seite ─────────────────────────────────────────────────────

export default async function DashboardPage() {
  const {
    aktiveKunden, laufendeProjekte, offeneAngebote, monatsumsatz,
    naechsteDeadlines, anstehendeEvents, followUpEintraege,
    budgetProjekte,
    letzteProjekte,
  } = await getDashboardData()

  return (
    <div className="h-full flex flex-col overflow-y-auto xl:overflow-hidden animate-fadeIn">

      {/* Header – shrink-0 damit Content-Bereich die restliche Höhe bekommt */}
      <div className="shrink-0 bg-white border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="font-syne text-[24px] font-bold text-gray-900 leading-tight tracking-tight">Dashboard</h1>
            <p className="text-xs text-gray-500 mt-0.5">Willkommen im Wellbeing Spaces Studio.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/dashboard/kunden/neu"
              className="text-sm px-4 py-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900 rounded-lg font-medium transition-colors"
            >
              + Kunde
            </Link>
            <Link
              href="/dashboard/projekte/neu"
              className="text-sm px-4 py-2 bg-wellbeing-green hover:bg-wellbeing-green-dark text-white rounded-lg font-semibold transition-colors"
            >
              + Neues Projekt
            </Link>
          </div>
        </div>
      </div>

      {/* Content – auf xl+ fest 100vh, intern flex-col mit zwei „flex-1"-Zeilen */}
      <div className="flex-1 xl:min-h-0 flex flex-col px-6 py-4 gap-4">

        {/* ROW 1: KPI-Kacheln */}
        <div className="shrink-0">
          <KpiKartenReihe
            aktiveKunden={aktiveKunden}
            laufendeProjekte={laufendeProjekte}
            offeneAngebote={offeneAngebote}
            monatsumsatz={monatsumsatz}
          />
        </div>

        {/* ROW 2: Deadlines + Follow-ups (nebeneinander, flexibler Höhe) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[220px] xl:flex-1 xl:min-h-0">
          <NaechsteDeadlines projekte={naechsteDeadlines} events={anstehendeEvents} />
          <OffeneFollowUps eintraege={followUpEintraege} />
        </div>

        {/* ROW 3: Budget + Letzte Projekte (nebeneinander, fluid rest of viewport) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[280px] xl:flex-1 xl:min-h-0">
          <BudgetUebersicht projekte={budgetProjekte} />
          <LetzteProjekte projekte={letzteProjekte} />
        </div>

      </div>
    </div>
  )
}
