'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Search, Package, Truck, AlertTriangle, Archive, ShoppingCart,
  Clock, CheckCircle2, Calendar, ExternalLink, ChevronRight, FolderOpen,
  CalendarClock, Check, Loader2, PackageCheck,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import { bestellungAusloesen, type BestellungMitPartner, type LieferuebersichtPosition } from '@/app/actions/lieferanten-bestellungen'
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

type Tab = 'zu_bestellen' | 'unterwegs' | 'lieferuebersicht' | 'anstehend' | 'ueberfaellig' | 'reklamationen' | 'archiv'
const TABS: Tab[] = ['zu_bestellen', 'unterwegs', 'lieferuebersicht', 'anstehend', 'ueberfaellig', 'reklamationen', 'archiv']

interface Props {
  zuBestellen: ZuBestellendesProdukt[]
  unterwegs: BestellungMitPartner[]
  entwuerfe: BestellungMitPartner[]
  anstehend: ZuBestellendesProdukt[]
  archiv: BestellungMitPartner[]
  offeneReklamationen: ReklamationMitProduktInfo[]
  erledigteReklamationen: ReklamationMitProduktInfo[]
  lieferuebersicht: LieferuebersichtPosition[]
}

export default function BestellungenClient({
  zuBestellen, unterwegs, entwuerfe, anstehend, archiv,
  offeneReklamationen, erledigteReklamationen, lieferuebersicht,
}: Props) {
  const searchParams = useSearchParams()
  const urlTab = searchParams.get('tab')
  const [tab, setTab] = useState<Tab>(urlTab && TABS.includes(urlTab as Tab) ? (urlTab as Tab) : 'zu_bestellen')
  const [suche, setSuche] = useState('')

  // Überfällig = ausgelöste/versandte Positionen mit Liefertermin in der Vergangenheit.
  const heute = new Date().toISOString().split('T')[0]
  const ueberfaelligPositionen = useMemo(
    () => lieferuebersicht.filter((p) => p.liefertermin && p.liefertermin < heute && p.status !== 'geliefert'),
    [lieferuebersicht, heute],
  )

  const counts = {
    zu_bestellen:    zuBestellen.length + entwuerfe.length,
    unterwegs:       unterwegs.length,
    lieferuebersicht: lieferuebersicht.length,
    anstehend:       anstehend.length,
    ueberfaellig:    ueberfaelligPositionen.length,
    reklamationen:   offeneReklamationen.length,
    archiv:          archiv.length + erledigteReklamationen.length,
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
        <FilterTab active={tab === 'lieferuebersicht'} onClick={() => setTab('lieferuebersicht')}
          count={counts.lieferuebersicht} label="Lieferübersicht"
          icon={<CalendarClock className="w-3.5 h-3.5" />} />
        <FilterTab active={tab === 'anstehend'} onClick={() => setTab('anstehend')}
          count={counts.anstehend} label="Diese Woche"
          icon={<Calendar className="w-3.5 h-3.5" />} />
        <FilterTab active={tab === 'ueberfaellig'} onClick={() => setTab('ueberfaellig')}
          count={counts.ueberfaellig} label="Überfällig"
          icon={<Clock className="w-3.5 h-3.5" />}
          dotPulse={counts.ueberfaellig > 0} />
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
      {tab === 'lieferuebersicht' && <LieferuebersichtView positionen={lieferuebersicht} suche={suche} />}
      {tab === 'anstehend' && <ZuBestellenView produkte={anstehend} entwuerfe={[]} suche={suche} variante="anstehend" />}
      {tab === 'ueberfaellig' && <LieferuebersichtView positionen={ueberfaelligPositionen} suche={suche} ueberfaellig leer="Keine überfälligen Lieferungen — alles im Plan. 🎉" />}
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
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [aktivPartner, setAktivPartner] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null)
  const readOnly = variante === 'anstehend'

  function showToast(msg: string, err = false) {
    setToast({ msg, err })
    setTimeout(() => setToast(null), 4000)
  }
  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  function ausloesen(g: { partnerId: string | null; partnerName: string; produkte: ZuBestellendesProdukt[] }) {
    if (!g.partnerId) { showToast('Produkte ohne Lieferant können nicht bestellt werden.', true); return }
    const ausgewaehlt = g.produkte.filter((p) => selected.has(p.raum_produkt_id))
    const ziel = ausgewaehlt.length > 0 ? ausgewaehlt : g.produkte
    const positionen = ziel.map((p) => ({
      raumProduktId:    p.raum_produkt_id,
      menge:            p.menge,
      einzelpreisNetto: p.produkt.einkaufspreis ?? 0,
    }))
    const partnerId = g.partnerId
    setAktivPartner(partnerId)
    startTransition(async () => {
      const res = await bestellungAusloesen({ partnerId, positionen })
      setAktivPartner(null)
      if (res.fehler) { showToast(res.fehler, true); return }
      showToast(`Bestellung ${res.bestellnummer ?? ''} bei ${g.partnerName} ausgelöst (${positionen.length} Position${positionen.length === 1 ? '' : 'en'}).`)
      setSelected(new Set())
      router.refresh()
    })
  }

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
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium text-white ${toast.err ? 'bg-red-500' : 'bg-wellbeing-green'}`}>
          {toast.msg}
        </div>
      )}

      {/* Entwurfs-Bestellungen oben */}
      {entwuerfe.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            Entwurfs-Bestellungen ({entwuerfe.length})
          </h3>
          <BestellungenListe bestellungen={entwuerfe} suche={suche} leerLabel="" />
        </div>
      )}

      {!readOnly && gruppen.length > 0 && (
        <p className="text-xs text-gray-400 -mb-2">
          Tipp: Produkte ankreuzen, um nur eine Teilmenge zu bestellen — ohne Auswahl wird die ganze Lieferanten-Gruppe ausgelöst.
        </p>
      )}

      {gruppen.length === 0 ? (
        <EmptyState text={
          variante === 'anstehend'
            ? 'Keine Lieferungen in den nächsten 7 Tagen.'
            : 'Aktuell muss nichts bestellt werden — alle freigegebenen Produkte sind in Bestellungen erfasst.'
        } />
      ) : (
        gruppen.map((g) => {
          const ausgewaehltInGruppe = g.produkte.filter((p) => selected.has(p.raum_produkt_id)).length
          const istAktiv = aktivPartner === g.partnerId && pending
          return (
          <div key={g.partnerId ?? '_'}>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="text-sm font-semibold text-gray-700">{g.partnerName}</h3>
              <span className="text-xs text-gray-400">
                ({ausgewaehltInGruppe > 0 ? `${ausgewaehltInGruppe} von ${g.produkte.length}` : g.produkte.length} Produkte)
              </span>
              {!readOnly && g.partnerId && (
                <div className="ml-auto flex items-center gap-3">
                  <Link
                    href={`/dashboard/bestellungen/neu?partner_id=${g.partnerId}`}
                    className="text-xs text-gray-400 hover:text-wellbeing-green hover:underline inline-flex items-center gap-1"
                  >
                    Als Entwurf <ChevronRight className="w-3 h-3" />
                  </Link>
                  <button
                    onClick={() => ausloesen(g)}
                    disabled={pending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-wellbeing-green hover:bg-wellbeing-green-dark text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {istAktiv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PackageCheck className="w-3.5 h-3.5" />}
                    {ausgewaehltInGruppe > 0 ? `${ausgewaehltInGruppe} bestellen` : 'Bestellung auslösen'}
                  </button>
                </div>
              )}
            </div>
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm divide-y divide-gray-100">
              {g.produkte.map((p) => (
                <ProduktZeile
                  key={p.raum_produkt_id}
                  eintrag={p}
                  selectable={!readOnly}
                  checked={selected.has(p.raum_produkt_id)}
                  onToggle={() => toggle(p.raum_produkt_id)}
                />
              ))}
            </div>
          </div>
        )})
      )}
    </div>
  )
}

function ProduktZeile({
  eintrag, selectable, checked, onToggle,
}: {
  eintrag: ZuBestellendesProdukt
  selectable?: boolean
  checked?: boolean
  onToggle?: () => void
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {selectable && (
        <button
          type="button"
          onClick={onToggle}
          aria-label="Produkt auswählen"
          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? 'border-wellbeing-green bg-wellbeing-green' : 'border-gray-300 hover:border-wellbeing-green/50'}`}
        >
          {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </button>
      )}
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

