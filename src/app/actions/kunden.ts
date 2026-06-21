'use server'

import { createClient, getOrganisationId } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { meineRolleAbrufen } from '@/app/actions/team'
import { istAdmin } from '@/lib/permissions'
import { ableitenFaviconUrl, applyFaviconIfNeeded } from '@/lib/favicon'
import { auditLog } from '@/lib/audit'
import { extrahiereStammdatenAusAntworten } from '@/lib/onboarding-stammdaten'
import type {
  KommunikationTyp, KundeKontakt, ProjektStatus,
  OnboardingAnfrage, OnboardingVorlage, OnboardingDatei, OnboardingStatus, OnboardingTyp,
} from '@/lib/supabase/types'

export type KundeActionState = { fehler: string } | null

export interface KundeImpact {
  projekte:      number
  raeume:        number
  produkte:      number
  angebote:      number
  vertraege:     number
  notizen:       number
  kommunikation: number
  portalUser:    number
}

/**
 * Loest die neuen Formular-Felder kundenname + firmenname + kunden_typ in das
 * Datenmodell (name + firmenname + kunden_typ) auf. `name` ist die NOT-NULL-
 * Spalte und bleibt das Primaer-Anzeigefeld:
 *  - privat:  name = kundenname,            firmenname = NULL
 *  - firma:   name = firmenname,            firmenname = firmenname
 *  - beide:   name = kundenname (Person),   firmenname = firmenname
 */
function parseKundeFelder(formData: FormData): {
  name:       string
  firmenname: string | null
  kunden_typ: 'privat' | 'firma' | 'beide'
  fehler?:    string
} {
  const typ        = (formData.get('kunden_typ') as 'privat' | 'firma' | 'beide') || 'firma'
  const kundenname = ((formData.get('kundenname') as string) || '').trim()
  const firmenname = ((formData.get('firmenname') as string) || '').trim()

  if (typ === 'privat') {
    if (!kundenname) return { name: '', firmenname: null, kunden_typ: typ, fehler: 'Kundenname ist erforderlich.' }
    return { name: kundenname, firmenname: null, kunden_typ: typ }
  }
  if (typ === 'firma') {
    if (!firmenname) return { name: '', firmenname: null, kunden_typ: typ, fehler: 'Firmenname ist erforderlich.' }
    return { name: firmenname, firmenname, kunden_typ: typ }
  }
  // beide
  if (!kundenname && !firmenname) {
    return { name: '', firmenname: null, kunden_typ: typ, fehler: 'Bitte Kundenname oder Firmenname angeben.' }
  }
  return {
    name:       kundenname || firmenname,
    firmenname: firmenname || null,
    kunden_typ: typ,
  }
}

/**
 * Liest die strukturierten Adressfelder (Straße/PLZ/Ort) aus dem Formular und
 * setzt daraus die zusammengesetzte `adresse` zusammen (Backward-Compat: Verträge
 * und PDF-Exporte lesen weiter `kunden.adresse`). `hatStruktur` ist true sobald
 * mindestens ein Teil ausgefüllt ist.
 */
function parseAdresseFelder(formData: FormData): {
  strasse: string | null
  plz:     string | null
  ort:     string | null
  hatStruktur: boolean
  adresseKomponiert: string | null
} {
  const strasse = ((formData.get('strasse') as string) || '').trim()
  const plz     = ((formData.get('plz')     as string) || '').trim()
  const ort     = ((formData.get('ort')     as string) || '').trim()
  const hatStruktur = !!(strasse || plz || ort)
  const ortZeile = [plz, ort].filter(Boolean).join(' ')
  const adresseKomponiert = hatStruktur
    ? [strasse, ortZeile].filter(Boolean).join(', ')
    : null
  return { strasse: strasse || null, plz: plz || null, ort: ort || null, hatStruktur, adresseKomponiert }
}

/**
 * Schreibt die strukturierten Adress-Spalten (Migration 127) best-effort.
 * Wenn die Spalten noch nicht existieren (Migration nicht eingespielt), wird der
 * Fehler ignoriert — die zusammengesetzte `adresse` bleibt die Quelle der Wahrheit,
 * sodass Kunde-Anlegen/Bearbeiten auch ohne Migration nie bricht.
 */
