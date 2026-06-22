import { createClient } from '@/lib/supabase/server'
import FreigabenTabelle, { type FreigabeEintrag } from '@/components/FreigabenTabelle'

// Kundenentscheidungen (Portal/Token) revalidaten diese Admin-Seite nicht →
// dynamisch laden, damit der Status immer aktuell ist.
export const dynamic = 'force-dynamic'

type RpRow = {
  id: string
  menge: number
  verkaufspreis_override: number | null
  freigabe_status: string
  freigabe_kommentar: string | null
  // Gruppierung (Mig 114/116) — atomar mitgeladen, im Fail-safe-Pfad fehlend
  produkt_gruppe_id?: string | null
  bereich_id?: string | null
  admin_favorit?: boolean | null
  kunde_favorit?: boolean | null
  produkte: {
    id: string; name: string; kategorie: string | null; einheit: string
    verkaufspreis: number | null; bild_url: string | null
    created_at: string; deleted_at: string | null
  }
  raeume: {
    id: string; name: string; projekt_id: string
    projekte: { id: string; name: string; kunden: { id: string; name: string } | null } | null
  } | null
}

async function getAlleProdukte(): Promise<FreigabeEintrag[]> {
  const supabase = await createClient()

  // Eine Zeile pro Raum↔Produkt. freigabe_status liegt seit Mig 076 auf raum_produkte.
  // WICHTIG: Gruppierungs-Spalten (produkt_gruppe_id/bereich_id/Favoriten) werden ATOMAR
  // in derselben Zeile geladen — NICHT mehr über separate `.in('id', rpIds)`-Nachladungen.
  // Bei Orgs mit viel Bestand wurde diese ID-Liste riesig → Anfrage scheiterte → Produkte
  // verloren ihre Gruppe („falsch gruppiert"). Block-/Bereich-NAMEN kommen über kleine,
  // gebundene Lookups (Anzahl Blöcke/Bereiche, nicht Produkte).
  const RP_BASIS  = 'id, menge, verkaufspreis_override, freigabe_status, freigabe_kommentar'
  const RP_GRUPPE = 'produkt_gruppe_id, bereich_id, admin_favorit, kunde_favorit'
  const RP_REST   = `produkte!inner(
        id, name, kategorie, einheit, verkaufspreis, bild_url, created_at, deleted_at
      ),
      raeume!inner(
        id, name, projekt_id,
        projekte ( id, name, kunden ( id, name ) )
      )`
  const bauen = (felder: string) =>
    supabase.from('raum_produkte').select(felder).order('created_at', { referencedTable: 'produkte', ascending: false })

  let gruppenInline = true
  const rich = await bauen(`${RP_BASIS}, ${RP_GRUPPE}, ${RP_REST}`)
  let data = rich.data
  if (rich.error) {
    // DB ohne Mig-114/116-Spalten → Minimal-Select + Fallback-Nachladung (kleine Orgs/Dev).
    gruppenInline = false
    data = (await bauen(`${RP_BASIS}, ${RP_REST}`)).data
  }

  const rows = ((data ?? []) as unknown as RpRow[]).filter((r) => r.produkte && !r.produkte.deleted_at && r.raeume)

  const basis = rows.map((row): FreigabeEintrag => ({
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
    produktstatus: { status: row.freigabe_status, kommentar: row.freigabe_kommentar },
    // Gruppierung — inline aus der Zeile; sonst (Fallback) unten nachgezogen.
    produkt_gruppe_id: gruppenInline ? (row.produkt_gruppe_id ?? null) : null,
    gruppe_name:       null,
    admin_favorit:     gruppenInline ? !!row.admin_favorit : false,
    kunde_favorit:     gruppenInline ? !!row.kunde_favorit : false,
    bereich_id:        null,   // EFFEKTIVER Bereich (block-first) — unten gesetzt
    bereich_name:      null,
    bereich_farbe:     null,
    block_kunde_notiz: null,
  }))

  const rpIds = basis.map((e) => e.id)

  // Eigener Bereich je raum_produkt (für lose Produkte). Inline aus der Zeile,
  // im Fallback-Pfad gebündelt nachgeladen.
  const ownBereich = new Map<string, string | null>()
  if (gruppenInline) {
    for (const row of rows) ownBereich.set(row.id, row.bereich_id ?? null)
  } else if (rpIds.length > 0) {
    // Fallback: Gruppierungs-Spalten fehlten im Haupt-Select → einzeln nachladen (fehlertolerant).
    const favMap = new Map<string, { produkt_gruppe_id: string | null; admin_favorit: boolean; kunde_favorit: boolean }>()
    {
      const { data: favData, error } = await supabase.from('raum_produkte').select('id, produkt_gruppe_id, admin_favorit, kunde_favorit').in('id', rpIds)
      if (!error) for (const f of (favData ?? []) as { id: string; produkt_gruppe_id: string | null; admin_favorit: boolean | null; kunde_favorit: boolean | null }[]) {
        favMap.set(f.id, { produkt_gruppe_id: f.produkt_gruppe_id ?? null, admin_favorit: !!f.admin_favorit, kunde_favorit: !!f.kunde_favorit })
      }
    }
    {
      const { data: berData, error } = await supabase.from('raum_produkte').select('id, bereich_id').in('id', rpIds)
      if (!error) for (const r of (berData ?? []) as { id: string; bereich_id: string | null }[]) ownBereich.set(r.id, r.bereich_id ?? null)
    }
    for (const e of basis) {
      const f = favMap.get(e.id)
      e.produkt_gruppe_id = f?.produkt_gruppe_id ?? null
      e.admin_favorit = !!f?.admin_favorit
      e.kunde_favorit = !!f?.kunde_favorit
    }
  }

  // Gebundene Lookups (klein!): Block-Details (Name/Bereich/Kundennotiz) + Bereich-Namen/Farben.
  type BlockRow = { id: string; name: string; bereich_id?: string | null; kunde_notiz?: string | null }
  const blockIds = Array.from(new Set(basis.map((e) => e.produkt_gruppe_id).filter(Boolean) as string[]))
  const blockMap = new Map<string, { name: string; bereich_id: string | null; kunde_notiz: string | null }>()
  if (blockIds.length > 0) {
    const richB = await supabase.from('produkt_gruppen').select('id, name, bereich_id, kunde_notiz').in('id', blockIds)
    const grows = richB.error
      ? ((await supabase.from('produkt_gruppen').select('id, name').in('id', blockIds)).data ?? [])
      : (richB.data ?? [])
    for (const g of grows as unknown as BlockRow[]) {
      blockMap.set(g.id, { name: g.name, bereich_id: g.bereich_id ?? null, kunde_notiz: g.kunde_notiz ?? null })
    }
  }
  const bereichIds = new Set<string>()
  for (const b of Array.from(blockMap.values())) if (b.bereich_id) bereichIds.add(b.bereich_id)
  for (const v of Array.from(ownBereich.values())) if (v) bereichIds.add(v)
  const bereichMap = new Map<string, { name: string; farbe: string | null }>()
  if (bereichIds.size > 0) {
    const { data: berDef, error } = await supabase.from('produkt_bereiche').select('id, name, farbe').in('id', Array.from(bereichIds))
    if (!error) for (const b of (berDef ?? []) as { id: string; name: string; farbe: string | null }[]) bereichMap.set(b.id, { name: b.name, farbe: b.farbe ?? null })
  }

  // Effektiven Bereich block-first setzen + Block-Name/Notiz.
  for (const e of basis) {
    const block = e.produkt_gruppe_id ? blockMap.get(e.produkt_gruppe_id) ?? null : null
    e.gruppe_name = block?.name ?? null
    e.block_kunde_notiz = block?.kunde_notiz ?? null
    const eff = block ? (block.bereich_id ?? null) : (ownBereich.get(e.id) ?? null)
    e.bereich_id = eff
    const bd = eff ? bereichMap.get(eff) ?? null : null
    e.bereich_name = bd?.name ?? null
    e.bereich_farbe = bd?.farbe ?? null
  }

  // Freigabe-Stempel (Mig 135) — SEPARAT + fail-safe nachladen (NICHT in RP_BASIS,
  // sonst kippt ein fehlendes Mig 135 den ganzen Select → Übersicht leer).
  if (rpIds.length > 0) {
    const { data: stempel, error } = await supabase
      .from('raum_produkte')
      .select('id, freigegeben_am, freigegeben_von')
      .in('id', rpIds)
    if (!error && stempel) {
      const sm = new Map(stempel.map((s) => [s.id as string, s]))
      for (const e of basis) {
        const s = sm.get(e.id)
        e.freigegeben_am  = (s?.freigegeben_am as string | null) ?? null
        e.freigegeben_von = (s?.freigegeben_von as string | null) ?? null
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
