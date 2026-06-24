import { describe, it, expect } from 'vitest'
import {
  baueFreigabeRaeume,
  dedupeBundleKomponenten,
  type FreigabeRpZeile,
  type BaueFreigabeRaeumeInput,
} from './freigabe-baum'
import type { FreigabeProdukt } from './supabase/types'

// ── Test-Factories ────────────────────────────────────────────
let rpCounter = 0
function makeRp(opts: {
  id?: string
  raum_id: string
  produkt_id?: string
  name?: string
  verkaufspreis?: number
  menge?: number
  produkt_gruppe_id?: string | null
  bereich_id?: string | null
  bundle_id?: string | null
  admin_favorit?: boolean
  kunde_favorit?: boolean
  freigabe_status?: string | null
  deleted_at?: string | null
}): FreigabeRpZeile & { _bundleId: string | null } {
  const id = opts.id ?? `rp-${++rpCounter}`
  const produkt_id = opts.produkt_id ?? `prod-${id}`
  return {
    id,
    raum_id: opts.raum_id,
    menge: opts.menge ?? 1,
    verkaufspreis_override: null,
    rabatt_prozent: null,
    reihenfolge: 0,
    freigabe_status: opts.freigabe_status ?? null,
    freigabe_kommentar: null,
    produkt_gruppe_id: opts.produkt_gruppe_id ?? null,
    bereich_id: opts.bereich_id ?? null,
    admin_favorit: opts.admin_favorit ?? null,
    kunde_favorit: opts.kunde_favorit ?? null,
    kunde_menge: null,
    // bundle_id liegt in page.tsx NICHT auf der Zeile, sondern in bundleIdMap →
    // Test-Metadatum, das makeInput in genau diese Map überführt (Accessor liest sie).
    _bundleId: opts.bundle_id ?? null,
    produkte: {
      id: produkt_id,
      name: opts.name ?? `Produkt ${produkt_id}`,
      beschreibung: null,
      kategorie: null,
      einheit: 'Stk',
      verkaufspreis: opts.verkaufspreis ?? 100,
      bild_url: null,
      produkt_url: null,
      deleted_at: opts.deleted_at ?? null,
      hinweis_extern: null,
      hinweis_extern_sichtbar: false,
    },
  }
}

function makeInput(opts: {
  raeume: { id: string; name: string }[]
  rows: (FreigabeRpZeile & { _bundleId?: string | null })[]
  gruppen?: { id: string; raum_id: string; name?: string; bereich_id?: string | null }[]
  bereiche?: { id: string; raum_id: string; name?: string }[]
  bundleNamen?: Record<string, string>
  auswahlMitBereich?: boolean
  scopeIds?: string[]
  scopeBereichIds?: string[]
}): BaueFreigabeRaeumeInput {
  // bundleIdMap exakt wie in page.tsx: bundle_id wird separat geladen, nicht von der Zeile.
  const bundleIdMap = new Map<string, string | null>()
  for (const r of opts.rows) bundleIdMap.set(r.id, r._bundleId ?? null)
  const gruppenProRaum = new Map<string, { id: string; name: string; beschreibung: string | null }[]>()
  const blockBereich = new Map<string, string | null>()
  for (const g of opts.gruppen ?? []) {
    const arr = gruppenProRaum.get(g.raum_id) ?? []
    arr.push({ id: g.id, name: g.name ?? g.id, beschreibung: null })
    gruppenProRaum.set(g.raum_id, arr)
    blockBereich.set(g.id, g.bereich_id ?? null)
  }
  const bereicheProRaum = new Map<string, { id: string; name: string; beschreibung: string | null }[]>()
  for (const b of opts.bereiche ?? []) {
    const arr = bereicheProRaum.get(b.raum_id) ?? []
    arr.push({ id: b.id, name: b.name ?? b.id, beschreibung: null })
    bereicheProRaum.set(b.raum_id, arr)
  }
  return {
    raeume: opts.raeume,
    rpDaten: opts.rows,
    gruppenProRaum,
    bereicheProRaum,
    blockBereich,
    gruppenNotizMap: new Map(),
    bundleNamen: new Map(Object.entries(opts.bundleNamen ?? {})),
    rpGruppeId: (rp) => rp.produkt_gruppe_id ?? null,
    rpBereichId: (rp) => rp.bereich_id ?? null,
    rpKundeMenge: (rp) => rp.kunde_menge ?? null,
    rpAdminFavorit: (rp) => !!rp.admin_favorit,
    rpKundeFavorit: (rp) => !!rp.kunde_favorit,
    rpBundleId: (rp) => bundleIdMap.get(rp.id) ?? null,
    auswahlMitBereich: opts.auswahlMitBereich ?? false,
    scopeIds: opts.scopeIds ?? [],
    scopeBereichIds: opts.scopeBereichIds ?? [],
  }
}

