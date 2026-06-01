import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import RaumHinzufuegen from '@/components/RaumHinzufuegen'
import FreigabeLinkKarte from '@/components/FreigabeLinkKarte'
import FreigabeUebersicht from '@/components/FreigabeUebersicht'
import FreigabeRaumPanel from '@/components/FreigabeRaumPanel'
import { freigabeTokensAbrufenFuerProjekt } from '@/app/actions/freigaben'
import DateiUpload from '@/components/DateiUpload'
import NotizBlock, { type Notiz } from '@/components/NotizBlock'
import { raumAnlegen } from '@/app/actions/raeume'
import { raumGruppenAbrufen } from '@/app/actions/raum-gruppen'
import { projektSoftDelete } from '@/app/actions/projekte'
import { projektEventsAbrufen } from '@/app/actions/timeline'
import { Timeline } from '@/components/Timeline'
import {
  ChevronRight, Download, CheckCircle2, Clock, XCircle, Banknote,
  Archive, CalendarDays, User, Phone, Mail, MapPin, Tag,
  AlertTriangle, FileText, ReceiptText, Pencil, TrendingUp,
  LayoutDashboard, Layers, Share2, Files, MessageSquare, StickyNote,
  ListChecks,
} from 'lucide-react'
import ProjektAktionenButtons from '@/components/ProjektAktionenButtons'
import ProjektStatusButtons from '@/components/ProjektStatusButtons'
import SortableRaumListe, { type RaumStat } from '@/components/SortableRaumListe'
import PdfExportButton from '@/components/PdfExportButton'
import ZeiterfassungBlock from '@/components/ZeiterfassungBlock'
import { getKategorien } from '@/app/actions/einstellungen'
import { getZeiterfassung, getZeitSumme } from '@/app/actions/zeiterfassung'
import { getRaumBudgetDetails } from '@/app/actions/raeume'
import { effektiverVpNetto } from '@/lib/preise'
import { berechneProjektKalkulation } from '@/lib/projekt-kalkulation'
import ProjektGesamtuebersicht from '@/components/ProjektGesamtuebersicht'
import { getMwstSatz } from '@/app/actions/einstellungen'
import { getServiceRaten } from '@/app/actions/service-raten'
import ServiceRatenBlock from '@/components/ServiceRatenBlock'
import RaumBudgetGrid from '@/components/RaumBudgetGrid'
import ChatBlock from '@/components/ChatBlock'
import ProjektAufgabenBlock from '@/components/ProjektAufgabenBlock'
import { getAufgaben, getAufgabePickerOptionen } from '@/app/actions/aufgaben'
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

async function getAktiveTokens(projektId: string) {
  const supabase = await createClient()
  const lade = (felder: string) =>
    supabase
      .from('freigabe_tokens')
      .select(felder)
      .eq('projekt_id', projektId)
      .eq('aktiv', true)
      .is('abgeschlossen_am', null)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
  const basis = 'id, token, gueltig_bis, scope_typ, scope_ids, created_at'
  // scope_bereich_ids (Migration 116) mitladen — sonst zeigt der Admin bei
  // „ganze Gruppen"-Links fälschlich „0 Produkte" + die rote Leer-Warnung.
  // Fail-safe: fehlt die Spalte, ohne sie laden.
  let res = await lade(`${basis}, scope_bereich_ids`)
  if (res.error) res = await lade(basis)
  return (res.data ?? []) as unknown as {
    id: string
    token: string
    gueltig_bis: string | null
    scope_typ: 'projekt' | 'raum' | 'auswahl' | null
    scope_ids: string[] | null
    scope_bereich_ids: string[] | null
    created_at: string
  }[]
}

/**
 * Wrapper um die zentrale Projekt-Kalkulation (src/lib/projekt-kalkulation.ts).
 * Behaelt die alte Rueckgabe-Form fuer Abwaerts-Kompatibilitaet mit dem UI,
 * fuegt aber netto/brutto/zusatzkosten/service-felder zusaetzlich an.
 */
