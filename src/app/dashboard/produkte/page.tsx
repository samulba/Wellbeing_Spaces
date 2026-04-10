import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Package } from 'lucide-react'
import ProdukteTabelle, { type ProduktZeile } from '@/components/ProdukteTabelle'
import type { ProduktStatus } from '@/lib/supabase/types'

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

  return (prodData ?? []).flatMap((p) => {
    const raum    = raumMap[p.raum_id]
    if (!raum) return []
    const projekt = projektMap[raum.projekt_id]
    if (!projekt) return []
    const kunde   = kundeMap[projekt.kunde_id]
    if (!kunde) return []
    const partner = p.partner_id ? partnerMap[p.partner_id] : null

    return [{
      id:           p.id,
      name:         p.name,
      kategorie:    p.kategorie,
      menge:        p.menge,
      einheit:      p.einheit,
      verkaufspreis: p.verkaufspreis,
      bild_url:     p.bild_url,
      produkt_url:  p.produkt_url,
      partnerName:  partner?.name ?? null,
      partnerId:    p.partner_id,
      raumId:       raum.id,
      raumName:     raum.name,
      projektId:    projekt.id,
      projektName:  projekt.name,
      kundeName:    kunde.name,
      status:       statusMap[p.id] ?? 'ausstehend',
    }]
  })
}

export default async function ProdukteSeite() {
  const produkte = await getProdukte()

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Produkte</h1>
          <p className="text-sm text-gray-500 mt-0.5">{produkte.length} Einträge über alle Projekte</p>
        </div>
        <Link
          href="/dashboard/produkte/neu"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Neues Produkt
        </Link>
      </div>

      {produkte.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <Package className="w-7 h-7 text-indigo-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">Noch keine Produkte angelegt</p>
            <p className="text-xs text-gray-400 mt-1">Lege Produkte in einem Projekt → Raum an.</p>
          </div>
          <Link
            href="/dashboard/produkte/neu"
            className="text-sm px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            + Erstes Produkt anlegen
          </Link>
        </div>
      ) : (
        <ProdukteTabelle produkte={produkte} />
      )}
    </div>
  )
}
