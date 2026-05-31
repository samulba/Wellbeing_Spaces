import { createAdminClient } from '@/lib/supabase/admin'
import { getMwstSatz } from '@/app/actions/einstellungen'
import { brandingFuerToken } from '@/app/actions/branding'
import { effektiverVpNetto } from '@/lib/preise'
import FreigabeClient from './FreigabeClient'
import type { FreigabeRaum, FreigabeProdukt, FreigabeProduktGruppe, ProduktStatus } from '@/lib/supabase/types'

interface Props {
  params: { token: string }
}

export default async function FreigabePage({ params }: Props) {
  const supabase = createAdminClient()

  // 1. Token validieren — inkl. Scope + Abschluss + Soft-Delete (Mig 081)
  const { data: tokenData } = await supabase
    .from('freigabe_tokens')
    .select('id, projekt_id, gueltig_bis, aktiv, scope_typ, scope_ids, abgeschlossen_am, abgeschlossen_durch, deleted_at')
    .eq('token', params.token)
    .maybeSingle()

  if (!tokenData || !tokenData.aktiv || tokenData.deleted_at) {
    return <Fehlerseite meldung="Dieser Freigabe-Link ist ungültig oder wurde zurückgezogen." />
  }

  if (tokenData.gueltig_bis && new Date(tokenData.gueltig_bis) < new Date()) {
    return <Fehlerseite meldung="Dieser Freigabe-Link ist abgelaufen." />
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
  const scopeIds   = (tokenData.scope_ids   as string[] | null) ?? []
  const raumFilter = scopeTyp === 'raum' && scopeIds[0] ? [scopeIds[0]] : raeumeDaten.map((r) => r.id)

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

  if (scopeTyp === 'auswahl' && scopeIds.length > 0) {
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

  // 5. Struktur aufbauen: Räume mit Auswahl-Gruppen + losen Produkten
  const raeume: FreigabeRaum[] = raeumeDaten
    .map((raum) => {
      const alleProdukte = (rpDaten ?? [])
        .filter((rp) => {
          if (rp.raum_id !== raum.id) return false
          // Gelöschte Produkte ausblenden
          const p = rp.produkte as unknown as { deleted_at: string | null }
          return !p?.deleted_at
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
            hinweis: p.hinweis_extern_sichtbar ? p.hinweis_extern : null,
            rabatt_prozent: (rp.rabatt_prozent as number | null) ?? null,
            // Auswahl-Gruppe + Favoriten (Migration 114) — aus fail-safe favMap
            produkt_gruppe_id: favMap.get(rp.id as string)?.produkt_gruppe_id ?? null,
            admin_favorit: favMap.get(rp.id as string)?.admin_favorit ?? false,
            kunde_favorit: favMap.get(rp.id as string)?.kunde_favorit ?? false,
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
          produkte: alleProdukte.filter((p) => p.produkt_gruppe_id === g.id),
        }))
        .filter((grp) => grp.produkte.length >= 2)
      const echteGruppenIds = new Set(gruppen.map((g) => g.id))
      const lose = alleProdukte.filter((p) => !p.produkt_gruppe_id || !echteGruppenIds.has(p.produkt_gruppe_id))

      return { id: raum.id, name: raum.name, gruppen, produkte: lose }
    })
    .filter((r) => r.produkte.length > 0 || (r.gruppen?.length ?? 0) > 0)

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
                              `${raeume.reduce((sum, r) => sum + produktAnzahl(r), 0)} ausgewählte Produkte`

  return (
    <FreigabeClient
      token={params.token}
      projektName={projekt.name}
      kundeName={kundeName}
      raeume={raeume}
      mwst={mwst}
      hatPin={!!projekt.freigabe_pin && projekt.freigabe_pin.toString().trim().length >= 4}
      branding={branding}
      scopeBeschreibung={scopeBeschreibung}
      bereitsAbgeschlossen={tokenData.abgeschlossen_am != null}
      abgeschlossenDurch={tokenData.abgeschlossen_durch}
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
