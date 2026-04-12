import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import RaumHinzufuegen from '@/components/RaumHinzufuegen'
import FreigabeLinkKarte from '@/components/FreigabeLinkKarte'
import FreigabePinEinstellung from '@/components/FreigabePinEinstellung'
import DateiUpload from '@/components/DateiUpload'
import NotizBlock, { type Notiz } from '@/components/NotizBlock'
import { raumAnlegen } from '@/app/actions/raeume'
import { projektSoftDelete, projektStatusAendern } from '@/app/actions/projekte'
import { ChevronRight, Download, CheckCircle2, Clock, XCircle, Banknote } from 'lucide-react'
import ConfirmDeleteButton from '@/components/ConfirmDeleteButton'
import SortableRaumListe from '@/components/SortableRaumListe'
import PdfExportButton, { type PdfProdukt } from '@/components/PdfExportButton'
import { getMwstSatz, getEinstellungen } from '@/app/actions/einstellungen'
import type { ProjektMitKunde, Raum } from '@/lib/supabase/types'
import type { DateiItem } from '@/components/DateiUpload'

const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

const statusOptionen = [
  { wert: 'offen',          label: 'Offen',         farbe: 'bg-gray-100 text-gray-600' },
  { wert: 'in_bearbeitung', label: 'In Bearbeitung', farbe: 'bg-blue-50 text-blue-700' },
  { wert: 'freigegeben',    label: 'Freigegeben',    farbe: 'bg-emerald-50 text-emerald-700' },
  { wert: 'abgeschlossen',  label: 'Abgeschlossen',  farbe: 'bg-gray-100 text-gray-500' },
]

