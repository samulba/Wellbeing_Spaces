import { createClient } from '@/lib/supabase/server'
import { getBestellungen, getLieferuebersicht } from '@/app/actions/lieferanten-bestellungen'
import { getReklamationen } from '@/app/actions/reklamationen'
import StickyPageHeader from '@/components/StickyPageHeader'
import BestellungenClient, { type ZuBestellendesProdukt, type ReklamationMitProduktInfo } from './BestellungenClient'
import type { BestellStatus } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/** Produkte mit freigabe_status='freigegeben' und bestellstatus='ausstehend' (oder null) */
async function getZuBestellendeProdukte(): Promise<ZuBestellendesProdukt[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('raum_produkte')
    .select(`
      id, menge, bestellstatus, freigabe_status, liefertermin,
      produkte(id, name, bild_url, partner_id, einheit, verkaufspreis, einkaufspreis, partner(id, name)),
      raeume(id, name, projekt_id, projekte(id, name, kunden(name)))
    `)
    .eq('freigabe_status', 'freigegeben')
    .eq('bestellstatus', 'ausstehend')
    // raum_produkte hat KEINE deleted_at-Spalte (Hard-Delete, Mig 101) → nicht filtern.

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((rp) => ({
    raum_produkt_id: rp.id,
    menge: rp.menge ?? 1,
    liefertermin: rp.liefertermin,
    produkt: rp.produkte ? {
      id: rp.produkte.id,
      name: rp.produkte.name,
      bild_url: rp.produkte.bild_url,
      partner_id: rp.produkte.partner_id,
      partner_name: rp.produkte.partner?.name ?? null,
      einheit: rp.produkte.einheit ?? 'Stk',
      verkaufspreis: rp.produkte.verkaufspreis,
      einkaufspreis: rp.produkte.einkaufspreis,
    } : null,
    raum: rp.raeume ? {
      id: rp.raeume.id,
      name: rp.raeume.name,
      projekt_id: rp.raeume.projekt_id,
      projekt_name: rp.raeume.projekte?.name ?? null,
      kunde_name: rp.raeume.projekte?.kunden?.name ?? null,
    } : null,
  })).filter((x) => x.produkt && x.raum) as ZuBestellendesProdukt[]
}

/** Anstehende Lieferungen — bestellt + liefertermin in den naechsten 7 Tagen */
async function getAnstehendeLieferungen(): Promise<ZuBestellendesProdukt[]> {
  const supabase = await createClient()
  const heute = new Date().toISOString().split('T')[0]
  const in7tagen = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  const { data } = await supabase
    .from('raum_produkte')
    .select(`
      id, menge, bestellstatus, liefertermin,
      produkte(id, name, bild_url, partner_id, einheit, partner(id, name)),
      raeume(id, name, projekt_id, projekte(id, name, kunden(name)))
    `)
    .in('bestellstatus', ['bestellt' as BestellStatus, 'teilgeliefert' as BestellStatus])
    .gte('liefertermin', heute)
    .lte('liefertermin', in7tagen)
    // raum_produkte hat KEINE deleted_at-Spalte (Hard-Delete, Mig 101) → nicht filtern.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((rp) => ({
    raum_produkt_id: rp.id,
    menge: rp.menge ?? 1,
    liefertermin: rp.liefertermin,
    produkt: rp.produkte ? {
      id: rp.produkte.id,
      name: rp.produkte.name,
      bild_url: rp.produkte.bild_url,
      partner_id: rp.produkte.partner_id,
      partner_name: rp.produkte.partner?.name ?? null,
      einheit: rp.produkte.einheit ?? 'Stk',
      verkaufspreis: null,
      einkaufspreis: null,
    } : null,
    raum: rp.raeume ? {
      id: rp.raeume.id,
      name: rp.raeume.name,
      projekt_id: rp.raeume.projekt_id,
      projekt_name: rp.raeume.projekte?.name ?? null,
      kunde_name: rp.raeume.projekte?.kunden?.name ?? null,
    } : null,
  })).filter((x) => x.produkt && x.raum) as ZuBestellendesProdukt[]
}

async function getReklamationenMitProduktInfo(): Promise<ReklamationMitProduktInfo[]> {
  const reks = await getReklamationen()
  if (reks.length === 0) return []
  const supabase = await createClient()
  const ids = reks.map((r) => r.raum_produkte_id)
  const { data } = await supabase
    .from('raum_produkte')
    .select(`
      id,
      produkte(id, name, bild_url),
      raeume(id, name, projekt_id, projekte(id, name, kunden(name)))
    `)
    .in('id', ids)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map = new Map<string, any>(((data ?? []) as any[]).map((rp) => [rp.id, rp]))
  return reks.map((r) => {
    const rp = map.get(r.raum_produkte_id)
    return {
      ...r,
      produkt_name:  rp?.produkte?.name ?? 'Unbekannt',
      produkt_bild:  rp?.produkte?.bild_url ?? null,
      raum_name:     rp?.raeume?.name ?? null,
      projekt_id:    rp?.raeume?.projekt_id ?? null,
      projekt_name:  rp?.raeume?.projekte?.name ?? null,
      kunde_name:    rp?.raeume?.projekte?.kunden?.name ?? null,
    } as ReklamationMitProduktInfo
  })
}

export default async function BestellungenPage() {
  const [zuBestellen, anstehend, alleBestellungen, reklamationen, lieferuebersicht] = await Promise.all([
    getZuBestellendeProdukte(),
    getAnstehendeLieferungen(),
    getBestellungen(),
    getReklamationenMitProduktInfo(),
    getLieferuebersicht(),
  ])

  // Bestellungen nach Status filtern
  const unterwegs = alleBestellungen.filter((b) => b.status === 'bestaetigt' || b.status === 'versandt')
  const archiv    = alleBestellungen.filter((b) => b.status === 'geliefert' || b.status === 'storniert')
  const entwuerfe = alleBestellungen.filter((b) => b.status === 'entwurf')

  const offeneReklamationen = reklamationen.filter((r) => r.status !== 'geloest')
  const erledigteReklamationen = reklamationen.filter((r) => r.status === 'geloest')

  return (
    <div className="flex-1 overflow-y-auto animate-fadeIn">
      <StickyPageHeader
        title="Bestellungen"
        count={zuBestellen.length + unterwegs.length + offeneReklamationen.length}
        countLabel="aktive Vorgänge"
        subtitle="Was muss bestellt werden, was kommt unterwegs, wo gibt es Reklamationen."
      />
      <div className="px-6 py-6">
        <BestellungenClient
          zuBestellen={zuBestellen}
          unterwegs={unterwegs}
          entwuerfe={entwuerfe}
          anstehend={anstehend}
          archiv={archiv}
          offeneReklamationen={offeneReklamationen}
          erledigteReklamationen={erledigteReklamationen}
          lieferuebersicht={lieferuebersicht}
        />
      </div>
    </div>
  )
}
