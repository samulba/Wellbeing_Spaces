// Reine Aufbau-Logik des Freigabe-Baums (Räume → Bereiche → Auswahl-Blöcke/Sets →
// Einzelprodukte). Bewusst OHNE Supabase/React/next ausgelagert, damit diese fragile
// Gruppierung isoliert unit-testbar ist (siehe freigabe-baum.test.ts).
//
// Hintergrund: Jede neue Funktion (Gruppen, Blöcke, Sets, Mehrfach-Produkte) ändert die
// Datenform, die diese Logik verarbeiten muss. Migration 134 erlaubt seit 06/2026 dasselbe
// Produkt/Set mehrfach pro Raum — was hier abgesichert sein MUSS (Set-Dedupe, Fall 7 im Test).

import type {
  FreigabeRaum,
  FreigabeProdukt,
  FreigabeProduktGruppe,
  FreigabeBereich,
  FreigabeProduktKomponente,
  ProduktStatus,
} from '@/lib/supabase/types'
import { bereichVonRaumProdukt, istImAuswahlScope } from '@/lib/freigabe-scope'
import { effektiverVpNetto } from '@/lib/preise'

// Zeilentyp, wie ihn page.tsx aus raum_produkte lädt (Gruppierungsfelder optional —
// auf dem Fallback-Pfad ohne Migration fehlen sie und kommen aus Backfill-Maps).
export type FreigabeRpZeile = {
  id: string
  raum_id: string
  menge: number
  verkaufspreis_override: number | null
  rabatt_prozent: number | null
  reihenfolge: number
  freigabe_status: string | null
  freigabe_kommentar: string | null
  produkt_gruppe_id?: string | null
  bereich_id?: string | null
  admin_favorit?: boolean | null
  kunde_favorit?: boolean | null
  kunde_menge?: number | null
  produkte: {
    id: string
    name: string
    beschreibung: string | null
    kategorie: string | null
    einheit: string
    verkaufspreis: number | null
    bild_url: string | null
    produkt_url: string | null
    deleted_at: string | null
    hinweis_extern: string | null
    hinweis_extern_sichtbar: boolean
  } | null
}

export interface BaueFreigabeRaeumeInput {
  /** Räume in Anzeigereihenfolge (page.tsx raeumeDaten). */
  raeume: { id: string; name: string }[]
  rpDaten: FreigabeRpZeile[]
  // Optionaler Namens-Lookup für Räume, die NICHT in `raeume` stehen, aber Produkte in
  // rpDaten haben (z. B. ein gescopter Raum-Link auf eine Raum-ID außerhalb der Liste).
  // Ohne Treffer wird ein generischer Fallback-Name verwendet (Produkte gehen NIE verloren).
  raumNameById?: Map<string, string>
  // In page.tsx bereits aufgebaute Lookup-Maps:
  gruppenProRaum: Map<string, { id: string; name: string; beschreibung: string | null }[]>
  bereicheProRaum: Map<string, { id: string; name: string; beschreibung: string | null }[]>
  blockBereich: Map<string, string | null>
  gruppenNotizMap: Map<string, string | null>
  bundleNamen: Map<string, string>
  // Per-Zeile-Accessoren (page.tsx liest inline ODER aus Backfill-Maps) — als Funktionen
  // übergeben, damit diese reine Funktion quellenagnostisch bleibt.
  rpGruppeId: (rp: FreigabeRpZeile) => string | null
  rpBereichId: (rp: FreigabeRpZeile) => string | null
  rpKundeMenge: (rp: FreigabeRpZeile) => number | null
  rpAdminFavorit: (rp: FreigabeRpZeile) => boolean
  rpKundeFavorit: (rp: FreigabeRpZeile) => boolean
  rpBundleId: (rp: FreigabeRpZeile) => string | null
  // Scope-Auflösung (auswahl + ganze Gruppen, Migration 116):
  auswahlMitBereich: boolean
  scopeIds: string[]
  scopeBereichIds: string[]
}

/**
 * Fasst Set-Komponenten für die ANZEIGE nach produkt_id zusammen (menge summiert).
 * Wird beim Aufbau genutzt und als Fallback im Client (BundleKarte). Verändert NICHT
 * die zugrunde liegenden raum_produkte-Zeilen — der Status/Submit läuft über die volle
 * Liste FreigabeProduktGruppe.produkte.
 */
export function dedupeBundleKomponenten(produkte: FreigabeProdukt[]): FreigabeProduktKomponente[] {
  const byProdukt = new Map<string, FreigabeProduktKomponente>()
  for (const p of produkte) {
    const ex = byProdukt.get(p.produkt_id)
    if (ex) {
      ex.menge += p.menge
    } else {
      byProdukt.set(p.produkt_id, {
        produkt_id: p.produkt_id,
        name: p.name,
        bild_url: p.bild_url,
        einheit: p.einheit,
        verkaufspreis: p.verkaufspreis,
        menge: p.menge,
      })
    }
  }
  return Array.from(byProdukt.values())
}

