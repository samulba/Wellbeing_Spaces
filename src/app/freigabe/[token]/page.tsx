import { createAdminClient } from '@/lib/supabase/admin'
import { getOrganisationIdOrNull } from '@/lib/supabase/server'
import { getMwstSatz } from '@/app/actions/einstellungen'
import { brandingFuerToken } from '@/app/actions/branding'
import { effektiverVpNetto } from '@/lib/preise'
import FreigabeClient from './FreigabeClient'
import FreigabePinGate from './FreigabePinGate'
import { pinCookieGueltig } from '@/lib/freigabe-pin-cookie'
import { bereichVonRaumProdukt, istImAuswahlScope } from '@/lib/freigabe-scope'
import type { FreigabeRaum, FreigabeProdukt, FreigabeProduktGruppe, FreigabeBereich, ProduktStatus } from '@/lib/supabase/types'

// Öffentliche, datengetriebene Seite — niemals cachen, damit Admin-Status-Änderungen
// (z. B. Freigabe auf „offen" zurücksetzen) sofort sichtbar sind.
export const dynamic = 'force-dynamic'

interface Props {
  params: { token: string }
  searchParams?: { vorschau?: string }
}

export default async function FreigabePage({ params, searchParams }: Props) {
  const supabase = createAdminClient()

  // 1. Token validieren — inkl. Scope + Abschluss + Soft-Delete (Mig 081)
  const { data: tokenData } = await supabase
    .from('freigabe_tokens')
    .select('id, organisation_id, projekt_id, gueltig_bis, aktiv, scope_typ, scope_ids, abgeschlossen_am, abgeschlossen_durch, deleted_at, created_at')
    .eq('token', params.token)
    .maybeSingle()

  if (!tokenData) {
    return <Fehlerseite meldung="Dieser Freigabe-Link ist ungültig oder wurde zurückgezogen." />
  }

  // Admin-Vorschau (?vorschau=1): nur für eingeloggte Nutzer DERSELBEN Organisation.
  // Umgeht Soft-Delete-/Ablauf-/PIN-/Abschluss-Gates rein zum Testen — schreibt
  // aber NIE (siehe vorschau-Prop an Client/Modal). Für anonyme Besucher (kein
  // gültiger Org-Login) bleibt alles beim Alten → PIN-Datentresor unberührt.
  const vorschau =
    searchParams?.vorschau === '1' &&
    !!tokenData.organisation_id &&
    (await getOrganisationIdOrNull()) === tokenData.organisation_id

  if (!vorschau) {
    if (!tokenData.aktiv || tokenData.deleted_at) {
      return <Fehlerseite meldung="Dieser Freigabe-Link ist ungültig oder wurde zurückgezogen." />
    }

    if (tokenData.gueltig_bis && new Date(tokenData.gueltig_bis) < new Date()) {
      return <Fehlerseite meldung="Dieser Freigabe-Link ist abgelaufen." />
    }
  }

  // 2. Projektdaten laden (inkl. PIN-Status – PIN selbst NICHT an Client weitergeben!)
  const { data: projektRaw } = await supabase
    .from('projekte')
    .select('id, name, freigabe_pin, kunden(name)')
    .eq('id', tokenData.projekt_id)
    .is('deleted_at', null)
    .maybeSingle()
  const projekt = projektRaw as typeof projektRaw & { kunden: { name: string } | null; freigabe_pin: string | null } | null

  if (!projekt) {
    return <Fehlerseite meldung="Das zugehörige Projekt wurde nicht gefunden." />
  }

  // 2b. PIN-Datentresor: Bei gesetzter PIN nur den PIN-Screen rendern, solange
  //     kein gültiges Cookie vorliegt — KEINE Produktdaten laden/ausliefern.
  const hatPin = !!projekt.freigabe_pin && projekt.freigabe_pin.toString().trim().length >= 4
  if (!vorschau && hatPin && !pinCookieGueltig(params.token, projekt.freigabe_pin)) {
    const branding = await brandingFuerToken()
    return <FreigabePinGate token={params.token} projektName={projekt.name} branding={branding} />
  }

  // 3. Räume laden
  const { data: raeumeDaten } = await supabase
    .from('raeume')
    .select('id, name, reihenfolge')
    .eq('projekt_id', tokenData.projekt_id)
    .is('deleted_at', null)
    .order('reihenfolge')
    .order('created_at')

  if (!raeumeDaten || raeumeDaten.length === 0) {
    return <Fehlerseite meldung="Für dieses Projekt wurden noch keine Räume oder Produkte angelegt." />
  }

  // 4. Produkte via raum_produkte laden – erfasst sowohl direkt angelegte als auch
  //    aus Bibliothek hinzugefügte Produkte. NUR öffentliche Felder, KEINE internen Preise.
  //    freigabe_status liegt seit Migration 076 auf raum_produkte (pro Raum eigen).
  // Scope-Filter (Migration 081): projekt=alle, raum=ein Raum, auswahl=explizite IDs
  const scopeTyp   = (tokenData.scope_typ   as 'projekt' | 'raum' | 'auswahl' | null) ?? 'projekt'
  let   scopeIds   = (tokenData.scope_ids   as string[] | null) ?? []
  const raumFilter = scopeTyp === 'raum' && scopeIds[0] ? [scopeIds[0]] : raeumeDaten.map((r) => r.id)

  // scope_bereich_ids fail-safe nachladen (Migration 116) — Spalte könnte fehlen.
  let scopeBereichIds: string[] = []
  {
    const { data: sbData } = await supabase
      .from('freigabe_tokens')
      .select('scope_bereich_ids')
      .eq('id', tokenData.id)
      .maybeSingle()
    scopeBereichIds = ((sbData?.scope_bereich_ids as string[] | null) ?? [])
  }
  // Bei „auswahl" + ganzen Gruppen wird dynamisch zur Ladezeit aufgelöst →
  // KEIN SQL-Vorfilter (alle Raum-Produkte laden, dann in JS filtern). Reine
  // Produkt-Auswahl (ohne Bereiche) nutzt weiter den effizienten .in()-Vorfilter.
  const auswahlMitBereich = scopeTyp === 'auswahl' && scopeBereichIds.length > 0

  // Auto-Sync (auch für ALTE Links): Ein „Auswahl"-Link nimmt beim Öffnen die Produkte
  // auf, die seit seiner Erstellung zu seinen abgedeckten Räumen hinzugekommen sind.
  // So erscheinen neue Produkte automatisch — ohne den Link neu anzulegen. Die
  // Kuratierung bleibt erhalten (nur created_at > Token; bewusst entfernte Alt-Produkte
  // kommen nicht zurück). scope_ids ist die EINZIGE Quelle für Anzeige UND Schreib-Guard
  // → wir persistieren die Erweiterung (außer in der Vorschau). Komplett fail-safe.
  if (scopeTyp === 'auswahl' && scopeIds.length > 0) {
    try {
      const { data: rpRooms } = await supabase
        .from('raum_produkte').select('raum_id').in('id', scopeIds).is('deleted_at', null)
      const raumIds = Array.from(new Set((rpRooms ?? []).map((r) => r.raum_id as string)))
      const tokenErstellt = tokenData.created_at as string | null
      if (raumIds.length > 0 && tokenErstellt) {
        const { data: neu } = await supabase
          .from('raum_produkte')
          .select('id')
          .in('raum_id', raumIds)
          .is('deleted_at', null)
          .gt('created_at', tokenErstellt)
        const vorhanden = new Set(scopeIds)
        const neuIds = Array.from(new Set((neu ?? []).map((r) => r.id as string))).filter((id) => !vorhanden.has(id))
        if (neuIds.length > 0) {
          const erweitert = [...scopeIds, ...neuIds]
          if (vorschau) {
            scopeIds = erweitert
          } else {
            const { error: updErr } = await supabase
              .from('freigabe_tokens').update({ scope_ids: erweitert }).eq('id', tokenData.id)
            if (!updErr) scopeIds = erweitert
          }
        }
      }
    } catch {
      /* fail-safe: Sync darf die Freigabe-Seite nie blockieren */
    }
  }

  let rpQuery = supabase
    .from('raum_produkte')
    .select(`
      id,
      raum_id,
      menge,
      verkaufspreis_override,
      rabatt_prozent,
      reihenfolge,
      freigabe_status,
      freigabe_kommentar,
      produkte!inner(
        id, name, beschreibung, kategorie, einheit, verkaufspreis,
        bild_url, produkt_url, deleted_at,
        hinweis_extern, hinweis_extern_sichtbar
      )
    `)
    .in('raum_id', raumFilter)
    .order('reihenfolge')
    .order('created_at')

  if (scopeTyp === 'auswahl' && scopeIds.length > 0 && !auswahlMitBereich) {
    rpQuery = rpQuery.in('id', scopeIds)
  }

  const { data: rpDaten } = await rpQuery

  // 4b. Auswahl-Gruppen der in-scope Räume laden (Migration 114)
  const { data: gruppenDaten } = await supabase
    .from('produkt_gruppen')
    .select('id, raum_id, name, beschreibung, reihenfolge')
    .in('raum_id', raumFilter)
    .is('deleted_at', null)
    .order('reihenfolge')
    .order('created_at')

  const gruppenProRaum = new Map<string, { id: string; name: string; beschreibung: string | null }[]>()
  for (const g of (gruppenDaten ?? []) as { id: string; raum_id: string; name: string; beschreibung: string | null }[]) {
    const arr = gruppenProRaum.get(g.raum_id) ?? []
    arr.push({ id: g.id, name: g.name, beschreibung: g.beschreibung })
    gruppenProRaum.set(g.raum_id, arr)
  }

  // Block-Sammelnotiz des Kunden (Migration 119) — fail-safe (Spalte kann fehlen).
  const gruppenNotizMap = new Map<string, string | null>()
  {
    const gIds = (gruppenDaten ?? []).map((g) => (g as { id: string }).id)
    if (gIds.length > 0) {
      const { data: gnData } = await supabase.from('produkt_gruppen').select('id, kunde_notiz').in('id', gIds)
      for (const g of (gnData ?? []) as { id: string; kunde_notiz: string | null }[]) gruppenNotizMap.set(g.id, g.kunde_notiz ?? null)
    }
  }

  // 4c. Gruppen-/Favoriten-Felder fail-safe nachladen — so bricht die Seite NICHT,
  //     falls Migration 114 noch nicht eingespielt ist (Spalten fehlen → leere Map,
  //     alles wird als „ohne Gruppe" gerendert).
  const favMap = new Map<string, { produkt_gruppe_id: string | null; admin_favorit: boolean; kunde_favorit: boolean }>()
  const rpIds = (rpDaten ?? []).map((rp) => rp.id as string)
  if (rpIds.length > 0) {
    const { data: favData } = await supabase
      .from('raum_produkte')
      .select('id, produkt_gruppe_id, admin_favorit, kunde_favorit')
      .in('id', rpIds)
    for (const f of (favData ?? []) as { id: string; produkt_gruppe_id: string | null; admin_favorit: boolean | null; kunde_favorit: boolean | null }[]) {
      favMap.set(f.id, {
        produkt_gruppe_id: f.produkt_gruppe_id ?? null,
        admin_favorit: !!f.admin_favorit,
        kunde_favorit: !!f.kunde_favorit,
      })
    }
  }

  // 4d. Bereiche/"Gruppen" der in-scope Räume laden (Migration 116) — fail-safe.
  const bereicheProRaum = new Map<string, { id: string; name: string; beschreibung: string | null }[]>()
  {
    const { data: bereicheDaten } = await supabase
      .from('produkt_bereiche')
      .select('id, raum_id, name, beschreibung, reihenfolge')
      .in('raum_id', raumFilter)
      .is('deleted_at', null)
      .order('reihenfolge')
      .order('created_at')
    for (const b of (bereicheDaten ?? []) as { id: string; raum_id: string; name: string; beschreibung: string | null }[]) {
      const arr = bereicheProRaum.get(b.raum_id) ?? []
      arr.push({ id: b.id, name: b.name, beschreibung: b.beschreibung })
      bereicheProRaum.set(b.raum_id, arr)
    }
  }

  // 4e. Block→Bereich + Produkt→Bereich fail-safe nachladen (Migration 116).
  const blockBereich = new Map<string, string | null>()
  {
    const gIds = (gruppenDaten ?? []).map((g) => (g as { id: string }).id)
    if (gIds.length > 0) {
      const { data: gbData } = await supabase.from('produkt_gruppen').select('id, bereich_id').in('id', gIds).is('deleted_at', null)
      for (const g of (gbData ?? []) as { id: string; bereich_id: string | null }[]) blockBereich.set(g.id, g.bereich_id ?? null)
    }
  }
  const produktBereichMap = new Map<string, string | null>()
  if (rpIds.length > 0) {
    const { data: pbData } = await supabase.from('raum_produkte').select('id, bereich_id').in('id', rpIds)
    for (const r of (pbData ?? []) as { id: string; bereich_id: string | null }[]) produktBereichMap.set(r.id, r.bereich_id ?? null)
  }

  // 4f. Wunsch-Menge des Kunden je Produkt (Migration 119) — fail-safe.
  const kundeMengeMap = new Map<string, number | null>()
  if (rpIds.length > 0) {
    const { data: kmData } = await supabase.from('raum_produkte').select('id, kunde_menge').in('id', rpIds)
    for (const r of (kmData ?? []) as { id: string; kunde_menge: number | null }[]) kundeMengeMap.set(r.id, r.kunde_menge ?? null)
  }

  // 5. Struktur aufbauen: Räume mit Bereichen → Auswahl-Blöcke + Einzelprodukte
  const raeume: FreigabeRaum[] = raeumeDaten
    .map((raum) => {
      const alleProdukte = (rpDaten ?? [])
        .filter((rp) => {
          if (rp.raum_id !== raum.id) return false
          // Gelöschte Produkte ausblenden
          const p = rp.produkte as unknown as { deleted_at: string | null }
          if (p?.deleted_at) return false
          // „auswahl"-Scope mit ganzen Gruppen: dynamisch auflösen (Migration 116).
          if (auswahlMitBereich) {
            const rpId = rp.id as string
            return istImAuswahlScope(
              { id: rpId, produkt_gruppe_id: favMap.get(rpId)?.produkt_gruppe_id, bereich_id: produktBereichMap.get(rpId) },
              scopeIds, scopeBereichIds, blockBereich,
            )
          }
          return true
        })
        .map((rp): FreigabeProdukt => {
          type ProdRaw = {
            id: string; name: string; beschreibung: string | null; kategorie: string | null
            einheit: string; verkaufspreis: number | null; bild_url: string | null
            produkt_url: string | null
            hinweis_extern: string | null; hinweis_extern_sichtbar: boolean
          }
          const p = rp.produkte as unknown as ProdRaw
          // Endpreis über zentralen Helper: Override → Rabatt → gerundet
          const vp = effektiverVpNetto(
            {
              verkaufspreis_override: (rp.verkaufspreis_override as number | null) ?? null,
              rabatt_prozent: (rp.rabatt_prozent as number | null) ?? null,
            },
            p.verkaufspreis,
          )
          return {
            id: rp.id as string,           // raum_produkte.id — Key für Freigabe-Aktionen
            produkt_id: p.id,              // globale Produkt-ID für Bilder/Links
            name: p.name,
            beschreibung: p.beschreibung,
            kategorie: p.kategorie,
            menge: rp.menge,
            einheit: p.einheit,
            verkaufspreis: vp,
            bild_url: p.bild_url,
            produkt_url: p.produkt_url,
            status: ((rp.freigabe_status as ProduktStatus) ?? 'ausstehend'),
            kommentar: (rp.freigabe_kommentar as string | null) ?? null,
            kunde_menge: kundeMengeMap.get(rp.id as string) ?? null,
            hinweis: p.hinweis_extern_sichtbar ? p.hinweis_extern : null,
            rabatt_prozent: (rp.rabatt_prozent as number | null) ?? null,
            // Auswahl-Gruppe + Favoriten (Migration 114) — aus fail-safe favMap
            produkt_gruppe_id: favMap.get(rp.id as string)?.produkt_gruppe_id ?? null,
            admin_favorit: favMap.get(rp.id as string)?.admin_favorit ?? false,
            kunde_favorit: favMap.get(rp.id as string)?.kunde_favorit ?? false,
            // Bereich/"Gruppe" (Migration 116) — aus fail-safe produktBereichMap
            bereich_id: produktBereichMap.get(rp.id as string) ?? null,
          }
        })

      // In Auswahl-Gruppen (mehrere Alternativen) + lose Produkte partitionieren.
      // Eine Gruppe ist erst ab 2 Mitgliedern sinnvoll — 1-Produkt-Gruppen werden als
      // normales Einzelprodukt (lose, mit Freigeben/Ablehnen) gerendert.
      const gruppenDefs = gruppenProRaum.get(raum.id) ?? []
      const gruppen: FreigabeProduktGruppe[] = gruppenDefs
        .map((g) => ({
          id: g.id,
          name: g.name,
          beschreibung: g.beschreibung,
          kunde_notiz: gruppenNotizMap.get(g.id) ?? null,
          produkte: alleProdukte.filter((p) => p.produkt_gruppe_id === g.id),
        }))
        .filter((grp) => grp.produkte.length >= 2)
      const echteGruppenIds = new Set(gruppen.map((g) => g.id))
      const lose = alleProdukte.filter((p) => !p.produkt_gruppe_id || !echteGruppenIds.has(p.produkt_gruppe_id))

      // Bereiche/"Gruppen" bauen (Migration 116): je Bereich seine Auswahl-Blöcke
      // (Block-bereich_id == Bereich) + Einzelprodukte (resolveBereich == Bereich).
      // Nicht zugeordnete Items → synthetischer Trailing-Bereich „Ohne Gruppe".
      // Jedes Item liegt in genau EINEM Bereich (kein Doppelzählen).
      const resolveBereich = (p: FreigabeProdukt) =>
        bereichVonRaumProdukt({ produkt_gruppe_id: p.produkt_gruppe_id, bereich_id: p.bereich_id }, blockBereich)
      const bereichDefs = bereicheProRaum.get(raum.id) ?? []
      const bereichIdSet = new Set(bereichDefs.map((b) => b.id))
      const bereiche: FreigabeBereich[] = []
      for (const b of bereichDefs) {
        const bloecke = gruppen.filter((g) => (blockBereich.get(g.id) ?? null) === b.id)
        const produkte = lose.filter((p) => resolveBereich(p) === b.id)
        bereiche.push({ id: b.id, name: b.name, beschreibung: b.beschreibung, bloecke, produkte })
      }
      const ohneBloecke = gruppen.filter((g) => { const bb = blockBereich.get(g.id) ?? null; return !bb || !bereichIdSet.has(bb) })
      const ohneProdukte = lose.filter((p) => { const bb = resolveBereich(p); return !bb || !bereichIdSet.has(bb) })
      if (ohneBloecke.length > 0 || ohneProdukte.length > 0) {
        bereiche.push({ id: '__ohne__', name: 'Ohne Gruppe', beschreibung: null, bloecke: ohneBloecke, produkte: ohneProdukte })
      }

      return { id: raum.id, name: raum.name, bereiche, gruppen, produkte: lose }
    })
    .filter((r) => r.produkte.length > 0 || (r.gruppen?.length ?? 0) > 0 || (r.bereiche?.length ?? 0) > 0)

  if (raeume.length === 0) {
    return <Fehlerseite meldung="Für dieses Projekt wurden noch keine Produkte hinterlegt." />
  }

  const [kundeName, mwst, branding] = await Promise.all([
    Promise.resolve(projekt.kunden?.name ?? null),
    getMwstSatz(),
    brandingFuerToken(),
  ])

  const produktAnzahl = (r: FreigabeRaum) =>
    r.produkte.length + (r.gruppen?.reduce((s, g) => s + g.produkte.length, 0) ?? 0)
  const scopeBeschreibung =
    scopeTyp === 'projekt' ? 'Gesamtes Projekt' :
    scopeTyp === 'raum'    ? `Raum: ${raeume[0]?.name ?? ''}` :
                              `${raeume.reduce((sum, r) => sum + produktAnzahl(r), 0)} ausgewählte Produkte` +
                              (scopeBereichIds.length > 0 ? ` · ${scopeBereichIds.length} Gruppe${scopeBereichIds.length === 1 ? '' : 'n'}` : '')

  return (
    <FreigabeClient
      token={params.token}
      projektName={projekt.name}
      kundeName={kundeName}
      raeume={raeume}
      mwst={mwst}
      branding={branding}
      scopeBeschreibung={scopeBeschreibung}
      bereitsAbgeschlossen={vorschau ? false : tokenData.abgeschlossen_am != null}
      abgeschlossenDurch={tokenData.abgeschlossen_durch}
      vorschau={vorschau}
    />
  )
}

// ── Fehler-Seite ──────────────────────────────────────────────
function Fehlerseite({ meldung }: { meldung: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 bg-gray-200 rounded-xl mb-6">
          <span className="text-gray-500 font-bold text-lg">S</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Link nicht verfügbar</h1>
        <p className="text-sm text-gray-500 leading-relaxed">{meldung}</p>
      </div>
    </div>
  )
}
