'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Search, Package, Truck, AlertTriangle, Archive, ShoppingCart,
  Clock, CheckCircle2, Calendar, ExternalLink, ChevronRight, FolderOpen,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import type { BestellungMitPartner } from '@/app/actions/lieferanten-bestellungen'
import type { ProduktReklamation } from '@/lib/supabase/types'

export type ZuBestellendesProdukt = {
  raum_produkt_id: string
  menge: number
  liefertermin: string | null
  produkt: {
    id: string
    name: string
    bild_url: string | null
    partner_id: string | null
    partner_name: string | null
    einheit: string
    verkaufspreis: number | null
    einkaufspreis: number | null
  }
  raum: {
    id: string
    name: string
    projekt_id: string
    projekt_name: string | null
    kunde_name: string | null
  }
}

export type ReklamationMitProduktInfo = ProduktReklamation & {
  produkt_name: string
  produkt_bild: string | null
  raum_name: string | null
  projekt_id: string | null
  projekt_name: string | null
  kunde_name: string | null
}

type Tab = 'zu_bestellen' | 'unterwegs' | 'anstehend' | 'reklamationen' | 'archiv'

interface Props {
  zuBestellen: ZuBestellendesProdukt[]
  unterwegs: BestellungMitPartner[]
  entwuerfe: BestellungMitPartner[]
  anstehend: ZuBestellendesProdukt[]
  archiv: BestellungMitPartner[]
  offeneReklamationen: ReklamationMitProduktInfo[]
  erledigteReklamationen: ReklamationMitProduktInfo[]
}

export default function BestellungenClient({
  zuBestellen, unterwegs, entwuerfe, anstehend, archiv,
  offeneReklamationen, erledigteReklamationen,
}: Props) {
  const [tab, setTab] = useState<Tab>('zu_bestellen')
  const [suche, setSuche] = useState('')

  const counts = {
    zu_bestellen:  zuBestellen.length + entwuerfe.length,
    unterwegs:     unterwegs.length,
    anstehend:     anstehend.length,
    reklamationen: offeneReklamationen.length,
    archiv:        archiv.length + erledigteReklamationen.length,
  }

  return (
    <>
      {/* Filter-Pills */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <FilterTab active={tab === 'zu_bestellen'} onClick={() => setTab('zu_bestellen')}
          count={counts.zu_bestellen} label="Zu bestellen"
          icon={<ShoppingCart className="w-3.5 h-3.5" />} />
        <FilterTab active={tab === 'unterwegs'} onClick={() => setTab('unterwegs')}
          count={counts.unterwegs} label="Unterwegs"
          icon={<Truck className="w-3.5 h-3.5" />} />
        <FilterTab active={tab === 'anstehend'} onClick={() => setTab('anstehend')}
          count={counts.anstehend} label="Diese Woche"
          icon={<Calendar className="w-3.5 h-3.5" />} />
        <FilterTab active={tab === 'reklamationen'} onClick={() => setTab('reklamationen')}
          count={counts.reklamationen} label="Reklamationen"
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
          dotPulse={counts.reklamationen > 0} />
        <FilterTab active={tab === 'archiv'} onClick={() => setTab('archiv')}
          count={counts.archiv} label="Archiv"
          icon={<Archive className="w-3.5 h-3.5" />} />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative w-[340px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            placeholder="Produkt, Lieferant, Projekt suchen…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition"
          />
        </div>
      </div>

      {/* Content */}
      {tab === 'zu_bestellen' && (
        <ZuBestellenView
          produkte={zuBestellen}
          entwuerfe={entwuerfe}
          suche={suche}
        />
      )}
      {tab === 'unterwegs' && <BestellungenListe bestellungen={unterwegs} suche={suche} leerLabel="Aktuell unterwegs ist nichts." />}
      {tab === 'anstehend' && <ZuBestellenView produkte={anstehend} entwuerfe={[]} suche={suche} variante="anstehend" />}
      {tab === 'reklamationen' && <ReklamationenListe reklamationen={offeneReklamationen} suche={suche} leerLabel="Keine offenen Reklamationen." />}
      {tab === 'archiv' && (
        <div className="space-y-6">
          {archiv.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Bestellungen ({archiv.length})
              </h3>
              <BestellungenListe bestellungen={archiv} suche={suche} leerLabel="" />
            </div>
          )}
          {erledigteReklamationen.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Erledigte Reklamationen ({erledigteReklamationen.length})
              </h3>
              <ReklamationenListe reklamationen={erledigteReklamationen} suche={suche} leerLabel="" />
            </div>
          )}
          {archiv.length === 0 && erledigteReklamationen.length === 0 && (
            <EmptyState text="Archiv ist leer." />
          )}
        </div>
      )}
    </>
  )
}

