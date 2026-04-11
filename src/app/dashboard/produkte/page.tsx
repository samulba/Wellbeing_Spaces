import { createClient } from '@/lib/supabase/server'
import { Package } from 'lucide-react'
import ProdukteTabelle, { type ProduktZeile } from '@/components/ProdukteTabelle'
import NeuesProduktModal from '@/components/NeuesProduktModal'
import type { ProduktStatus } from '@/lib/supabase/types'
import type { KategorieOption } from '@/components/KategorieDropdown'

async function getProdukte(): Promise<ProduktZeile[]> {
  const supabase = await createClient()

  const [
    { data: prodData },
    { data: raumData },
    { data: projektData },
    { data: kundenData },
    { data: partnerData },
    { data: statusData },
  ] = await Promise.all([
    supabase
      .from('produkte')
      .select('id, name, kategorie, menge, einheit, verkaufspreis, bild_url, produkt_url, raum_id, partner_id')
      .is('deleted_at', null)
      .order('name'),
    supabase.from('raeume').select('id, name, projekt_id').is('deleted_at', null),
    supabase.from('projekte').select('id, name, kunde_id').is('deleted_at', null),
    supabase.from('kunden').select('id, name').is('deleted_at', null),
    supabase.from('partner').select('id, name').is('deleted_at', null),
    supabase.from('produktstatus').select('produkt_id, status'),
  ])

  const raumMap    = Object.fromEntries((raumData    ?? []).map((r) => [r.id, r]))
  const projektMap = Object.fromEntries((projektData ?? []).map((p) => [p.id, p]))
  const kundeMap   = Object.fromEntries((kundenData  ?? []).map((k) => [k.id, k]))
  const partnerMap = Object.fromEntries((partnerData ?? []).map((p) => [p.id, p]))
  const statusMap  = Object.fromEntries((statusData  ?? []).map((s) => [s.produkt_id, s.status as ProduktStatus]))

  return (prodData ?? []).map((p) => {
    const raum    = p.raum_id ? raumMap[p.raum_id] : null
    const projekt = raum ? projektMap[raum.projekt_id] : null
    const kunde   = projekt ? kundeMap[projekt.kunde_id] : null
    const partner = p.partner_id ? partnerMap[p.partner_id] : null

    return {
      id:            p.id,
      name:          p.name,
      kategorie:     p.kategorie,
      menge:         p.menge,
      einheit:       p.einheit,
      verkaufspreis: p.verkaufspreis,
      bild_url:      p.bild_url,
      produkt_url:   p.produkt_url,
      partnerName:   partner?.name ?? null,
      partnerId:     p.partner_id,
      raumId:        raum?.id ?? null,
      raumName:      raum?.name ?? null,
      projektId:     projekt?.id ?? null,
      projektName:   projekt?.name ?? null,
      kundeName:     kunde?.name ?? null,
      status:        statusMap[p.id] ?? 'ausstehend',
    }
  })
}

async function getKategorienListe(): Promise<KategorieOption[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('einstellungen')
    .select('wert')
    .eq('schluessel', 'produktkategorien')
    .single()
  if (!data?.wert) return []
  return (data.wert as string)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((raw) => {
      const idx = raw.indexOf('|')
      if (idx === -1) return { name: raw, icon: 'Package' }
      return { name: raw.slice(0, idx).trim(), icon: raw.slice(idx + 1).trim() || 'Package' }
    })
}

export default async function ProdukteSeite() {
  const [produkte, kategorienListe] = await Promise.all([getProdukte(), getKategorienListe()])

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Produkte</h1>
          <p className="text-sm text-gray-500 mt-0.5">{produkte.length} Einträge über alle Projekte</p>
        </div>
        <NeuesProduktModal />
      </div>

      {produkte.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <Package className="w-7 h-7 text-indigo-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">Noch keine Produkte angelegt</p>
            <p className="text-xs text-gray-400 mt-1">Lege Produkte in einem Projekt → Raum an oder füge zur Bibliothek hinzu.</p>
          </div>
          <NeuesProduktModal />
        </div>
      ) : (
        <ProdukteTabelle produkte={produkte} kategorienListe={kategorienListe} />
      )}
    </div>
  )
}
