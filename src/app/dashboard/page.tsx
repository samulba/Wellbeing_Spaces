import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Users, FolderOpen, Handshake, Package, ArrowRight, Clock, AlertCircle, TrendingUp } from 'lucide-react'
import type { ProjektMitKunde } from '@/lib/supabase/types'
import {
  BalkenChart,
  DonutChart,
  LinienChart,
  type ProjektKostenData,
  type StatusData,
  type MonatsData,
} from '@/components/DashboardCharts'

// ── Hilfsfunktionen ───────────────────────────────────────────

function letzteSechtsMonate() {
  const result: { key: string; label: string }[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('de-DE', { month: 'short' })
    result.push({ key, label })
  }
  return result
}

const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

// ── Datenabruf ────────────────────────────────────────────────

type ProduktKostenRaw = {
  verkaufspreis: number | null
  menge: number
  raeume: { projekt_id: string } | null
}

type OffeneFreigabeRaw = {
  id: string
  name: string
  created_at: string
  raeume: { name: string; projekte: { id: string; name: string } | null } | null
}

async function getDashboardData() {
  const supabase = await createClient()
  const sechsMonateAgo = new Date()
  sechsMonateAgo.setMonth(sechsMonateAgo.getMonth() - 6)

  const [
    { count: kundenCount },
    { count: projekteCount },
    { count: partnerCount },
    { count: produkteCount },
    { data: projekteDaten },
    { data: produkteKostenRaw },
    { data: statusDaten },
    { data: neueProjekteDaten },
    { data: neueKundenDaten },
    { data: ausstehendStatus },
    { data: letzteProjekteRaw },
  ] = await Promise.all([
    supabase.from('kunden').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('projekte').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('partner').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('produkte').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase
      .from('projekte')
      .select('id, name, gesamtbudget, status')
      .is('deleted_at', null)
      .neq('status', 'abgeschlossen')
      .not('gesamtbudget', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('produkte')
      .select('verkaufspreis, menge, raeume!inner(projekt_id)')
      .is('deleted_at', null),
    supabase.from('produktstatus').select('status'),
    supabase
      .from('projekte')
      .select('created_at')
      .is('deleted_at', null)
      .gte('created_at', sechsMonateAgo.toISOString()),
    supabase
      .from('kunden')
      .select('created_at')
      .is('deleted_at', null)
      .gte('created_at', sechsMonateAgo.toISOString()),
    supabase.from('produktstatus').select('produkt_id').eq('status', 'ausstehend'),
    supabase
      .from('projekte')
      .select('*, kunden(id, name)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  // ── Ist-Kosten pro Projekt berechnen ──────────────────────
  const kostenByProjekt = new Map<string, number>()
  for (const p of (produkteKostenRaw ?? []) as unknown as ProduktKostenRaw[]) {
    if (!p.raeume) continue
    const kosten = (p.verkaufspreis ?? 0) * p.menge
    const prev = kostenByProjekt.get(p.raeume.projekt_id) ?? 0
    kostenByProjekt.set(p.raeume.projekt_id, prev + kosten)
  }

  const projektKosten: ProjektKostenData[] = (projekteDaten ?? []).map((p) => ({
    name: p.name.length > 10 ? p.name.slice(0, 10) + '…' : p.name,
    budget: p.gesamtbudget ?? 0,
    istKosten: Math.round((kostenByProjekt.get(p.id) ?? 0) * 100) / 100,
  }))

  // ── Status-Verteilung ─────────────────────────────────────
  const statusCounts: Record<string, number> = {}
  for (const s of statusDaten ?? []) {
    statusCounts[s.status] = (statusCounts[s.status] ?? 0) + 1
  }
  const statusVerteilung: StatusData[] = [
    { status: 'Freigegeben',   count: statusCounts.freigegeben    ?? 0, farbe: '#10B981' },
    { status: 'Ausstehend',    count: statusCounts.ausstehend     ?? 0, farbe: '#F59E0B' },
    { status: 'Abgelehnt',     count: statusCounts.abgelehnt      ?? 0, farbe: '#EF4444' },
    { status: 'Überarbeitung', count: statusCounts.ueberarbeitung ?? 0, farbe: '#6366F1' },
  ].filter((s) => s.count > 0)
  const gesamtProdukte = statusVerteilung.reduce((s, d) => s + d.count, 0)

  // ── Aktivitäts-Liniendiagramm ────────────────────────────
  const monate = letzteSechtsMonate()
  const aktivitaet: MonatsData[] = monate.map(({ key, label }) => ({
    monat: label,
    projekte: (neueProjekteDaten ?? []).filter((p) => p.created_at.startsWith(key)).length,
    kunden:   (neueKundenDaten   ?? []).filter((k) => k.created_at.startsWith(key)).length,
  }))

  // ── Offene Freigaben ─────────────────────────────────────
  const ausstehendIds = (ausstehendStatus ?? []).map((s) => s.produkt_id)
  let offeneFreigaben: {
    id: string; produktName: string; raumName: string; projektName: string; projektId: string; seitTagen: number
  }[] = []

  if (ausstehendIds.length > 0) {
    const { data: offenProdukte } = await supabase
      .from('produkte')
      .select('id, name, created_at, raeume!inner(name, projekte!inner(id, name))')
      .in('id', ausstehendIds.slice(0, 30))
      .is('deleted_at', null)
      .limit(8)

    offeneFreigaben = ((offenProdukte ?? []) as unknown as OffeneFreigabeRaw[]).map((p) => ({
      id: p.id,
      produktName: p.name,
      raumName:    p.raeume?.name ?? '–',
      projektName: p.raeume?.projekte?.name ?? '–',
      projektId:   p.raeume?.projekte?.id ?? '',
      seitTagen:   Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86_400_000),
    }))
  }

  // ── Budget-Übersicht (Tabelle Zeile 3) ───────────────────
  const budgetUebersicht = (projekteDaten ?? [])
    .filter((p) => (p.gesamtbudget ?? 0) > 0)
    .map((p) => {
      const ist = Math.round((kostenByProjekt.get(p.id) ?? 0) * 100) / 100
      const budget = p.gesamtbudget ?? 0
      return {
        name: p.name,
        budget,
        istKosten: ist,
        prozent: budget > 0 ? Math.min(Math.round((ist / budget) * 100), 999) : 0,
      }
    })

  return {
    kundenCount:    kundenCount    ?? 0,
    projekteCount:  projekteCount  ?? 0,
    partnerCount:   partnerCount   ?? 0,
    produkteCount:  produkteCount  ?? 0,
    ausstehendCount: ausstehendIds.length,
    projektKosten,
    statusVerteilung,
    gesamtProdukte,
    aktivitaet,
    offeneFreigaben,
    budgetUebersicht,
    letzteProjekte: (letzteProjekteRaw ?? []) as ProjektMitKunde[],
  }
}

// ── Konstanten ────────────────────────────────────────────────

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

// ── Seite ─────────────────────────────────────────────────────

export default async function DashboardPage() {
  const {
    kundenCount, projekteCount, partnerCount, ausstehendCount,
    projektKosten, statusVerteilung, gesamtProdukte,
    aktivitaet, offeneFreigaben, budgetUebersicht, letzteProjekte,
  } = await getDashboardData()

  const kpis = [
    { label: 'Kunden',          wert: kundenCount,    href: '/dashboard/kunden',   icon: Users,       farbe: 'text-indigo-600', bg: 'bg-indigo-50'  },
    { label: 'Projekte',         wert: projekteCount,  href: '/dashboard/projekte', icon: FolderOpen,  farbe: 'text-blue-600',   bg: 'bg-blue-50'    },
    { label: 'Partner',          wert: partnerCount,   href: '/dashboard/partner',  icon: Handshake,   farbe: 'text-violet-600', bg: 'bg-violet-50'  },
    { label: 'Offene Freigaben', wert: ausstehendCount, href: '/dashboard/projekte', icon: AlertCircle, farbe: 'text-amber-600',  bg: 'bg-amber-50'   },
  ]

  return (
    <div className="px-6 py-6 animate-fadeIn space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Übersicht</h1>
          <p className="text-sm text-gray-500 mt-0.5">Willkommen im Studio.</p>
        </div>
        <div className="flex items-center gap-2">
          {[
            { label: '+ Kunde',   href: '/dashboard/kunden/neu'   },
            { label: '+ Projekt', href: '/dashboard/projekte/neu' },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-xs px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Zeile 1: KPI-Kacheln */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map(({ label, wert, href, icon: Icon, farbe, bg }) => (
          <Link
            key={label}
            href={href}
            className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-gray-300 transition-all duration-200 group flex items-center gap-4"
          >
            <div className={`${bg} p-2.5 rounded-xl shrink-0`}>
              <Icon className={`w-5 h-5 ${farbe}`} />
            </div>
            <div className="min-w-0">
              <p className="text-3xl font-bold text-gray-900 leading-none">{wert}</p>
              <p className="text-xs text-gray-500 font-medium mt-1">{label}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all ml-auto shrink-0" />
          </Link>
        ))}
      </div>

      {/* Zeile 2: Donut (30%) + Balken (70%) */}
      <div className="grid grid-cols-10 gap-4" style={{ minHeight: 320 }}>
        <div className="col-span-3">
          <DonutChart data={statusVerteilung} gesamt={gesamtProdukte} />
        </div>
        <div className="col-span-7">
          <BalkenChart data={projektKosten} />
        </div>
      </div>

      {/* Zeile 3: Offene Freigaben (50%) + Budget-Übersicht (50%) */}
      <div className="grid grid-cols-2 gap-4">

        {/* Offene Freigaben */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-gray-900">
                Offene Freigaben
                {ausstehendCount > 0 && (
                  <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    {ausstehendCount}
                  </span>
                )}
              </h2>
            </div>
            <Link href="/dashboard/projekte" className="text-xs text-indigo-600 hover:text-indigo-700 transition-colors">
              Alle →
            </Link>
          </div>

          {offeneFreigaben.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-gray-600">Alles freigegeben</p>
              <p className="text-xs text-gray-400">Keine ausstehenden Produktfreigaben.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {offeneFreigaben.map((f) => (
                <li key={f.id}>
                  <Link
                    href={`/dashboard/projekte/${f.projektId}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                        {f.produktName}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {f.projektName} › {f.raumName}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0 ml-3">
                      {f.seitTagen === 0 ? 'Heute' : `${f.seitTagen}d`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Budget-Übersicht */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Budget-Übersicht</h2>
            <p className="text-xs text-gray-400 mt-0.5">Projekte mit gesetztem Budget</p>
          </div>

          {budgetUebersicht.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600">Kein Budget hinterlegt</p>
              <p className="text-xs text-gray-400">Setze ein Gesamtbudget in deinen Projekten.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {budgetUebersicht.slice(0, 6).map((p) => {
                const ueberschritten = p.prozent > 100
                return (
                  <li key={p.name} className="px-5 py-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[60%]">{p.name}</p>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className={`text-xs font-semibold ${ueberschritten ? 'text-red-500' : 'text-gray-500'}`}>
                          {p.prozent}%
                        </span>
                        <span className="text-xs text-gray-400">{eur(p.istKosten)} / {eur(p.budget)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${ueberschritten ? 'bg-red-400' : p.prozent > 80 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                        style={{ width: `${Math.min(p.prozent, 100)}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Zeile 4: Liniendiagramm volle Breite */}
      <LinienChart data={aktivitaet} />

      {/* Zeile 5: Letzte Projekte Tabelle volle Breite */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">
            Letzte Projekte <span className="text-gray-400 font-normal">({letzteProjekte.length})</span>
          </h2>
          <Link href="/dashboard/projekte" className="text-xs text-indigo-600 hover:text-indigo-700 transition-colors font-medium">
            Alle anzeigen →
          </Link>
        </div>

        {letzteProjekte.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Noch keine Projekte</p>
              <p className="text-xs text-gray-400 mt-0.5">Lege dein erstes Projekt an.</p>
            </div>
            <Link
              href="/dashboard/projekte/neu"
              className="text-xs px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              + Neues Projekt
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-widest">Projekt</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-widest">Kunde</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-widest">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-widest">Budget</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-widest">Angelegt</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {letzteProjekte.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/dashboard/projekte/${p.id}`}
                      className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs">{p.kunden?.name ?? '–'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusFarbe[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {statusLabel[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-500 font-mono">
                    {p.gesamtbudget != null ? eur(p.gesamtbudget) : '–'}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-400">
                    {new Date(p.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </td>
                  <td className="px-3 py-3.5">
                    <Link
                      href={`/dashboard/projekte/${p.id}`}
                      className="text-xs text-gray-300 group-hover:text-indigo-500 transition-colors"
                    >
                      →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}