async function schreibeStrukturierteAdresse(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  orgId: string,
  adr: { strasse: string | null; plz: string | null; ort: string | null },
): Promise<void> {
  try {
    await supabase
      .from('kunden')
      .update({ strasse: adr.strasse, plz: adr.plz, ort: adr.ort })
      .eq('id', id)
      .eq('organisation_id', orgId)
  } catch {
    // Spalten evtl. noch nicht migriert — bewusst ignoriert.
  }
}

export async function kundeAnlegen(
  prevState: KundeActionState,
  formData: FormData
): Promise<KundeActionState> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const websiteRaw = (formData.get('website') as string) || null
  const autoFavicon = ableitenFaviconUrl(websiteRaw)

  const felder = parseKundeFelder(formData)
  if (felder.fehler) return { fehler: felder.fehler }

  const adr = parseAdresseFelder(formData)

  // Hinweis: ansprechpartner/email/telefon werden ab Migration 091 nicht mehr
  // direkt ueber das Formular gepflegt, sondern vom Hauptkontakt im Kontakte-
  // Block via syncKundeHauptkontakt() gespiegelt.
  const { data: angelegt, error } = await supabase.from('kunden').insert({
    name:        felder.name,
    firmenname:  felder.firmenname,
    kunden_typ:  felder.kunden_typ,
    adresse:     adr.adresseKomponiert,
    website:     websiteRaw,
    logo_url:    autoFavicon,
    organisation_id: orgId,
  }).select('id').single()

  if (error || !angelegt) return { fehler: 'Fehler beim Speichern. Bitte erneut versuchen.' }

  // Strukturierte Adress-Spalten best-effort (Migration 127)
  await schreibeStrukturierteAdresse(supabase, angelegt.id as string, orgId, adr)

  await auditLog({
    aktion:        'kunde_angelegt',
    entitaet_typ:  'kunde',
    entitaet_id:   angelegt.id,
    entitaet_name: felder.name,
  })

  revalidatePath('/dashboard/kunden')
  redirect('/dashboard/kunden')
}

export async function kundeAktualisieren(
  id: string,
  prevState: KundeActionState,
  formData: FormData
): Promise<KundeActionState> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const felder = parseKundeFelder(formData)
  if (felder.fehler) return { fehler: felder.fehler }

  const adr = parseAdresseFelder(formData)

  // ansprechpartner/email/telefon kommen ueber syncKundeHauptkontakt.
  // `adresse` (zusammengesetzt) nur überschreiben, wenn strukturierte Felder
  // ausgefüllt sind — sonst Legacy-Freitext (Bestandskunden) erhalten.
  const updateFelder: Record<string, unknown> = {
    name:       felder.name,
    firmenname: felder.firmenname,
    kunden_typ: felder.kunden_typ,
    website: (formData.get('website') as string) || null,
  }
  if (adr.hatStruktur) updateFelder.adresse = adr.adresseKomponiert

  const { error } = await supabase
    .from('kunden')
    .update(updateFelder)
    .eq('id', id)
    .eq('organisation_id', orgId)
    .is('deleted_at', null)

  if (error) return { fehler: 'Fehler beim Aktualisieren. Bitte erneut versuchen.' }

  // Strukturierte Adress-Spalten best-effort (Migration 127)
  await schreibeStrukturierteAdresse(supabase, id, orgId, adr)

  // Auto-Favicon: wenn Website geaendert wurde und kein eigenes Logo gesetzt ist
  await applyFaviconIfNeeded(supabase, 'kunden', id, orgId)

  revalidatePath('/dashboard/kunden')
  revalidatePath(`/dashboard/kunden/${id}`)
  redirect(`/dashboard/kunden/${id}`)
}

/**
 * Zählt alle abhängigen Datensätze eines Kunden — für Impact-Anzeige
 * im Lösch-Dialog. Admin-Client wegen der RLS auf Portal-Tabellen.
 */
