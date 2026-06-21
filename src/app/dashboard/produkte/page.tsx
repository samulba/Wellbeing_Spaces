import { createClient } from '@/lib/supabase/server'
import { Package } from 'lucide-react'
import ProdukteTabelle, { type ProduktZeile } from '@/components/ProdukteTabelle'
import NeuesProduktModal from '@/components/NeuesProduktModal'
import StickyPageHeader from '@/components/StickyPageHeader'
import type { KategorieOption } from '@/components/KategorieDropdown'
import type { ProjektOption, RaumOption } from '@/components/ProduktZuweisenModal'
import { getMwstSatz, getKategorien } from '@/app/actions/einstellungen'
import { berechneBundlePreis } from '@/lib/bundle-preis'

type ProduktRoh = {
  id: string; name: string; kategorie: string | null; menge: number; einheit: string
  verkaufspreis: number | null; bild_url: string | null; produkt_url: string | null
  partner_id: string | null; ist_bundle?: boolean
}

async function getProdukte(): Promise<ProduktZeile[]> {
  const supabase = await createClient()

  // produkte laden — fail-safe: mit ist_bundle (Mig 128) probieren, sonst ohne.
  const baseCols = 'id, name, kategorie, menge, einheit, verkaufspreis, bild_url, produkt_url, partner_id'
  let prodData: ProduktRoh[] = []
  let hatBundleSpalte = true
  const mitBundle = await supabase
    .from('produkte').select(baseCols + ', ist_bundle').is('deleted_at', null).order('name')
  if (mitBundle.error) {
    hatBundleSpalte = false
    const ohne = await supabase.from('produkte').select(baseCols).is('deleted_at', null).order('name')
    prodData = (ohne.data ?? []) as unknown as ProduktRoh[]
  } else {
    prodData = (mitBundle.data ?? []) as unknown as ProduktRoh[]
  }

  const [{ data: partnerData }, { data: raumProdData }] = await Promise.all([
    supabase.from('partner').select('id, name').is('deleted_at', null),
    supabase.from('raum_produkte').select('produkt_id, bestellstatus'),
  ])

  const partnerMap = Object.fromEntries((partnerData ?? []).map((p) => [p.id, p]))

  // Anzahl Räume + Anzahl erfolgreich gelieferte raum_produkte pro Produkt
  const raumAnzahlMap: Record<string, number> = {}
  const geliefertMap: Record<string, number> = {}
  for (const rp of raumProdData ?? []) {
    raumAnzahlMap[rp.produkt_id] = (raumAnzahlMap[rp.produkt_id] ?? 0) + 1
    if (rp.bestellstatus === 'geliefert' || rp.bestellstatus === 'rechnung_erhalten') {
      geliefertMap[rp.produkt_id] = (geliefertMap[rp.produkt_id] ?? 0) + 1
    }
  }

  // Bundle-Infos (Komponentenzahl + Set-Preis) für Bundle-Köpfe
  const bundleInfo = new Map<string, { anzahl: number; setPreis: number | null }>()
  const empfohlenSet = new Set<string>()
  if (hatBundleSpalte) {
    const bundleIds = prodData.filter((p) => p.ist_bundle).map((p) => p.id)
    if (bundleIds.length > 0) {
      // Empfohlen-Flag (Mig 132) — eigene fail-safe Query, damit fehlende Mig 132
      // die Set-Preis-Berechnung nicht kippt.
      try {
        const { data: eData, error: eErr } = await supabase
          .from('produkte').select('id, bundle_empfohlen').in('id', bundleIds)
        if (!eErr) for (const r of (eData ?? []) as { id: string; bundle_empfohlen: boolean | null }[]) {
          if (r.bundle_empfohlen) empfohlenSet.add(r.id)
        }
      } catch { /* Mig 132 noch nicht eingespielt */ }

      const { data: bData } = await supabase
        .from('produkte')
        .select('id, bundle_preis_modus, bundle_rabatt_prozent, bundle_festpreis, komponenten:bundle_komponenten!bundle_id(menge, komponente:produkte!komponente_produkt_id(verkaufspreis, deleted_at))')
        .in('id', bundleIds)
      type BRow = {
        id: string; bundle_preis_modus: 'summe' | 'rabatt' | 'festpreis' | null
        bundle_rabatt_prozent: number | null; bundle_festpreis: number | null
        komponenten: { menge: number; komponente: { verkaufspreis: number | null; deleted_at: string | null } | null }[] | null
      }
      for (const b of (bData ?? []) as unknown as BRow[]) {
        const komps = (b.komponenten ?? []).filter((k) => k.komponente && k.komponente.deleted_at == null)
        const preis = berechneBundlePreis(
          b.bundle_preis_modus, b.bundle_rabatt_prozent, b.bundle_festpreis,
          komps.map((k) => ({ menge: k.menge, verkaufspreis: k.komponente?.verkaufspreis ?? 0 })),
        )
        bundleInfo.set(b.id, { anzahl: komps.length, setPreis: preis.setPreis })
      }
    }
  }

  return prodData.map((p) => {
    const partner = p.partner_id ? partnerMap[p.partner_id] : null
    const istBundle = !!p.ist_bundle
    const info = istBundle ? bundleInfo.get(p.id) : undefined
    return {
      id:                 p.id,
      name:               p.name,
      kategorie:          p.kategorie,
      menge:              p.menge,
      einheit:            p.einheit,
      verkaufspreis:      istBundle ? (info?.setPreis ?? p.verkaufspreis) : p.verkaufspreis,
      bild_url:           p.bild_url,
      produkt_url:        p.produkt_url,
      partnerName:        partner?.name ?? null,
      partnerId:          p.partner_id,
      raumId:             null,
      raumName:           null,
      projektId:          null,
      projektName:        null,
      kundeName:          null,
      verwendetInAnzahl:  raumAnzahlMap[p.id] ?? 0,
      gelieferteAnzahl:   geliefertMap[p.id] ?? 0,
      istBundle,
      komponentenAnzahl:  info?.anzahl ?? 0,
      setPreisNetto:      info?.setPreis ?? null,
      empfohlen:          istBundle && empfohlenSet.has(p.id),
    }
  })
}

