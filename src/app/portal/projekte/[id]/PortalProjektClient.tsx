'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, MessageSquare, FileText, CalendarDays,
  LayoutGrid, Check, X, ChevronDown, ChevronUp, Download,
  Clock, Flag, Truck, Info, ZoomIn,
  Package as PackageIcon, AlertTriangle,
} from 'lucide-react'
import Image from 'next/image'
import {
  portalProduktFreigeben,
  portalAlleFreigeben,
  portalNachrichtSenden,
  portalAnhangSignedUrl,
} from '@/app/actions/portal'
import type { PortalRaum, PortalProdukt } from '@/app/actions/portal'
import type { ClientNachricht, ChatNachrichtTyp } from '@/lib/supabase/types'
import { NachrichtBubble, ChatInputBar } from '@/components/ChatBlock'

// ── Typen ─────────────────────────────────────────────────────

interface Nachricht {
  id: string
  nachricht: string | null
  von_kunde: boolean
  created_at: string
  typ?: ChatNachrichtTyp
  anhang_pfad?: string | null
  anhang_typ?: string | null
  anhang_name?: string | null
  anhang_groesse?: number | null
  anhang_dauer?: number | null
}

interface Dokument {
  id: string
  name: string
  typ: string
  datei_url: string
  groesse_bytes: number | null
  created_at: string
}

interface Event {
  id: string
  titel: string
  typ: string
  start_datum: string
  end_datum: string | null
  status: string
  farbe: string | null
}

// ── Bestell-/Liefer-Status (Migration 100) ──────────────────────
export type BestellStatusEintrag = {
  bestellstatus:           string
  bestellt_am:             string | null
  liefertermin:            string | null
  lieferung_erhalten_am:   string | null
}

export type PortalReklamation = {
  id:               string
  raum_produkte_id: string
  raum_id:          string | null
  produkt_id:       string | null
  typ:              string
  beschreibung:     string
  status:           string
  loesung_typ:      string | null
  geloest_am:       string | null
  created_at:       string
}

interface Props {
  projektId: string
  projektName: string
  prim: string
  raeume: PortalRaum[]
  dokumente: Dokument[]
  nachrichten: Nachricht[]
  events: Event[]
  bestellStatusMap: Record<string, BestellStatusEintrag>
  reklamationen: PortalReklamation[]
  preiseAnzeigen: boolean
  vorname: string
}

type Tab = 'freigaben' | 'lieferungen' | 'dokumente' | 'nachrichten' | 'timeline'

const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

const FREIGABE_STATUS: Record<string, { label: string; farbe: string }> = {
  ausstehend:  { label: 'Ausstehend',  farbe: 'bg-gray-100 text-gray-500' },
  freigegeben: { label: 'Freigegeben', farbe: 'bg-emerald-100 text-emerald-700' },
  abgelehnt:   { label: 'Abgelehnt',   farbe: 'bg-red-100 text-red-600' },
  alternativ:  { label: 'Alternative', farbe: 'bg-amber-100 text-amber-700' },
}

const EVENT_TYP: Record<string, { farbe: string; icon: React.ReactNode }> = {
  meilenstein: { farbe: 'bg-purple-100 text-purple-700 border-purple-200', icon: <Flag className="w-3 h-3" /> },
  lieferung:   { farbe: 'bg-blue-100 text-blue-700 border-blue-200',       icon: <Truck className="w-3 h-3" /> },
  termin:      { farbe: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <Clock className="w-3 h-3" /> },
  phase:       { farbe: 'bg-gray-100 text-gray-600 border-gray-200',        icon: <CalendarDays className="w-3 h-3" /> },
}

// ── Produktkarte ──────────────────────────────────────────────

