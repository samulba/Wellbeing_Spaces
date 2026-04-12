import { createAdminClient } from '@/lib/supabase/admin'
import { getMwstSatz } from '@/app/actions/einstellungen'
import FreigabeClient from './FreigabeClient'
import type { FreigabeRaum, FreigabeProdukt, ProduktStatus } from '@/lib/supabase/types'

interface Props {
  params: { token: string }
}

export default async function FreigabePage({ params }: Props) {
  const supabase = createAdminClient()

  // 1. Token validieren
  const { data: tokenData } = await supabase
    .from('freigabe_tokens')
    .select('projekt_id, gueltig_bis, aktiv')
    .eq('token', params.token)
    .single()

  if (!tokenData || !tokenData.aktiv) {
    return <Fehlerseite meldung="Dieser Freigabe-Link ist ungültig oder wurde deaktiviert." />
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
    .single()
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

  // 4. Produkte laden – NUR öffentliche Felder, KEINE internen Preise
  const { data: produkteDaten } = await supabase
    .from('produkte')
    .select(`
      id,
      raum_id,
      name,
      beschreibung,
      kategorie,
      menge,
      einheit,
      verkaufspreis,
      bild_url,
      produkt_url,
      produktstatus ( status, kommentar )
    `)
    .in(
      'raum_id',
      raeumeDaten.map((r) => r.id)
    )
    .is('deleted_at', null)
    .order('reihenfolge')
    .order('created_at')

  // 5. Struktur aufbauen: Räume mit Produkten
  const raeume: FreigabeRaum[] = raeumeDaten
    .map((raum) => {
      const raumpProdukte = (produkteDaten ?? [])
        .filter((p) => p.raum_id === raum.id)
        .map((p): FreigabeProdukt => {
          type PS = { status: string; kommentar: string | null } | null
          const psRaw = p.produktstatus as PS | PS[]
          const ps = Array.isArray(psRaw) ? psRaw[0] : psRaw
          return {
            id: p.id,
            name: p.name,
            beschreibung: p.beschreibung,
            kategorie: p.kategorie,
            menge: p.menge,
            einheit: p.einheit,
            verkaufspreis: p.verkaufspreis,
            bild_url: p.bild_url,
            produkt_url: p.produkt_url,
            status: (ps?.status as ProduktStatus) ?? 'ausstehend',
            kommentar: ps?.kommentar ?? null,
          }
        })
      return { id: raum.id, name: raum.name, produkte: raumpProdukte }
    })
    .filter((r) => r.produkte.length > 0)

  if (raeume.length === 0) {
    return <Fehlerseite meldung="Für dieses Projekt wurden noch keine Produkte hinterlegt." />
  }

  const [kundeName, mwst] = [projekt.kunden?.name ?? null, await getMwstSatz()]

  return (
    <FreigabeClient
      token={params.token}
      projektName={projekt.name}
      kundeName={kundeName}
      raeume={raeume}
      mwst={mwst}
      hatPin={projekt.freigabe_pin != null}
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