export async function getKundeImpact(kundeId: string): Promise<KundeImpact> {
  const orgId = await getOrganisationId()
  const admin = createAdminClient()

  // Projekt-IDs dieses Kunden laden (für raum-/produkt-Counts)
  const { data: projekte } = await admin
    .from('projekte')
    .select('id')
    .eq('kunde_id', kundeId)
    .eq('organisation_id', orgId)
    .is('deleted_at', null)

  const projektIds = (projekte ?? []).map((p) => p.id)

  // Räume in diesen Projekten
  const { count: raeumeCount } = projektIds.length > 0
    ? await admin
        .from('raeume')
        .select('id', { count: 'exact', head: true })
        .in('projekt_id', projektIds)
        .is('deleted_at', null)
    : { count: 0 }

  // Produkte (via raum_produkte → projekt), einfachheitshalber count raum_produkte für diese Räume
  const { data: raeumeDaten } = projektIds.length > 0
    ? await admin
        .from('raeume')
        .select('id')
        .in('projekt_id', projektIds)
        .is('deleted_at', null)
    : { data: [] as { id: string }[] }

  const raumIds = (raeumeDaten ?? []).map((r) => r.id)
  const { count: produkteCount } = raumIds.length > 0
    ? await admin
        .from('raum_produkte')
        .select('id', { count: 'exact', head: true })
        .in('raum_id', raumIds)
    : { count: 0 }

  // Angebote + Verträge direkt auf kunde_id
  const [angeboteRes, vertraegeRes, notizenRes, kommRes, portalRes] = await Promise.all([
    admin.from('angebote').select('id', { count: 'exact', head: true })
      .eq('kunde_id', kundeId).eq('organisation_id', orgId),
    admin.from('vertraege').select('id', { count: 'exact', head: true })
      .eq('kunde_id', kundeId).eq('organisation_id', orgId),
    admin.from('notizen').select('id', { count: 'exact', head: true })
      .eq('typ', 'kunde').eq('referenz_id', kundeId).is('deleted_at', null),
    admin.from('kommunikation').select('id', { count: 'exact', head: true })
      .eq('kunde_id', kundeId).eq('organisation_id', orgId),
    admin.from('client_users').select('id', { count: 'exact', head: true })
      .eq('kunde_id', kundeId),
  ])

  return {
    projekte:      projektIds.length,
    raeume:        raeumeCount ?? 0,
    produkte:      produkteCount ?? 0,
    angebote:      angeboteRes.count ?? 0,
    vertraege:     vertraegeRes.count ?? 0,
    notizen:       notizenRes.count ?? 0,
    kommunikation: kommRes.count ?? 0,
    portalUser:    portalRes.count ?? 0,
  }
}

/**
 * Soft-Delete eines Kunden. NUR Admins dürfen löschen.
 * Erfordert dass der eingegebene Bestätigungsname mit kunde.name übereinstimmt
 * (client-seitig erzwungen, hier als zweite Absicherung).
 */
export async function kundeSoftDelete(
  id: string,
  bestaetigungsName?: string,
): Promise<{ fehler?: string }> {
  const rolle = await meineRolleAbrufen()
  if (!istAdmin(rolle)) return { fehler: 'Nur Admins dürfen Kunden löschen.' }

  const supabase = await createClient()
  const orgId = await getOrganisationId()

  // Bestätigungsname prüfen (wenn übergeben)
  if (bestaetigungsName !== undefined) {
    const { data: kunde } = await supabase
      .from('kunden').select('name').eq('id', id).eq('organisation_id', orgId).maybeSingle()
    if (!kunde) return { fehler: 'Kunde nicht gefunden.' }
    if (kunde.name.trim() !== bestaetigungsName.trim()) {
      return { fehler: 'Bestätigungsname stimmt nicht überein.' }
    }
  }

  const { data: vorher } = await supabase
    .from('kunden').select('name').eq('id', id).eq('organisation_id', orgId).maybeSingle()

  const { error } = await supabase
    .from('kunden')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organisation_id', orgId)
    .is('deleted_at', null)

  if (error) return { fehler: 'Fehler beim Löschen.' }

  await auditLog({
    aktion:        'kunde_geloescht',
    entitaet_typ:  'kunde',
    entitaet_id:   id,
    entitaet_name: vorher?.name ?? null,
  })

  revalidatePath('/dashboard/kunden')
  return {}
}

/** Archivierte Kunden laden (deleted_at IS NOT NULL). */
export async function getArchivierteKunden(): Promise<Array<{
  id: string; name: string; email: string | null; deleted_at: string
}>> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { data } = await supabase
    .from('kunden')
    .select('id, name, email, deleted_at')
    .eq('organisation_id', orgId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
  return (data ?? []) as Array<{ id: string; name: string; email: string | null; deleted_at: string }>
}

