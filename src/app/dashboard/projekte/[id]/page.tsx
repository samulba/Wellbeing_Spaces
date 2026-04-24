import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import RaumHinzufuegen from '@/components/RaumHinzufuegen'
import FreigabeLinkKarte from '@/components/FreigabeLinkKarte'
import FreigabeUebersicht from '@/components/FreigabeUebersicht'
import { freigabeTokensAbrufenFuerProjekt } from '@/app/actions/freigaben'
import DateiUpload from '@/components/DateiUpload'
import NotizBlock, { type Notiz } from '@/components/NotizBlock'
import { raumAnlegen } from '@/app/actions/raeume'
import { projektSoftDelete } from '@/app/actions/projekte'
import { projektEventsAbrufen } from '@/app/actions/timeline'
import { Timeline } from '@/components/Timeline'
import {
  ChevronRight, Download, CheckCircle2, Clock, XCircle, Banknote,
  Archive, CalendarDays, User, Phone, Mail,
  AlertTriangle, Wrench, FileText, ReceiptText,
  LayoutDashboard, Layers, Share2, Files, MessageSquare, StickyNote,
} from 'lucide-react'
import ProjektAktionenButtons from '@/components/ProjektAktionenButtons'
import SortableRaumListe, { type RaumStat } from '@/components/SortableRaumListe'
import PdfExportButton from '@/components/PdfExportButton'
import ZeiterfassungBlock from '@/components/ZeiterfassungBlock'
import { getKategorien } from '@/app/actions/einstellungen'
import { getZeiterfassung, getZeitSumme } from '@/app/actions/zeiterfassung'
import { getRaumBudgetDetails } from '@/app/actions/raeume'
import { effektiverVpNetto } from '@/lib/preise'
import RaumBudgetGrid from '@/components/RaumBudgetGrid'
import ChatBlock from '@/components/ChatBlock'
import { getNachrichtenFuerProjekt } from '@/app/actions/nachrichten'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ProjektMitKunde, Raum } from '@/lib/supabase/types'
import type { DateiItem } from '@/components/DateiUpload'

const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

async function getProjekt(id: string): Promise<ProjektMitKunde | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('projekte')
    .select('*, kunden(id, name, email, telefon, ansprechpartner)')
    .eq('id', id).is('deleted_at', null).single()
  return data as ProjektMitKunde | null
}

async function getKunden(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('kunden').select('id, name').is('deleted_at', null).order('name')
  return data ?? []
}

async function getRaeume(projektId: string): Promise<Raum[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('raeume').select('*').eq('projekt_id', projektId).is('deleted_at', null).order('reihenfolge').order('created_at')
  return data ?? []
}

async function getAktivenToken(projektId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('freigabe_tokens')
    .select('id, token, gueltig_bis')
    .eq('projekt_id', projektId)
    .eq('aktiv', true)
    .maybeSingle()
  return data
}

async function getProjektStats(projektId: string) {
  const supabase = await createClient()
  const { data: raeume } = await supabase.from('raeume').select('id').eq('projekt_id', projektId).is('deleted_at', null)
  const raumIds = (raeume ?? []).map((r) => r.id)
  if (raumIds.length === 0) return { gesamtkosten: 0, ausstehend: 0, freigegeben: 0, abgelehnt: 0, ueberarbeitung: 0, produkteGesamt: 0 }

  // freigabe_status liegt seit Migration 076 auf raum_produkte (pro Raum eigen).
  const { data: eintraege } = await supabase
    .from('raum_produkte')
    .select('menge, verkaufspreis_override, rabatt_prozent, freigabe_status, produkte(id, verkaufspreis, deleted_at)')
    .in('raum_id', raumIds)

  let gesamtkosten = 0, ausstehend = 0, freigegeben = 0, abgelehnt = 0, ueberarbeitung = 0
  const aktiveEintraege = (eintraege ?? []).filter((e) => {
    const prod = (e.produkte as unknown) as { deleted_at: string | null } | null
    return prod?.deleted_at == null
  })

  for (const e of aktiveEintraege) {
    const prod = (e.produkte as unknown) as { verkaufspreis: number | null } | null
    const vp = effektiverVpNetto(
      { verkaufspreis_override: e.verkaufspreis_override, rabatt_prozent: e.rabatt_prozent ?? null },
      prod?.verkaufspreis ?? null,
    )
    gesamtkosten += vp * e.menge
    const s = (e.freigabe_status as string | null) ?? 'ausstehend'
    if (s === 'ausstehend') ausstehend++
    else if (s === 'freigegeben') freigegeben++
    else if (s === 'abgelehnt') abgelehnt++
    else if (s === 'ueberarbeitung') ueberarbeitung++
  }
  return { gesamtkosten: Math.round(gesamtkosten * 100) / 100, ausstehend, freigegeben, abgelehnt, ueberarbeitung, produkteGesamt: aktiveEintraege.length }
}

