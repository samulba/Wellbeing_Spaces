'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { effektiverVpNetto } from '@/lib/preise'

export type RaumActionState = { fehler: string } | null

// ── Budget-Details pro Raum (für Projekt-Detail-Seite) ───────

export type RaumBudgetKategorie = {
  kategorie: string
  betrag: number
  anteil: number // 0–1
}

export type RaumBudgetDetail = {
  raumId: string
  name: string
  budget: number | null
  verbraucht: number
  top3Kategorien: RaumBudgetKategorie[]
}

/**
 * Liefert pro Raum des Projekts: Budget, verbrauchten Betrag (Summe
 * VP-netto × Menge unter Berücksichtigung von Override + Rabatt) sowie
 * die Top-3-Kategorien mit Einzelbeträgen und Anteil am Verbrauch.
 * Ein einziger Query + Aggregation serverseitig — kein N+1.
 */
export async function getRaumBudgetDetails(projektId: string): Promise<RaumBudgetDetail[]> {
  const supabase = await createClient()

  // Räume laden (inkl. deleted_at-Filter, budget, reihenfolge)
  const { data: raeume } = await supabase
    .from('raeume')
    .select('id, name, budget, reihenfolge')
    .eq('projekt_id', projektId)
    .is('deleted_at', null)
    .order('reihenfolge')
    .order('created_at')

  if (!raeume || raeume.length === 0) return []

  const raumIds = raeume.map((r) => r.id)

  // raum_produkte JOIN produkte (verkaufspreis + kategorie)
  const { data: rps } = await supabase
    .from('raum_produkte')
    .select('raum_id, menge, verkaufspreis_override, rabatt_prozent, produkte(kategorie, verkaufspreis)')
    .in('raum_id', raumIds)

  const perRaum = new Map<string, { verbraucht: number; kategorien: Map<string, number> }>()
  for (const r of raumIds) perRaum.set(r, { verbraucht: 0, kategorien: new Map() })

  type Row = {
    raum_id: string
    menge: number
    verkaufspreis_override: number | null
    rabatt_prozent: number | null
    produkte: { kategorie: string | null; verkaufspreis: number | null } | null
  }

  for (const raw of (rps ?? []) as unknown as Row[]) {
    const vpNetto = effektiverVpNetto(
      { verkaufspreis_override: raw.verkaufspreis_override, rabatt_prozent: raw.rabatt_prozent },
      raw.produkte?.verkaufspreis ?? null,
    )
    const total = vpNetto * raw.menge
    const slot = perRaum.get(raw.raum_id)
    if (!slot) continue
    slot.verbraucht += total
    const kat = raw.produkte?.kategorie ?? 'Ohne Kategorie'
    slot.kategorien.set(kat, (slot.kategorien.get(kat) ?? 0) + total)
  }

  return raeume.map((r) => {
    const slot = perRaum.get(r.id) ?? { verbraucht: 0, kategorien: new Map<string, number>() }
    const verbraucht = Math.round(slot.verbraucht * 100) / 100
    const sortiert = Array.from(slot.kategorien.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([kategorie, betrag]) => ({
        kategorie,
        betrag: Math.round(betrag * 100) / 100,
        anteil: verbraucht > 0 ? betrag / verbraucht : 0,
      }))
    return {
      raumId: r.id,
      name: r.name,
      budget: r.budget,
      verbraucht,
      top3Kategorien: sortiert,
    }
  })
}

export async function raumAnlegen(
  projektId: string,
  prevState: RaumActionState,
  formData: FormData
): Promise<RaumActionState> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const name = (formData.get('name') as string).trim()
  if (!name) return { fehler: 'Raumname darf nicht leer sein.' }

  const budgetRaw = formData.get('budget') as string
  const budget = budgetRaw ? parseFloat(budgetRaw) : null

  const raumtypId = (formData.get('raumtyp_id') as string) || null

  const { error } = await supabase.from('raeume').insert({
    projekt_id: projektId,
    name,
    beschreibung: (formData.get('beschreibung') as string) || null,
    raumtyp_id: raumtypId,
    budget: budget && !isNaN(budget) ? budget : null,
    organisation_id: orgId,
  })

  if (error) {
    return { fehler: `Fehler beim Speichern: ${error.message}` }
  }

  revalidatePath(`/dashboard/projekte/${projektId}`)
  return null
}

export async function raumSoftDelete(
  raumId: string,
  projektId: string
): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  await supabase
    .from('raeume')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', raumId)
    .eq('organisation_id', orgId)

  revalidatePath(`/dashboard/projekte/${projektId}`)
}

export async function updateRaumPositionen(
  projektId: string,
  positionen: { id: string; reihenfolge: number }[]
): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  await Promise.all(
    positionen.map(({ id, reihenfolge }) =>
      supabase.from('raeume').update({ reihenfolge }).eq('id', id).eq('organisation_id', orgId)
    )
  )
  revalidatePath(`/dashboard/projekte/${projektId}`)
}
