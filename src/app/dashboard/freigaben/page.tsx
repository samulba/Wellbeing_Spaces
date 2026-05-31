import { createClient } from '@/lib/supabase/server'
import FreigabenTabelle, { type FreigabeEintrag } from '@/components/FreigabenTabelle'

async function getAlleProdukte(): Promise<FreigabeEintrag[]> {
  const supabase = await createClient()

  // Lädt via raum_produkte – eine Zeile pro Raum↔Produkt-Verknüpfung.
  // Seit Migration 076 liegt freigabe_status auf raum_produkte direkt
  // (vorher auf produktstatus, global pro produkt_id → leakte zwischen Räumen).
  const { data } = await supabase
    .from('raum_produkte')
    .select(`
      id,
      menge,
      verkaufspreis_override,
      freigabe_status,
      freigabe_kommentar,
      produkte!inner(
        id, name, kategorie, einheit, verkaufspreis, bild_url, created_at, deleted_at
      ),
      raeume!inner(
        id, name, projekt_id,
        projekte ( id, name, kunden ( id, name ) )
      )
    `)
    .order('created_at', { referencedTable: 'produkte', ascending: false })

  type RpRow = {
    id: string
    menge: number
    verkaufspreis_override: number | null
    freigabe_status: string
    freigabe_kommentar: string | null
    produkte: {
      id: string; name: string; kategorie: string | null; einheit: string
      verkaufspreis: number | null; bild_url: string | null
      created_at: string; deleted_at: string | null
    }
    raeume: {
      id: string; name: string; projekt_id: string
      projekte: { id: string; name: string; kunden: { id: string; name: string } | null } | null
    }
  }

  const basis = ((data ?? []) as unknown as RpRow[])
    .filter((row) => !row.produkte.deleted_at)
    .map((row): FreigabeEintrag => ({
      id:         row.id,                 // raum_produkte.id — Key für Freigabe-Aktionen
      produkt_id: row.produkte.id,        // globale Produkt-ID
      name:       row.produkte.name,
      kategorie:  row.produkte.kategorie,
      menge:      row.menge,
      einheit:    row.produkte.einheit,
      verkaufspreis: row.verkaufspreis_override ?? row.produkte.verkaufspreis,
      bild_url:   row.produkte.bild_url,
      created_at: row.produkte.created_at,
      raeume:     row.raeume,
      produktstatus: {
        status:    row.freigabe_status,
        kommentar: row.freigabe_kommentar,
      },
    }))

  // Fail-safe Anreicherung mit Auswahl-Gruppe + Favoriten (Migration 114).
  // Eigene Query, damit die Seite NICHT bricht, falls Migration 114 noch nicht
  // eingespielt ist (Spalten/Tabelle fehlen → Maps bleiben leer, keine Badges).
  const rpIds = basis.map((e) => e.id)
  if (rpIds.length > 0) {
    const { data: favData } = await supabase
      .from('raum_produkte')
      .select('id, produkt_gruppe_id, admin_favorit, kunde_favorit')
      .in('id', rpIds)
    const favList = (favData ?? []) as { id: string; produkt_gruppe_id: string | null; admin_favorit: boolean | null; kunde_favorit: boolean | null }[]
    if (favList.length > 0) {
      const gruppeIds = Array.from(new Set(favList.map((f) => f.produkt_gruppe_id).filter(Boolean) as string[]))
      const nameMap = new Map<string, string>()
      if (gruppeIds.length > 0) {
        const { data: gData } = await supabase.from('produkt_gruppen').select('id, name').in('id', gruppeIds)
        for (const g of (gData ?? []) as { id: string; name: string }[]) nameMap.set(g.id, g.name)
      }
      const favMap = new Map(favList.map((f) => [f.id, f]))
      for (const e of basis) {
        const f = favMap.get(e.id)
        if (!f) continue
        e.produkt_gruppe_id = f.produkt_gruppe_id ?? null
        e.gruppe_name = f.produkt_gruppe_id ? (nameMap.get(f.produkt_gruppe_id) ?? null) : null
        e.admin_favorit = !!f.admin_favorit
        e.kunde_favorit = !!f.kunde_favorit
      }
    }
  }

  return basis
}

export default async function FreigabenPage() {
  const eintraege = await getAlleProdukte()

  return (
    <div className="flex-1 overflow-y-auto animate-fadeIn">
      <FreigabenTabelle eintraege={eintraege} />
    </div>
  )
}