async function getRaumStats(raumIds: string[]): Promise<Record<string, RaumStat>> {
  if (raumIds.length === 0) return {}
  const supabase = await createClient()
  const { data: eintraege } = await supabase
    .from('raum_produkte')
    .select('raum_id, menge, verkaufspreis_override, rabatt_prozent, freigabe_status, produkte(verkaufspreis, deleted_at)')
    .in('raum_id', raumIds)

  const result: Record<string, RaumStat> = {}
  for (const e of eintraege ?? []) {
    const prod = (e.produkte as unknown) as { verkaufspreis: number | null; deleted_at: string | null } | null
    if (prod?.deleted_at != null) continue
    if (!result[e.raum_id]) result[e.raum_id] = { produkteAnzahl: 0, vpSumme: 0, freigegeben: 0 }
    result[e.raum_id].produkteAnzahl++
    const vp = effektiverVpNetto(
      { verkaufspreis_override: e.verkaufspreis_override, rabatt_prozent: e.rabatt_prozent ?? null },
      prod?.verkaufspreis ?? null,
    )
    result[e.raum_id].vpSumme += vp * e.menge
    if ((e.freigabe_status as string | null) === 'freigegeben') result[e.raum_id].freigegeben++
  }
  return result
}

async function getNotizen(projektId: string): Promise<Notiz[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('notizen').select('id, inhalt, erstellt_von, erstellt_am, bearbeitet_am').eq('typ', 'projekt').eq('referenz_id', projektId).is('deleted_at', null).order('erstellt_am', { ascending: false })
  return (data ?? []) as Notiz[]
}

async function getDateien(projektId: string): Promise<DateiItem[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('dateien').select('id, datei_name, datei_url, datei_typ, dateigroesse').eq('projekt_id', projektId).is('deleted_at', null).order('created_at', { ascending: false })
  return (data ?? []) as DateiItem[]
}

