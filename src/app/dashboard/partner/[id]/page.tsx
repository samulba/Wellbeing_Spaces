import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { partnerSoftDelete, getPartnerKonditionen, getPartnerKontakte } from '@/app/actions/partner'
import { getKategorien } from '@/app/actions/einstellungen'
import { provisionBetrag, einkaufNettoNachRabatt } from '@/lib/preise'
import ConfirmDeleteButton from '@/components/ConfirmDeleteButton'
import NotizBlock, { type Notiz } from '@/components/NotizBlock'
import LogoUpload from '@/components/LogoUpload'
import PartnerKonditionenBlock from '@/components/PartnerKonditionenBlock'
import PartnerVertraegeBlock from '@/components/PartnerVertraegeBlock'
import PartnerDetailTabs from '@/components/PartnerDetailTabs'
import PartnerProdukteTab, { type SortimentEintrag, type EinsatzEintrag } from '@/components/PartnerProdukteTab'
import PartnerKontakteBlock from '@/components/PartnerKontakteBlock'
import PartnerAltNotizBanner from '@/components/PartnerAltNotizBanner'
import { vertraegeAbrufen } from '@/app/actions/partner-vertraege'
import {
  ExternalLink, Mail, Phone, Smartphone, Globe, Star, MapPin, BadgeCheck,
  ShoppingCart, Truck, Banknote, Users, TrendingUp, Percent, Coins, Wallet, Package,
} from 'lucide-react'

const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)

const partnerTypLabel: Record<string, string> = {
  lieferant:   'Lieferant',
  hersteller:  'Hersteller',
  handwerker:  'Handwerker',
  planer:      'Planer',
  sonstiges:   'Sonstiges',
}

async function getPartnerNotizen(partnerId: string): Promise<Notiz[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('notizen')
    .select('id, inhalt, erstellt_von, erstellt_am, bearbeitet_am')
    .eq('typ', 'partner')
    .eq('referenz_id', partnerId)
    .is('deleted_at', null)
    .order('erstellt_am', { ascending: false })
  return (data ?? []) as Notiz[]
}

