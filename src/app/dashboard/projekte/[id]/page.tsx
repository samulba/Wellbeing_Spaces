import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import RaumHinzufuegen from '@/components/RaumHinzufuegen'
import FreigabeLinkKarte from '@/components/FreigabeLinkKarte'
import DateiUpload from '@/components/DateiUpload'
import NotizBlock, { type Notiz } from '@/components/NotizBlock'
import { raumAnlegen } from '@/app/actions/raeume'
import { projektSoftDelete } from '@/app/actions/projekte'
import ProjektStatusButtons from '@/components/ProjektStatusButtons'
import { projektEventsAbrufen } from '@/app/actions/timeline'
import { Timeline } from '@/components/Timeline'
import {
  ChevronRight, Download, CheckCircle2, Clock, XCircle, Banknote,
  Archive, CalendarDays, User, Phone, Mail,
  AlertTriangle, Wrench, FileText, ReceiptText,
} from 'lucide-react'
import ProjektAktionenButtons from '@/components/ProjektAktionenButtons'
import SortableRaumListe, { type RaumStat } from '@/components/SortableRaumListe'
import PdfExportButton, { type PdfProdukt } from '@/components/PdfExportButton'
import ZeiterfassungBlock from '@/components/ZeiterfassungBlock'
import { getMwstSatz, getKategorien } from '@/app/actions/einstellungen'
import { getZeiterfassung, getZeitSumme } from '@/app/actions/zeiterfassung'
import { getRaumBudgetDetails } from '@/app/actions/raeume'
import { effektiverVpNetto } from '@/lib/preise'
import RaumBudgetGrid from '@/components/RaumBudgetGrid'
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

  // Lade über raum_produkte mit JOIN auf produkte + produktstatus
  const { data: eintraege } = await supabase
    .from('raum_produkte')
    .select('menge, verkaufspreis_override, rabatt_prozent, produkte(id, verkaufspreis, deleted_at, produktstatus(status))')
    .in('raum_id', raumIds)

  let gesamtkosten = 0, ausstehend = 0, freigegeben = 0, abgelehnt = 0, ueberarbeitung = 0
  const aktiveEintraege = (eintraege ?? []).filter((e) => {
    const prod = (e.produkte as unknown) as { deleted_at: string | null } | null
    return prod?.deleted_at == null
  })

  for (const e of aktiveEintraege) {
    const prod = (e.produkte as unknown) as { verkaufspreis: number | null; produktstatus: { status: string } | { status: string }[] | null } | null
    const vp = effektiverVpNetto(
      { verkaufspreis_override: e.verkaufspreis_override, rabatt_prozent: e.rabatt_prozent ?? null },
      prod?.verkaufspreis ?? null,
    )
    gesamtkosten += vp * e.menge
    const statusObj = Array.isArray(prod?.produktstatus) ? prod?.produktstatus[0] : prod?.produktstatus
    const s = statusObj?.status ?? 'ausstehend'
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
    .select('raum_id, menge, verkaufspreis_override, rabatt_prozent, produkte(verkaufspreis, deleted_at, produktstatus(status))')
    .in('raum_id', raumIds)

  const result: Record<string, RaumStat> = {}
  for (const e of eintraege ?? []) {
    const prod = (e.produkte as unknown) as { verkaufspreis: number | null; deleted_at: string | null; produktstatus: { status: string } | { status: string }[] | null } | null
    if (prod?.deleted_at != null) continue
    if (!result[e.raum_id]) result[e.raum_id] = { produkteAnzahl: 0, vpSumme: 0, freigegeben: 0 }
    result[e.raum_id].produkteAnzahl++
    const vp = effektiverVpNetto(
      { verkaufspreis_override: e.verkaufspreis_override, rabatt_prozent: e.rabatt_prozent ?? null },
      prod?.verkaufspreis ?? null,
    )
    result[e.raum_id].vpSumme += vp * e.menge
    const statusObj = Array.isArray(prod?.produktstatus) ? prod?.produktstatus[0] : prod?.produktstatus
    if (statusObj?.status === 'freigegeben') result[e.raum_id].freigegeben++
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

async function getProdukteForPdf(projektId: string): Promise<PdfProdukt[]> {
  const supabase = await createClient()
  const { data: raeume } = await supabase.from('raeume').select('id, name').eq('projekt_id', projektId).is('deleted_at', null).order('reihenfolge')
  const raumMap: Record<string, string> = {}
  for (const r of raeume ?? []) raumMap[r.id] = r.name
  const raumIds = (raeume ?? []).map((r) => r.id)
  if (raumIds.length === 0) return []

  const { data: eintraege } = await supabase
    .from('raum_produkte')
    .select('raum_id, menge, reihenfolge, verkaufspreis_override, produkte(name, kategorie, einheit, verkaufspreis, deleted_at, produktstatus(status))')
    .in('raum_id', raumIds)
    .order('reihenfolge')

  return (eintraege ?? [])
    .filter((e) => {
      const prod = (e.produkte as unknown) as { deleted_at: string | null } | null
      return prod?.deleted_at == null
    })
    .map((e) => {
      const prod = (e.produkte as unknown) as {
        name: string; kategorie: string | null; einheit: string
        verkaufspreis: number | null
        produktstatus: { status: string } | { status: string }[] | null
      }
      const psRaw = prod?.produktstatus
      const ps = Array.isArray(psRaw) ? psRaw[0] : psRaw
      const vp = e.verkaufspreis_override ?? prod?.verkaufspreis ?? 0
      return {
        name:      prod?.name ?? '–',
        raumName:  raumMap[e.raum_id] ?? '–',
        kategorie: prod?.kategorie ?? null,
        menge:     e.menge,
        einheit:   prod?.einheit ?? 'Stk',
        vpNetto:   vp,
        status:    ps?.status ?? 'ausstehend',
      }
    })
}

export default async function ProjektDetailPage({ params }: { params: { id: string } }) {
  const supabaseForBranding = await (await import('@/lib/supabase/server')).createClient()
  const [projekt, raeume, aktiverToken, dateien, stats, notizen, pdfProdukte, mwst, raumtypen, kunden, zeitEintraege, zeitSumme, { data: branding }, alleEvents, raumBudgetDetails] = await Promise.all([
    getProjekt(params.id),
    getRaeume(params.id),
    getAktivenToken(params.id),
    getDateien(params.id),
    getProjektStats(params.id),
    getNotizen(params.id),
    getProdukteForPdf(params.id),
    getMwstSatz(),
    getKategorien('raumtyp'),
    getKunden(),
    getZeiterfassung(params.id),
    getZeitSumme(params.id),
    supabaseForBranding.from('branding').select('firmenname, logo_url, adresse, email, telefon').maybeSingle(),
    projektEventsAbrufen(params.id),
    getRaumBudgetDetails(params.id),
  ])

  if (!projekt) notFound()

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
              <PdfExportButton
                projektName={projekt.name}
                kundeName={projekt.kunden?.name ?? null}
                produkte={pdfProdukte}
                mwst={mwst}
                firmenname={branding?.firmenname ?? undefined}
                logoUrl={branding?.logo_url ?? null}
                firmenAdresse={branding?.adresse ?? null}
                firmenEmail={branding?.email ?? null}
                firmenTelefon={branding?.telefon ?? null}
              />
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

        {/* Status Buttons */}
        <div className="mt-3">
          <ProjektStatusButtons projektId={projekt.id} initialStatus={projekt.status} disabled={istArchiviert} />
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

      {/* ── 2-Spalten Content ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto xl:overflow-hidden flex flex-col xl:flex-row">

        {/* ── Linke Spalte (60%) ─────────────────────────────── */}
        <div className="xl:flex-[3] xl:overflow-y-auto border-b xl:border-b-0 xl:border-r border-gray-100">

          {/* ── Räume ────────────────────────────────────────── */}
          <div className="px-6 py-4 border-b border-gray-50">
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
          </div>

          {/* ── Budget pro Raum (Aufschlüsselung + Kategorie-Mix) ── */}
          {raumBudgetDetails.length > 0 && (
            <div className="px-6 py-4 border-b border-gray-50">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Budget pro Raum</p>
                <p className="text-[11px] text-gray-400">
                  Wo wurde wieviel investiert · Top-Kategorien pro Raum
                </p>
              </div>
              <RaumBudgetGrid details={raumBudgetDetails} projektId={projekt.id} />
            </div>
          )}

          {/* ── Kunden-Freigabe & PIN ────────────────────────── */}
          <div className="px-6 py-4 border-b border-gray-50">
            <FreigabeLinkKarte
              projektId={projekt.id}
              initialToken={aktiverToken ?? null}
              initialHatPin={projekt.freigabe_pin != null}
            />
          </div>

          {/* ── Konfigurator (deaktiviert) ─────────────────────── */}
        </div>

        {/* ── Rechte Spalte (40%) ────────────────────────────── */}
        <div className="xl:flex-[2] xl:overflow-y-auto px-5 py-4 space-y-4">

          {/* Budget-Karte: Produkte + Service */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Budget-Auslastung</p>

            {/* Produkte-Ring */}
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
                  {projekt.produkt_budget != null && (
                    <p className="text-[10px] text-wellbeing-green/70 mt-0.5">Produkt-Budget (klientenseitig)</p>
                  )}
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

            {/* Service-Kosten */}
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

            {/* Gesamtsumme wenn beide vorhanden */}
            {serviceKosten != null && (
              <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                <p className="text-xs text-gray-400">Gesamt (Produkte + Service)</p>
                <p className="text-sm font-mono font-bold text-wellbeing-green">
                  {eur(stats.gesamtkosten + serviceKosten)}
                </p>
              </div>
            )}
          </div>

          {/* Freigabe-Status */}
          {stats.produkteGesamt > 0 && (
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-emerald-50 border border-emerald-200/60 rounded-xl p-3.5 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-lg font-bold text-emerald-700 leading-none">{stats.freigegeben}</p>
                  <p className="text-[11px] text-emerald-600 mt-0.5">Freigegeben</p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-3.5 flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <p className="text-lg font-bold text-amber-700 leading-none">{stats.ausstehend + stats.ueberarbeitung}</p>
                  <p className="text-[11px] text-amber-600 mt-0.5">Ausstehend</p>
                </div>
              </div>
              {stats.abgelehnt > 0 && (
                <div className="bg-red-50 border border-red-200/60 rounded-xl p-3.5 flex items-center gap-2.5">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <div>
                    <p className="text-lg font-bold text-red-700 leading-none">{stats.abgelehnt}</p>
                    <p className="text-[11px] text-red-600 mt-0.5">Abgelehnt</p>
                  </div>
                </div>
              )}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 flex items-center gap-2.5">
                <Banknote className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-lg font-bold text-gray-700 leading-none">{stats.produkteGesamt}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Produkte</p>
                </div>
              </div>
            </div>
          )}

          {/* Zeiterfassung (nur bei Stundensatz-Projekten) */}
          {projekt.service_modell === 'stundensatz' && projekt.service_stundensatz != null && (
            <ZeiterfassungBlock
              projektId={projekt.id}
              stundensatz={projekt.service_stundensatz}
              initialEintraege={zeitEintraege}
            />
          )}

          {/* Projekt-Timeline */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Projekt-Timeline</p>
              <Link
                href={`/dashboard/projekte/${projekt.id}/timeline`}
                className="text-xs text-wellbeing-green hover:underline"
              >
                Bearbeiten →
              </Link>
            </div>
            <Timeline
              events={alleEvents}
              showRaumBadge={true}
              alleLink={`/dashboard/projekte/${projekt.id}/timeline`}
              limit={6}
            />
          </div>

          {/* Dateien */}
          <DateiUpload projektId={projekt.id} initialDateien={dateien} />

          {/* Notizen */}
          <NotizBlock typ="projekt" referenzId={projekt.id} initialNotizen={notizen} />
        </div>
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