/** Kunde aus Archiv wiederherstellen. Nur Admins. */
export async function kundeWiederherstellen(id: string): Promise<{ fehler?: string }> {
  const rolle = await meineRolleAbrufen()
  if (!istAdmin(rolle)) return { fehler: 'Nur Admins dürfen wiederherstellen.' }

  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const { error } = await supabase
    .from('kunden')
    .update({ deleted_at: null })
    .eq('id', id)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Fehler beim Wiederherstellen.' }
  revalidatePath('/dashboard/kunden')
  return {}
}

// ── Kunden-Detailseite: aggregierte Stats & Projekt-Übersicht ─────
//    Nutzt getOrganisationIdOrNull damit Archivseiten nicht crashen.
//    Alle Queries laufen parallel wo möglich.

export interface KundeStatsResult {
  projekte:      { aktiv: number; abgeschlossen: number; total: number }
  angebote:      { offen: number; offen_summe: number; angenommen: number; total: number }
  vertraege:     { aktiv: number; abgelaufen: number; total: number }
  letzterKontakt: { datum: string; typ: KommunikationTyp; betreff: string | null } | null
}

/**
 * Aggregiert KPIs für den Kunde-Detail-Header in einem Rutsch.
 * Schonend implementiert: einzelne Query-Fehler werfen nicht, sondern geben
 * Defaults zurück — Seite soll auch mit Teil-Daten rendern.
 */