export function baueFreigabeRaeume(input: BaueFreigabeRaeumeInput): FreigabeRaum[] {
  const {
    raeume: raeumeDaten,
    rpDaten,
    gruppenProRaum,
    bereicheProRaum,
    blockBereich,
    gruppenNotizMap,
    bundleNamen,
    rpGruppeId,
    rpBereichId,
    rpKundeMenge,
    rpAdminFavorit,
    rpKundeFavorit,
    rpBundleId,
    auswahlMitBereich,
    scopeIds,
    scopeBereichIds,
    raumNameById,
  } = input

  // Räume aus den VORHANDENEN Produkten ableiten — nicht nur aus der Eingabeliste.
  // Ein gescopter Raum-Link (scope_typ='raum') lädt Produkte über raum_id, auch wenn der
  // Raum nicht in `raeume` steht (z. B. Link auf eine umbenannte/duplizierte/soft-gelöschte
  // Raum-ID oder verschobene scope_ids). Ohne diese Ergänzung würden die geladenen Produkte
  // STILL verschwinden → „keine Produkte". Bekannte Räume behalten Reihenfolge + Namen;
  // Räume nur aus rpDaten werden hinten angehängt (Name aus raumNameById, sonst Fallback).
  const bekannteRaumIds = new Set(raeumeDaten.map((r) => r.id))
  const extraRaeume: { id: string; name: string }[] = []
  const extraGesehen = new Set<string>()
  for (const rp of rpDaten ?? []) {
    const rid = rp.raum_id
    if (bekannteRaumIds.has(rid) || extraGesehen.has(rid)) continue
    extraGesehen.add(rid)
    extraRaeume.push({ id: rid, name: raumNameById?.get(rid) ?? 'Raum' })
  }
  const alleRaeume = extraRaeume.length > 0 ? [...raeumeDaten, ...extraRaeume] : raeumeDaten

  return alleRaeume
    .map((raum) => {
      const alleProdukte = (rpDaten ?? [])
        .filter((rp) => {
          if (rp.raum_id !== raum.id) return false
          // Gelöschte Produkte ausblenden (produkte.deleted_at, NICHT raum_produkte)
          const p = rp.produkte as unknown as { deleted_at: string | null } | null
          if (p?.deleted_at) return false
          // „auswahl"-Scope mit ganzen Gruppen: dynamisch auflösen (Migration 116).
          if (auswahlMitBereich) {
            const rpId = rp.id
            return istImAuswahlScope(
              { id: rpId, produkt_gruppe_id: rpGruppeId(rp), bereich_id: rpBereichId(rp) },
              scopeIds,
              scopeBereichIds,
              blockBereich,
            )
          }
          return true
        })
        .map((rp): FreigabeProdukt => {
          type ProdRaw = {
            id: string
            name: string
            beschreibung: string | null
            kategorie: string | null
            einheit: string
            verkaufspreis: number | null
            bild_url: string | null
            produkt_url: string | null
            hinweis_extern: string | null
            hinweis_extern_sichtbar: boolean
          }
          const p = rp.produkte as unknown as ProdRaw
          // Endpreis über zentralen Helper: Override → Rabatt → gerundet
          const vp = effektiverVpNetto(
            {
              verkaufspreis_override: rp.verkaufspreis_override ?? null,
              rabatt_prozent: rp.rabatt_prozent ?? null,
            },
            p.verkaufspreis,
          )
          return {
            id: rp.id, // raum_produkte.id — Key für Freigabe-Aktionen
            produkt_id: p.id, // globale Produkt-ID für Bilder/Links
            name: p.name,
            beschreibung: p.beschreibung,
            kategorie: p.kategorie,
            menge: rp.menge,
            einheit: p.einheit,
            verkaufspreis: vp,
            bild_url: p.bild_url,
            produkt_url: p.produkt_url,
            status: (rp.freigabe_status as ProduktStatus) ?? 'ausstehend',
            kommentar: rp.freigabe_kommentar ?? null,
            kunde_menge: rpKundeMenge(rp),
            hinweis: p.hinweis_extern_sichtbar ? p.hinweis_extern : null,
            rabatt_prozent: rp.rabatt_prozent ?? null,
            produkt_gruppe_id: rpGruppeId(rp),
            admin_favorit: rpAdminFavorit(rp),
            kunde_favorit: rpKundeFavorit(rp),
            bereich_id: rpBereichId(rp),
            bundle_id: rpBundleId(rp),
          }
        })

      // In Auswahl-Gruppen (mehrere Alternativen) + lose Produkte partitionieren.
      // Eine Gruppe ist erst ab 2 Mitgliedern sinnvoll — 1-Produkt-Gruppen werden als
      // normales Einzelprodukt gerendert, AUSSER sie sind einem Bereich zugeordnet.
      const gruppenDefs = gruppenProRaum.get(raum.id) ?? []
      const gruppen: FreigabeProduktGruppe[] = gruppenDefs
        .map((g) => ({
          id: g.id,
          name: g.name,
          beschreibung: g.beschreibung,
          kunde_notiz: gruppenNotizMap.get(g.id) ?? null,
          produkte: alleProdukte.filter((p) => p.produkt_gruppe_id === g.id),
        }))
        .filter(
          (grp) =>
            grp.produkte.length >= 2 ||
            (grp.produkte.length >= 1 && (blockBereich.get(grp.id) ?? null) !== null),
        )
      const echteGruppenIds = new Set(gruppen.map((g) => g.id))
      let lose = alleProdukte.filter(
        (p) => !p.produkt_gruppe_id || !echteGruppenIds.has(p.produkt_gruppe_id),
      )

      // Set/Bundle (Mig 128, Phase 2): lose Produkte mit gleicher bundle_id zu EINER
      // synthetischen Set-Gruppe bündeln (AND-Semantik). Seit Migration 134 kann dasselbe
      // Set mehrfach im Raum liegen → ALLE Instanz-Zeilen teilen sich die bundle_id.
      // `produkte` enthält daher ALLE rp-Zeilen (Submit/Status), aber die Anzeige
      // (bundle_komponenten_anzeige) wird pro produkt_id zusammengefasst, damit Komponenten
      // nicht doppelt erscheinen und der Set-Preis nicht multipliziert wird.
      const bundleMap = new Map<string, FreigabeProdukt[]>()
      const loseOhneBundle: FreigabeProdukt[] = []
      for (const p of lose) {
        if (p.bundle_id) {
          const arr = bundleMap.get(p.bundle_id) ?? []
          arr.push(p)
          bundleMap.set(p.bundle_id, arr)
        } else {
          loseOhneBundle.push(p)
        }
      }
      for (const [bid, komponenten] of Array.from(bundleMap.entries())) {
        const anzeige = dedupeBundleKomponenten(komponenten)
        // Instanz-Anzahl = häufigste Wiederholung einer einzelnen produkt_id
        // (robust, falls eine Komponente in der Set-Definition mehrfach vorkommt).
        const counts = new Map<string, number>()
        for (const p of komponenten) counts.set(p.produkt_id, (counts.get(p.produkt_id) ?? 0) + 1)
        const instanzen = Math.max(1, ...Array.from(counts.values()))
        gruppen.push({
          id: bid,
          name: bundleNamen.get(bid) ?? 'Set',
          beschreibung: null,
          ist_bundle: true,
          // Preis aus der DEDUPLIZIERTEN Sicht → korrekter Satz (kein Doppeln)
          bundle_set_preis_netto: anzeige.reduce((s, k) => s + (k.verkaufspreis ?? 0) * k.menge, 0),
          produkte: komponenten, // ALLE rp-Zeilen (Submit committet jede id)
          bundle_komponenten_anzeige: anzeige,
          bundle_instanz_anzahl: instanzen,
        })
      }
      lose = loseOhneBundle

      // Bereiche/"Gruppen" bauen (Migration 116): je Bereich seine Auswahl-Blöcke
      // (Block-bereich_id == Bereich) + Einzelprodukte (resolveBereich == Bereich).
      // Nicht zugeordnete Items → synthetischer Trailing-Bereich „Ohne Gruppe".
      const resolveBereich = (p: FreigabeProdukt) =>
        bereichVonRaumProdukt({ produkt_gruppe_id: p.produkt_gruppe_id, bereich_id: p.bereich_id }, blockBereich)
      const bereichDefs = bereicheProRaum.get(raum.id) ?? []
      const bereichIdSet = new Set(bereichDefs.map((b) => b.id))
      const bereiche: FreigabeBereich[] = []
      for (const b of bereichDefs) {
        const bloecke = gruppen.filter((g) => (blockBereich.get(g.id) ?? null) === b.id)
        const produkte = lose.filter((p) => resolveBereich(p) === b.id)
        // Leere Bereiche NICHT rendern (sonst „0 von 0").
        if (bloecke.length > 0 || produkte.length > 0) {
          bereiche.push({ id: b.id, name: b.name, beschreibung: b.beschreibung, bloecke, produkte })
        }
      }
      const ohneBloecke = gruppen.filter((g) => {
        const bb = blockBereich.get(g.id) ?? null
        return !bb || !bereichIdSet.has(bb)
      })
      const ohneProdukte = lose.filter((p) => {
        const bb = resolveBereich(p)
        return !bb || !bereichIdSet.has(bb)
      })
      if (ohneBloecke.length > 0 || ohneProdukte.length > 0) {
        bereiche.push({ id: '__ohne__', name: 'Ohne Gruppe', beschreibung: null, bloecke: ohneBloecke, produkte: ohneProdukte })
      }

      return { id: raum.id, name: raum.name, bereiche, gruppen, produkte: lose }
    })
    .filter((r) => r.produkte.length > 0 || (r.gruppen?.length ?? 0) > 0 || (r.bereiche?.length ?? 0) > 0)
}
