import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BestellungNeuClient, { type ProduktKandidat, type PartnerOption, type OffeneBestellung } from './BestellungNeuClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Props {
  searchParams: { partner_id?: string }
}

async function getKandidaten(partnerId: string): Promise<ProduktKandidat[]> {
  const supabase = await createClient()
  const lade = (extra: string) => supabase
    .from('raum_produkte')
    .select(`
      id, menge,
      produkte!inner(id, name, bild_url, partner_id, einheit, einkaufspreis${extra}, verkaufspreis),
      raeume(id, name, projekt_id, projekte(name))
    `)
    .eq('produkte.partner_id', partnerId)
    .eq('freigabe_status', 'freigegeben')
    .eq('bestellstatus', 'ausstehend')
    // raum_produkte hat KEINE deleted_at-Spalte (Hard-Delete, Mig 101) → nicht filtern.
  // Fail-safe: einkaufsrabatt_prozent (Migration 120) ggf. noch nicht vorhanden.
  let res = await lade(', einkaufsrabatt_prozent')
  if (res.error) res = await lade('')
  const data = res.data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((rp) => ({
    raum_produkt_id: rp.id,
    menge:           rp.menge ?? 1,
    produkt: {
      id:            rp.produkte.id,
      name:          rp.produkte.name,
      bild_url:      rp.produkte.bild_url,
      einheit:       rp.produkte.einheit ?? 'Stk',
      einkaufspreis: rp.produkte.einkaufspreis,
      einkaufsrabatt_prozent: rp.produkte.einkaufsrabatt_prozent ?? null,
      verkaufspreis: rp.produkte.verkaufspreis,
    },
    raum: rp.raeume ? {
      id:           rp.raeume.id,
      name:         rp.raeume.name,
      projekt_id:   rp.raeume.projekt_id,
      projekt_name: rp.raeume.projekte?.name ?? null,
    } : null,
  }))
}

async function getPartnerListe(): Promise<PartnerOption[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('partner')
    .select('id, name')
    .is('deleted_at', null)
    .order('name')
  return (data ?? []) as PartnerOption[]
}

async function getOffeneBestellungen(partnerId: string): Promise<OffeneBestellung[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('lieferanten_bestellungen')
    .select('id, bestellnummer, status, gesamtpreis_netto')
    .eq('partner_id', partnerId)
    .in('status', ['entwurf', 'bestaetigt'])
    .order('created_at', { ascending: false })
  return (data ?? []) as OffeneBestellung[]
}

export default async function NeueBestellungPage({ searchParams }: Props) {
  if (!searchParams.partner_id) {
    // Ohne Partner-Param: zur Bestellungen-Übersicht zurück, dort kann er Lieferant wählen
    redirect('/dashboard/bestellungen')
  }
  const [kandidaten, partner, offen] = await Promise.all([
    getKandidaten(searchParams.partner_id),
    getPartnerListe(),
    getOffeneBestellungen(searchParams.partner_id),
  ])
  const aktiverPartner = partner.find((p) => p.id === searchParams.partner_id) ?? null

  return (
    <BestellungNeuClient
      partner={partner}
      aktiverPartner={aktiverPartner}
      kandidaten={kandidaten}
      offeneBestellungen={offen}
    />
  )
}