// ── Tests ─────────────────────────────────────────────────────
describe('baueFreigabeRaeume', () => {
  it('1: Einzelprodukt → eine lose Karte im „Ohne Gruppe"-Bereich', () => {
    const out = baueFreigabeRaeume(
      makeInput({ raeume: [{ id: 'r1', name: 'Raum 1' }], rows: [makeRp({ raum_id: 'r1', name: 'Stuhl' })] }),
    )
    expect(out).toHaveLength(1)
    expect(out[0].produkte).toHaveLength(1)
    expect(out[0].gruppen).toHaveLength(0)
    expect(out[0].bereiche).toHaveLength(1)
    expect(out[0].bereiche![0].id).toBe('__ohne__')
    expect(out[0].bereiche![0].produkte).toHaveLength(1)
    expect(out[0].produkte[0].status).toBe('ausstehend')
  })

  it('2: gleiches Produkt 2× (lose) → 2 getrennte Karten, kein Collapse', () => {
    const out = baueFreigabeRaeume(
      makeInput({
        raeume: [{ id: 'r1', name: 'Raum 1' }],
        rows: [
          makeRp({ id: 'rp-a', raum_id: 'r1', produkt_id: 'p1', name: 'Stuhl' }),
          makeRp({ id: 'rp-b', raum_id: 'r1', produkt_id: 'p1', name: 'Stuhl' }),
        ],
      }),
    )
    expect(out[0].produkte.map((p) => p.id).sort()).toEqual(['rp-a', 'rp-b'])
    expect(out[0].gruppen).toHaveLength(0)
  })

  it('3: Auswahl-Block 1-von-N mit Favorit', () => {
    const out = baueFreigabeRaeume(
      makeInput({
        raeume: [{ id: 'r1', name: 'Raum 1' }],
        rows: [
          makeRp({ id: 'rp-1', raum_id: 'r1', produkt_gruppe_id: 'g1', admin_favorit: true, name: 'Variante A' }),
          makeRp({ id: 'rp-2', raum_id: 'r1', produkt_gruppe_id: 'g1', name: 'Variante B' }),
        ],
        gruppen: [{ id: 'g1', raum_id: 'r1', name: 'Sessel' }],
      }),
    )
    expect(out[0].gruppen).toHaveLength(1)
    const g = out[0].gruppen![0]
    expect(g.ist_bundle).toBeFalsy()
    expect(g.produkte).toHaveLength(2)
    expect(g.produkte.find((p) => p.id === 'rp-1')!.admin_favorit).toBe(true)
    expect(out[0].produkte).toHaveLength(0) // Block-Mitglieder NICHT lose
  })

  it('4: Block + Einzelprodukt einem Bereich zugeordnet → ein Bereich, kein „Ohne Gruppe"', () => {
    const out = baueFreigabeRaeume(
      makeInput({
        raeume: [{ id: 'r1', name: 'Raum 1' }],
        rows: [
          makeRp({ id: 'rp-1', raum_id: 'r1', produkt_gruppe_id: 'g1', name: 'A' }),
          makeRp({ id: 'rp-2', raum_id: 'r1', produkt_gruppe_id: 'g1', name: 'B' }),
          makeRp({ id: 'rp-3', raum_id: 'r1', bereich_id: 'b1', name: 'Einzel' }),
        ],
        gruppen: [{ id: 'g1', raum_id: 'r1', bereich_id: 'b1' }],
        bereiche: [{ id: 'b1', raum_id: 'r1', name: 'Wohnen' }],
      }),
    )
    expect(out[0].bereiche!.map((b) => b.id)).toEqual(['b1'])
    const b = out[0].bereiche![0]
    expect(b.bloecke).toHaveLength(1)
    expect(b.produkte.map((p) => p.id)).toEqual(['rp-3'])
  })

  it('5: „Ohne Gruppe"-Bucket für unzugeordnete Items', () => {
    const out = baueFreigabeRaeume(
      makeInput({
        raeume: [{ id: 'r1', name: 'Raum 1' }],
        rows: [
          makeRp({ id: 'rp-1', raum_id: 'r1', bereich_id: 'b1', name: 'Zugeordnet' }),
          makeRp({ id: 'rp-2', raum_id: 'r1', name: 'Unzugeordnet' }),
        ],
        bereiche: [{ id: 'b1', raum_id: 'r1', name: 'Wohnen' }],
      }),
    )
    expect(out[0].bereiche!.map((b) => b.id)).toEqual(['b1', '__ohne__'])
    const ohne = out[0].bereiche!.find((b) => b.id === '__ohne__')!
    expect(ohne.produkte.map((p) => p.id)).toEqual(['rp-2'])
  })

  it('6: einzelnes Set → Komponenten gruppiert, Preis korrekt', () => {
    const out = baueFreigabeRaeume(
      makeInput({
        raeume: [{ id: 'r1', name: 'Raum 1' }],
        rows: [
          makeRp({ id: 'rp-1', raum_id: 'r1', produkt_id: 'k1', bundle_id: 'B', verkaufspreis: 100 }),
          makeRp({ id: 'rp-2', raum_id: 'r1', produkt_id: 'k2', bundle_id: 'B', verkaufspreis: 50 }),
          makeRp({ id: 'rp-3', raum_id: 'r1', produkt_id: 'k3', bundle_id: 'B', verkaufspreis: 25 }),
        ],
        bundleNamen: { B: 'LED-Set' },
      }),
    )
    const sets = out[0].gruppen!.filter((g) => g.ist_bundle)
    expect(sets).toHaveLength(1)
    const s = sets[0]
    expect(s.id).toBe('B')
    expect(s.name).toBe('LED-Set')
    expect(s.produkte).toHaveLength(3)
    expect(s.bundle_komponenten_anzeige).toHaveLength(3)
    expect(s.bundle_instanz_anzahl).toBe(1)
    expect(s.bundle_set_preis_netto).toBe(175)
  })

  it('7: GLEICHES SET 2× (der Bug) → EINE Karte, alle rp.ids erhalten, Komponenten dedupliziert', () => {
    const inst = (id: string, pid: string, vp: number) =>
      makeRp({ id, raum_id: 'r1', produkt_id: pid, bundle_id: 'B', verkaufspreis: vp, menge: 1 })
    const out = baueFreigabeRaeume(
      makeInput({
        raeume: [{ id: 'r1', name: 'Raum 1' }],
        rows: [
          inst('rp-1', 'k1', 100), inst('rp-2', 'k2', 50), inst('rp-3', 'k3', 25), // Instanz 1
          inst('rp-4', 'k1', 100), inst('rp-5', 'k2', 50), inst('rp-6', 'k3', 25), // Instanz 2
        ],
        bundleNamen: { B: 'LED-Set' },
      }),
    )
    const sets = out[0].gruppen!.filter((g) => g.ist_bundle)
    expect(sets).toHaveLength(1) // genau EINE Karte (nicht 2, nicht falsch zusammengeführt)
    const s = sets[0]
    // ALLE 6 raum_produkte.ids bleiben erhalten → Submit committet jede Zeile (kein Deadlock)
    expect(s.produkte.map((p) => p.id).sort()).toEqual(['rp-1', 'rp-2', 'rp-3', 'rp-4', 'rp-5', 'rp-6'])
    // Anzeige dedupliziert: 3 Komponenten, je menge 2
    expect(s.bundle_komponenten_anzeige).toHaveLength(3)
    for (const k of s.bundle_komponenten_anzeige!) expect(k.menge).toBe(2)
    expect(s.bundle_instanz_anzahl).toBe(2)
    // Preis = 2 Sets = (100+50+25)×2 = 350 (KOMPONENTEN nicht doppelt gelistet)
    expect(s.bundle_set_preis_netto).toBe(350)
  })

  it('7b: Set 2× mit unterschiedlicher Menge → Summe (nicht Anzahl) bestimmt Preis', () => {
    const out = baueFreigabeRaeume(
      makeInput({
        raeume: [{ id: 'r1', name: 'Raum 1' }],
        rows: [
          makeRp({ id: 'rp-1', raum_id: 'r1', produkt_id: 'k1', bundle_id: 'B', verkaufspreis: 100, menge: 1 }),
          makeRp({ id: 'rp-2', raum_id: 'r1', produkt_id: 'k1', bundle_id: 'B', verkaufspreis: 100, menge: 3 }),
        ],
        bundleNamen: { B: 'Set' },
      }),
    )
    const s = out[0].gruppen!.find((g) => g.ist_bundle)!
    expect(s.bundle_komponenten_anzeige).toHaveLength(1)
    expect(s.bundle_komponenten_anzeige![0].menge).toBe(4)
    expect(s.bundle_set_preis_netto).toBe(400)
    expect(s.produkte).toHaveLength(2) // beide rp.ids erhalten
  })

  it('8: Mix Set + lose + Block in einem Raum', () => {
    const out = baueFreigabeRaeume(
      makeInput({
        raeume: [{ id: 'r1', name: 'R1' }],
        rows: [
          makeRp({ id: 's1', raum_id: 'r1', produkt_id: 'k1', bundle_id: 'B', verkaufspreis: 100 }),
          makeRp({ id: 's2', raum_id: 'r1', produkt_id: 'k2', bundle_id: 'B', verkaufspreis: 50 }),
          makeRp({ id: 'l1', raum_id: 'r1', produkt_id: 'p9', name: 'Lampe' }),
          makeRp({ id: 'b1', raum_id: 'r1', produkt_gruppe_id: 'g1', name: 'Var A' }),
          makeRp({ id: 'b2', raum_id: 'r1', produkt_gruppe_id: 'g1', name: 'Var B' }),
        ],
        gruppen: [{ id: 'g1', raum_id: 'r1', name: 'Sessel' }],
        bundleNamen: { B: 'Set' },
      }),
    )
    expect(out[0].gruppen).toHaveLength(2) // Block g1 + synthetisches Set B
    expect(out[0].gruppen!.find((g) => g.ist_bundle)!.produkte.map((p) => p.id).sort()).toEqual(['s1', 's2'])
    const block = out[0].gruppen!.find((g) => !g.ist_bundle)!
    expect(block.id).toBe('g1')
    expect(block.produkte).toHaveLength(2)
    expect(out[0].produkte.map((p) => p.id)).toEqual(['l1']) // nur das echte Einzelprodukt ist lose
  })

  it('9: leerer / nur soft-gelöschter Raum wird herausgefiltert', () => {
    const out = baueFreigabeRaeume(
      makeInput({
        raeume: [
          { id: 'r1', name: 'R1' },
          { id: 'r2', name: 'R2' },
        ],
        rows: [
          makeRp({ id: 'rp-1', raum_id: 'r1', name: 'A' }),
          makeRp({ id: 'rp-2', raum_id: 'r2', deleted_at: '2026-01-01', name: 'Gelöscht' }),
        ],
      }),
    )
    expect(out.map((r) => r.id)).toEqual(['r1'])
  })
})

describe('dedupeBundleKomponenten', () => {
  it('fasst gleiche produkt_id zusammen und summiert die Menge', () => {
    const p = (produkt_id: string, menge: number, vp: number): FreigabeProdukt => ({
      id: `${produkt_id}-${menge}`, produkt_id, name: produkt_id, beschreibung: null, kategorie: null,
      menge, einheit: 'Stk', verkaufspreis: vp, bild_url: null, produkt_url: null,
      status: 'ausstehend', kommentar: null,
    })
    const out = dedupeBundleKomponenten([p('k1', 1, 100), p('k2', 2, 50), p('k1', 3, 100)])
    expect(out).toHaveLength(2)
    expect(out.find((k) => k.produkt_id === 'k1')!.menge).toBe(4)
    expect(out.find((k) => k.produkt_id === 'k2')!.menge).toBe(2)
  })
})