function ProduktKarte({
  produkt,
  preiseAnzeigen,
  onUpdate,
}: {
  produkt: PortalProdukt & { localStatus?: string }
  preiseAnzeigen: boolean
  onUpdate: (id: string, status: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [zoom, setZoom] = useState(false)
  const status = produkt.localStatus ?? produkt.freigabe_status ?? 'ausstehend'
  const info   = FREIGABE_STATUS[status] ?? FREIGABE_STATUS.ausstehend

  function waehlen(s: string) {
    if (isPending) return
    onUpdate(produkt.id, s)
    startTransition(async () => {
      await portalProduktFreigeben(produkt.id, s)
    })
  }

  return (
    <>
      {zoom && produkt.image_url && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setZoom(false)}>
          <Image src={produkt.image_url} alt={produkt.name} width={800} height={600} className="max-h-[80vh] w-auto rounded-xl object-contain" />
        </div>
      )}
      <div className={`bg-white border rounded-2xl overflow-hidden transition-all ${isPending ? 'opacity-60' : ''} ${status === 'freigegeben' ? 'border-emerald-200' : status === 'abgelehnt' ? 'border-red-200' : 'border-gray-100'}`}>
        {/* Bild */}
        {produkt.image_url ? (
          <div className="relative h-40 bg-gray-50 cursor-pointer" onClick={() => setZoom(true)}>
            <Image src={produkt.image_url} alt={produkt.name} fill className="object-contain p-2" />
            <div className="absolute top-2 right-2 bg-black/20 rounded-lg p-1">
              <ZoomIn className="w-3 h-3 text-white" />
            </div>
          </div>
        ) : (
          <div className="h-24 bg-gray-50 flex items-center justify-center">
            <LayoutGrid className="w-8 h-8 text-gray-200" />
          </div>
        )}

        <div className="p-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-semibold text-gray-900 leading-snug">{produkt.name}</p>
            <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${info.farbe}`}>
              {info.label}
            </span>
          </div>
          {produkt.kategorie && (
            <p className="text-xs text-gray-400 mb-1">{produkt.kategorie}</p>
          )}
          {preiseAnzeigen && produkt.verkaufspreis != null && (
            <p className="text-sm font-bold text-gray-800 mb-2">{eur(produkt.verkaufspreis)}</p>
          )}
          {produkt.beschreibung && (
            <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">{produkt.beschreibung}</p>
          )}

          {/* Aktionen */}
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={() => waehlen('freigegeben')} disabled={isPending}
              className={`flex items-center justify-center gap-1 py-2 text-xs font-medium rounded-xl border transition-all ${
                status === 'freigegeben'
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}>
              <Check className="w-3.5 h-3.5" /> Freigeben
            </button>
            <button onClick={() => waehlen('abgelehnt')} disabled={isPending}
              className={`flex items-center justify-center gap-1 py-2 text-xs font-medium rounded-xl border transition-all ${
                status === 'abgelehnt'
                  ? 'bg-red-500 text-white border-red-500'
                  : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
              }`}>
              <X className="w-3.5 h-3.5" /> Ablehnen
            </button>
            <button onClick={() => waehlen('alternativ')} disabled={isPending}
              className={`flex items-center justify-center gap-1 py-2 text-xs font-medium rounded-xl border transition-all ${
                status === 'alternativ'
                  ? 'bg-amber-400 text-white border-amber-400'
                  : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
              }`}>
              <MessageSquare className="w-3.5 h-3.5" /> Alternative
            </button>
            <button onClick={() => waehlen('ausstehend')} disabled={isPending}
              className={`flex items-center justify-center gap-1 py-2 text-xs font-medium rounded-xl border transition-all ${
                status === 'ausstehend'
                  ? 'bg-gray-200 text-gray-600 border-gray-200'
                  : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
              }`}>
              <Clock className="w-3.5 h-3.5" /> Offen
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Raum-Akkordeon ────────────────────────────────────────────

function RaumBlock({
  raum,
  preiseAnzeigen,
  statusMap,
  onUpdate,
}: {
  raum: PortalRaum
  preiseAnzeigen: boolean
  statusMap: Record<string, string>
  onUpdate: (id: string, status: string) => void
}) {
  const [offen, setOffen] = useState(true)
  const ausstehend = raum.produkte.filter(
    (p) => !statusMap[p.id] && (!p.freigabe_status || p.freigabe_status === 'ausstehend')
  ).length

  return (
    <div className="mb-4">
      <button onClick={() => setOffen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">{raum.name}</span>
          <span className="text-xs text-gray-400">{raum.produkte.length} Produkte</span>
          {ausstehend > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
              {ausstehend} ausstehend
            </span>
          )}
        </div>
        {offen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {offen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
          {raum.produkte.map((p) => (
            <ProduktKarte
              key={p.id}
              produkt={{ ...p, localStatus: statusMap[p.id] }}
              preiseAnzeigen={preiseAnzeigen}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Nachrichten-Tab ───────────────────────────────────────────

function NachrichtenTab({
  projektId,
  initialNachrichten,
  prim,
}: {
  projektId: string
  initialNachrichten: Nachricht[]
  vorname: string
  prim: string
}) {
  const [nachrichten, setNachrichten] = useState<Nachricht[]>(initialNachrichten)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()

  // Server-gerenderte Nachrichten übernehmen, wenn neue eintreffen (ersetzt temp-Items).
  useEffect(() => {
    setNachrichten(initialNachrichten)
  }, [initialNachrichten])

  // Auto-Scroll nur wenn User schon nah am unteren Rand ist.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const abstand = el.scrollHeight - el.scrollTop - el.clientHeight
    if (abstand < 150) el.scrollTop = el.scrollHeight
  }, [nachrichten.length])

  async function handleSend(formData: FormData): Promise<{ fehler?: string; erfolg?: string }> {
    formData.set('projekt_id', projektId)
    const res = await portalNachrichtSenden(null, formData)
    if (res?.erfolg) {
      const datei = formData.get('datei') as File | null
      const text  = (formData.get('nachricht') as string) ?? ''
      let typ: ChatNachrichtTyp = 'text'
      let anhangName: string | null = null
      let anhangGroesse: number | null = null
      let anhangTyp: string | null = null
      if (datei && datei.size > 0) {
        if (datei.type.startsWith('image/'))      typ = 'bild'
        else if (datei.type.startsWith('audio/')) typ = 'audio'
        else                                      typ = 'datei'
        anhangName    = datei.name
        anhangGroesse = datei.size
        anhangTyp     = datei.type
      }
      setNachrichten((prev) => [...prev, {
        id:            `temp-${crypto.randomUUID()}`,
        nachricht:     text,
        von_kunde:     true,
        created_at:    new Date().toISOString(),
        typ,
        anhang_pfad:   anhangName ? 'pending-upload' : null,
        anhang_name:   anhangName,
        anhang_groesse:anhangGroesse,
        anhang_typ:    anhangTyp,
      }])
      // Server-Refresh, um temp-Items durch die echten zu ersetzen.
      router.refresh()
    }
    return res ?? {}
  }

  // Adapter: Nachricht → ClientNachricht-shape für NachrichtBubble
  const asClient = (n: Nachricht): ClientNachricht => ({
    id:              n.id,
    organisation_id: null,
    projekt_id:      projektId,
    client_user_id:  null,
    team_user_id:    null,
    von_kunde:       n.von_kunde,
    nachricht:       n.nachricht,
    gelesen:         false,
    gelesen_am:      null,
    created_at:      n.created_at,
    typ:             n.typ ?? 'text',
    anhang_pfad:     n.anhang_pfad ?? null,
    anhang_typ:      n.anhang_typ ?? null,
    anhang_name:     n.anhang_name ?? null,
    anhang_groesse:  n.anhang_groesse ?? null,
    anhang_dauer:    n.anhang_dauer ?? null,
  })

  return (
    <div className="flex flex-col bg-white border border-black/[0.06] brand-radius overflow-hidden">
      <div ref={scrollRef} className="flex-1 h-[480px] overflow-y-auto px-4 py-5 space-y-2 bg-gray-50/40">
        {nachrichten.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: `rgba(var(--brand-primary-rgb), 0.08)` }}
            >
              <MessageSquare className="w-5 h-5" style={{ color: prim }} />
            </div>
            <p className="text-sm font-medium text-gray-700">Noch keine Nachrichten</p>
            <p className="text-xs text-gray-400 max-w-xs">
              Schreib dem Team deine erste Nachricht — Antwort kommt meist innerhalb von 24 Stunden.
            </p>
          </div>
        ) : (
          nachrichten.map((n) => (
            <NachrichtBubble
              key={n.id}
              n={asClient(n)}
              istEigene={n.von_kunde}
              getUrl={portalAnhangSignedUrl}
              brandColor={prim}
            />
          ))
        )}
      </div>

      <ChatInputBar onSend={handleSend} kontextLabel="an das Team" brandColor={prim} />
    </div>
  )
}

// ── Dokumente-Tab ─────────────────────────────────────────────

const TYP_LABEL: Record<string, string> = {
  angebot: 'Angebot', rechnung: 'Rechnung', vertrag: 'Vertrag', sonstiges: 'Dokument',
}

function DokumenteTab({ dokumente, prim }: { dokumente: Dokument[]; prim: string }) {
  if (dokumente.length === 0) {
    return (
      <EmptyState
        Icon={FileText}
        title="Noch keine Dokumente"
        text="Sobald dein Designer Angebote, Rechnungen oder Verträge teilt, findest du sie hier zum Download."
        prim={prim}
      />
    )
  }
  return (
    <div className="space-y-2">
      {dokumente.map((d) => (
        <div key={d.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-3.5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <FileText className="w-4 h-4 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">{d.name}</p>
              <p className="text-xs text-gray-400">
                {TYP_LABEL[d.typ] ?? 'Dokument'} ·{' '}
                {new Date(d.created_at).toLocaleDateString('de-DE')}
                {d.groesse_bytes && ` · ${Math.round(d.groesse_bytes / 1024)} KB`}
              </p>
            </div>
          </div>
          <a href={d.datei_url} target="_blank" rel="noopener noreferrer" download
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
            <Download className="w-4 h-4" />
          </a>
        </div>
      ))}
    </div>
  )
}

// ── Timeline-Tab ──────────────────────────────────────────────

// ── LieferungenTab — Bestellstatus + Reklamationen pro Produkt ──

const BESTELL_LABEL: Record<string, { label: string; bg: string; text: string; Icon: React.ComponentType<{ className?: string }> }> = {
  ausstehend:        { label: 'Ausstehend',     bg: 'bg-gray-100',    text: 'text-gray-600',    Icon: Clock },
  bestellt:          { label: 'Bestellt',       bg: 'bg-blue-50',     text: 'text-blue-700',    Icon: PackageIcon },
  teilgeliefert:     { label: 'Teilgeliefert',  bg: 'bg-amber-50',    text: 'text-amber-700',   Icon: Truck },
  geliefert:         { label: 'Geliefert',      bg: 'bg-emerald-50',  text: 'text-emerald-700', Icon: CheckCircle2 },
  mangel_gemeldet:   { label: 'Mangel gemeldet', bg: 'bg-orange-50',  text: 'text-orange-700',  Icon: AlertTriangle },
  retoure_unterwegs: { label: 'Retoure unterwegs', bg: 'bg-indigo-50',text: 'text-indigo-700',  Icon: Truck },
  retoure_erhalten:  { label: 'Retoure erhalten', bg: 'bg-slate-100', text: 'text-slate-700',   Icon: CheckCircle2 },
  rechnung_erhalten: { label: 'Rechnung',       bg: 'bg-violet-50',   text: 'text-violet-700',  Icon: CheckCircle2 },
  storniert:         { label: 'Storniert',      bg: 'bg-rose-50',     text: 'text-rose-700',    Icon: X },
}

const REK_STATUS_LABEL: Record<string, { label: string; bg: string; text: string }> = {
  offen:                 { label: 'Offen',                 bg: 'bg-orange-100',  text: 'text-orange-800' },
  lieferant_kontaktiert: { label: 'Lieferant kontaktiert', bg: 'bg-blue-100',    text: 'text-blue-800' },
  loesung_zugesagt:      { label: 'Lösung zugesagt',       bg: 'bg-amber-100',   text: 'text-amber-800' },
  geloest:               { label: 'Gelöst',                bg: 'bg-emerald-100', text: 'text-emerald-800' },
  eskaliert:             { label: 'Eskaliert',             bg: 'bg-red-100',     text: 'text-red-800' },
}

function LieferungenTab({
  raeume, bestellStatusMap, reklamationen, prim,
}: {
  raeume: PortalRaum[]
  bestellStatusMap: Record<string, BestellStatusEintrag>
  reklamationen: PortalReklamation[]
  prim: string
}) {
  // Kommende Lieferungen — datums-gruppiert, OHNE Lieferantennamen (Sourcing verborgen).
  const kommendeListe: { datum: string; produktName: string; raumName: string }[] = []
  for (const raum of raeume) {
    for (const p of raum.produkte) {
      const e = bestellStatusMap[`${raum.id}:${p.id}`]
      if (e && (e.bestellstatus === 'bestellt' || e.bestellstatus === 'teilgeliefert') && e.liefertermin) {
        kommendeListe.push({ datum: e.liefertermin, produktName: p.name, raumName: raum.name })
      }
    }
  }
  const kommendeGruppen = Array.from(
    kommendeListe.reduce((m, k) => {
      const list = m.get(k.datum) ?? []; list.push(k); m.set(k.datum, list); return m
    }, new Map<string, { datum: string; produktName: string; raumName: string }[]>()).entries(),
  ).sort((a, b) => a[0].localeCompare(b[0]))

  // Reklamationen-Lookup nach raum_produkte_id (in der Map laden wir ueber raum_id+produkt_id)
  // Da Portal mit produkte+raum_id arbeitet, mappen wir per (raum_id, produkt_id) → Reklamationen
  const rekByRaumProdukt = new Map<string, PortalReklamation[]>()
  for (const r of reklamationen) {
    if (!r.raum_id || !r.produkt_id) continue
    const k = `${r.raum_id}:${r.produkt_id}`
    const list = rekByRaumProdukt.get(k) ?? []
    list.push(r)
    rekByRaumProdukt.set(k, list)
  }

  const offeneRek = reklamationen.filter((r) => r.status !== 'geloest')

  return (
    <div className="space-y-6">
      {/* Kommende Lieferungen — was wann (ohne Lieferantennamen) */}
      {kommendeGruppen.length > 0 && (
        <div className="bg-white border border-black/[0.06] rounded-2xl shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3 inline-flex items-center gap-2">
            <Truck className="w-4 h-4" style={{ color: prim }} /> Kommende Lieferungen
          </p>
          <div className="space-y-3">
            {kommendeGruppen.map(([datum, items]) => (
              <div key={datum}>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  Voraussichtlich am {new Date(datum).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
                <ul className="space-y-1">
                  {items.map((it, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: prim }} />
                      <span className="truncate">{it.produktName}</span>
                      <span className="text-gray-400 text-xs shrink-0">· {it.raumName}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Banner mit offenen Reklamationen oben */}
      {offeneRek.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-900">
              {offeneRek.length} {offeneRek.length === 1 ? 'offene Reklamation' : 'offene Reklamationen'}
            </p>
            <p className="text-xs text-orange-800 mt-0.5">
              Wir kümmern uns gerade um {offeneRek.length === 1 ? 'das Problem' : 'die Probleme'} — siehe unten bei den Produkten.
            </p>
          </div>
        </div>
      )}

      {raeume.map((raum) => {
        const produkteMitStatus = raum.produkte.filter((p) => {
          const e = bestellStatusMap[`${raum.id}:${p.id}`]
          return e && e.bestellstatus !== 'ausstehend'
        })
        if (produkteMitStatus.length === 0) return null
        return (
          <section key={raum.id}>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{raum.name}</h3>
            <div className="bg-white border border-black/[0.06] rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden">
              {produkteMitStatus.map((p) => {
                const e = bestellStatusMap[`${raum.id}:${p.id}`]
                const cfg = BESTELL_LABEL[e.bestellstatus] ?? BESTELL_LABEL.ausstehend
                const reks = rekByRaumProdukt.get(`${raum.id}:${p.id}`) ?? []
                return (
                  <div key={p.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-50 border border-gray-200 shrink-0 flex items-center justify-center">
                      {p.image_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <PackageIcon className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900 truncate">{p.name}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.bg} ${cfg.text}`}>
                          <cfg.Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 inline-flex items-center gap-3 flex-wrap">
                        {e.bestellt_am && <span>Bestellt: {new Date(e.bestellt_am).toLocaleDateString('de-DE')}</span>}
                        {e.liefertermin && <span>Liefertermin: {new Date(e.liefertermin).toLocaleDateString('de-DE')}</span>}
                        {e.lieferung_erhalten_am && <span>Erhalten: {new Date(e.lieferung_erhalten_am).toLocaleDateString('de-DE')}</span>}
                      </div>
                      {/* Reklamationen */}
                      {reks.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {reks.map((r) => {
                            const rcfg = REK_STATUS_LABEL[r.status] ?? REK_STATUS_LABEL.offen
                            return (
                              <div key={r.id} className="bg-orange-50/60 border border-orange-200 rounded-lg p-2">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <AlertTriangle className="w-3 h-3 text-orange-600 shrink-0" />
                                  <span className="text-xs font-medium text-orange-900 capitalize">
                                    {r.typ.replace(/_/g, ' ')}
                                  </span>
                                  <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded ${rcfg.bg} ${rcfg.text}`}>
                                    {rcfg.label}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-700 line-clamp-2">{r.beschreibung}</p>
                                {r.geloest_am && r.loesung_typ && (
                                  <p className="text-[11px] text-emerald-700 mt-0.5">
                                    Lösung: {r.loesung_typ.replace(/_/g, ' ')} ({new Date(r.geloest_am).toLocaleDateString('de-DE')})
                                  </p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      {raeume.every((r) => r.produkte.every((p) => {
        const e = bestellStatusMap[`${r.id}:${p.id}`]
        return !e || e.bestellstatus === 'ausstehend'
      })) && (
        <EmptyState
          Icon={Truck}
          title="Noch keine Lieferungen"
          text="Sobald die ersten Produkte bestellt sind, erscheinen sie hier mit Status und Liefertermin."
          prim={prim}
        />
      )}
    </div>
  )
}

function TimelineTab({ events, prim }: { events: Event[]; prim: string }) {
  if (events.length === 0) {
    return (
      <EmptyState
        Icon={CalendarDays}
        title="Keine Timeline-Einträge"
        text="Meilensteine und Liefertermine deines Projekts werden hier sichtbar, sobald dein Designer sie plant."
        prim={prim}
      />
    )
  }
  const heute = new Date().toISOString().split('T')[0]
  return (
    <div className="relative pl-6 space-y-3">
      <div className="absolute left-2.5 top-0 bottom-0 w-px bg-gray-200" />
      {events.map((e) => {
        const vergangen = e.start_datum < heute
        const heute2    = e.start_datum === heute
        const cfg       = EVENT_TYP[e.typ] ?? EVENT_TYP.termin
        return (
          <div key={e.id} className="relative">
            <div className={`absolute -left-4 w-3 h-3 rounded-full border-2 border-white ${
              heute2 ? 'ring-2 ring-blue-400' : ''
            } ${vergangen ? 'bg-emerald-400' : heute2 ? 'bg-blue-500' : 'bg-gray-300'}`} />
            <div className="bg-white border border-gray-100 rounded-xl p-3.5">
              <div className="flex items-start gap-2">
                <span className={`shrink-0 mt-0.5 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${cfg.farbe}`}>
                  {cfg.icon} {e.typ}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{e.titel}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(e.start_datum).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
                    {e.end_datum && e.end_datum !== e.start_datum && (
                      <> – {new Date(e.end_datum).toLocaleDateString('de-DE', { day: '2-digit', month: 'long' })}</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Haupt-Komponente ──────────────────────────────────────────

export default function PortalProjektClient({
  projektId, prim, raeume, dokumente, nachrichten, events,
  bestellStatusMap, reklamationen,
  preiseAnzeigen, vorname,
}: Props) {
  const [aktuellerTab, setAktuellerTab] = useState<Tab>('freigaben')
  const [statusMap, setStatusMap]       = useState<Record<string, string>>({})
  const [alleFreigeben, setAlleFreigeben] = useState(false)
  const [, startTransition] = useTransition()

  const alleProdukteFlach = raeume.flatMap((r) => r.produkte)
  const ausstehend = alleProdukteFlach.filter(
    (p) => { const s = statusMap[p.id] ?? p.freigabe_status; return !s || s === 'ausstehend' }
  ).length

  function updateStatus(id: string, status: string) {
    setStatusMap((prev) => ({ ...prev, [id]: status }))
  }

  function handleAlleFreigeben() {
    setAlleFreigeben(true)
    const neueMap: Record<string, string> = {}
    alleProdukteFlach.forEach((p) => {
      if (!statusMap[p.id] && (!p.freigabe_status || p.freigabe_status === 'ausstehend')) {
        neueMap[p.id] = 'freigegeben'
      }
    })
    setStatusMap((prev) => ({ ...prev, ...neueMap }))
    startTransition(async () => {
      await portalAlleFreigeben(projektId)
      setAlleFreigeben(false)
    })
  }

  // Hat das Projekt überhaupt Bestell-/Liefer-Aktivität?
  const lieferungenAktiv = Object.values(bestellStatusMap).some(
    (e) => e && e.bestellstatus !== 'ausstehend',
  )
  const offeneRekCount = reklamationen.filter((r) => r.status !== 'geloest').length

  const TABS = [
    { id: 'freigaben'   as Tab, label: 'Freigaben',  icon: <CheckCircle2 className="w-3.5 h-3.5" />, badge: ausstehend > 0 ? ausstehend : null },
    ...(lieferungenAktiv || offeneRekCount > 0 ? [
      { id: 'lieferungen' as Tab, label: 'Lieferungen', icon: <Truck className="w-3.5 h-3.5" />, badge: offeneRekCount > 0 ? offeneRekCount : null },
    ] : []),
    { id: 'dokumente'   as Tab, label: 'Dokumente',  icon: <FileText     className="w-3.5 h-3.5" />, badge: null },
    { id: 'nachrichten' as Tab, label: 'Nachrichten',icon: <MessageSquare className="w-3.5 h-3.5" />, badge: null },
    { id: 'timeline'    as Tab, label: 'Timeline',   icon: <CalendarDays  className="w-3.5 h-3.5" />, badge: null },
  ]

  return (
    <div>
      {/* Tabs — moderne Pill-Leiste mit Border-Indicator */}
      <div className="mb-6 md:mb-8 border-b border-black/[0.06] -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {TABS.map((t) => {
            const isActive = aktuellerTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setAktuellerTab(t.id)}
                className={`relative flex items-center gap-2 px-4 md:px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {t.icon}
                {t.label}
                {t.badge != null && (
                  <span
                    className="ml-1 min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full flex items-center justify-center text-white tabular-nums"
                    style={{ background: prim }}
                  >
                    {t.badge}
                  </span>
                )}
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full"
                    style={{ background: prim }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab-Inhalt */}
      {aktuellerTab === 'freigaben' && (
        <div>
          {raeume.length === 0 ? (
            <EmptyState
              Icon={Info}
              title="Noch keine Produkte im Projekt"
              text="Sobald dein Designer Produkte hinzufügt, erscheinen sie hier zur Freigabe."
              prim={prim}
            />
          ) : (
            <>
              {ausstehend > 0 && (
                <div className="flex items-center justify-between gap-3 mb-5 p-4 rounded-2xl border"
                  style={{
                    background: `rgba(var(--brand-primary-rgb),0.04)`,
                    borderColor: `rgba(var(--brand-primary-rgb),0.15)`,
                  }}
                >
                  <p className="text-sm font-medium" style={{ color: prim }}>
                    {ausstehend} Produkt{ausstehend !== 1 ? 'e' : ''} wartet auf deine Entscheidung
                  </p>
                  <button
                    onClick={handleAlleFreigeben} disabled={alleFreigeben}
                    className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-xl transition-all hover:brightness-95 disabled:opacity-60"
                    style={{ background: prim }}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {alleFreigeben ? 'Wird freigegeben…' : 'Alle freigeben'}
                  </button>
                </div>
              )}
              <div className="space-y-5">
                {raeume.map((r) => (
                  <RaumBlock key={r.id} raum={r} preiseAnzeigen={preiseAnzeigen}
                    statusMap={statusMap} onUpdate={updateStatus} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {aktuellerTab === 'lieferungen' && (
        <LieferungenTab
          raeume={raeume}
          bestellStatusMap={bestellStatusMap}
          reklamationen={reklamationen}
          prim={prim}
        />
      )}


      {aktuellerTab === 'dokumente' && (
        <DokumenteTab dokumente={dokumente} prim={prim} />
      )}

      {aktuellerTab === 'nachrichten' && (
        <NachrichtenTab
          projektId={projektId}
          initialNachrichten={nachrichten}
          vorname={vorname}
          prim={prim}
        />
      )}

      {aktuellerTab === 'timeline' && (
        <TimelineTab events={events} prim={prim} />
      )}
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────────
function EmptyState({
  Icon, title, text, prim,
}: {
  Icon: React.ComponentType<{ className?: string }>
  title: string
  text: string
  prim: string
}) {
  return (
    <div className="relative rounded-3xl overflow-hidden border border-black/[0.05] bg-white px-6 py-14 md:py-20 text-center">
      <div
        aria-hidden
        className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full opacity-40 blur-3xl"
        style={{ background: `radial-gradient(circle, rgba(var(--brand-primary-rgb),0.15) 0%, transparent 70%)` }}
      />
      <div className="relative">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: `rgba(var(--brand-primary-rgb),0.1)`, color: prim }}
        >
          <Icon className="w-6 h-6" />
        </div>
        <p className="text-base font-semibold" style={{ color: prim }}>{title}</p>
        <p className="text-sm opacity-60 mt-2 max-w-md mx-auto leading-relaxed">{text}</p>
      </div>
    </div>
  )
}