// ── Lieferübersicht (wer liefert was wann) ──────────────────────
const LU_STATUS: Record<string, { label: string; cls: string }> = {
  bestaetigt: { label: 'Ausgelöst',   cls: 'bg-blue-50 text-blue-700' },
  versandt:   { label: 'Versandt',    cls: 'bg-indigo-50 text-indigo-700' },
  geliefert:  { label: 'Geliefert',   cls: 'bg-emerald-50 text-emerald-700' },
  teilretour: { label: 'Teilretoure', cls: 'bg-amber-50 text-amber-700' },
}

function LieferuebersichtView({ positionen, suche, ueberfaellig, leer }: {
  positionen: LieferuebersichtPosition[]
  suche: string
  ueberfaellig?: boolean
  leer?: string
}) {
  const gefiltert = useMemo(() => {
    if (!suche.trim()) return positionen
    const q = suche.trim().toLowerCase()
    return positionen.filter((p) =>
      p.produkt_name.toLowerCase().includes(q) ||
      p.partner_name.toLowerCase().includes(q) ||
      (p.projekt_name?.toLowerCase().includes(q) ?? false) ||
      (p.bestellnummer?.toLowerCase().includes(q) ?? false))
  }, [positionen, suche])

  const gruppen = useMemo(() => {
    const m = new Map<string, { partnerName: string; positionen: LieferuebersichtPosition[] }>()
    for (const p of gefiltert) {
      const key = p.partner_id ?? '_'
      const e = m.get(key)
      if (e) e.positionen.push(p)
      else m.set(key, { partnerName: p.partner_name, positionen: [p] })
    }
    return Array.from(m.values()).sort((a, b) => a.partnerName.localeCompare(b.partnerName, 'de'))
  }, [gefiltert])

  if (gruppen.length === 0) {
    return <EmptyState text={leer ?? 'Noch keine ausgelösten Bestellungen — sobald du eine Bestellung auslöst, erscheint sie hier mit Lieferterminen.'} />
  }

  return (
    <div className="space-y-6">
      {gruppen.map((g) => (
        <div key={g.partnerName}>
          <div className="flex items-center gap-2 mb-2">
            <Truck className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">{g.partnerName}</h3>
            <span className="text-xs text-gray-400">({g.positionen.length})</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm divide-y divide-gray-100">
            {g.positionen.map((p, i) => {
              const st = LU_STATUS[p.status] ?? { label: p.status, cls: 'bg-gray-100 text-gray-600' }
              return (
                <div key={`${p.bestellung_id}-${i}`} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">{p.produkt_name}</span>
                      <span className="text-[11px] text-gray-400 shrink-0">×{p.menge} {p.einheit}</span>
                    </div>
                    <div className="text-xs text-gray-500 truncate mt-0.5 inline-flex items-center gap-1">
                      {p.bestellnummer && <span className="text-gray-400">{p.bestellnummer}</span>}
                      {p.projekt_name && <><span className="text-gray-300">·</span>{p.projekt_name}</>}
                      {p.raum_name && <span className="text-gray-400">· {p.raum_name}</span>}
                    </div>
                  </div>
                  <div className={`text-xs inline-flex items-center gap-1 shrink-0 ${ueberfaellig ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                    <Calendar className={`w-3 h-3 ${ueberfaellig ? 'text-red-500' : 'text-gray-400'}`} />
                    {p.liefertermin ? new Date(p.liefertermin).toLocaleDateString('de-DE') : 'kein Termin'}
                    {ueberfaellig && <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-semibold">überfällig</span>}
                    {p.liefertermin_bestaetigt && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${st.cls}`}>{st.label}</span>
                  <Link href={`/dashboard/bestellungen/${p.bestellung_id}`} className="text-gray-300 hover:text-wellbeing-green shrink-0" title="Zur Bestellung">
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      ))}
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
    bestaetigt: { bg: 'bg-blue-50',     text: 'text-blue-700',     label: 'Ausgelöst',  Icon: CheckCircle2 },
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