async function getProjekt(id: string): Promise<ProjektMitKunde | null> {
  const supabase = await createClient()
  const { data } = await supabase.from('projekte').select('*, kunden(id, name)').eq('id', id).is('deleted_at', null).single()
  return data as ProjektMitKunde | null
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

type ProjektStats = {
  gesamtkosten: number
  ausstehend: number
  freigegeben: number
  abgelehnt: number
  ueberarbeitung: number
  produkteGesamt: number
}

async function getProjektStats(projektId: string): Promise<ProjektStats> {
  const supabase = await createClient()

  // Räume → Produkte → Kosten + Status
  const { data: raeume } = await supabase
    .from('raeume').select('id').eq('projekt_id', projektId).is('deleted_at', null)

  const raumIds = (raeume ?? []).map((r) => r.id)
  if (raumIds.length === 0) return { gesamtkosten: 0, ausstehend: 0, freigegeben: 0, abgelehnt: 0, ueberarbeitung: 0, produkteGesamt: 0 }

  const { data: produkte } = await supabase
    .from('produkte')
    .select('id, verkaufspreis, menge, produktstatus(status)')
    .in('raum_id', raumIds)
    .is('deleted_at', null)

  let gesamtkosten = 0, ausstehend = 0, freigegeben = 0, abgelehnt = 0, ueberarbeitung = 0
  for (const p of produkte ?? []) {
    gesamtkosten += (p.verkaufspreis ?? 0) * p.menge
    const statusObj = Array.isArray(p.produktstatus) ? p.produktstatus[0] : p.produktstatus
    const s = statusObj?.status ?? 'ausstehend'
    if (s === 'ausstehend')     ausstehend++
    else if (s === 'freigegeben') freigegeben++
    else if (s === 'abgelehnt')   abgelehnt++
    else if (s === 'ueberarbeitung') ueberarbeitung++
  }

  return {
    gesamtkosten: Math.round(gesamtkosten * 100) / 100,
    ausstehend, freigegeben, abgelehnt, ueberarbeitung,
    produkteGesamt: (produkte ?? []).length,
  }
}

async function getNotizen(projektId: string): Promise<Notiz[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('notizen')
    .select('id, inhalt, erstellt_von, erstellt_am, bearbeitet_am')
    .eq('typ', 'projekt')
    .eq('referenz_id', projektId)
    .is('deleted_at', null)
    .order('erstellt_am', { ascending: false })
  return (data ?? []) as Notiz[]
}

async function getDateien(projektId: string): Promise<DateiItem[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('dateien')
    .select('id, datei_name, datei_url, datei_typ, dateigroesse')
    .eq('projekt_id', projektId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  return (data ?? []) as DateiItem[]
}

async function getProdukteForPdf(projektId: string): Promise<PdfProdukt[]> {
  const supabase = await createClient()
  const { data: raeume } = await supabase
    .from('raeume')
    .select('id, name')
    .eq('projekt_id', projektId)
    .is('deleted_at', null)
    .order('reihenfolge')
  const raumMap: Record<string, string> = {}
  for (const r of raeume ?? []) raumMap[r.id] = r.name
  const raumIds = (raeume ?? []).map((r) => r.id)
  if (raumIds.length === 0) return []
  const { data: produkte } = await supabase
    .from('produkte')
    .select('name, raum_id, kategorie, menge, einheit, verkaufspreis, produktstatus(status)')
    .in('raum_id', raumIds)
    .is('deleted_at', null)
    .order('reihenfolge')
  return (produkte ?? []).map((p) => {
    const psRaw = p.produktstatus as { status: string } | { status: string }[] | null
    const ps = Array.isArray(psRaw) ? psRaw[0] : psRaw
    return {
      name:      p.name,
      raumName:  raumMap[p.raum_id] ?? '–',
      kategorie: p.kategorie,
      menge:     p.menge,
      einheit:   p.einheit,
      vpNetto:   p.verkaufspreis ?? 0,
      status:    ps?.status ?? 'ausstehend',
    }
  })
}

export default async function ProjektDetailPage({ params }: { params: { id: string } }) {
  const [projekt, raeume, aktiverToken, dateien, stats, notizen, pdfProdukte, mwst, einstellungen] = await Promise.all([
    getProjekt(params.id),
    getRaeume(params.id),
    getAktivenToken(params.id),
    getDateien(params.id),
    getProjektStats(params.id),
    getNotizen(params.id),
    getProdukteForPdf(params.id),
    getMwstSatz(),
    getEinstellungen(),
  ])

  const raumtypen = (einstellungen.raumtypen ?? 'Büro,Studio,Wellness,Hotel,Privat,Wohnung,Sonstiges')
    .split(',').map((s: string) => s.trim()).filter(Boolean)

  if (!projekt) notFound()

  const raumHinzufuegenAktion = raumAnlegen.bind(null, projekt.id)
  const loeschenAktion        = projektSoftDelete.bind(null, projekt.id)

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
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
          <h1 className="text-xl font-semibold text-gray-900">{projekt.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* CSV Export */}
          <a
            href={`/api/projekte/${projekt.id}/export`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:scale-[1.02] rounded-lg transition-all duration-200"
            download
          >
            <Download className="w-3.5 h-3.5" />
            CSV Export
          </a>
          {/* PDF Export */}
          <PdfExportButton
            projektName={projekt.name}
            kundeName={projekt.kunden?.name ?? null}
            produkte={pdfProdukte}
            mwst={mwst}
          />
          <Link
            href={`/dashboard/projekte/${projekt.id}/bearbeiten`}
            className="px-4 py-2 text-xs font-medium text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:scale-[1.02] rounded-lg transition-all duration-200"
          >
            Bearbeiten
          </Link>
          <ConfirmDeleteButton
            action={loeschenAktion}
            confirmMessage={`„${projekt.name}" wirklich löschen?`}
          />
        </div>
      </div>

      {/* Status-Umschalter */}
      <div className="flex items-center gap-2 mb-6">
        {statusOptionen.map((s) => {
          const istAktiv = projekt.status === s.wert
          const statusAendernAktion = projektStatusAendern.bind(null, projekt.id, s.wert as import('@/lib/supabase/types').ProjektStatus)
          return (
            <form key={s.wert} action={statusAendernAktion}>
              <button
                type="submit"
                className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition-all duration-200 hover:scale-[1.02] ${
                  istAktiv
                    ? s.farbe + ' ring-2 ring-offset-1 ring-wellbeing-green-light'
                    : 'bg-white text-gray-400 border border-gray-200 hover:border-gray-300'
                }`}
              >
                {s.label}
              </button>
            </form>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Linke Spalte */}
        <div className="space-y-4">
          {/* Projektdetails */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Projektdetails</h2>
            <dl className="space-y-3">
              <InfoZeile label="Projektart" wert={projekt.projektart} />
              <InfoZeile label="Standort"   wert={projekt.standort} />
              {projekt.gesamtbudget != null && (
                <div>
                  <dt className="text-xs text-gray-500 mb-0.5">Gesamtbudget</dt>
                  <dd className="text-sm font-semibold text-gray-900">
                    {eur(projekt.gesamtbudget)}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Angelegt am</dt>
                <dd className="text-sm text-gray-600">
                  {new Date(projekt.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </dd>
              </div>
            </dl>
          </div>

          {/* Beschreibung */}
          {projekt.beschreibung && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Beschreibung</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{projekt.beschreibung}</p>
            </div>
          )}

          <FreigabeLinkKarte projektId={projekt.id} initialToken={aktiverToken ?? null} />
          <FreigabePinEinstellung projektId={projekt.id} hatPin={projekt.freigabe_pin != null} />
          <DateiUpload projektId={projekt.id} initialDateien={dateien} />
          <NotizBlock typ="projekt" referenzId={projekt.id} initialNotizen={notizen} />
        </div>

        {/* Rechte 2 Spalten: Stats + Räume */}
        <div className="lg:col-span-2 space-y-4">

          {/* Stats-Panel */}
          <div className="grid grid-cols-2 gap-4">
            {/* Budget-Auslastung */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm col-span-2">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Budget-Auslastung</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1 font-mono">{eur(stats.gesamtkosten)}</p>
                  <p className="text-xs text-gray-400">VP-Summe netto</p>
                </div>
                {projekt.gesamtbudget != null && projekt.gesamtbudget > 0 && (() => {
                  const pct = Math.min(Math.round((stats.gesamtkosten / projekt.gesamtbudget!) * 100), 999)
                  const farbe = pct >= 100 ? 'text-red-500' : pct >= 80 ? 'text-amber-600' : 'text-emerald-600'
                  return (
                    <div className="text-right">
                      <p className={`text-3xl font-bold font-mono ${farbe}`}>{pct}%</p>
                      <p className="text-xs text-gray-400">von {eur(projekt.gesamtbudget!)}</p>
                    </div>
                  )
                })()}
              </div>
              {projekt.gesamtbudget != null && projekt.gesamtbudget > 0 && (() => {
                const pct = Math.min(Math.round((stats.gesamtkosten / projekt.gesamtbudget!) * 100), 100)
                const balkenFarbe = pct >= 100 ? 'bg-red-400' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-400'
                return (
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${balkenFarbe}`} style={{ width: `${pct}%` }} />
                  </div>
                )
              })()}
            </div>

            {/* Freigabe-Status */}
            {stats.produkteGesamt > 0 && (
              <>
                <div className="bg-emerald-50 border border-emerald-200/60 rounded-xl p-4 shadow-sm flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-xl font-bold text-emerald-700">{stats.freigegeben}</p>
                    <p className="text-xs text-emerald-600">Freigegeben</p>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-4 shadow-sm flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-xl font-bold text-amber-700">{stats.ausstehend + stats.ueberarbeitung}</p>
                    <p className="text-xs text-amber-600">Ausstehend</p>
                  </div>
                </div>
                {stats.abgelehnt > 0 && (
                  <div className="bg-red-50 border border-red-200/60 rounded-xl p-4 shadow-sm flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                    <div>
                      <p className="text-xl font-bold text-red-700">{stats.abgelehnt}</p>
                      <p className="text-xs text-red-600">Abgelehnt</p>
                    </div>
                  </div>
                )}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
                  <Banknote className="w-5 h-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xl font-bold text-gray-700">{stats.produkteGesamt}</p>
                    <p className="text-xs text-gray-500">Produkte gesamt</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Räume */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <RaumHinzufuegen
              aktion={raumHinzufuegenAktion}
              raumtypen={raumtypen}
              raumAnzahl={raeume.length}
            />

            {raeume.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-gray-400">Noch keine Räume angelegt.</p>
                <p className="text-xs text-gray-300 mt-1">Über &bdquo;+ Raum hinzufügen&ldquo; erstellen.</p>
              </div>
            ) : (
              <SortableRaumListe projektId={projekt.id} raeume={raeume} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoZeile({ label, wert }: { label: string; wert: string | null }) {
  if (!wert) return null
  return (
    <div>
      <dt className="text-xs text-gray-500 mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-700">{wert}</dd>
    </div>
  )
}