async function getProjekteMitRaeumen(): Promise<{ projekte: ProjektOption[]; raeume: RaumOption[] }> {
  const supabase = await createClient()
  const [{ data: projData }, { data: raumData }] = await Promise.all([
    supabase.from('projekte').select('id, name').is('deleted_at', null).order('name'),
    supabase.from('raeume').select('id, name, projekt_id').is('deleted_at', null).order('name'),
  ])
  return {
    projekte: (projData ?? []) as ProjektOption[],
    raeume:   (raumData ?? []) as RaumOption[],
  }
}

export default async function ProdukteSeite() {
  const [produkte, kategorienRoh, { projekte, raeume }, mwst] = await Promise.all([
    getProdukte(),
    getKategorien('produktkategorie'),
    getProjekteMitRaeumen(),
    getMwstSatz(),
  ])
  const kategorienListe: KategorieOption[] = kategorienRoh.map((k) => ({ name: k.name, icon: k.icon }))

  return (
    <div className="flex-1 overflow-y-auto animate-fadeIn">
      <StickyPageHeader
        title="Produkte"
        count={produkte.length}
        countLabel={produkte.length === 1 ? 'Produkt in der Bibliothek' : 'Produkte in der Bibliothek'}
        action={<NeuesProduktModal />}
      />
      <div className="px-6 py-6">
        {produkte.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-wellbeing-cream flex items-center justify-center">
              <Package className="w-7 h-7 text-wellbeing-green-light" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">Noch keine Produkte angelegt</p>
              <p className="text-xs text-gray-400 mt-1">Lege Produkte in einem Projekt → Raum an oder füge zur Bibliothek hinzu.</p>
            </div>
            <NeuesProduktModal />
          </div>
        ) : (
          <ProdukteTabelle produkte={produkte} kategorienListe={kategorienListe} projekte={projekte} raeume={raeume} mwst={mwst} />
        )}
      </div>
    </div>
  )
}