export default async function ProjektDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab: tabParam } = await searchParams
  const [projekt, raeume, aktiverToken, alleTokens, dateien, stats, notizen, raumtypen, kunden, zeitEintraege, zeitSumme, alleEvents, raumBudgetDetails, nachrichten] = await Promise.all([
    getProjekt(params.id),
    getRaeume(params.id),
    getAktivenToken(params.id),
    freigabeTokensAbrufenFuerProjekt(params.id),
    getDateien(params.id),
    getProjektStats(params.id),
    getNotizen(params.id),
    getKategorien('raumtyp'),
    getKunden(),
    getZeiterfassung(params.id),
    getZeitSumme(params.id),
    projektEventsAbrufen(params.id),
    getRaumBudgetDetails(params.id),
    getNachrichtenFuerProjekt(params.id),
  ])

  if (!projekt) notFound()

  // Hat der Kunde einen Portal-Zugang? (Voraussetzung für Chat)
  let hatPortal = false
  if (projekt.kunde_id) {
    const admin = createAdminClient()
    const { count } = await admin
      .from('client_users')
      .select('id', { count: 'exact', head: true })
      .eq('kunde_id', projekt.kunde_id)
      .eq('organisation_id', projekt.organisation_id)  // defense-in-depth gegen Cross-Tenant
    hatPortal = (count ?? 0) > 0
  }

  const raumIds = raeume.map((r) => r.id)
  const raumStats = await getRaumStats(raumIds)

  const raumHinzufuegenAktion = raumAnlegen.bind(null, projekt.id)
  const loeschenAktion        = projektSoftDelete.bind(null, projekt.id)

  const istArchiviert  = projekt.archiviert === true

  // Produkt-Budget-Ring: bevorzuge produkt_budget, Fallback auf gesamtbudget
  const produktBudget = projekt.produkt_budget ?? projekt.gesamtbudget
  const budgetPct   = produktBudget && produktBudget > 0
    ? Math.min(Math.round((stats.gesamtkosten / produktBudget) * 100), 999)
    : null
  const ringFarbe   = budgetPct == null ? '#445c49' : budgetPct >= 100 ? '#ef4444' : budgetPct >= 80 ? '#f59e0b' : '#445c49'
  const ringR       = 52
  const ringCircum  = 2 * Math.PI * ringR
  const ringDash    = budgetPct != null ? Math.min(budgetPct / 100, 1) * ringCircum : 0

  // Service-Kosten
  const serviceKosten = projekt.service_modell === 'pauschale'
    ? (projekt.service_pauschale ?? null)
    : projekt.service_modell === 'stundensatz' && projekt.service_stundensatz
    ? Math.round(zeitSumme.abrechenbarStunden * projekt.service_stundensatz * 100) / 100
    : null

  // Deadline Countdown
  const deadlineInfo = (() => {
    if (!projekt.deadline) return null
    const heute = new Date(); heute.setHours(0,0,0,0)
    const dl = new Date(projekt.deadline + 'T00:00:00')
    const diffMs = dl.getTime() - heute.getTime()
    const diffTage = Math.round(diffMs / (1000 * 60 * 60 * 24))
    const datum = dl.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    return { datum, diffTage }
  })()

  return (
    <div className="flex-1 overflow-hidden flex flex-col animate-fadeIn">

      {/* Archive Banner */}
      {istArchiviert && (
        <div className="shrink-0 flex items-center gap-2 px-6 py-2.5 bg-gray-100 border-b border-gray-200 text-xs text-gray-600">
          <Archive className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          Dieses Projekt ist archiviert
          {projekt.archiviert_am && (
            <> · {new Date(projekt.archiviert_am).toLocaleDateString('de-DE')}</>
          )}
          <span className="text-gray-400">— Bearbeitung deaktiviert</span>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="shrink-0 px-6 pt-4 pb-3 border-b border-gray-100 bg-white">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1.5">
          <Link href="/dashboard/projekte" className="hover:text-wellbeing-green transition-colors">Projekte</Link>
          <ChevronRight className="w-3 h-3" />
          {projekt.kunden && (
            <>
              <Link href={`/dashboard/kunden/${projekt.kunden.id}`} className="hover:text-wellbeing-green transition-colors">
                {projekt.kunden.name}
              </Link>
              <ChevronRight className="w-3 h-3" />
            </>
          )}
          <span className="text-gray-600">{projekt.name}</span>
        </div>

        {/* Title + Toolbar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 truncate">{projekt.name}</h1>
            {/* Deadline Badge */}
            {deadlineInfo && (
              <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full ${
                deadlineInfo.diffTage < 0
                  ? 'bg-red-100 text-red-700'
                  : deadlineInfo.diffTage <= 7
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {deadlineInfo.diffTage < 0 ? (
                  <><AlertTriangle className="w-3 h-3" /> {Math.abs(deadlineInfo.diffTage)} Tage überfällig</>
                ) : deadlineInfo.diffTage === 0 ? (
                  <><AlertTriangle className="w-3 h-3" /> Heute fällig</>
                ) : (
                  <>Deadline: {deadlineInfo.datum} · Noch {deadlineInfo.diffTage} Tage</>
                )}
              </span>
            )}
          </div>

          {!istArchiviert && (
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/dashboard/projekte/${projekt.id}/timeline`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-lg transition-all"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Timeline
              </Link>
              <Link
                href={`/dashboard/projekte/${projekt.id}/vertraege`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-lg transition-all"
              >
                <FileText className="w-3.5 h-3.5" />
                Verträge
              </Link>
              <Link
                href={`/dashboard/projekte/${projekt.id}/angebote`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-lg transition-all"
              >
                <ReceiptText className="w-3.5 h-3.5" />
                Angebote
              </Link>
              <a
                href={`/api/projekte/${projekt.id}/export`}
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-lg transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                CSV
              </a>
              <PdfExportButton projektId={projekt.id} />
              <Link
                href={`/dashboard/projekte/${projekt.id}/bearbeiten`}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-lg transition-all"
              >
                Bearbeiten
              </Link>
              <ProjektAktionenButtons
                projektId={projekt.id}
                projektName={projekt.name}
                aktuellerKundeId={projekt.kunde_id}
                kunden={kunden}
                archiviert={istArchiviert}
                loeschenAktion={loeschenAktion}
              />
            </div>
          )}

          {istArchiviert && (
            <ProjektAktionenButtons
              projektId={projekt.id}
              projektName={projekt.name}
              aktuellerKundeId={projekt.kunde_id}
              kunden={kunden}
              archiviert={istArchiviert}
              loeschenAktion={loeschenAktion}
            />
          )}
        </div>

      </div>

      {/* ── Kunde + Details Strip (full-width) ─────────────────── */}
      <div className="shrink-0 px-6 py-3 border-b border-gray-100 bg-gray-50/30">
        <div className="flex flex-wrap items-start gap-x-6 gap-y-2">
          {/* Kunden-Card */}
          {projekt.kunden && (
            <div className="flex items-center gap-3 mr-4">
              <div className="w-7 h-7 rounded-full bg-wellbeing-green/10 flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5 text-wellbeing-green" />
              </div>
              <div>
                <Link
                  href={`/dashboard/kunden/${projekt.kunden.id}`}
                  className="text-sm font-semibold text-gray-900 hover:text-wellbeing-green transition-colors"
                >
                  {projekt.kunden.name}
                </Link>
                <div className="flex items-center gap-3 mt-0.5">
                  {projekt.kunden.email && (
                    <a href={`mailto:${projekt.kunden.email}`} className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors">
                      <Mail className="w-3 h-3" />
                      {projekt.kunden.email}
                    </a>
                  )}
                  {projekt.kunden.telefon && (
                    <a href={`tel:${projekt.kunden.telefon}`} className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors">
                      <Phone className="w-3 h-3" />
                      {projekt.kunden.telefon}
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Projektdetails */}
          <div className="flex flex-wrap items-start gap-x-6 gap-y-1.5">
            {projekt.projektart && <InfoPill label="Projektart" wert={projekt.projektart} />}
            {projekt.standort && <InfoPill label="Standort" wert={projekt.standort} />}
            {projekt.gesamtbudget != null && <InfoPill label="Budget" wert={eur(projekt.gesamtbudget)} />}
            <InfoPill
              label="Angelegt"
              wert={new Date(projekt.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            />
          </div>

          {projekt.beschreibung && (
            <p className="w-full text-xs text-gray-500 leading-relaxed max-w-3xl whitespace-pre-wrap mt-0.5">
              {projekt.beschreibung}
            </p>
          )}
        </div>
      </div>

      {/* ── Tab-Nav ─────────────────────────────────────────────── */}
      {(() => {
        const tabs: { key: string; label: string; icon: typeof LayoutDashboard; badge?: number }[] = [
          { key: 'uebersicht', label: 'Übersicht',  icon: LayoutDashboard },
          { key: 'raeume',     label: 'Räume',      icon: Layers,     badge: raeume.length || undefined },
          { key: 'freigaben',  label: 'Freigaben',  icon: Share2 },
          { key: 'timeline',   label: 'Timeline',   icon: CalendarDays, badge: alleEvents.length || undefined },
          { key: 'dateien',    label: 'Dateien',    icon: Files,       badge: dateien.length || undefined },
          ...(hatPortal ? [{ key: 'chat' as const, label: 'Chat', icon: MessageSquare, badge: nachrichten.length || undefined }] : []),
          { key: 'notizen',    label: 'Notizen',    icon: StickyNote,  badge: notizen.length || undefined },
        ]
        const aktiverTab = tabs.some((t) => t.key === tabParam) ? tabParam : 'uebersicht'
        return (
          <div className="shrink-0 border-b border-gray-100 bg-white px-6">
            <nav className="flex items-center gap-0 overflow-x-auto">
              {tabs.map((t) => {
                const Icon = t.icon
                const ist = aktiverTab === t.key
                return (
                  <Link
                    key={t.key}
                    href={`/dashboard/projekte/${projekt.id}${t.key === 'uebersicht' ? '' : `?tab=${t.key}`}`}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                      ist
                        ? 'border-wellbeing-green text-wellbeing-green'
                        : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-200'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${ist ? 'text-wellbeing-green' : 'text-gray-400'}`} />
                    {t.label}
                    {t.badge != null && (
                      <span className={`ml-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        ist ? 'bg-wellbeing-green/10 text-wellbeing-green' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {t.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>
        )
      })()}

      {/* ── Tab-Content ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-5 bg-gray-50/30">

        {/* ── ÜBERSICHT ─────────────────────────────────────────── */}
        {(!tabParam || tabParam === 'uebersicht') && (
          <div className="max-w-7xl mx-auto space-y-5">
            {/* Row 1: Budget-Karte + Status-Kacheln */}
            <div className="grid grid-cols-1 xl:grid-cols-[auto_1fr] gap-5">
              {/* Budget-Karte */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm xl:min-w-[420px]">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Budget-Auslastung</p>
                {budgetPct != null ? (
                  <div className="flex items-center gap-5">
                    <svg width="108" height="108" viewBox="0 0 128 128" className="shrink-0">
                      <circle cx="64" cy="64" r={ringR} fill="none" stroke="#f3f4f6" strokeWidth="14" />
                      <circle
                        cx="64" cy="64" r={ringR}
                        fill="none"
                        stroke={ringFarbe}
                        strokeWidth="14"
                        strokeLinecap="round"
                        strokeDasharray={`${ringDash} ${ringCircum - ringDash}`}
                        transform="rotate(-90 64 64)"
                      />
                      <text x="64" y="60" textAnchor="middle" fill={ringFarbe} fontSize="20" fontWeight="bold" fontFamily="monospace">
                        {budgetPct}%
                      </text>
                      <text x="64" y="76" textAnchor="middle" fill="#9ca3af" fontSize="10">Produkte</text>
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 mb-0.5">VP-Summe netto</p>
                      <p className="text-xl font-bold text-gray-900 font-mono">{eur(stats.gesamtkosten)}</p>
                      <p className="text-xs text-gray-400 mt-1">von {eur(produktBudget!)}</p>
                      {budgetPct >= 80 && (
                        <p className={`text-xs mt-2 font-medium ${budgetPct >= 100 ? 'text-red-500' : 'text-amber-500'}`}>
                          {budgetPct >= 100 ? '⚠ Budget überschritten' : '⚠ Budget fast aufgebraucht'}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">VP-Summe Produkte (netto)</p>
                    <p className="text-2xl font-bold text-gray-900 font-mono">{eur(stats.gesamtkosten)}</p>
                    <p className="text-xs text-gray-400 mt-1">Kein Produkt-Budget definiert</p>
                  </div>
                )}

                {serviceKosten != null && (
                  <div className="border-t border-gray-100 mt-4 pt-4 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-wellbeing-cream flex items-center justify-center shrink-0 mt-0.5">
                      <Wrench className="w-3.5 h-3.5 text-wellbeing-green" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">
                        {projekt.service_modell === 'pauschale' ? 'Service-Pauschale' : `Service (${zeitSumme.abrechenbarStunden.toFixed(2).replace('.', ',')} h × ${eur(projekt.service_stundensatz!)} /h)`}
                      </p>
                      <p className="text-lg font-bold font-mono text-gray-900">{eur(serviceKosten)}</p>
                    </div>
                  </div>
                )}
                {serviceKosten != null && (
                  <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                    <p className="text-xs text-gray-400">Gesamt (Produkte + Service)</p>
                    <p className="text-sm font-mono font-bold text-wellbeing-green">
                      {eur(stats.gesamtkosten + serviceKosten)}
                    </p>
                  </div>
                )}
              </div>

              {/* Freigabe-Status + Räume-Count */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 self-start">
                <StatCard
                  icon={CheckCircle2}
                  wert={stats.freigegeben}
                  label="Freigegeben"
                  tone="emerald"
                />
                <StatCard
                  icon={Clock}
                  wert={stats.ausstehend + stats.ueberarbeitung}
                  label="Ausstehend"
                  tone="amber"
                />
                {stats.abgelehnt > 0 ? (
                  <StatCard
                    icon={XCircle}
                    wert={stats.abgelehnt}
                    label="Abgelehnt"
                    tone="red"
                  />
                ) : (
                  <StatCard
                    icon={Layers}
                    wert={raeume.length}
                    label={raeume.length === 1 ? 'Raum' : 'Räume'}
                    tone="gray"
                  />
                )}
                <StatCard
                  icon={Banknote}
                  wert={stats.produkteGesamt}
                  label={stats.produkteGesamt === 1 ? 'Produkt' : 'Produkte'}
                  tone="gray"
                />
              </div>
            </div>

            {/* Row 2: Räume (kompakt) + Mini-Timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Räume kompakt */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Räume</p>
                  <Link href={`/dashboard/projekte/${projekt.id}?tab=raeume`} className="text-xs text-wellbeing-green hover:underline">
                    Alle verwalten →
                  </Link>
                </div>
                {raeume.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Noch keine Räume angelegt.</p>
                ) : (
                  <ul className="divide-y divide-gray-50 max-h-[280px] overflow-y-auto">
                    {raeume.slice(0, 8).map((r) => {
                      const s = raumStats[r.id] ?? { produkteAnzahl: 0, vpSumme: 0, freigegeben: 0 }
                      return (
                        <li key={r.id}>
                          <Link
                            href={`/dashboard/projekte/${projekt.id}/raeume/${r.id}`}
                            className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-gray-50 transition-colors"
                          >
                            <span className="text-sm font-medium text-gray-800 truncate">{r.name}</span>
                            <span className="shrink-0 flex items-center gap-2 text-[11px] text-gray-500">
                              {s.produkteAnzahl} Produkte · {eur(s.vpSumme)}
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              {/* Mini-Timeline */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Projekt-Timeline</p>
                  <Link
                    href={`/dashboard/projekte/${projekt.id}?tab=timeline`}
                    className="text-xs text-wellbeing-green hover:underline"
                  >
                    Alle Events →
                  </Link>
                </div>
                <Timeline
                  events={alleEvents}
                  showRaumBadge={true}
                  alleLink={`/dashboard/projekte/${projekt.id}/timeline`}
                  limit={5}
                />
              </div>
            </div>

            {/* Row 3 (optional): Zeiterfassung */}
            {projekt.service_modell === 'stundensatz' && projekt.service_stundensatz != null && (
              <ZeiterfassungBlock
                projektId={projekt.id}
                stundensatz={projekt.service_stundensatz}
                initialEintraege={zeitEintraege}
              />
            )}
          </div>
        )}

        {/* ── RÄUME ──────────────────────────────────────────────── */}
        {tabParam === 'raeume' && (
          <div className="max-w-7xl mx-auto space-y-5">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <RaumHinzufuegen
                aktion={raumHinzufuegenAktion}
                raumtypen={raumtypen}
                raumAnzahl={raeume.length}
              />
              {raeume.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm text-gray-400">Noch keine Räume angelegt.</p>
                  <p className="text-xs text-gray-300 mt-1">Über &bdquo;+ Raum hinzufügen&ldquo; erstellen.</p>
                </div>
              ) : (
                <SortableRaumListe projektId={projekt.id} raeume={raeume} raumStats={raumStats} />
              )}
            </div>

            {raumBudgetDetails.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Budget pro Raum</p>
                  <p className="text-[11px] text-gray-400">
                    Wo wurde wieviel investiert · Top-Kategorien pro Raum
                  </p>
                </div>
                <RaumBudgetGrid details={raumBudgetDetails} projektId={projekt.id} />
              </div>
            )}
          </div>
        )}

        {/* ── FREIGABEN ─────────────────────────────────────────── */}
        {tabParam === 'freigaben' && (
          <div className="max-w-5xl mx-auto space-y-5">
            <FreigabeLinkKarte
              projektId={projekt.id}
              initialToken={aktiverToken ?? null}
              initialHatPin={!!projekt.freigabe_pin && projekt.freigabe_pin.toString().trim().length >= 4}
            />
            <FreigabeUebersicht projektId={projekt.id} initialTokens={alleTokens} />
          </div>
        )}

        {/* ── TIMELINE ──────────────────────────────────────────── */}
        {tabParam === 'timeline' && (
          <div className="max-w-5xl mx-auto">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Projekt-Timeline</p>
                  <p className="text-xs text-gray-500 mt-0.5">{alleEvents.length} Events</p>
                </div>
                <Link
                  href={`/dashboard/projekte/${projekt.id}/timeline`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-wellbeing-green hover:bg-wellbeing-green-dark text-white rounded-lg transition-colors"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  Timeline-Editor öffnen
                </Link>
              </div>
              <Timeline
                events={alleEvents}
                showRaumBadge={true}
                alleLink={`/dashboard/projekte/${projekt.id}/timeline`}
              />
            </div>
          </div>
        )}

        {/* ── DATEIEN ───────────────────────────────────────────── */}
        {tabParam === 'dateien' && (
          <div className="max-w-5xl mx-auto">
            <DateiUpload projektId={projekt.id} initialDateien={dateien} />
          </div>
        )}

        {/* ── CHAT ──────────────────────────────────────────────── */}
        {tabParam === 'chat' && hatPortal && projekt.kunden && (
          <div className="max-w-5xl mx-auto">
            <ChatBlock
              projektId={projekt.id}
              kundeName={projekt.kunden.name}
              initialNachrichten={nachrichten}
            />
          </div>
        )}

        {/* ── NOTIZEN ───────────────────────────────────────────── */}
        {tabParam === 'notizen' && (
          <div className="max-w-5xl mx-auto">
            <NotizBlock typ="projekt" referenzId={projekt.id} initialNotizen={notizen} />
          </div>
        )}

      </div>
    </div>
  )
}

// ── Mini-Stat-Kachel ─────────────────────────────────────────
function StatCard({
  icon: Icon, wert, label, tone,
}: {
  icon: typeof CheckCircle2
  wert: number
  label: string
  tone: 'emerald' | 'amber' | 'red' | 'gray'
}) {
  const toneClasses = {
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200/60', iconColor: 'text-emerald-500', wertColor: 'text-emerald-700', labelColor: 'text-emerald-600' },
    amber:   { bg: 'bg-amber-50',   border: 'border-amber-200/60',   iconColor: 'text-amber-500',   wertColor: 'text-amber-700',   labelColor: 'text-amber-600' },
    red:     { bg: 'bg-red-50',     border: 'border-red-200/60',     iconColor: 'text-red-500',     wertColor: 'text-red-700',     labelColor: 'text-red-600' },
    gray:    { bg: 'bg-white',      border: 'border-gray-200',        iconColor: 'text-gray-400',    wertColor: 'text-gray-700',    labelColor: 'text-gray-500' },
  }[tone]
  return (
    <div className={`${toneClasses.bg} border ${toneClasses.border} rounded-xl p-3.5 flex items-center gap-2.5`}>
      <Icon className={`w-4 h-4 shrink-0 ${toneClasses.iconColor}`} />
      <div>
        <p className={`text-lg font-bold leading-none ${toneClasses.wertColor}`}>{wert}</p>
        <p className={`text-[11px] mt-0.5 ${toneClasses.labelColor}`}>{label}</p>
      </div>
    </div>
  )
}


function InfoPill({ label, wert }: { label: string; wert: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 mb-0.5 uppercase tracking-widest font-medium">{label}</p>
      <p className="text-xs font-semibold text-gray-700">{wert}</p>
    </div>
  )
}
