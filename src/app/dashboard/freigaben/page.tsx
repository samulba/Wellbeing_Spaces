import { createClient } from '@/lib/supabase/server'
import FreigabenTabelle, { type FreigabeEintrag } from '@/components/FreigabenTabelle'

// Kundenentscheidungen (Portal/Token) revalidaten diese Admin-Seite nicht →
// dynamisch laden, damit der Status immer aktuell ist.
export const dynamic = 'force-dynamic'

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

  // Fail-safe Anreicherung: Auswahl-Block (Mig 114) + Bereich/„Gruppe" (Mig 116)
  // + Block-Kundennotiz (Mig 119). Getrennte, fehlertolerante Queries — fehlt eine
  // Migration, bleibt das jeweilige Feld leer (Seite rendert weiter, alles „Ohne Gruppe").
  const rpIds = basis.map((e) => e.id)
  if (rpIds.length > 0) {
    // 1. Block-Zuordnung + Favoriten je raum_produkt (Mig 114)
    const favMap = new Map<string, { produkt_gruppe_id: string | null; admin_favorit: boolean; kunde_favorit: boolean }>()
    {
      const { data: favData, error } = await supabase
        .from('raum_produkte')
        .select('id, produkt_gruppe_id, admin_favorit, kunde_favorit')
        .in('id', rpIds)
      if (!error) {
        for (const f of (favData ?? []) as { id: string; produkt_gruppe_id: string | null; admin_favorit: boolean | null; kunde_favorit: boolean | null }[]) {
          favMap.set(f.id, { produkt_gruppe_id: f.produkt_gruppe_id ?? null, admin_favorit: !!f.admin_favorit, kunde_favorit: !!f.kunde_favorit })
        }
      }
    }
    // 2. Eigener Bereich je raum_produkt (Mig 116)
    const ownBereich = new Map<string, string | null>()
    {
      const { data: berData, error } = await supabase.from('raum_produkte').select('id, bereich_id').in('id', rpIds)
      if (!error) for (const r of (berData ?? []) as { id: string; bereich_id: string | null }[]) ownBereich.set(r.id, r.bereich_id ?? null)
    }
    // 3. Block-Details: Name (Mig 114) + Bereich (Mig 116) + Kundennotiz (Mig 119)
    type BlockRow = { id: string; name: string; bereich_id?: string | null; kunde_notiz?: string | null }
    const blockIds = Array.from(new Set(Array.from(favMap.values()).map((f) => f.produkt_gruppe_id).filter(Boolean) as string[]))
    const blockMap = new Map<string, { name: string; bereich_id: string | null; kunde_notiz: string | null }>()
    if (blockIds.length > 0) {
      const rich = await supabase.from('produkt_gruppen').select('id, name, bereich_id, kunde_notiz').in('id', blockIds)
      const rows = rich.error
        ? ((await supabase.from('produkt_gruppen').select('id, name').in('id', blockIds)).data ?? [])
        : (rich.data ?? [])
      for (const g of rows as unknown as BlockRow[]) {
        blockMap.set(g.id, { name: g.name, bereich_id: g.bereich_id ?? null, kunde_notiz: g.kunde_notiz ?? null })
      }
    }
    // 4. Bereich-Namen/Farben (Mig 116)
    const bereichIds = new Set<string>()
    for (const b of Array.from(blockMap.values())) if (b.bereich_id) bereichIds.add(b.bereich_id)
    for (const v of Array.from(ownBereich.values())) if (v) bereichIds.add(v)
    const bereichMap = new Map<string, { name: string; farbe: string | null }>()
    if (bereichIds.size > 0) {
      const { data: berDef, error } = await supabase.from('produkt_bereiche').select('id, name, farbe').in('id', Array.from(bereichIds))
      if (!error) for (const b of (berDef ?? []) as { id: string; name: string; farbe: string | null }[]) bereichMap.set(b.id, { name: b.name, farbe: b.farbe ?? null })
    }
    // 5. In die Einträge schreiben — effektiver Bereich block-first (Block-Bereich gewinnt).
    for (const e of basis) {
      const f = favMap.get(e.id)
      const block = f?.produkt_gruppe_id ? blockMap.get(f.produkt_gruppe_id) ?? null : null
      e.produkt_gruppe_id = f?.produkt_gruppe_id ?? null
      e.gruppe_name = block?.name ?? null
      e.admin_favorit = !!f?.admin_favorit
      e.kunde_favorit = !!f?.kunde_favorit
      e.block_kunde_notiz = block?.kunde_notiz ?? null
      const effBereich = block ? (block.bereich_id ?? null) : (ownBereich.get(e.id) ?? null)
      e.bereich_id = effBereich
      const berDef = effBereich ? bereichMap.get(effBereich) ?? null : null
      e.bereich_name = berDef?.name ?? null
      e.bereich_farbe = berDef?.farbe ?? null
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
