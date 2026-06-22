import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import ProjekteGrid, { type ProjektMitStats } from '@/components/ProjekteGrid'
import StickyPageHeader from '@/components/StickyPageHeader'

async function getProjekteMitStats(): Promise<ProjektMitStats[]> {
  const supabase = await createClient()

  // Wir laden raum_produkte (Junction) + produkte zusammen — deckt Bibliotheks-
  // Produkte, die erst via raum_produkte in einen Raum verlinkt sind, korrekt ab.
  const [{ data: projekte }, { data: raeume }, { data: rps }] = await Promise.all([
    supabase.from('projekte').select('*, kunden(id, name, logo_url)').is('deleted_at', null).order('archiviert').order('created_at', { ascending: false }),
    supabase.from('raeume').select('id, projekt_id').is('deleted_at', null),
    supabase
      .from('raum_produkte')
      // Bestell-/Freigabe-Status liegen seit S71 (Mig 076) auf raum_produkte selbst,
      // NICHT mehr auf produkte/produktstatus — sonst zeigen die Karten veraltete Werte.
      .select('raum_id, menge, verkaufspreis_override, rabatt_prozent, bestellstatus, freigabe_status, produkte(verkaufspreis, deleted_at)'),
  ])

  // raum_id → projekt_id
  const raumProjektMap: Record<string, string> = {}
  const raumCount: Record<string, number> = {}
  for (const r of raeume ?? []) {
    raumProjektMap[r.id] = r.projekt_id
    raumCount[r.projekt_id] = (raumCount[r.projekt_id] ?? 0) + 1
  }

  const produkteGesamt:   Record<string, number> = {}
  const freigegebenCount: Record<string, number> = {}
  const bestelltCount:    Record<string, number> = {}
  const geliefertCount:   Record<string, number> = {}
  const vpGesamt:         Record<string, number> = {}

  type Row = {
    raum_id: string
    menge: number
    verkaufspreis_override: number | null
    rabatt_prozent: number | null
    bestellstatus: string | null
    freigabe_status: string | null
    produkte: {
      verkaufspreis: number | null
      deleted_at: string | null
    } | null
  }
  for (const e of (rps ?? []) as unknown as Row[]) {
    const pid = raumProjektMap[e.raum_id]
    if (!pid) continue
    const prod = e.produkte
    if (!prod || prod.deleted_at != null) continue

    produkteGesamt[pid] = (produkteGesamt[pid] ?? 0) + 1

    // Effektiver VP netto (Override → Rabatt) * Menge
    const basis = e.verkaufspreis_override ?? prod.verkaufspreis ?? 0
    const rabatt = e.rabatt_prozent ?? 0
    const vp = Math.round(basis * (1 - rabatt / 100) * 100) / 100
    vpGesamt[pid] = (vpGesamt[pid] ?? 0) + vp * e.menge

    // Freigabe (Status auf raum_produkte)
    if (e.freigabe_status === 'freigegeben') {
      freigegebenCount[pid] = (freigegebenCount[pid] ?? 0) + 1
    }

    // Bestell-/Liefer-Status (auf raum_produkte; teilgeliefert zählt als bestellt)
    const bs = e.bestellstatus ?? 'ausstehend'
    if (bs === 'bestellt' || bs === 'teilgeliefert' || bs === 'geliefert' || bs === 'rechnung_erhalten') {
      bestelltCount[pid] = (bestelltCount[pid] ?? 0) + 1
    }
    if (bs === 'geliefert' || bs === 'rechnung_erhalten') {
      geliefertCount[pid] = (geliefertCount[pid] ?? 0) + 1
    }
  }

  return (projekte ?? []).map((p) => {
    const gesamt = produkteGesamt[p.id] ?? 0
    const freig  = freigegebenCount[p.id] ?? 0
    return {
      ...p,
      kunden:          p.kunden as { id: string; name: string; logo_url: string | null } | null,
      archiviert:      p.archiviert ?? false,
      archiviert_am:   p.archiviert_am ?? null,
      deadline:        p.deadline ?? null,
      raeumCount:      raumCount[p.id] ?? 0,
      produkteGesamt:  gesamt,
      freigegeben:     freig,
      offeneFreigaben: Math.max(0, gesamt - freig),
      bestellt:        bestelltCount[p.id]  ?? 0,
      geliefert:       geliefertCount[p.id] ?? 0,
      vpGesamt:        Math.round((vpGesamt[p.id] ?? 0) * 100) / 100,
    }
  })
}

export default async function ProjektePage() {
  const projekte = await getProjekteMitStats()

  const aktiveCount = projekte.filter((p) => !p.archiviert).length

  return (
    <div className="flex-1 overflow-y-auto animate-fadeIn">
      <StickyPageHeader
        title="Projekte"
        count={aktiveCount}
        countLabel="aktive Projekte"
        action={
          <Link
            href="/dashboard/projekte/neu"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-wellbeing-green hover:bg-wellbeing-green-dark hover:scale-[1.02] active:scale-[0.98] text-white text-sm font-medium rounded-lg transition-all duration-200"
          >
            <Plus className="w-4 h-4" />Neues Projekt
          </Link>
        }
      />
      <div className="px-6 py-6">
        {projekte.length === 0 ? (
          <div className="text-center py-20 bg-white border border-gray-200 rounded-xl shadow-sm">
            <p className="text-gray-500 text-sm">Noch keine Projekte angelegt.</p>
            <Link href="/dashboard/projekte/neu" className="inline-block mt-3 text-sm text-wellbeing-green underline underline-offset-2">
              Erstes Projekt anlegen
            </Link>
          </div>
        ) : (
          <ProjekteGrid projekte={projekte} />
        )}
      </div>
    </div>
  )
}