export async function kundeStats(kundeId: string): Promise<KundeStatsResult> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()
  const heute = new Date().toISOString().split('T')[0]

  const [projekteRes, angeboteRes, vertraegeRes, kommRes] = await Promise.all([
    supabase
      .from('projekte')
      .select('status', { count: 'exact' })
      .eq('kunde_id', kundeId)
      .eq('organisation_id', orgId)
      .is('deleted_at', null),
    supabase
      .from('angebote')
      .select('status, netto_summe')
      .eq('kunde_id', kundeId)
      .eq('organisation_id', orgId),
    supabase
      .from('vertraege')
      .select('status, end_datum')
      .eq('kunde_id', kundeId)
      .eq('organisation_id', orgId),
    supabase
      .from('kommunikation')
      .select('typ, datum, betreff')
      .eq('kunde_id', kundeId)
      .eq('organisation_id', orgId)
      .order('datum', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const projekteListe = (projekteRes.data ?? []) as { status: ProjektStatus }[]
  const projekteAktiv        = projekteListe.filter((p) => p.status !== 'abgeschlossen').length
  const projekteAbgeschlossen = projekteListe.filter((p) => p.status === 'abgeschlossen').length

  const angeboteListe = (angeboteRes.data ?? []) as { status: string; netto_summe: number | null }[]
  const angeboteOffen = angeboteListe.filter((a) =>
    ['entwurf', 'gesendet', 'angesehen', 'ueberarbeitung'].includes(a.status),
  )
  const angeboteOffenSumme = angeboteOffen.reduce((acc, a) => acc + (a.netto_summe ?? 0), 0)
  const angeboteAngenommen = angeboteListe.filter((a) => a.status === 'angenommen').length

  const vertraegeListe = (vertraegeRes.data ?? []) as { status: string; end_datum: string | null }[]
  const VERTRAG_AKTIV_STATUS = new Set(['aktiv', 'unterschrieben_beide'])
  const vertraegeAktiv = vertraegeListe.filter(
    (v) => VERTRAG_AKTIV_STATUS.has(v.status) && (!v.end_datum || v.end_datum >= heute),
  ).length
  const vertraegeAbgelaufen = vertraegeListe.filter(
    (v) => v.status === 'abgelaufen' || (v.end_datum != null && v.end_datum < heute),
  ).length

  const letzterKontakt = kommRes.data
    ? {
        datum:  (kommRes.data as { datum: string }).datum,
        typ:    (kommRes.data as { typ: KommunikationTyp }).typ,
        betreff:(kommRes.data as { betreff: string | null }).betreff,
      }
    : null

  return {
    projekte: {
      aktiv:          projekteAktiv,
      abgeschlossen:  projekteAbgeschlossen,
      total:          projekteListe.length,
    },
    angebote: {
      offen:        angeboteOffen.length,
      offen_summe:  Math.round(angeboteOffenSumme * 100) / 100,
      angenommen:   angeboteAngenommen,
      total:        angeboteListe.length,
    },
    vertraege: {
      aktiv:      vertraegeAktiv,
      abgelaufen: vertraegeAbgelaufen,
      total:      vertraegeListe.length,
    },
    letzterKontakt,
  }
}

// ── Projekte des Kunden mit aggregierten Mini-Stats ──────────────

export interface KundeProjektStats {
  anzahlRaeume: number
  freigabeStats: { gesamt: number; freigegeben: number; ausstehend: number; abgelehnt: number }
  budget:        { gesamt: number; vpNetto: number }
}

export interface KundeProjektMitStats {
  id:         string
  name:       string
  status:     ProjektStatus
  deadline:   string | null
  archiviert: boolean
  created_at: string
  stats:      KundeProjektStats
}

/**
 * Lädt alle Projekte des Kunden (inkl. archivierte, damit Breadcrumb nie 404)
 * und aggregiert pro Projekt: Räume, Freigabe-Stats, Budget.
 */
export async function kundeProjekteMitStats(
  kundeId: string,
  inklArchiviert = false,
): Promise<KundeProjektMitStats[]> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  let projekteQuery = supabase
    .from('projekte')
    .select('id, name, status, deadline, archiviert, created_at')
    .eq('kunde_id', kundeId)
    .eq('organisation_id', orgId)
  if (!inklArchiviert) projekteQuery = projekteQuery.is('deleted_at', null)
  const { data: projekte } = await projekteQuery.order('created_at', { ascending: false })

  const projektListe = (projekte ?? []) as {
    id: string; name: string; status: ProjektStatus
    deadline: string | null; archiviert: boolean; created_at: string
  }[]
  if (projektListe.length === 0) return []

  // Erst Räume laden, dann raum_produkte mit allen raum_ids
  const projektIds = projektListe.map((p) => p.id)
  const { data: raeumeDaten } = await supabase
    .from('raeume')
    .select('id, projekt_id')
    .in('projekt_id', projektIds)
    .eq('organisation_id', orgId)
    .is('deleted_at', null)

  const raeumeListe = (raeumeDaten ?? []) as { id: string; projekt_id: string }[]
  const raumIds = raeumeListe.map((r) => r.id)
  const raumZuProjekt = new Map(raeumeListe.map((r) => [r.id, r.projekt_id]))

  const rpRes = raumIds.length > 0
    ? await supabase
        .from('raum_produkte')
        .select('raum_id, menge, verkaufspreis_override, freigabe_status, produkte(verkaufspreis)')
        .in('raum_id', raumIds)
        .eq('organisation_id', orgId)
    : { data: [] as const }

  type RpRow = {
    raum_id: string; menge: number; verkaufspreis_override: number | null
    freigabe_status: string | null
    produkte: { verkaufspreis: number | null } | { verkaufspreis: number | null }[] | null
  }
  const rpListe = (rpRes.data ?? []) as unknown as RpRow[]

  return projektListe.map((p) => {
    const raumIdsDiesesProjekts = new Set(raeumeListe.filter((r) => r.projekt_id === p.id).map((r) => r.id))
    const eintraegeDiesesProjekts = rpListe.filter((rp) => raumZuProjekt.get(rp.raum_id) === p.id)

    let gesamt = 0, freigegeben = 0, ausstehend = 0, abgelehnt = 0, vpNetto = 0
    for (const rp of eintraegeDiesesProjekts) {
      gesamt += 1
      const s = rp.freigabe_status ?? 'ausstehend'
      if (s === 'freigegeben')    freigegeben += 1
      else if (s === 'abgelehnt') abgelehnt += 1
      else                        ausstehend += 1
      const prod = Array.isArray(rp.produkte) ? rp.produkte[0] : rp.produkte
      const vp = rp.verkaufspreis_override ?? prod?.verkaufspreis ?? 0
      vpNetto += vp * (rp.menge ?? 0)
    }
    return {
      id:         p.id,
      name:       p.name,
      status:     p.status,
      deadline:   p.deadline,
      archiviert: p.archiviert,
      created_at: p.created_at,
      stats: {
        anzahlRaeume:  raumIdsDiesesProjekts.size,
        freigabeStats: { gesamt, freigegeben, ausstehend, abgelehnt },
        budget:        { gesamt, vpNetto: Math.round(vpNetto * 100) / 100 },
      },
    }
  })
}

// ── Kunden-Kontaktpersonen (Migration 091) ────────────────────

export interface KundeKontaktDaten {
  name:             string
  rolle:            string | null
  email:            string | null
  telefon:          string | null
  mobil:            string | null
  notizen:          string | null
  ist_hauptkontakt: boolean
  reihenfolge?:     number
}

export type KundeKontaktResult = { fehler?: string; erfolg?: boolean }

/**
 * Spiegelt den aktuellen Hauptkontakt in die Legacy-Spalten
 * kunden.ansprechpartner / email / telefon zurück, damit Listen-
 * Ansichten und PDFs ohne JOIN funktionieren.
 */
async function syncKundeHauptkontakt(kundeId: string, orgId: string): Promise<void> {
  const supabase = await createClient()
  const { data: kontakte } = await supabase
    .from('kunden_kontakte')
    .select('name, email, telefon, mobil, ist_hauptkontakt, reihenfolge, created_at')
    .eq('kunde_id', kundeId)
    .eq('organisation_id', orgId)
    .order('ist_hauptkontakt', { ascending: false })
    .order('reihenfolge', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(1)

  const primaer = (kontakte ?? [])[0] as {
    name: string; email: string | null; telefon: string | null; mobil: string | null
  } | undefined

  // kunde.telefon-Spalte fuellen wir bevorzugt aus Mobil (neuer Standard),
  // Fallback auf Telefon (Bestand) damit Listenanzeige bei Altdaten weiter funktioniert.
  await supabase
    .from('kunden')
    .update({
      ansprechpartner: primaer?.name ?? null,
      email:           primaer?.email ?? null,
      telefon:         primaer?.mobil ?? primaer?.telefon ?? null,
    })
    .eq('id', kundeId)
    .eq('organisation_id', orgId)
}

export async function getKundenKontakte(kundeId: string): Promise<KundeKontakt[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('kunden_kontakte')
    .select('*')
    .eq('kunde_id', kundeId)
    .order('ist_hauptkontakt', { ascending: false })
    .order('reihenfolge',      { ascending: true })
    .order('created_at',       { ascending: true })
  return (data ?? []) as KundeKontakt[]
}

export async function kundeKontaktAnlegen(
  kundeId: string,
  daten: KundeKontaktDaten,
): Promise<KundeKontaktResult> {
  if (!daten.name?.trim()) return { fehler: 'Name ist erforderlich.' }

  const supabase = await createClient()
  const orgId = await getOrganisationId()

  if (daten.ist_hauptkontakt) {
    await supabase
      .from('kunden_kontakte')
      .update({ ist_hauptkontakt: false })
      .eq('kunde_id', kundeId)
      .eq('organisation_id', orgId)
  }

  const { error } = await supabase.from('kunden_kontakte').insert({
    organisation_id: orgId,
    kunde_id:        kundeId,
    name:            daten.name.trim(),
    rolle:           daten.rolle?.trim() || null,
    email:           daten.email?.trim() || null,
    telefon:         daten.telefon?.trim() || null,
    mobil:           daten.mobil?.trim() || null,
    notizen:         daten.notizen?.trim() || null,
    ist_hauptkontakt: !!daten.ist_hauptkontakt,
    reihenfolge:     daten.reihenfolge ?? 0,
  })
  if (error) return { fehler: 'Fehler beim Speichern.' }

  await syncKundeHauptkontakt(kundeId, orgId)
  revalidatePath(`/dashboard/kunden/${kundeId}`)
  revalidatePath(`/dashboard/kunden`)
  return { erfolg: true }
}

export async function kundeKontaktAktualisieren(
  id: string,
  kundeId: string,
  daten: KundeKontaktDaten,
): Promise<KundeKontaktResult> {
  if (!daten.name?.trim()) return { fehler: 'Name ist erforderlich.' }

  const supabase = await createClient()
  const orgId = await getOrganisationId()

  if (daten.ist_hauptkontakt) {
    await supabase
      .from('kunden_kontakte')
      .update({ ist_hauptkontakt: false })
      .eq('kunde_id', kundeId)
      .eq('organisation_id', orgId)
      .neq('id', id)
  }

  const { error } = await supabase
    .from('kunden_kontakte')
    .update({
      name:             daten.name.trim(),
      rolle:            daten.rolle?.trim() || null,
      email:            daten.email?.trim() || null,
      telefon:          daten.telefon?.trim() || null,
      mobil:            daten.mobil?.trim() || null,
      notizen:          daten.notizen?.trim() || null,
      ist_hauptkontakt: !!daten.ist_hauptkontakt,
      ...(daten.reihenfolge != null ? { reihenfolge: daten.reihenfolge } : {}),
    })
    .eq('id', id)
    .eq('kunde_id', kundeId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Fehler beim Aktualisieren.' }

  await syncKundeHauptkontakt(kundeId, orgId)
  revalidatePath(`/dashboard/kunden/${kundeId}`)
  revalidatePath(`/dashboard/kunden`)
  return { erfolg: true }
}

export async function kundeKontaktLoeschen(
  id: string,
  kundeId: string,
): Promise<KundeKontaktResult> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  const { error } = await supabase
    .from('kunden_kontakte')
    .delete()
    .eq('id', id)
    .eq('kunde_id', kundeId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Fehler beim Löschen.' }

  await syncKundeHauptkontakt(kundeId, orgId)
  revalidatePath(`/dashboard/kunden/${kundeId}`)
  revalidatePath(`/dashboard/kunden`)
  return { erfolg: true }
}

export async function kundeKontaktAlsHauptkontaktSetzen(
  id: string,
  kundeId: string,
): Promise<KundeKontaktResult> {
  const supabase = await createClient()
  const orgId = await getOrganisationId()

  await supabase
    .from('kunden_kontakte')
    .update({ ist_hauptkontakt: false })
    .eq('kunde_id', kundeId)
    .eq('organisation_id', orgId)

  const { error } = await supabase
    .from('kunden_kontakte')
    .update({ ist_hauptkontakt: true })
    .eq('id', id)
    .eq('kunde_id', kundeId)
    .eq('organisation_id', orgId)
  if (error) return { fehler: 'Fehler beim Setzen.' }

  await syncKundeHauptkontakt(kundeId, orgId)
  revalidatePath(`/dashboard/kunden/${kundeId}`)
  revalidatePath(`/dashboard/kunden`)
  return { erfolg: true }
}

// ── Onboarding-Angaben des Kunden ─────────────────────────────────
//    Die beim Onboarding erfassten Daten (Budget, Räume, Stil, Zeitrahmen,
//    alle eingereichten Antworten + Uploads) liegen auf `onboarding_anfragen`,
//    verknüpft über kunde_id (gesetzt beim "Kunde aus Onboarding anlegen").
//    Hier laden wir sie für die Anzeige auf der Kunden-Detailseite auf.

export interface KundeOnboardingEckdaten {
  kunde_email:       string | null
  kunde_telefon:     string | null
  projekt_name:      string | null
  projekt_adresse:   string | null
  raumtypen:         string[] | null
  budget_min:        number | null
  budget_max:        number | null
  zeitrahmen:        string | null
  stil_praeferenzen: string | null
  notizen:           string | null
}

export interface KundeOnboarding {
  id:               string
  status:           OnboardingStatus
  typ:              OnboardingTyp
  titel:            string | null
  vorlageName:      string | null
  created_at:       string
  abgeschlossen_am: string | null
  /** Zusammengefasste Eckdaten (persistierte Spalten, Fallback aus Antworten). */
  eckdaten:         KundeOnboardingEckdaten
  /** Aufgelöste Vorlage (Snapshot bevorzugt) für die vollständige Antwort-Anzeige. */
  vorlage:          OnboardingVorlage | null
  antworten:        Record<string, unknown> | null
  dateien:          OnboardingDatei[]
}

/**
 * Lädt alle mit dem Kunden verknüpften Onboarding-Anfragen, die tatsächlich
 * Inhalt haben (eingereicht/abgeschlossen/in Bearbeitung oder mit Antworten).
 * Fail-safe: gibt bei fehlenden Tabellen/Spalten einfach [] zurück, damit die
 * Kundenseite nie crasht.
 */
export async function getKundeOnboardings(kundeId: string): Promise<KundeOnboarding[]> {
  try {
    const supabase = await createClient()
    const orgId    = await getOrganisationId()

    const { data: anfragenRaw, error } = await supabase
      .from('onboarding_anfragen')
      .select('*')
      .eq('kunde_id', kundeId)
      .eq('organisation_id', orgId)
      .order('created_at', { ascending: false })
    if (error || !anfragenRaw) return []

    const anfragen = (anfragenRaw as unknown as OnboardingAnfrage[]).filter((a) => {
      const hatAntworten = a.antworten != null && Object.keys(a.antworten).length > 0
      return hatAntworten
        || a.status === 'eingereicht'
        || a.status === 'abgeschlossen'
        || a.status === 'in_bearbeitung'
    })
    if (anfragen.length === 0) return []

    // Vorlagen nachladen (nur dort wo kein Snapshot vorliegt)
    const fehlendeVorlageIds = Array.from(new Set(
      anfragen
        .filter((a) => !a.vorlage_snapshot && a.vorlage_id)
        .map((a) => a.vorlage_id as string),
    ))
    const vorlagenMap = new Map<string, OnboardingVorlage>()
    if (fehlendeVorlageIds.length > 0) {
      const { data: vorlagen } = await supabase
        .from('onboarding_vorlagen')
        .select('*')
        .in('id', fehlendeVorlageIds)
        .eq('organisation_id', orgId)
      for (const v of (vorlagen ?? []) as OnboardingVorlage[]) vorlagenMap.set(v.id, v)
    }

    // Uploads gebündelt laden (RLS scoped Org; anfrage_ids sind bereits org-geprüft)
    const anfrageIds  = anfragen.map((a) => a.id)
    const dateienMap  = new Map<string, OnboardingDatei[]>()
    const { data: dateien } = await supabase
      .from('onboarding_dateien')
      .select('*')
      .in('anfrage_id', anfrageIds)
      .order('created_at', { ascending: true })
    for (const d of (dateien ?? []) as OnboardingDatei[]) {
      const list = dateienMap.get(d.anfrage_id) ?? []
      list.push(d)
      dateienMap.set(d.anfrage_id, list)
    }

    return anfragen.map((a) => {
      const vorlage: OnboardingVorlage | null =
        (a.vorlage_snapshot as OnboardingVorlage | null | undefined) ??
        (a.vorlage_id ? vorlagenMap.get(a.vorlage_id) ?? null : null)

      const fallback = extrahiereStammdatenAusAntworten(vorlage, a.antworten)
      const eckdaten: KundeOnboardingEckdaten = {
        kunde_email:       a.kunde_email       ?? fallback.kunde_email       ?? null,
        kunde_telefon:     a.kunde_telefon     ?? fallback.kunde_telefon     ?? null,
        projekt_name:      a.projekt_name      ?? fallback.projekt_name      ?? null,
        projekt_adresse:   a.projekt_adresse   ?? fallback.projekt_adresse   ?? null,
        raumtypen:         (a.raumtypen && a.raumtypen.length > 0 ? a.raumtypen : fallback.raumtypen) ?? null,
        budget_min:        a.budget_min        ?? fallback.budget_min        ?? null,
        budget_max:        a.budget_max        ?? fallback.budget_max        ?? null,
        zeitrahmen:        a.zeitrahmen        ?? fallback.zeitrahmen        ?? null,
        stil_praeferenzen: a.stil_praeferenzen ?? fallback.stil_praeferenzen ?? null,
        notizen:           a.notizen           ?? fallback.notizen           ?? null,
      }

      return {
        id:               a.id,
        status:           a.status,
        typ:              a.typ,
        titel:            a.titel ?? null,
        vorlageName:      vorlage?.name ?? null,
        created_at:       a.created_at,
        abgeschlossen_am: a.abgeschlossen_am ?? null,
        eckdaten,
        vorlage,
        antworten:        a.antworten,
        dateien:          dateienMap.get(a.id) ?? [],
      }
    })
  } catch {
    return []
  }
}
