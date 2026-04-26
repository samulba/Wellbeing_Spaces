import { createClient } from '@/lib/supabase/server'
import { Package } from 'lucide-react'
import ProdukteTabelle, { type ProduktZeile } from '@/components/ProdukteTabelle'
import NeuesProduktModal from '@/components/NeuesProduktModal'
import StickyPageHeader from '@/components/StickyPageHeader'
import type { KategorieOption } from '@/components/KategorieDropdown'
import type { ProjektOption, RaumOption } from '@/components/ProduktZuweisenModal'
import { getMwstSatz, getKategorien } from '@/app/actions/einstellungen'

async function getProdukte(): Promise<ProduktZeile[]> {
  const supabase = await createClient()

  const [{ data: prodData }, { data: partnerData }, { data: raumProdData }] = await Promise.all([
    supabase
      .from('produkte')
      .select('id, name, kategorie, menge, einheit, verkaufspreis, bild_url, produkt_url, partner_id')
      .is('deleted_at', null)
      .order('name'),
    supabase.from('partner').select('id, name').is('deleted_at', null),
    supabase.from('raum_produkte').select('produkt_id, bestellstatus'),
  ])

  const partnerMap = Object.fromEntries((partnerData ?? []).map((p) => [p.id, p]))

  // Anzahl Räume + Anzahl erfolgreich gelieferte raum_produkte pro Produkt
  const raumAnzahlMap: Record<string, number> = {}
  const geliefertMap: Record<string, number> = {}
  for (const rp of raumProdData ?? []) {
    raumAnzahlMap[rp.produkt_id] = (raumAnzahlMap[rp.produkt_id] ?? 0) + 1
    if (rp.bestellstatus === 'geliefert' || rp.bestellstatus === 'rechnung_erhalten') {
      geliefertMap[rp.produkt_id] = (geliefertMap[rp.produkt_id] ?? 0) + 1
    }
  }

  return (prodData ?? []).map((p) => {
    const partner = p.partner_id ? partnerMap[p.partner_id] : null
    return {
      id:                 p.id,
      name:               p.name,
      kategorie:          p.kategorie,
      menge:              p.menge,
      einheit:            p.einheit,
      verkaufspreis:      p.verkaufspreis,
      bild_url:           p.bild_url,
      produkt_url:        p.produkt_url,
      partnerName:        partner?.name ?? null,
      partnerId:          p.partner_id,
      raumId:             null,
      raumName:           null,
      projektId:          null,
      projektName:        null,
      kundeName:          null,
      verwendetInAnzahl:  raumAnzahlMap[p.id] ?? 0,
      gelieferteAnzahl:   geliefertMap[p.id] ?? 0,
    }
  })
}

async function getProjekteMitRaeumen(): Promise<{ projekte: ProjektOption[]; raeume: RaumOption[] }> {
  const supabase = await createClient()
  const [{ data: projData }, { data: raumData }] = await Promise.all([
    supabase.from('projekte').select('id, name').is('deleted_at', null).order('name'),
    supabase.from('raeume').select('id, name, projekt_id').is('deleted_at', null).order('name'),
  ])
  return {
    projekte: (projData ?? []) as ProjektOption[],
    raeume:   (raumData ?? []) as RaumOption[],
  }
}

export default async function ProdukteSeite() {
  const [produkte, kategorienRoh, { projekte, raeume }, mwst] = await Promise.all([
    getProdukte(),
    getKategorien('produktkategorie'),
    getProjekteMitRaeumen(),
    getMwstSatz(),
  ])
  const kategorienListe: KategorieOption[] = kategorienRoh.map((k) => ({ name: k.name, icon: k.icon }))

  return (
    <div className="flex-1 overflow-y-auto animate-fadeIn">
      <StickyPageHeader
        title="Produkte"
        count={produkte.length}
        countLabel={produkte.length === 1 ? 'Produkt in der Bibliothek' : 'Produkte in der Bibliothek'}
        action={<NeuesProduktModal />}
      />
      <div className="px-6 py-6">
        {produkte.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-wellbeing-cream flex items-center justify-center">
              <Package className="w-7 h-7 text-wellbeing-green-light" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">Noch keine Produkte angelegt</p>
              <p className="text-xs text-gray-400 mt-1">Lege Produkte in einem Projekt → Raum an oder füge zur Bibliothek hinzu.</p>
            </div>
            <NeuesProduktModal />
          </div>
        ) : (
          <ProdukteTabelle produkte={produkte} kategorienListe={kategorienListe} projekte={projekte} raeume={raeume} mwst={mwst} />
        )}
      </div>
    </div>
  )
}