async function getProjektStats(projektId: string, mwstSatz: number) {
  const supabase = await createClient()
  const kalk = await berechneProjektKalkulation(supabase, projektId, mwstSatz)
  return {
    // Legacy-Felder (UI-kompatibel)
    gesamtkosten:  kalk.budgetVerbrauchtNetto,
    ausstehend:    kalk.statusCounts.ausstehend,
    freigegeben:   kalk.statusCounts.freigegeben,
    abgelehnt:     kalk.statusCounts.abgelehnt,
    ueberarbeitung: kalk.statusCounts.ueberarbeitung,
    produkteGesamt: kalk.produkteAnzahl,
    // Neue Felder
    kalk,
  }
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
  const mwstSatz = await getMwstSatz()
  const [projekt, raeume, aktiveTokens, alleTokens, dateien, stats, notizen, raumtypen, kunden, zeitEintraege, zeitSumme, alleEvents, raumBudgetDetails, nachrichten, aufgabenAlle, aufgabenPickerOptionen, serviceRaten, raumGruppen] = await Promise.all([
    getProjekt(params.id),
    getRaeume(params.id),
    getAktiveTokens(params.id),
    freigabeTokensAbrufenFuerProjekt(params.id),
    getDateien(params.id),
    getProjektStats(params.id, mwstSatz),
    getNotizen(params.id),
    getKategorien('raumtyp'),
    getKunden(),
    getZeiterfassung(params.id),
    getZeitSumme(params.id),
    projektEventsAbrufen(params.id),
    getRaumBudgetDetails(params.id),
    getNachrichtenFuerProjekt(params.id),
    getAufgaben({ projektId: params.id }),
    getAufgabePickerOptionen(),
    getServiceRaten(params.id),
    raumGruppenAbrufen(params.id),
  ])

  if (!projekt) return notFound()

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

      {/* ── Hero-Header ─────────────────────────────────────────── */}
      <div className="shrink-0 px-6 pt-4 pb-4 border-b border-gray-100 bg-white">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
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

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {/* Title + Status + Deadline */}
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-syne text-[22px] font-bold text-gray-900 leading-tight tracking-tight">
                {projekt.name}
              </h1>
              {!istArchiviert && (
                <ProjektStatusButtons projektId={projekt.id} initialStatus={projekt.status} />
              )}
              {deadlineInfo && (
                <span className={`shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                  deadlineInfo.diffTage < 0
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : deadlineInfo.diffTage <= 7
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-gray-50 text-gray-600 border border-gray-200'
                }`}>
                  {deadlineInfo.diffTage < 0 ? (
                    <><AlertTriangle className="w-3 h-3" /> {Math.abs(deadlineInfo.diffTage)} Tage überfällig</>
                  ) : deadlineInfo.diffTage === 0 ? (
                    <><AlertTriangle className="w-3 h-3" /> Heute fällig</>
                  ) : (
                    <><CalendarDays className="w-3 h-3" /> {deadlineInfo.datum} · noch {deadlineInfo.diffTage} Tage</>
                  )}
                </span>
              )}
            </div>

            {/* Meta-Leiste: Kunde · Standort · Budget · Projektart · Angelegt */}
            <div className="flex items-center flex-wrap gap-x-5 gap-y-1.5 mt-2 text-[12px] text-gray-500">
              {projekt.kunden && (
                <Link
                  href={`/dashboard/kunden/${projekt.kunden.id}`}
                  className="inline-flex items-center gap-1.5 hover:text-wellbeing-green transition-colors group"
                >
                  <User className="w-3.5 h-3.5 text-gray-400 group-hover:text-wellbeing-green" />
                  <span className="font-medium text-gray-700 group-hover:text-wellbeing-green">{projekt.kunden.name}</span>
                </Link>
              )}
              {projekt.kunden?.email && (
                <a href={`mailto:${projekt.kunden.email}`} className="inline-flex items-center gap-1.5 hover:text-gray-700 transition-colors">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  {projekt.kunden.email}
                </a>
              )}
              {projekt.kunden?.telefon && (
                <a href={`tel:${projekt.kunden.telefon}`} className="inline-flex items-center gap-1.5 hover:text-gray-700 transition-colors">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  {projekt.kunden.telefon}
                </a>
              )}
              {projekt.standort && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  {projekt.standort}
                </span>
              )}
              {projekt.gesamtbudget != null && (
                <span className="inline-flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5 text-gray-400" />
                  <span className="font-medium text-gray-700">{eur(projekt.gesamtbudget)}</span>
                </span>
              )}
              {projekt.projektart && (
                <span className="inline-flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-gray-400" />
                  {projekt.projektart}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                Angelegt {new Date(projekt.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
            </div>

            {projekt.beschreibung && (
              <p className="text-xs text-gray-500 leading-relaxed max-w-3xl whitespace-pre-wrap mt-2.5">
                {projekt.beschreibung}
              </p>
            )}
          </div>

          {/* Toolbar — rechts */}
          {!istArchiviert ? (
            <div className="flex items-center gap-1 shrink-0">
              {/* Primäre Navigations-Buttons */}
              <Link
                href={`/dashboard/projekte/${projekt.id}/vertraege`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Verträge
              </Link>
              <Link
                href={`/dashboard/projekte/${projekt.id}/angebote`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <ReceiptText className="w-3.5 h-3.5" />
                Angebote
              </Link>

              {/* Trenner */}
              <span className="w-px h-5 bg-gray-200 mx-1" />

              {/* Icon-Aktionen mit Tooltip */}
              <Link
                href={`/dashboard/projekte/${projekt.id}/timeline`}
                title="Timeline-Editor"
                className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <CalendarDays className="w-4 h-4" />
              </Link>
              <a
                href={`/api/projekte/${projekt.id}/export`}
                download
                title="CSV-Export"
                className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
              </a>
              <PdfExportButton projektId={projekt.id} />
              <Link
                href={`/dashboard/projekte/${projekt.id}/bearbeiten`}
                title="Projekt bearbeiten"
                className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Pencil className="w-4 h-4" />
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
          ) : (
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

      {/* ── Tab-Nav ─────────────────────────────────────────────── */}
      {(() => {
        const tabs: { key: string; label: string; icon: typeof LayoutDashboard; badge?: number }[] = [
          { key: 'uebersicht', label: 'Übersicht',  icon: LayoutDashboard },
          { key: 'raeume',     label: 'Räume',      icon: Layers,     badge: raeume.length || undefined },
          { key: 'freigaben',  label: 'Freigaben',  icon: Share2 },
          { key: 'timeline',   label: 'Timeline',   icon: CalendarDays, badge: alleEvents.length || undefined },
          { key: 'aufgaben',   label: 'Aufgaben',   icon: ListChecks,   badge: aufgabenAlle.filter((a) => a.status !== 'erledigt').length || undefined },
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
          <div className="space-y-5">
            {/* Row 1: Dashboard-Karte (Budget + Status-Strip kombiniert) */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 p-5">
                {/* Ring + Main Numbers */}
                <div className="flex items-center gap-5 lg:min-w-[300px]">
                  {budgetPct != null ? (
                    <svg width="128" height="128" viewBox="0 0 128 128" className="shrink-0">
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
                      <text x="64" y="60" textAnchor="middle" fill={ringFarbe} fontSize="22" fontWeight="bold" fontFamily="monospace">
                        {budgetPct}%
                      </text>
                      <text x="64" y="78" textAnchor="middle" fill="#9ca3af" fontSize="10">ausgelastet</text>
                    </svg>
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gray-50 flex flex-col items-center justify-center shrink-0">
                      <TrendingUp className="w-6 h-6 text-gray-300 mb-1" />
                      <span className="text-[10px] text-gray-400">Kein Budget</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Budget-Auslastung</p>
                    <p
                      className="text-2xl font-bold text-gray-900 font-mono leading-tight"
                      title={`Netto: ${eur(stats.gesamtkosten + (serviceKosten ?? 0))}`}
                    >
                      {eur((stats.gesamtkosten + (serviceKosten ?? 0)) * (1 + mwstSatz))}
                      <span className="text-[10px] text-gray-400 ml-1.5 font-normal align-middle">brutto</span>
                    </p>
                    {produktBudget != null && produktBudget > 0 ? (
                      <p className="text-xs text-gray-400 mt-1" title={`Produktbudget netto: ${eur(produktBudget)}`}>
                        von {eur(produktBudget * (1 + mwstSatz))} brutto · <span className={budgetPct! >= 100 ? 'text-red-500 font-medium' : budgetPct! >= 80 ? 'text-amber-500 font-medium' : 'text-emerald-600 font-medium'}>
                          {budgetPct! >= 100
                            ? `${eur((stats.gesamtkosten - produktBudget) * (1 + mwstSatz))} über Budget`
                            : `${eur((produktBudget - stats.gesamtkosten) * (1 + mwstSatz))} verbleibend`
                          }
                        </span>
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 mt-1">Kein Produkt-Budget definiert</p>
                    )}
                    {budgetPct != null && budgetPct >= 80 && (
                      <p className={`text-xs mt-2 font-medium flex items-center gap-1 ${budgetPct >= 100 ? 'text-red-500' : 'text-amber-600'}`}>
                        <AlertTriangle className="w-3 h-3" />
                        {budgetPct >= 100 ? 'Budget überschritten' : 'Budget fast aufgebraucht'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress-Bars (Anzeige brutto, Tooltip netto) */}
                <div className="space-y-3 min-w-0">
                  <BudgetBar
                    label="Produkt-Kosten + Zusatzkosten"
                    wert={stats.gesamtkosten}
                    budget={produktBudget}
                    farbeName="wellbeing"
                    mwstSatz={mwstSatz}
                  />
                  {serviceKosten != null && (
                    <BudgetBar
                      label={projekt.service_modell === 'pauschale' ? 'Service-Pauschale' : `Service · ${zeitSumme.abrechenbarStunden.toFixed(1).replace('.', ',')}h`}
                      wert={serviceKosten}
                      budget={null}
                      farbeName="amber"
                      mwstSatz={mwstSatz}
                    />
                  )}
                  {projekt.gesamtbudget != null && projekt.gesamtbudget > 0 && (
                    <BudgetBar
                      label="Gesamt (Produkte + Service)"
                      wert={stats.gesamtkosten + (serviceKosten ?? 0)}
                      budget={projekt.gesamtbudget}
                      farbeName="green"
                      mwstSatz={mwstSatz}
                    />
                  )}
                </div>
              </div>

              {/* Status-Strip (integriert, keine Lücke mehr) */}
              <div className="grid grid-cols-2 md:grid-cols-4 border-t border-gray-100 divide-x divide-gray-100">
                <StatStripCell
                  icon={CheckCircle2}
                  wert={stats.freigegeben}
                  label="Freigegeben"
                  tone="emerald"
                />
                <StatStripCell
                  icon={Clock}
                  wert={stats.ausstehend + stats.ueberarbeitung}
                  label="Ausstehend"
                  tone="amber"
                />
                <StatStripCell
                  icon={stats.abgelehnt > 0 ? XCircle : Layers}
                  wert={stats.abgelehnt > 0 ? stats.abgelehnt : raeume.length}
                  label={stats.abgelehnt > 0 ? 'Abgelehnt' : (raeume.length === 1 ? 'Raum' : 'Räume')}
                  tone={stats.abgelehnt > 0 ? 'red' : 'gray'}
                />
                <StatStripCell
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

            {/* Row 3: Budget pro Raum mit Kategorie-Breakdown */}
            {raumBudgetDetails.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Budget &amp; Kategorien pro Raum</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Wo wurde wieviel investiert · Top-Kategorien pro Raum</p>
                  </div>
                </div>
                <RaumBudgetGrid details={raumBudgetDetails} projektId={projekt.id} />
              </div>
            )}

            {/* Row 4 (optional): Zeiterfassung */}
            {projekt.service_modell === 'stundensatz' && projekt.service_stundensatz != null && (
              <ZeiterfassungBlock
                projektId={projekt.id}
                stundensatz={projekt.service_stundensatz}
                initialEintraege={zeitEintraege}
              />
            )}

            {/* Row 5: Service-Raten (nur bei Pauschale-Modell) */}
            {projekt.service_modell === 'pauschale' && (
              <ServiceRatenBlock
                projektId={projekt.id}
                initial={serviceRaten}
                servicePauschale={projekt.service_pauschale ?? null}
              />
            )}
          </div>
        )}

        {/* ── RÄUME ──────────────────────────────────────────────── */}
        {tabParam === 'raeume' && (
          <div className="space-y-4">
            {/* Projekt-Gesamtuebersicht: Anzahl, Mengen, Summen, Budgetauslastung */}
            {stats.kalk.raeume.length > 0 && (
              <ProjektGesamtuebersicht
                kalk={stats.kalk}
                serviceKostenNetto={serviceKosten}
                produktBudget={produktBudget}
              />
            )}

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
                <SortableRaumListe projektId={projekt.id} raeume={raeume} raumStats={raumStats} raumGruppen={raumGruppen} />
              )}
            </div>

            {raumBudgetDetails.length > 0 && (
              <p className="mt-3 text-[11px] text-gray-400 text-right">
                Budget-Details mit Kategorie-Breakdown findest du in der{' '}
                <Link
                  href={`/dashboard/projekte/${projekt.id}`}
                  className="text-wellbeing-green hover:underline"
                >
                  Übersicht
                </Link>.
              </p>
            )}
          </div>
        )}

        {/* ── FREIGABEN ─────────────────────────────────────────── */}
        {tabParam === 'freigaben' && (
          <div className="space-y-5">
            <FreigabeLinkKarte
              projektId={projekt.id}
              initialTokens={aktiveTokens}
              raeume={raeume.map((r) => ({ id: r.id, name: r.name }))}
              initialHatPin={!!projekt.freigabe_pin && projekt.freigabe_pin.toString().trim().length >= 4}
            />
            <FreigabeUebersicht projektId={projekt.id} initialTokens={alleTokens} />
            {raeume.length > 0 && (
              <FreigabeRaumPanel
                projektId={projekt.id}
                raeume={raeume}
                raumStats={raumStats}
                raumGruppen={raumGruppen}
              />
            )}
          </div>
        )}

        {/* ── TIMELINE ──────────────────────────────────────────── */}
        {tabParam === 'timeline' && (
          <div>
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

        {/* ── AUFGABEN ──────────────────────────────────────────── */}
        {tabParam === 'aufgaben' && (
          <div>
            <ProjektAufgabenBlock
              projektId={projekt.id}
              kundeId={projekt.kunde_id}
              initialAufgaben={aufgabenAlle}
              pickerOptionen={aufgabenPickerOptionen}
            />
          </div>
        )}

        {/* ── DATEIEN ───────────────────────────────────────────── */}
        {tabParam === 'dateien' && (
          <div>
            <DateiUpload projektId={projekt.id} initialDateien={dateien} />
          </div>
        )}

        {/* ── CHAT ──────────────────────────────────────────────── */}
        {tabParam === 'chat' && hatPortal && projekt.kunden && (
          <div>
            <ChatBlock
              projektId={projekt.id}
              kundeName={projekt.kunden.name}
              initialNachrichten={nachrichten}
            />
          </div>
        )}

        {/* ── NOTIZEN ───────────────────────────────────────────── */}
        {tabParam === 'notizen' && (
          <div>
            <NotizBlock typ="projekt" referenzId={projekt.id} initialNotizen={notizen} />
          </div>
        )}

      </div>
    </div>
  )
}

// ── Status-Strip-Zelle (für Übersicht-Dashboard-Karte) ──────
function StatStripCell({
  icon: Icon, wert, label, tone,
}: {
  icon: typeof CheckCircle2
  wert: number
  label: string
  tone: 'emerald' | 'amber' | 'red' | 'gray'
}) {
  const toneClasses = {
    emerald: { iconColor: 'text-emerald-500', wertColor: 'text-emerald-700' },
    amber:   { iconColor: 'text-amber-500',   wertColor: 'text-amber-700' },
    red:     { iconColor: 'text-red-500',     wertColor: 'text-red-700' },
    gray:    { iconColor: 'text-gray-400',    wertColor: 'text-gray-800' },
  }[tone]
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <Icon className={`w-5 h-5 shrink-0 ${toneClasses.iconColor}`} />
      <div className="min-w-0">
        <p className={`text-xl font-bold leading-none font-mono ${toneClasses.wertColor}`}>{wert}</p>
        <p className="text-[11px] mt-1 text-gray-500 uppercase tracking-wide font-medium">{label}</p>
      </div>
    </div>
  )
}

// ── Budget-Progress-Bar mit 80%/100% Markern ───────────────
function BudgetBar({
  label, wert, budget, farbeName, mwstSatz,
}: {
  label: string
  /** Wert NETTO — Anzeige wird brutto, Netto als title-Tooltip. */
  wert: number
  budget: number | null
  farbeName: 'wellbeing' | 'amber' | 'green'
  mwstSatz?: number  // default 0 = nur Netto
}) {
  const eurFmt = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
  const mwst = mwstSatz ?? 0
  const wertBrutto = wert * (1 + mwst)
  const budgetBrutto = budget != null ? budget * (1 + mwst) : null
  const pct = budget && budget > 0 ? Math.min((wert / budget) * 100, 100) : null
  const exakt = budget && budget > 0 ? Math.round((wert / budget) * 100) : null
  const ueber = pct === 100 && budget !== null && wert > budget

  const barFarbe = ueber
    ? 'bg-red-400'
    : pct != null && pct >= 80
    ? 'bg-amber-400'
    : farbeName === 'wellbeing'
    ? 'bg-wellbeing-green'
    : farbeName === 'amber'
    ? 'bg-wellbeing-cream border border-wellbeing-sand'
    : 'bg-wellbeing-green-light'

  const tooltip = mwst > 0
    ? `Netto: ${eurFmt(wert)}${budget != null ? ` / ${eurFmt(budget)}` : ''}`
    : undefined

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <span className="text-xs text-gray-600 truncate">{label}</span>
        <span className="text-xs font-mono shrink-0" title={tooltip}>
          <span className="font-semibold text-gray-900">{eurFmt(wertBrutto)}</span>
          {budgetBrutto != null && (
            <span className="text-gray-400"> / {eurFmt(budgetBrutto)}</span>
          )}
          {exakt != null && (
            <span className={`ml-2 font-semibold ${ueber ? 'text-red-500' : exakt >= 80 ? 'text-amber-500' : 'text-gray-400'}`}>
              {exakt}%
            </span>
          )}
        </span>
      </div>
      {budget != null ? (
        <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 ${barFarbe} rounded-full transition-all`}
            style={{ width: `${pct ?? 0}%` }}
          />
          {/* 80%-Marker */}
          <div className="absolute inset-y-0 w-px bg-amber-400/40" style={{ left: '80%' }} />
          {/* 100%-Marker (Rand) */}
        </div>
      ) : (
        <div className="h-2 rounded-full overflow-hidden">
          <div className={`h-full ${barFarbe}`} style={{ width: '100%' }} />
        </div>
      )}
    </div>
  )
}