// ── Filter-Tab ──────────────────────────────────────────────────
function FilterTab({
  active, onClick, count, label, icon, dotPulse,
}: {
  active: boolean
  onClick: () => void
  count: number
  label: string
  icon?: React.ReactNode
  dotPulse?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active
          ? 'bg-wellbeing-green text-white'
          : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
      }`}
    >
      {icon}
      {label}
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
        active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
      }`}>
        {count}
      </span>
      {dotPulse && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
      )}
    </button>
  )
}

// ── Zu Bestellen View (Produkte gruppiert nach Lieferant) ─────────
function ZuBestellenView({
  produkte, entwuerfe, suche, variante,
}: {
  produkte: ZuBestellendesProdukt[]
  entwuerfe: BestellungMitPartner[]
  suche: string
  variante?: 'anstehend'
}) {
  const gefiltert = useMemo(() => {
    if (!suche.trim()) return produkte
    const q = suche.trim().toLowerCase()
    return produkte.filter(
      (p) =>
        p.produkt.name.toLowerCase().includes(q) ||
        (p.produkt.partner_name?.toLowerCase().includes(q) ?? false) ||
        (p.raum.projekt_name?.toLowerCase().includes(q) ?? false) ||
        (p.raum.kunde_name?.toLowerCase().includes(q) ?? false),
    )
  }, [produkte, suche])

  // Gruppieren nach Partner
  const gruppen = useMemo(() => {
    const m = new Map<string, { partnerName: string; partnerId: string | null; produkte: ZuBestellendesProdukt[] }>()
    for (const p of gefiltert) {
      const key = p.produkt.partner_id ?? '_kein_lieferant_'
      const eintrag = m.get(key)
      if (eintrag) eintrag.produkte.push(p)
      else m.set(key, {
        partnerName: p.produkt.partner_name ?? 'Kein Lieferant',
        partnerId:   p.produkt.partner_id,
        produkte:    [p],
      })
    }
    return Array.from(m.values()).sort((a, b) => a.partnerName.localeCompare(b.partnerName, 'de'))
  }, [gefiltert])

  return (
    <div className="space-y-6">
      {/* Entwurfs-Bestellungen oben */}
      {entwuerfe.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            Entwurfs-Bestellungen ({entwuerfe.length})
          </h3>
          <BestellungenListe bestellungen={entwuerfe} suche={suche} leerLabel="" />
        </div>
      )}

      {gruppen.length === 0 ? (
        <EmptyState text={
          variante === 'anstehend'
            ? 'Keine Lieferungen in den nächsten 7 Tagen.'
            : 'Aktuell muss nichts bestellt werden — alle freigegebenen Produkte sind in Bestellungen erfasst.'
        } />
      ) : (
        gruppen.map((g) => (
          <div key={g.partnerId ?? '_'}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold text-gray-700">{g.partnerName}</h3>
              <span className="text-xs text-gray-400">({g.produkte.length} Produkte)</span>
              {variante !== 'anstehend' && g.partnerId && (
                <Link
                  href={`/dashboard/bestellungen/neu?partner_id=${g.partnerId}`}
                  className="ml-auto text-xs text-wellbeing-green hover:underline inline-flex items-center gap-1"
                >
                  Bestellung anlegen <ChevronRight className="w-3 h-3" />
                </Link>
              )}
            </div>
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm divide-y divide-gray-100">
              {g.produkte.map((p) => (
                <ProduktZeile key={p.raum_produkt_id} eintrag={p} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function ProduktZeile({ eintrag }: { eintrag: ZuBestellendesProdukt }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-50 border border-gray-200 shrink-0 flex items-center justify-center">
        {eintrag.produkt.bild_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={eintrag.produkt.bild_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <Package className="w-4 h-4 text-gray-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 truncate">{eintrag.produkt.name}</span>
          <span className="text-[11px] text-gray-400 shrink-0">×{eintrag.menge} {eintrag.produkt.einheit}</span>
        </div>
        <div className="text-xs text-gray-500 truncate mt-0.5 inline-flex items-center gap-1">
          <FolderOpen className="w-3 h-3 text-gray-400" />
          {eintrag.raum.projekt_name}
          <span className="text-gray-400">·</span>
          {eintrag.raum.name}
          {eintrag.raum.kunde_name && (
            <span className="text-gray-400">· {eintrag.raum.kunde_name}</span>
          )}
        </div>
      </div>
      {eintrag.liefertermin && (
        <div className="text-xs text-gray-500 inline-flex items-center gap-1 shrink-0">
          <Calendar className="w-3 h-3 text-gray-400" />
          {new Date(eintrag.liefertermin).toLocaleDateString('de-DE')}
        </div>
      )}
      <Link
        href={`/dashboard/projekte/${eintrag.raum.projekt_id}/raeume/${eintrag.raum.id}`}
        className="text-gray-300 hover:text-wellbeing-green transition-colors shrink-0"
        title="Zum Produkt"
      >
        <ExternalLink className="w-4 h-4" />
      </Link>
    </div>
  )
}

// ── Bestellungen-Liste ──────────────────────────────────────────
function BestellungenListe({
  bestellungen, suche, leerLabel,
}: {
  bestellungen: BestellungMitPartner[]
  suche: string
  leerLabel: string
}) {
  const gefiltert = suche.trim()
    ? bestellungen.filter((b) =>
        b.partner_name.toLowerCase().includes(suche.toLowerCase()) ||
        (b.bestellnummer?.toLowerCase().includes(suche.toLowerCase()) ?? false))
    : bestellungen

  if (gefiltert.length === 0) {
    return leerLabel ? <EmptyState text={leerLabel} /> : null
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {gefiltert.map((b) => (
        <Link
          key={b.id}
          href={`/dashboard/bestellungen/${b.id}`}
          className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">{b.bestellnummer ?? 'Entwurf'}</div>
              <div className="text-sm font-medium text-gray-900 mt-0.5">{b.partner_name}</div>
            </div>
            <StatusBadge status={b.status} />
          </div>
          <div className="text-xs text-gray-500 mb-2">
            {b.positionen_count} {b.positionen_count === 1 ? 'Produkt' : 'Produkte'}
            {b.gesamtpreis_netto > 0 && (
              <span className="ml-2 text-gray-700 tabular-nums font-medium">
                {b.gesamtpreis_netto.toFixed(2)} €
              </span>
            )}
          </div>
          {b.liefertermin_geplant && (
            <div className="text-[11px] text-gray-400 inline-flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Liefertermin: {new Date(b.liefertermin_geplant).toLocaleDateString('de-DE')}
            </div>
          )}
        </Link>
      ))}
    </div>
  )
}

function StatusBadge({ status }: { status: BestellungMitPartner['status'] }) {
  const cfg: Record<typeof status, { bg: string; text: string; label: string; Icon: React.ComponentType<{ className?: string }> }> = {
    entwurf:    { bg: 'bg-gray-100',    text: 'text-gray-700',     label: 'Entwurf',    Icon: Clock },
    bestaetigt: { bg: 'bg-blue-50',     text: 'text-blue-700',     label: 'Bestätigt',  Icon: CheckCircle2 },
    versandt:   { bg: 'bg-indigo-50',   text: 'text-indigo-700',   label: 'Versandt',   Icon: Truck },
    geliefert:  { bg: 'bg-emerald-50',  text: 'text-emerald-700',  label: 'Geliefert',  Icon: CheckCircle2 },
    storniert:  { bg: 'bg-rose-50',     text: 'text-rose-700',     label: 'Storniert',  Icon: AlertTriangle },
    teilretour: { bg: 'bg-amber-50',    text: 'text-amber-700',    label: 'Teilretour', Icon: AlertTriangle },
  }
  const c = cfg[status]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${c.bg} ${c.text}`}>
      <c.Icon className="w-2.5 h-2.5" />
      {c.label}
    </span>
  )
}

// ── Reklamationen-Liste ─────────────────────────────────────────
function ReklamationenListe({
  reklamationen, suche, leerLabel,
}: {
  reklamationen: ReklamationMitProduktInfo[]
  suche: string
  leerLabel: string
}) {
  const gefiltert = suche.trim()
    ? reklamationen.filter((r) =>
        r.produkt_name.toLowerCase().includes(suche.toLowerCase()) ||
        r.beschreibung.toLowerCase().includes(suche.toLowerCase()) ||
        (r.projekt_name?.toLowerCase().includes(suche.toLowerCase()) ?? false))
    : reklamationen

  if (gefiltert.length === 0) {
    return leerLabel ? <EmptyState text={leerLabel} /> : null
  }
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm divide-y divide-gray-100 overflow-hidden">
      {gefiltert.map((r) => {
        const tageOffen = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000)
        const dringend = tageOffen > 7 && r.status !== 'geloest'
        return (
          <div key={r.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-orange-50 border border-orange-200 shrink-0 flex items-center justify-center">
              {r.produkt_bild ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={r.produkt_bild} alt="" className="w-full h-full object-cover" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-orange-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-900 truncate">{r.produkt_name}</span>
                <ReklamationStatusBadge status={r.status} />
                {dringend && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-50 text-red-700 text-[10px] font-medium rounded">
                    seit {tageOffen} Tagen offen
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">{r.beschreibung}</p>
              <div className="text-[11px] text-gray-400 mt-1 inline-flex items-center gap-2">
                <span>{r.typ.replace(/_/g, ' ')}</span>
                <span>·</span>
                <span>{formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: de })}</span>
                {r.projekt_name && <><span>·</span><span>{r.projekt_name}</span></>}
              </div>
            </div>
            {r.projekt_id && (
              <Link
                href={`/dashboard/projekte/${r.projekt_id}/raeume`}
                className="text-gray-300 hover:text-wellbeing-green transition-colors shrink-0 self-center"
                title="Zum Produkt"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ReklamationStatusBadge({ status }: { status: ReklamationMitProduktInfo['status'] }) {
  const cfg: Record<typeof status, { bg: string; text: string; label: string }> = {
    offen:                 { bg: 'bg-orange-100',   text: 'text-orange-800',  label: 'Offen' },
    lieferant_kontaktiert: { bg: 'bg-blue-100',     text: 'text-blue-800',    label: 'Lieferant kontaktiert' },
    loesung_zugesagt:      { bg: 'bg-amber-100',    text: 'text-amber-800',   label: 'Lösung zugesagt' },
    geloest:               { bg: 'bg-emerald-100',  text: 'text-emerald-800', label: 'Gelöst' },
    eskaliert:             { bg: 'bg-red-100',      text: 'text-red-800',     label: 'Eskaliert' },
  }
  const c = cfg[status]
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-16 bg-white border border-gray-200 rounded-xl shadow-sm">
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  )
}
