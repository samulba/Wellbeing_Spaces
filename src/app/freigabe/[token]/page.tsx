import { createAdminClient } from '@/lib/supabase/admin'
import { getOrganisationIdOrNull } from '@/lib/supabase/server'
import { getMwstSatz } from '@/app/actions/einstellungen'
import { brandingFuerToken } from '@/app/actions/branding'
import FreigabeClient from './FreigabeClient'
import FreigabePinGate from './FreigabePinGate'
import { pinCookieGueltig } from '@/lib/freigabe-pin-cookie'
import { baueFreigabeRaeume, type FreigabeRpZeile } from '@/lib/freigabe-baum'
import { ladeAlleSeiten, ladeNachIds } from '@/lib/supabase-paginate'
import type { FreigabeRaum } from '@/lib/supabase/types'

// Öffentliche, datengetriebene Seite — niemals cachen, damit Admin-Status-Änderungen
// (z. B. Freigabe auf „offen" zurücksetzen) sofort sichtbar sind.
export const dynamic = 'force-dynamic'

interface Props {
  params: { token: string }
  searchParams?: { vorschau?: string; debug?: string }
}

export default async function FreigabePage({ params, searchParams }: Props) {
  const supabase = createAdminClient()

  // 1. Token validieren — inkl. Scope + Abschluss + Soft-Delete (Mig 081)
  const { data: tokenData, error: tokenErr } = await supabase
    .from('freigabe_tokens')
    .select('id, organisation_id, projekt_id, gueltig_bis, aktiv, scope_typ, scope_ids, abgeschlossen_am, abgeschlossen_durch, deleted_at, created_at')
    .eq('token', params.token)
    .maybeSingle()
  if (tokenErr) console.error('[freigabe:token]', params.token, tokenErr.message)

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

  // Deaktiviert/zurückgezogen gilt IMMER — auch in der Admin-Vorschau. Ein
  // entfernter Link ist für alle weg; sonst bliebe ein „alter Tab" mit ?vorschau=1
  // weiter nutzbar. Nur Ablauf/PIN/Abschluss werden in der Vorschau übersprungen.
  if (!tokenData.aktiv || tokenData.deleted_at) {
    return <Fehlerseite meldung="Dieser Freigabe-Link ist ungültig oder wurde zurückgezogen." />
  }

  if (!vorschau) {
    if (tokenData.gueltig_bis && new Date(tokenData.gueltig_bis) < new Date()) {
      return <Fehlerseite meldung="Dieser Freigabe-Link ist abgelaufen." />
    }
  }

  // 2. Projektdaten laden (inkl. PIN-Status – PIN selbst NICHT an Client weitergeben!)
  const { data: projektRaw, error: projektErr } = await supabase
    .from('projekte')
    .select('id, name, freigabe_pin, kunden(name)')
    .eq('id', tokenData.projekt_id)
    .is('deleted_at', null)
    .maybeSingle()
  if (projektErr) console.error('[freigabe:projekt]', params.token, projektErr.message)
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
  const { data: raeumeDaten, error: raeumeErr } = await supabase
    .from('raeume')
    .select('id, name, reihenfolge')
    .eq('projekt_id', tokenData.projekt_id)
    .is('deleted_at', null)
    .order('reihenfolge')
    .order('created_at')
  if (raeumeErr) console.error('[freigabe:raeume]', params.token, raeumeErr.message)

  if (!raeumeDaten || raeumeDaten.length === 0) {
    return <Fehlerseite meldung="Für dieses Projekt wurden noch keine Räume oder Produkte angelegt." />
  }

  // 4. Produkte via raum_produkte laden – erfasst sowohl direkt angelegte als auch
  //    aus Bibliothek hinzugefügte Produkte. NUR öffentliche Felder, KEINE internen Preise.
  //    freigabe_status liegt seit Migration 076 auf raum_produkte (pro Raum eigen).
  // Scope-Filter (Migration 081): projekt=alle, raum=ein Raum, auswahl=explizite IDs
  const scopeTyp   = (tokenData.scope_typ   as 'projekt' | 'raum' | 'auswahl' | null) ?? 'projekt'
  const scopeIds   = (tokenData.scope_ids   as string[] | null) ?? []
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
  // Begleit-Nachricht (Admin→Kunde, Migration 136) separat fail-safe nachladen — NICHT in
  // die Kern-Token-Query (die hat keinen Fallback und würde bei fehlender Spalte die ganze
  // Seite brechen).
  let begleitNachricht: string | null = null
  {
    const { data: bnData } = await supabase
      .from('freigabe_tokens')
      .select('begleit_nachricht')
      .eq('id', tokenData.id)
      .maybeSingle()
    begleitNachricht = ((bnData?.begleit_nachricht as string | null) ?? null)
  }
  // Auswahl-Links sind beim Erstellen EINGEFROREN: scope_ids ist die feste,
  // selbsttragende Produktliste → es wird IMMER der stabile .in('id', scopeIds)-Pfad
  // genutzt, sobald scope_ids gesetzt ist. Die dynamische Bereich-Auflösung greift nur
  // noch als Fallback für ganz alte Links OHNE scope_ids (vor dem Backfill, Migration 124).
  // Dadurch kann ein Link nie mehr „nicht verfügbar" sein, nur weil sich die Räume ändern.
  const auswahlMitBereich = scopeTyp === 'auswahl' && scopeIds.length === 0 && scopeBereichIds.length > 0

  // Gruppierungs-Spalten (Mig 114/116/119) MÖGLICHST atomar auf derselben Zeile
  // laden — exakt wie der Admin (getRaumProdukte). So kann die Block-/Bereich-
  // Zuordnung der Anzeige NIE von der DB abweichen (kein Desync/Row-Cap über
  // separate Backfill-Queries). Fail-safe: fehlt eine Spalte (DB ohne Migration),
  // liefert PostgREST einen Fehler → Minimal-Select + Backfill-Maps wie bisher.
  const RP_BASIS = 'id, raum_id, menge, verkaufspreis_override, rabatt_prozent, reihenfolge, freigabe_status, freigabe_kommentar'
  const RP_GRUPPE = 'produkt_gruppe_id, bereich_id, admin_favorit, kunde_favorit, kunde_menge'
  const RP_PRODUKT = `produkte!inner(
        id, name, beschreibung, kategorie, einheit, verkaufspreis,
        bild_url, produkt_url, deleted_at,
        hinweis_extern, hinweis_extern_sichtbar
      )`
  const baueRpQuery = (felder: string) => {
    let q = supabase
      .from('raum_produkte')
      .select(felder)
      .in('raum_id', raumFilter)
      .order('reihenfolge')
      .order('created_at')
      .order('id') // eindeutiger Tiebreaker → stabile, lücken-/duplikatfreie Pagination
    if (scopeTyp === 'auswahl' && scopeIds.length > 0 && !auswahlMitBereich) {
      q = q.in('id', scopeIds)
    }
    return q
  }

  // Konkreter Zeilentyp (der dynamische .select(string) liefert sonst GenericStringError).
  // Definiert in der reinen Baum-Logik (freigabe-baum.ts), die ihn ebenfalls konsumiert.
  type RpZeile = FreigabeRpZeile

  // ALLE Seiten laden (paginiert) — sonst cappt PostgREST bei großen Räumen still auf ~1000
  // Zeilen und zuletzt hinzugefügte Produkte/Blöcke verschwinden im Link. Bei ≤1000 identisch
  // zu vorher (eine Seite). Stabile Ordnung via .order('id') in baueRpQuery (Pflicht für Pagination).
  let gruppenInline = true
  const rpRich = await ladeAlleSeiten<RpZeile>(async (von, bis) => {
    const r = await baueRpQuery(`${RP_BASIS}, ${RP_GRUPPE}, ${RP_PRODUKT}`).range(von, bis)
    return { data: r.data as unknown as RpZeile[] | null, error: r.error }
  })
  let rpDaten = rpRich.data
  if (rpRich.error) {
    // Migrations-Spalte fehlt → Minimal-Select; Gruppierung kommt aus Backfill-Maps.
    // Sichtbar loggen: ein Fehler hier deutet auf fehlende Migration / Schema-Drift.
    console.error('[freigabe:rp-rich]', params.token, rpRich.error.message)
    gruppenInline = false
    const fallback = await ladeAlleSeiten<RpZeile>(async (von, bis) => {
      const r = await baueRpQuery(`${RP_BASIS}, ${RP_PRODUKT}`).range(von, bis)
      return { data: r.data as unknown as RpZeile[] | null, error: r.error }
    })
    if (fallback.error) console.error('[freigabe:rp-fallback]', params.token, fallback.error.message)
    rpDaten = fallback.data
  }

  // 4b. Auswahl-Gruppen der in-scope Räume laden (Migration 114).
  // KEIN deleted_at-Filter: die Block-Zugehörigkeit lebt auf raum_produkte.produkt_gruppe_id.
  // Ist eine Block-Zeile (fälschlich) als gelöscht markiert, ihre Produkte aber noch
  // zugeordnet, müssen sie trotzdem als Block erscheinen. Leere (echt gelöschte) Blöcke
  // werden weiter unten ohnehin herausgefiltert (kein Mitglied im Scope).
  const { data: gruppenDaten, error: gruppenErr } = await supabase
    .from('produkt_gruppen')
    .select('id, raum_id, name, beschreibung, reihenfolge')
    .in('raum_id', raumFilter)
    .order('reihenfolge')
    .order('created_at')
  if (gruppenErr) console.error('[freigabe:produkt_gruppen]', params.token, gruppenErr.message)

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

  // 4c. Gruppen-/Favoriten-Felder NUR im Fallback nachladen (wenn die Spalten
  //     nicht inline geladen werden konnten). Auf dem Normalpfad reisen sie auf
  //     rpDaten → kein separater Roundtrip, kein Desync/Row-Cap.
  const favMap = new Map<string, { produkt_gruppe_id: string | null; admin_favorit: boolean; kunde_favorit: boolean }>()
  const rpIds = (rpDaten ?? []).map((rp) => rp.id as string)
  // Lädt raum_produkte-Folgefelder für (potenziell >1000) rpIds vollständig, gechunkt —
  // sonst cappt auch `.in('id', …)` bei großen Räumen still auf ~1000 Treffer.
  const ladeRpNachIds = <T,>(felder: string) =>
    ladeNachIds<T>(rpIds, async (idChunk) => {
      const r = await supabase.from('raum_produkte').select(felder).in('id', idChunk)
      return { data: r.data as unknown as T[] | null, error: r.error }
    })
  if (!gruppenInline && rpIds.length > 0) {
    const { data: favData } = await ladeRpNachIds<{ id: string; produkt_gruppe_id: string | null; admin_favorit: boolean | null; kunde_favorit: boolean | null }>(
      'id, produkt_gruppe_id, admin_favorit, kunde_favorit',
    )
    for (const f of favData ?? []) {
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
    const { data: bereicheDaten, error: bereicheErr } = await supabase
      .from('produkt_bereiche')
      .select('id, raum_id, name, beschreibung, reihenfolge')
      .in('raum_id', raumFilter)
      .is('deleted_at', null)
      .order('reihenfolge')
      .order('created_at')
    if (bereicheErr) console.error('[freigabe:produkt_bereiche]', params.token, bereicheErr.message)
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
      // Kein deleted_at-Filter — Block-Bereich muss auch für (fälschlich) als gelöscht
      // markierte Blöcke mit noch zugeordneten Produkten verfügbar sein (siehe oben).
      const { data: gbData } = await supabase.from('produkt_gruppen').select('id, bereich_id').in('id', gIds)
      for (const g of (gbData ?? []) as { id: string; bereich_id: string | null }[]) blockBereich.set(g.id, g.bereich_id ?? null)
    }
  }
  const produktBereichMap = new Map<string, string | null>()
  if (!gruppenInline && rpIds.length > 0) {
    const { data: pbData } = await ladeRpNachIds<{ id: string; bereich_id: string | null }>('id, bereich_id')
    for (const r of pbData ?? []) produktBereichMap.set(r.id, r.bereich_id ?? null)
  }

  // 4f. Wunsch-Menge des Kunden je Produkt (Migration 119) — nur im Fallback.
  const kundeMengeMap = new Map<string, number | null>()
  if (!gruppenInline && rpIds.length > 0) {
    const { data: kmData } = await ladeRpNachIds<{ id: string; kunde_menge: number | null }>('id, kunde_menge')
    for (const r of kmData ?? []) kundeMengeMap.set(r.id, r.kunde_menge ?? null)
  }

  // 4g. Bundle-Instanz je Produkt (Migration 128) — EIGENE fail-safe Query (nicht
  // im Rich-Select), damit ein fehlendes Mig 128 NIE die Block-/Bereich-Ladung kippt.
  // Fehlt die Spalte → bErr → leere Map → keine Sets, alles andere unberührt.
  const bundleIdMap = new Map<string, string | null>()
  if (rpIds.length > 0) {
    const { data: bData, error: bErr } = await ladeRpNachIds<{ id: string; bundle_id: string | null }>('id, bundle_id')
    if (bErr) console.error('[freigabe:bundle_id]', params.token, bErr.message)
    else for (const r of bData ?? []) bundleIdMap.set(r.id, r.bundle_id ?? null)
  }

  // Namen der Set-Köpfe (für die Set-Karte) — Admin-Client (anon-safe), einmal vorab.
  const bundleNamen = new Map<string, string>()
  const alleBundleIds = Array.from(new Set(Array.from(bundleIdMap.values()).filter(Boolean) as string[]))
  if (alleBundleIds.length > 0) {
    const { data: bnData } = await supabase.from('produkte').select('id, name').in('id', alleBundleIds)
    for (const b of (bnData ?? []) as { id: string; name: string }[]) bundleNamen.set(b.id, b.name)
  }

  // Gruppierungs-Accessoren: lesen aus der rpDaten-Zeile (Normalpfad, atomar) oder
  // aus den Backfill-Maps (Fallback). EINE Quelle für Scope-Filter UND gerendertes
  // Objekt → Anzeige kann nie „lose vs. im Block" widersprüchlich werden.
  const rpGruppeId = (rp: RpZeile): string | null =>
    gruppenInline ? (rp.produkt_gruppe_id ?? null) : (favMap.get(rp.id)?.produkt_gruppe_id ?? null)
  const rpBereichId = (rp: RpZeile): string | null =>
    gruppenInline ? (rp.bereich_id ?? null) : (produktBereichMap.get(rp.id) ?? null)
  const rpKundeMenge = (rp: RpZeile): number | null =>
    gruppenInline ? (rp.kunde_menge ?? null) : (kundeMengeMap.get(rp.id) ?? null)
  const rpAdminFavorit = (rp: RpZeile): boolean =>
    gruppenInline ? !!rp.admin_favorit : (favMap.get(rp.id)?.admin_favorit ?? false)
  const rpKundeFavorit = (rp: RpZeile): boolean =>
    gruppenInline ? !!rp.kunde_favorit : (favMap.get(rp.id)?.kunde_favorit ?? false)
  const rpBundleId = (rp: RpZeile): string | null => bundleIdMap.get(rp.id) ?? null

  // Raumnamen-Lookup — auch für Räume, die NICHT in raeumeDaten stehen. Ein Raum-Scope-Link
  // lädt Produkte direkt über raum_id; steht der Raum nicht in der (nicht-gelöschten) Liste,
  // rendert baueFreigabeRaeume ihn trotzdem aus den Produkten. Hier holen wir den echten Namen.
  const raumNameById = new Map<string, string>(
    raeumeDaten.map((r) => [r.id as string, r.name as string]),
  )
  if (scopeTyp === 'raum' && scopeIds[0] && !raumNameById.has(scopeIds[0])) {
    const { data: scopedRaum } = await supabase
      .from('raeume').select('id, name').eq('id', scopeIds[0]).maybeSingle()
    if (scopedRaum?.name) raumNameById.set(scopedRaum.id as string, scopedRaum.name as string)
  }

  // 5. Struktur aufbauen — reine, getestete Logik (src/lib/freigabe-baum.ts):
  //    Räume → Bereiche → Auswahl-Blöcke/Sets → Einzelprodukte. Die fragile
  //    Gruppierung (inkl. Set-Dedupe bei mehrfach hinzugefügtem Set, Migration 134)
  //    ist dort isoliert und unit-getestet → kann bei Updates nicht still brechen.
  const raeume: FreigabeRaum[] = baueFreigabeRaeume({
    raeume: raeumeDaten,
    raumNameById,
    rpDaten: rpDaten ?? [],
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
  })

  // Diagnose (immer, billig): wie viele Produkt-Zeilen wirklich geladen wurden. Vor dem
  // Pagination-Fix hätte ein stiller Row-Cap hier ~1000 angezeigt (statt der echten Anzahl).
  const geladenDiagnose = {
    rp: (rpDaten ?? []).length,
    bloecke: (gruppenDaten ?? []).length,
    raeume: raeume.length,
    scopeTyp,
  }
  console.error('[freigabe:geladen]', params.token, JSON.stringify(geladenDiagnose))

  if (raeume.length === 0) {
    // Diagnose: WARUM ist die Liste leer? In Vercel-Logs sichtbar; für eingeloggte Admins
    // zusätzlich on-screen via ?vorschau=1&debug=1 (zeigt den exakten Grund, kein Rätselraten).
    const diagnose = {
      scopeTyp,
      scopeIds,
      raumFilter,
      rpAnzahl: (rpDaten ?? []).length,
      raeumeAnzahl: raeumeDaten.length,
      raeumeIds: raeumeDaten.map((r) => r.id),
      scopeBereichIds,
      gruppenInline,
    }
    console.error('[freigabe:leer]', params.token, JSON.stringify(diagnose))
    if (vorschau && searchParams?.debug === '1') {
      return <FreigabeLeerDiagnose token={params.token} diagnose={diagnose} />
    }
    // Auswahl-Link, der (aktuell) auf nichts auflöst → klare Meldung statt „keine Produkte".
    const istAuswahlMitInhalt = scopeTyp === 'auswahl' && (scopeIds.length > 0 || scopeBereichIds.length > 0)
    return (
      <Fehlerseite
        meldung={
          istAuswahlMitInhalt
            ? 'Die für diesen Link ausgewählten Produkte oder Gruppen sind derzeit nicht verfügbar. Bitte fordern Sie einen aktualisierten Freigabe-Link an.'
            : 'Für dieses Projekt wurden noch keine Produkte hinterlegt.'
        }
      />
    )
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
    <>
      {vorschau && searchParams?.debug === '1' && (
        <div className="fixed top-0 inset-x-0 z-[100] bg-amber-100 text-amber-900 text-[11px] font-medium px-3 py-1 text-center shadow">
          Diagnose · geladen: {geladenDiagnose.rp} Produkte · {geladenDiagnose.bloecke} Blöcke · {geladenDiagnose.raeume} Räume · scope={geladenDiagnose.scopeTyp}
        </div>
      )}
      <FreigabeClient
        token={params.token}
        projektName={projekt.name}
        kundeName={kundeName}
        raeume={raeume}
        mwst={mwst}
        branding={branding}
        scopeBeschreibung={scopeBeschreibung}
        begleitNachricht={begleitNachricht}
        bereitsAbgeschlossen={vorschau ? false : tokenData.abgeschlossen_am != null}
        abgeschlossenDurch={tokenData.abgeschlossen_durch}
        vorschau={vorschau}
      />
    </>
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

// ── Admin-Diagnose (nur Vorschau + ?debug=1) ──────────────────
// Zeigt, WARUM ein Link „keine Produkte" liefert, damit die Ursache in einem Klick
// feststeht (Token-Scope, geladene Produkte, Raumliste). Temporär — nach Klärung entfernen.
function FreigabeLeerDiagnose({
  token,
  diagnose,
}: {
  token: string
  diagnose: {
    scopeTyp: string
    scopeIds: string[]
    raumFilter: string[]
    rpAnzahl: number
    raeumeAnzahl: number
    raeumeIds: string[]
    scopeBereichIds: string[]
    gruppenInline: boolean
  }
}) {
  const zeilen: [string, string][] = [
    ['Scope-Typ', diagnose.scopeTyp],
    ['scope_ids', JSON.stringify(diagnose.scopeIds)],
    ['Raum-Filter (geladen für)', JSON.stringify(diagnose.raumFilter)],
    ['Geladene Produkte (rpDaten)', String(diagnose.rpAnzahl)],
    ['Räume im Projekt (nicht gelöscht)', `${diagnose.raeumeAnzahl} → ${JSON.stringify(diagnose.raeumeIds)}`],
    ['scope_bereich_ids', JSON.stringify(diagnose.scopeBereichIds)],
    ['Gruppierung inline?', String(diagnose.gruppenInline)],
  ]
  const hinweis =
    diagnose.rpAnzahl === 0
      ? 'rpDaten = 0 → für die gescopte Raum-ID wurden KEINE Produkte gefunden. Wahrscheinlich zeigt der Link auf eine veraltete/umbenannte Raum-ID (scope_ids stimmt nicht mit dem aktuellen Raum überein). Lösung: Link löschen und neu erstellen.'
      : 'Produkte WURDEN geladen — sie sollten jetzt (nach dem Fix) gerendert werden. Wird das hier trotzdem angezeigt, bitte diese Werte an die Entwicklung geben.'
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="max-w-lg w-full bg-white border border-amber-200 rounded-2xl shadow-sm p-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-600 mb-1">Admin-Diagnose · nur Vorschau</p>
        <h1 className="text-lg font-semibold text-gray-900 mb-1">Freigabe-Link liefert keine Produkte</h1>
        <p className="text-xs text-gray-400 mb-4 break-all">Token: {token}</p>
        <dl className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden mb-4">
          {zeilen.map(([k, v]) => (
            <div key={k} className="flex items-start gap-3 px-3 py-2 bg-white">
              <dt className="text-xs font-medium text-gray-500 w-44 shrink-0">{k}</dt>
              <dd className="text-xs font-mono text-gray-800 break-all">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-gray-600 leading-relaxed bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">{hinweis}</p>
      </div>
    </div>
  )
}