export default async function PartnerDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  // Partner zuerst laden – brauchen wir für die Folge-Queries (insb. RLS-Sicht)
  const { data: partner } = await supabase
    .from('partner')
    .select('*')
    .eq('id', params.id)
    .is('deleted_at', null)
    .single()
  if (!partner) notFound()

  // Bibliotheks-Produkte dieses Partners (Sortiment-Basis)
  const { data: produkte } = await supabase
    .from('produkte')
    .select('id, name, artikelnummer, einheit, verkaufspreis, einkaufspreis, marge_prozent, provision_prozent, provision_typ, provision_fix, einkaufsrabatt_prozent, bilder_urls')
    .eq('partner_id', params.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  type ProduktBasis = {
    id: string
    name: string
    artikelnummer: string | null
    einheit: string | null
    verkaufspreis: number | null
    einkaufspreis: number | null
    marge_prozent: number | null
    provision_prozent: number | null
    provision_typ: 'prozent' | 'fix' | null
    provision_fix: number | null
    einkaufsrabatt_prozent: number | null
    bilder_urls: string[] | null
  }
  const produkteBasis = (produkte ?? []) as ProduktBasis[]
  const produktIds   = produkteBasis.map((p) => p.id)

  // Alle raum_produkte-Einsätze für diese Produkte (Einsatz-Basis)
  type RpRow = {
    id: string
    produkt_id: string
    menge: number
    verkaufspreis_override: number | null
    rabatt_prozent: number | null
    bestellstatus: 'ausstehend' | 'bestellt' | 'geliefert' | 'rechnung_erhalten'
    freigabe_status: 'ausstehend' | 'freigegeben' | 'abgelehnt' | 'ueberarbeitung'
    raeume: {
      id: string
      name: string
      deleted_at: string | null
      projekte: { id: string; name: string; deleted_at: string | null } | null
    } | null
  }
  const { data: rpRows } = produktIds.length > 0
    ? await supabase
        .from('raum_produkte')
        .select('id, produkt_id, menge, verkaufspreis_override, rabatt_prozent, bestellstatus, freigabe_status, raeume!inner(id, name, deleted_at, projekte!inner(id, name, deleted_at))')
        .in('produkt_id', produktIds)
    : { data: [] as RpRow[] }
  const einsatzRaw = ((rpRows ?? []) as unknown as RpRow[]).filter(
    (e) => e.raeume && !e.raeume.deleted_at && e.raeume.projekte && !e.raeume.projekte.deleted_at,
  )

  // Notizen / Konditionen / Verträge / Kontakte parallel
  const [notizen, konditionen, vertraege, kontakte, kategorienDB] = await Promise.all([
    getPartnerNotizen(params.id),
    getPartnerKonditionen(params.id),
    vertraegeAbrufen(params.id),
    getPartnerKontakte(params.id),
    getKategorien('produktkategorie'),
  ])
  const hauptkontakt = kontakte.find((k) => k.ist_hauptkontakt) ?? kontakte[0] ?? null

  // ── KPI-Aggregate ────────────────────────────────────────────
  // VP-Effektiv pro Einsatz (override → rabatt) * menge — nur für „bestellt+"
  const aktiveStatus = ['bestellt', 'geliefert', 'rechnung_erhalten'] as const
  type AktiverStatus = (typeof aktiveStatus)[number]
  const istAktiv = (s: string): s is AktiverStatus => (aktiveStatus as readonly string[]).includes(s)
  const istGeliefert = (s: string) => s === 'geliefert' || s === 'rechnung_erhalten'

  const produktById = new Map(produkteBasis.map((p) => [p.id, p]))
  function effPreis(rp: RpRow): number {
    const basis = rp.verkaufspreis_override ?? produktById.get(rp.produkt_id)?.verkaufspreis ?? 0
    const rabatt = rp.rabatt_prozent ?? 0
    return Math.round(basis * (1 - rabatt / 100) * 100) / 100
  }

  let bestellterUmsatz = 0
  let aktiveBestellungen = 0
  let offeneLieferungen = 0
  let einkaufVolumen = 0
  let provisionGesamt = 0
  for (const rp of einsatzRaw) {
    if (istAktiv(rp.bestellstatus)) {
      const vp   = effPreis(rp)
      const prod = produktById.get(rp.produkt_id)
      const ekEff = einkaufNettoNachRabatt(prod?.einkaufspreis ?? 0, prod?.einkaufsrabatt_prozent ?? null)
      bestellterUmsatz   += vp * rp.menge
      einkaufVolumen     += ekEff * rp.menge
      provisionGesamt    += provisionBetrag(
        { provision_typ: prod?.provision_typ ?? null, provision_prozent: prod?.provision_prozent ?? null, provision_fix: prod?.provision_fix ?? null },
        vp,
      ) * rp.menge
      aktiveBestellungen += 1
      if (!istGeliefert(rp.bestellstatus)) offeneLieferungen += 1
    }
  }
  const r2 = (n: number) => Math.round(n * 100) / 100
  bestellterUmsatz = r2(bestellterUmsatz)
  einkaufVolumen   = r2(einkaufVolumen)
  provisionGesamt  = r2(provisionGesamt)
  const margeGesamt  = r2(bestellterUmsatz - einkaufVolumen)
  const ertragGesamt = r2(margeGesamt + provisionGesamt)
  const produkteAnzahl = produkteBasis.length

  // ── Sortiment-Liste ──────────────────────────────────────────
  type Agg = { raumIds: Set<string>; menge: number; bestellt: number; geliefert: number }
  const agg = new Map<string, Agg>()
  for (const rp of einsatzRaw) {
    const cur = agg.get(rp.produkt_id) ?? { raumIds: new Set(), menge: 0, bestellt: 0, geliefert: 0 }
    if (rp.raeume) cur.raumIds.add(rp.raeume.id)
    cur.menge += rp.menge
    if (istAktiv(rp.bestellstatus))   cur.bestellt  += 1
    if (istGeliefert(rp.bestellstatus)) cur.geliefert += 1
    agg.set(rp.produkt_id, cur)
  }
  const sortiment: SortimentEintrag[] = produkteBasis.map((p) => {
    const a = agg.get(p.id) ?? { raumIds: new Set(), menge: 0, bestellt: 0, geliefert: 0 }
    return {
      id:            p.id,
      name:          p.name,
      artikelnummer: p.artikelnummer,
      bild_url:      (p.bilder_urls && p.bilder_urls.length > 0) ? p.bilder_urls[0] : null,
      einheit:       p.einheit ?? 'Stk.',
      verkaufspreis: p.verkaufspreis,
      raumCount:     a.raumIds.size,
      mengeGesamt:   a.menge,
      bestellt:      a.bestellt,
      geliefert:     a.geliefert,
    }
  })

  // ── Einsatz-Liste ────────────────────────────────────────────
  const einsatz: EinsatzEintrag[] = einsatzRaw
    .map((rp) => {
      const p = produktById.get(rp.produkt_id)
      if (!p || !rp.raeume?.projekte) return null
      return {
        raumProduktId:  rp.id,
        produktId:      rp.produkt_id,
        produktName:    p.name,
        artikelnummer:  p.artikelnummer,
        bild_url:       (p.bilder_urls && p.bilder_urls.length > 0) ? p.bilder_urls[0] : null,
        projektId:      rp.raeume.projekte.id,
        projektName:    rp.raeume.projekte.name,
        raumId:         rp.raeume.id,
        raumName:       rp.raeume.name,
        einheit:        p.einheit ?? 'Stk.',
        menge:          rp.menge,
        preisEffektiv:  effPreis(rp),
        bestellstatus:  rp.bestellstatus,
        freigabeStatus: rp.freigabe_status,
      } as EinsatzEintrag
    })
    .filter((e): e is EinsatzEintrag => e != null)
    .sort((a, b) => a.projektName.localeCompare(b.projektName) || a.raumName.localeCompare(b.raumName))

  const loeschenAktion = partnerSoftDelete.bind(null, partner.id)
  const bewertung      = partner.bewertung as number | null

  // ── UI ───────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-6 animate-fadeIn">
      {/* Breadcrumb + Header (analog zu Kunde / Raum: kompakt, kein font-syne) */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <LogoUpload typ="partner" entityId={partner.id} initialLogoUrl={partner.logo_url} name={partner.name} />
          <div className="min-w-0">
            <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
              <Link href="/dashboard/partner" className="hover:text-wellbeing-green transition-colors">Partner</Link>
              <span>›</span>
              <span className="text-gray-600 truncate">{partner.name}</span>
            </nav>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-semibold text-gray-900 leading-tight">{partner.name}</h1>
              {partner.partner_typ && (
                <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                  {partnerTypLabel[partner.partner_typ] ?? partner.partner_typ}
                </span>
              )}
              {bewertung != null && bewertung > 0 && (
                <div className="flex items-center gap-0.5" title={`${bewertung} von 5`}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3 h-3 ${s <= bewertung ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-x-4 gap-y-1 mt-1 flex-wrap text-[12px] text-gray-500">
              {partner.website && (
                <a href={partner.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-wellbeing-green transition-colors">
                  <Globe className="w-3 h-3" />
                  {partner.website.replace(/^https?:\/\/(www\.)?/, '')}
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/partner/${partner.id}/bearbeiten`}
            className="px-4 py-2 text-xs font-medium text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:scale-[1.02] rounded-lg transition-all duration-200">
            Bearbeiten
          </Link>
          <ConfirmDeleteButton action={loeschenAktion} confirmMessage={`„${partner.name}" wirklich löschen?`} />
        </div>
      </div>

      {/* Auswertung — Wirtschaftlichkeit + Operatives (nur intern) */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2 px-0.5">Auswertung · nur intern</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <KpiKarte icon={<Banknote className="w-4 h-4" />}     tone="emerald" label="Bestellter Umsatz"   wert={bestellterUmsatz > 0 ? eur(bestellterUmsatz) : '–'} subLabel="VK netto · bestellt + geliefert" />
          <KpiKarte icon={<Wallet className="w-4 h-4" />}       tone="slate"   label="Einkaufsvolumen"     wert={einkaufVolumen > 0 ? eur(einkaufVolumen) : '–'}     subLabel="EK netto · an Partner" />
          <KpiKarte icon={<Percent className="w-4 h-4" />}      tone="blue"    label="Marge"               wert={margeGesamt !== 0 ? eur(margeGesamt) : '–'}         subLabel="Umsatz − Einkauf" />
          <KpiKarte icon={<Coins className="w-4 h-4" />}        tone="violet"  label="Provision"           wert={provisionGesamt > 0 ? eur(provisionGesamt) : '–'}   subLabel="Trade-Provision" />
          <KpiKarte icon={<TrendingUp className="w-4 h-4" />}   tone="green"   label="Ertrag gesamt"       wert={ertragGesamt !== 0 ? eur(ertragGesamt) : '–'}       subLabel="Marge + Provision" />
          <KpiKarte icon={<ShoppingCart className="w-4 h-4" />} tone="amber"   label="Aktive Bestellungen" wert={aktiveBestellungen}                                subLabel="Positionen ≥ bestellt" />
          <KpiKarte icon={<Truck className="w-4 h-4" />}        tone="blue"    label="Offene Lieferungen"  wert={offeneLieferungen}                                 subLabel="noch nicht geliefert" />
          <KpiKarte icon={<Package className="w-4 h-4" />}      tone="slate"   label="Produkte"            wert={produkteAnzahl}                                    subLabel="im Sortiment" />
        </div>
      </div>

      {/* Tabs */}
      <PartnerDetailTabs
        badgeKontakte={kontakte.length}
        badgeKonditionen={konditionen.length}
        badgeVertraege={vertraege.length}
        badgeProdukte={einsatz.length}
        uebersicht={
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Linke Spalte: Hauptkontakt + Firmen-Daten */}
            <div className="space-y-4">
              {/* Hauptkontakt-Mini-Karte */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Hauptkontakt</h2>
                  <Link
                    href={`/dashboard/partner/${partner.id}?tab=kontakte`}
                    className="inline-flex items-center gap-1 text-[11px] text-wellbeing-green hover:text-wellbeing-green-dark"
                  >
                    <Users className="w-3 h-3" />
                    Alle Kontakte ({kontakte.length})
                  </Link>
                </div>
                {hauptkontakt ? (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-wellbeing-green text-white flex items-center justify-center text-sm font-semibold shrink-0">
                      {hauptkontakt.name
                        .trim()
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((t) => t[0])
                        .join('')
                        .toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900 truncate">{hauptkontakt.name}</p>
                        {hauptkontakt.ist_hauptkontakt && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-wellbeing-green-dark bg-wellbeing-green/15 px-1.5 py-0.5 rounded-full">
                            <BadgeCheck className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      {hauptkontakt.rolle && (
                        <p className="text-[11px] text-gray-500 mt-0.5">{hauptkontakt.rolle}</p>
                      )}
                      <div className="mt-2 space-y-1">
                        {hauptkontakt.email && (
                          <a href={`mailto:${hauptkontakt.email}`} className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-wellbeing-green">
                            <Mail className="w-3 h-3 text-gray-400" />{hauptkontakt.email}
                          </a>
                        )}
                        {hauptkontakt.telefon && (
                          <a href={`tel:${hauptkontakt.telefon}`} className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-wellbeing-green">
                            <Phone className="w-3 h-3 text-gray-400" />{hauptkontakt.telefon}
                          </a>
                        )}
                        {hauptkontakt.mobil && (
                          <a href={`tel:${hauptkontakt.mobil}`} className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-wellbeing-green">
                            <Smartphone className="w-3 h-3 text-gray-400" />{hauptkontakt.mobil}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <p className="text-xs text-gray-500 mb-2">Noch keine Kontaktperson hinterlegt.</p>
                    <Link
                      href={`/dashboard/partner/${partner.id}?tab=kontakte`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-wellbeing-green hover:bg-wellbeing-green-dark rounded-lg transition-colors"
                    >
                      <Users className="w-3.5 h-3.5" />
                      Kontakt anlegen
                    </Link>
                  </div>
                )}
              </div>

              {/* Firmen-Daten */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Firma</h2>
                <dl className="space-y-3">
                  {partner.website && (
                    <div>
                      <dt className="text-xs text-gray-400 mb-0.5">Website</dt>
                      <dd>
                        <a href={partner.website} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-wellbeing-green transition-colors">
                          <Globe className="w-3.5 h-3.5 text-gray-400" />
                          {partner.website.replace(/^https?:\/\/(www\.)?/, '')}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </dd>
                    </div>
                  )}
                  {partner.ust_id && (
                    <div>
                      <dt className="text-xs text-gray-400 mb-0.5">USt-IdNr.</dt>
                      <dd className="text-sm text-gray-700 font-mono">{partner.ust_id}</dd>
                    </div>
                  )}
                  {partner.iban && (
                    <div>
                      <dt className="text-xs text-gray-400 mb-0.5">IBAN</dt>
                      <dd className="text-sm text-gray-700 font-mono tracking-wide">{partner.iban}</dd>
                    </div>
                  )}
                  {partner.zahlungsziel_tage != null && (
                    <div>
                      <dt className="text-xs text-gray-400 mb-0.5">Zahlungsziel</dt>
                      <dd className="text-sm text-gray-700">{partner.zahlungsziel_tage} Tage</dd>
                    </div>
                  )}
                  {partner.adresse && (
                    <div>
                      <dt className="text-xs text-gray-400 mb-0.5">Adresse</dt>
                      <dd className="flex items-start gap-1.5 text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                        <span>{partner.adresse}</span>
                      </dd>
                    </div>
                  )}
                  {!partner.website && !partner.ust_id && !partner.iban && !partner.adresse && partner.zahlungsziel_tage == null && (
                    <p className="text-sm text-gray-400">Keine Firmen-Daten hinterlegt.</p>
                  )}
                </dl>
              </div>
            </div>

            {/* Rechte Spalte: Notizen + Einkaufskonditionen + Alt-Notiz-Banner */}
            <div className="space-y-4">
              {partner.einkaufskonditionen && (
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Einkaufskonditionen</h2>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{partner.einkaufskonditionen}</p>
                </div>
              )}
              {partner.notizen && (
                <PartnerAltNotizBanner partnerId={partner.id} inhalt={partner.notizen} />
              )}
              <NotizBlock typ="partner" referenzId={partner.id} initialNotizen={notizen} />
            </div>
          </div>
        }
        kontakte={
          <PartnerKontakteBlock partnerId={partner.id} initialKontakte={kontakte} />
        }
        konditionen={
          <PartnerKonditionenBlock partnerId={partner.id} initialKonditionen={konditionen} kategorien={kategorienDB.map((k) => ({ name: k.name }))} />
        }
        vertraege={
          <PartnerVertraegeBlock partnerId={partner.id} initialVertraege={vertraege} />
        }
        produkte={
          <PartnerProdukteTab
            partnerId={partner.id}
            sortiment={sortiment}
            einsatz={einsatz}
          />
        }
      />
    </div>
  )
}

// ── KPI-Karte (analog KundeStatsBand) ───────────────────────
type KpiTone = 'emerald' | 'amber' | 'blue' | 'slate' | 'violet' | 'green'
const KPI_TONE: Record<KpiTone, { iconBg: string; iconText: string }> = {
  emerald: { iconBg: 'bg-emerald-50', iconText: 'text-emerald-600' },
  amber:   { iconBg: 'bg-amber-50',   iconText: 'text-amber-600' },
  blue:    { iconBg: 'bg-blue-50',    iconText: 'text-blue-600' },
  slate:   { iconBg: 'bg-slate-100',  iconText: 'text-slate-600' },
  violet:  { iconBg: 'bg-violet-50',  iconText: 'text-violet-600' },
  green:   { iconBg: 'bg-wellbeing-green/10', iconText: 'text-wellbeing-green' },
}

function KpiKarte({
  icon, label, wert, subLabel, tone = 'emerald',
}: {
  icon:      React.ReactNode
  label:     string
  wert:      string | number
  subLabel?: string
  tone?:     KpiTone
}) {
  const t = KPI_TONE[tone]
  return (
    <div className="bg-white border border-gray-200 hover:border-wellbeing-green/40 hover:shadow rounded-xl px-4 py-3 flex items-center gap-3 transition-all">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${t.iconBg} ${t.iconText}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider leading-none">{label}</p>
        <p className="text-2xl font-semibold text-gray-900 leading-tight mt-1 tabular-nums">{wert}</p>
        {subLabel && <p className="text-[11px] text-gray-500 truncate">{subLabel}</p>}
      </div>
    </div>
  )
}
