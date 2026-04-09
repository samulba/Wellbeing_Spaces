import { createAdminClient } from '@/lib/supabase/admin'
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

  // 2. Projektdaten laden
  const { data: projektRaw } = await supabase
    .from('projekte')
    .select('id, name, kunden(name)')
    .eq('id', tokenData.projekt_id)
    .is('deleted_at', null)
    .single()
  const projekt = projektRaw as typeof projektRaw & { kunden: { name: string } | null } | null

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

  const kundeName = projekt.kunden?.name ?? null

  return (
    <FreigabeClient
      token={params.token}
      projektName={projekt.name}
      kundeName={kundeName}
      raeume={raeume}
    />
  )
}

// ── Fehler-Seite ──────────────────────────────────────────────
function Fehlerseite({ meldung }: { meldung: string }) {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <p className="text-xs text-stone-400 uppercase tracking-widest mb-4">WBC Studio</p>
        <h1 className="text-lg font-semibold text-stone-800 mb-2">Link nicht verfügbar</h1>
        <p className="text-sm text-stone-500 leading-relaxed">{meldung}</p>
      </div>
    </div>
  )
}
