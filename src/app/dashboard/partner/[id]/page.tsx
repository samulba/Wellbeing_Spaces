import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { partnerSoftDelete, getPartnerKonditionen } from '@/app/actions/partner'
import ConfirmDeleteButton from '@/components/ConfirmDeleteButton'
import NotizBlock, { type Notiz } from '@/components/NotizBlock'
import LogoUpload from '@/components/LogoUpload'
import PartnerKonditionenBlock from '@/components/PartnerKonditionenBlock'
import PartnerVertraegeBlock from '@/components/PartnerVertraegeBlock'
import PartnerDetailTabs from '@/components/PartnerDetailTabs'
import PartnerProdukteTab, { type SortimentEintrag, type EinsatzEintrag } from '@/components/PartnerProdukteTab'
import PartnerAltNotizBanner from '@/components/PartnerAltNotizBanner'
import { vertraegeAbrufen } from '@/app/actions/partner-vertraege'
import {
  ExternalLink, Mail, Phone, Globe, Star, MapPin,
  ShoppingCart, Truck, Banknote,
} from 'lucide-react'

const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)

const modellBadge: Record<string, string> = {
  Prozent:     'bg-wellbeing-cream text-wellbeing-green-dark',
  Fix:         'bg-emerald-50 text-emerald-700',
  Individuell: 'bg-gray-100 text-gray-600',
}

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
    .select('id, name, artikelnummer, einheit, verkaufspreis, bilder_urls')
    .eq('partner_id', params.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  type ProduktBasis = {
    id: string
    name: string
    artikelnummer: string | null
    einheit: string | null
    verkaufspreis: number | null
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

  // Notizen / Konditionen / Verträge parallel
  const [notizen, konditionen, vertraege] = await Promise.all([
    getPartnerNotizen(params.id),
    getPartnerKonditionen(params.id),
    vertraegeAbrufen(params.id),
  ])

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
  for (const rp of einsatzRaw) {
    if (istAktiv(rp.bestellstatus)) {
      bestellterUmsatz   += effPreis(rp) * rp.menge
      aktiveBestellungen += 1
      if (!istGeliefert(rp.bestellstatus)) offeneLieferungen += 1
    }
  }

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
    <div className="flex-1 overflow-y-auto px-6 py-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-5">
          <LogoUpload typ="partner" entityId={partner.id} initialLogoUrl={partner.logo_url} name={partner.name} />
          <div>
            <Link href="/dashboard/partner" className="text-xs text-gray-400 hover:text-wellbeing-green transition-colors mb-1 inline-block">
              ← Partner
            </Link>
            <h1 className="font-syne text-2xl font-bold text-gray-900 leading-tight">{partner.name}</h1>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {partner.partner_typ && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                  {partnerTypLabel[partner.partner_typ] ?? partner.partner_typ}
                </span>
              )}
              {partner.website && (
                <a href={partner.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-wellbeing-green transition-colors">
                  <Globe className="w-3.5 h-3.5" />
                  {partner.website.replace(/^https?:\/\/(www\.)?/, '')}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {partner.provisionsmodell && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${modellBadge[partner.provisionsmodell] ?? 'bg-gray-100 text-gray-600'}`}>
                  {partner.provisionsmodell}
                  {partner.provisions_wert != null && partner.provisionsmodell === 'Prozent' && ` · ${partner.provisions_wert} %`}
                  {partner.provisions_wert != null && partner.provisionsmodell === 'Fix' && ` · ${eur(partner.provisions_wert)}`}
                </span>
              )}
              {bewertung != null && bewertung > 0 && (
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${s <= bewertung ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`}
                    />
                  ))}
                </div>
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

      {/* KPI-Kacheln (3 nützliche statt Provisionsmodell+Satz dupliziert) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KpiKarte
          icon={<Banknote className="w-4 h-4" />}
          tone="emerald"
          label="Bestellter Umsatz"
          value={bestellterUmsatz > 0 ? eur(bestellterUmsatz) : '–'}
          hint={'Nur Positionen mit Bestellstatus „bestellt", „geliefert" oder „Rechnung erhalten".'}
        />
        <KpiKarte
          icon={<ShoppingCart className="w-4 h-4" />}
          tone="amber"
          label="Aktive Bestellungen"
          value={aktiveBestellungen}
          hint="Anzahl Positionen, die mindestens als bestellt markiert sind."
        />
        <KpiKarte
          icon={<Truck className="w-4 h-4" />}
          tone="blue"
          label="Offene Lieferungen"
          value={offeneLieferungen}
          hint="Bestellt, aber noch nicht geliefert oder Rechnung erhalten."
        />
      </div>

      {/* Tabs */}
      <PartnerDetailTabs
        badgeKonditionen={konditionen.length}
        badgeVertraege={vertraege.length}
        badgeProdukte={einsatz.length}
        uebersicht={
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Kontakt */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Kontakt</h2>
              <dl className="space-y-3">
                {partner.ansprechpartner && (
                  <div>
                    <dt className="text-xs text-gray-400 mb-0.5">Ansprechpartner</dt>
                    <dd className="text-sm text-gray-800 font-medium">{partner.ansprechpartner}</dd>
                  </div>
                )}
                {partner.email && (
                  <div>
                    <dt className="text-xs text-gray-400 mb-0.5">E-Mail</dt>
                    <dd>
                      <a href={`mailto:${partner.email}`} className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-wellbeing-green transition-colors">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />{partner.email}
                      </a>
                    </dd>
                  </div>
                )}
                {partner.telefon && (
                  <div>
                    <dt className="text-xs text-gray-400 mb-0.5">Telefon</dt>
                    <dd>
                      <a href={`tel:${partner.telefon}`} className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-wellbeing-green transition-colors">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />{partner.telefon}
                      </a>
                    </dd>
                  </div>
                )}
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
                {!partner.ansprechpartner && !partner.email && !partner.telefon && !partner.ust_id && !partner.iban && !partner.adresse && (
                  <p className="text-sm text-gray-400">Keine Kontaktdaten hinterlegt.</p>
                )}
              </dl>
            </div>

            {/* Notizen + Einkaufskonditionen + Alt-Notiz-Banner */}
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
        konditionen={
          <PartnerKonditionenBlock partnerId={partner.id} initialKonditionen={konditionen} />
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

// ── KPI-Karte ───────────────────────────────────────────────
type KpiTone = 'emerald' | 'amber' | 'blue'
const KPI_TONE: Record<KpiTone, { iconBg: string; iconText: string; valueText: string }> = {
  emerald: { iconBg: 'bg-emerald-50', iconText: 'text-emerald-600', valueText: 'text-wellbeing-green' },
  amber:   { iconBg: 'bg-amber-50',   iconText: 'text-amber-600',   valueText: 'text-amber-700' },
  blue:    { iconBg: 'bg-blue-50',    iconText: 'text-blue-600',    valueText: 'text-blue-700' },
}

function KpiKarte({
  icon, label, value, hint, tone = 'emerald',
}: {
  icon:  React.ReactNode
  label: string
  value: string | number
  hint?: string
  tone?: KpiTone
}) {
  const t = KPI_TONE[tone]
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-start gap-3 mb-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${t.iconBg} ${t.iconText}`}>
          {icon}
        </div>
        <p className="text-xs text-gray-500 uppercase tracking-widest font-medium leading-tight pt-1">
          {label}
        </p>
      </div>
      <p className={`text-2xl font-semibold font-mono leading-tight ${t.valueText}`}>{value}</p>
      {hint && <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">{hint}</p>}
    </div>
  )
}
