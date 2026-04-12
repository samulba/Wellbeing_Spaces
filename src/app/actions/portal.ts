'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPortalSession } from '@/lib/portal-auth'

// ── Typen ─────────────────────────────────────────────────────

export type PortalActionState = { fehler?: string; erfolg?: string } | null

// ── Hilfsfunktionen ───────────────────────────────────────────

async function sessionCookie(token: string) {
  const jar = await cookies()
  jar.set('portal_session', token, {
    httpOnly:  true,
    secure:    process.env.NODE_ENV === 'production',
    maxAge:    30 * 24 * 60 * 60,
    path:      '/',
    sameSite:  'lax',
  })
}

async function requireSession() {
  const session = await getPortalSession()
  if (!session) redirect('/portal/login')
  return session
}

// ── LOGIN / LOGOUT ────────────────────────────────────────────

export async function portalLogin(
  prevState: PortalActionState,
  formData: FormData
): Promise<PortalActionState> {
  const email   = (formData.get('email')   as string ?? '').trim().toLowerCase()
  const passwort = formData.get('passwort') as string ?? ''

  if (!email || !passwort) return { fehler: 'E-Mail und Passwort erforderlich.' }

  const supabase = createAdminClient()
  const { data: user } = await supabase
    .from('client_users')
    .select('id, email, password_hash, aktiv, vorname')
    .eq('email', email)
    .maybeSingle()

  if (!user || !user.aktiv) return { fehler: 'Ungültige Zugangsdaten.' }
  if (!user.password_hash)  return { fehler: 'Bitte schließen Sie zuerst die Registrierung ab.' }

  const gueltig = await bcrypt.compare(passwort, user.password_hash)
  if (!gueltig) return { fehler: 'Ungültige Zugangsdaten.' }

  const token     = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  await supabase
    .from('client_users')
    .update({ session_token: token, session_expires_at: expiresAt, letzter_login: new Date().toISOString() })
    .eq('id', user.id)

  await sessionCookie(token)
  redirect('/portal/dashboard')
}

export async function portalLogout() {
  const jar   = await cookies()
  const token = jar.get('portal_session')?.value

  if (token) {
    const supabase = createAdminClient()
    await supabase
      .from('client_users')
      .update({ session_token: null, session_expires_at: null })
      .eq('session_token', token)
  }

  jar.delete('portal_session')
  redirect('/portal/login')
}

// ── REGISTRIERUNG ─────────────────────────────────────────────

export async function einladungValidieren(token: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('client_users')
    .select('id, vorname, nachname, email, token_gueltig_bis, password_hash, kunden(name)')
    .eq('einladungs_token', token)
    .maybeSingle()

  if (!data) return null
  if (data.token_gueltig_bis && new Date(data.token_gueltig_bis) < new Date()) return null

  const raw = data.kunden as { name: string } | { name: string }[] | null
  const kundeName = Array.isArray(raw) ? raw[0]?.name : raw?.name

  return {
    id:               data.id,
    vorname:          data.vorname,
    nachname:         data.nachname,
    email:            data.email,
    bereitsRegistriert: !!data.password_hash,
    kundeName:        kundeName ?? '',
  }
}

export async function portalRegistrieren(
  prevState: PortalActionState,
  formData: FormData
): Promise<PortalActionState> {
  const einladungsToken = formData.get('einladungs_token') as string
  const vorname  = (formData.get('vorname')  as string ?? '').trim()
  const nachname = (formData.get('nachname') as string ?? '').trim()
  const passwort = formData.get('passwort')  as string ?? ''
  const passwort2 = formData.get('passwort2') as string ?? ''

  if (!einladungsToken) return { fehler: 'Ungültiger Einladungslink.' }
  if (!vorname || !nachname) return { fehler: 'Vor- und Nachname erforderlich.' }
  if (passwort.length < 8)   return { fehler: 'Passwort muss mindestens 8 Zeichen haben.' }
  if (passwort !== passwort2) return { fehler: 'Passwörter stimmen nicht überein.' }

  const supabase = createAdminClient()
  const { data: user } = await supabase
    .from('client_users')
    .select('id, token_gueltig_bis')
    .eq('einladungs_token', einladungsToken)
    .maybeSingle()

  if (!user) return { fehler: 'Ungültiger oder abgelaufener Einladungslink.' }
  if (user.token_gueltig_bis && new Date(user.token_gueltig_bis) < new Date()) {
    return { fehler: 'Dieser Einladungslink ist abgelaufen.' }
  }

  const hash     = await bcrypt.hash(passwort, 12)
  const token    = crypto.randomUUID()
  const expires  = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  await supabase
    .from('client_users')
    .update({
      vorname,
      nachname,
      password_hash:      hash,
      einladungs_token:   null,
      token_gueltig_bis:  null,
      email_verifiziert:  true,
      aktiv:              true,
      session_token:      token,
      session_expires_at: expires,
      letzter_login:      new Date().toISOString(),
    })
    .eq('id', user.id)

  await sessionCookie(token)
  redirect('/portal/dashboard')
}

// ── ADMIN: EINLADUNG SENDEN ───────────────────────────────────

export async function kundeEinladen(
  kundeId: string,
  email: string,
  vorname: string,
  nachname: string,
  preiseAnzeigen: boolean
): Promise<{ erfolg: boolean; einladungsLink?: string; fehler?: string }> {
  if (!email) return { erfolg: false, fehler: 'E-Mail erforderlich.' }

  const supabase = createAdminClient()

  // Bestehenden Eintrag prüfen
  const { data: existing } = await supabase
    .from('client_users')
    .select('id, aktiv, password_hash')
    .eq('kunde_id', kundeId)
    .maybeSingle()

  const einladungsToken = crypto.randomUUID()
  const tokenGueltigBis = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  if (existing) {
    // Bestehenden Eintrag aktualisieren (neue Einladung)
    await supabase
      .from('client_users')
      .update({
        email:            email.toLowerCase().trim(),
        vorname:          vorname.trim(),
        nachname:         nachname.trim(),
        preise_anzeigen:  preiseAnzeigen,
        einladungs_token: einladungsToken,
        token_gueltig_bis: tokenGueltigBis,
        aktiv:            true,
        updated_at:       new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    const { error } = await supabase
      .from('client_users')
      .insert({
        kunde_id:         kundeId,
        email:            email.toLowerCase().trim(),
        vorname:          vorname.trim(),
        nachname:         nachname.trim(),
        preise_anzeigen:  preiseAnzeigen,
        einladungs_token: einladungsToken,
        token_gueltig_bis: tokenGueltigBis,
      })

    if (error) return { erfolg: false, fehler: 'E-Mail bereits vergeben.' }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  revalidatePath(`/dashboard/kunden/${kundeId}`)
  return { erfolg: true, einladungsLink: `${baseUrl}/portal/einladung/${einladungsToken}` }
}

export async function portalZuganDeaktivieren(kundeId: string): Promise<void> {
  const supabase = createAdminClient()
  await supabase
    .from('client_users')
    .update({ aktiv: false, session_token: null })
    .eq('kunde_id', kundeId)
  revalidatePath(`/dashboard/kunden/${kundeId}`)
}

export async function portalBenutzerAbrufen(kundeId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('client_users')
    .select('id, email, vorname, nachname, aktiv, letzter_login, preise_anzeigen, einladungs_token, token_gueltig_bis')
    .eq('kunde_id', kundeId)
    .maybeSingle()
  return data
}

// ── PORTAL: DASHBOARD ─────────────────────────────────────────

export async function portalDashboardDaten() {
  const session = await requireSession()
  const supabase = createAdminClient()

  const { data: projekte } = await supabase
    .from('projekte')
    .select('id, name, status, created_at')
    .eq('kunde_id', session.kundeId)
    .is('deleted_at', null)
    .is('archiviert', false)
    .order('created_at', { ascending: false })

  const projektIds = (projekte ?? []).map((p) => p.id)

  // Freigabe-Stats pro Projekt
  const statsMap: Record<string, { gesamt: number; ausstehend: number; freigegeben: number }> = {}
  if (projektIds.length > 0) {
    const { data: raeume } = await supabase
      .from('raeume')
      .select('id, projekt_id')
      .in('projekt_id', projektIds)
      .is('deleted_at', null)

    const raumIds  = (raeume ?? []).map((r) => r.id)
    const raumMap: Record<string, string> = {}
    for (const r of raeume ?? []) raumMap[r.id] = r.projekt_id

    if (raumIds.length > 0) {
      const { data: produkte } = await supabase
        .from('produkte')
        .select('raum_id, freigabe_status')
        .in('raum_id', raumIds)
        .is('deleted_at', null)

      for (const p of produkte ?? []) {
        const pid = raumMap[p.raum_id]
        if (!pid) continue
        if (!statsMap[pid]) statsMap[pid] = { gesamt: 0, ausstehend: 0, freigegeben: 0 }
        statsMap[pid].gesamt++
        if (!p.freigabe_status || p.freigabe_status === 'ausstehend') statsMap[pid].ausstehend++
        if (p.freigabe_status === 'freigegeben') statsMap[pid].freigegeben++
      }
    }
  }

  // Aktivitäten
  const { data: aktivitaeten } = await supabase
    .from('client_aktivitaeten')
    .select('id, typ, titel, beschreibung, created_at')
    .eq('kunde_id', session.kundeId)
    .order('created_at', { ascending: false })
    .limit(10)

  // Ungelesene Nachrichten
  const { count: ungelesen } = await supabase
    .from('client_nachrichten')
    .select('id', { count: 'exact', head: true })
    .in('projekt_id', projektIds.length > 0 ? projektIds : [''])
    .eq('gelesen', false)
    .eq('von_kunde', false)

  const projekte2 = (projekte ?? []).map((p) => ({
    ...p,
    stats: statsMap[p.id] ?? { gesamt: 0, ausstehend: 0, freigegeben: 0 },
  }))

  return {
    session,
    projekte: projekte2,
    aktivitaeten: aktivitaeten ?? [],
    ungelesenNachrichten: ungelesen ?? 0,
  }
}

// ── PORTAL: PROJEKT-DATEN ─────────────────────────────────────

export interface PortalProdukt {
  id: string
  name: string
  beschreibung: string | null
  image_url: string | null
  kategorie: string | null
  menge: number | null
  einheit: string | null
  verkaufspreis: number | null
  freigabe_status: string | null
  raum_id: string
}

export interface PortalRaum {
  id: string
  name: string
  typ: string | null
  produkte: PortalProdukt[]
}

export async function portalProjektAbrufen(projektId: string) {
  const session = await requireSession()
  const supabase = createAdminClient()

  // Projekt + Eigentümer-Prüfung
  const { data: projekt } = await supabase
    .from('projekte')
    .select('id, name, status, beschreibung, standort, projektart, created_at, kunden(id, name)')
    .eq('id', projektId)
    .eq('kunde_id', session.kundeId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!projekt) return null

  // Räume
  const { data: raeume } = await supabase
    .from('raeume')
    .select('id, name, typ')
    .eq('projekt_id', projektId)
    .is('deleted_at', null)
    .order('reihenfolge')

  const raumIds = (raeume ?? []).map((r) => r.id)

  // Produkte (KEINE internen Felder!)
  let produkte: PortalProdukt[] = []
  if (raumIds.length > 0) {
    const { data } = await supabase
      .from('produkte')
      .select('id, name, beschreibung, image_url, kategorie, menge, einheit, verkaufspreis, freigabe_status, raum_id')
      .in('raum_id', raumIds)
      .is('deleted_at', null)
      .order('reihenfolge')
    produkte = (data ?? []) as PortalProdukt[]
  }

  const raeumeMitProdukten: PortalRaum[] = (raeume ?? []).map((r) => ({
    ...r,
    produkte: produkte.filter((p) => p.raum_id === r.id),
  }))

  // Dokumente
  const { data: dokumente } = await supabase
    .from('client_dokumente')
    .select('id, name, typ, datei_url, groesse_bytes, created_at')
    .eq('projekt_id', projektId)
    .eq('sichtbar_fuer_kunde', true)
    .order('created_at', { ascending: false })

  // Nachrichten
  const { data: nachrichten } = await supabase
    .from('client_nachrichten')
    .select('id, nachricht, von_kunde, created_at, client_user_id')
    .eq('projekt_id', projektId)
    .order('created_at')

  // Timeline Events
  const { data: events } = await supabase
    .from('timeline_events')
    .select('id, titel, typ, start_datum, end_datum, status, farbe')
    .eq('projekt_id', projektId)
    .order('start_datum')

  // Nachrichten als gelesen markieren
  await supabase
    .from('client_nachrichten')
    .update({ gelesen: true, gelesen_am: new Date().toISOString() })
    .eq('projekt_id', projektId)
    .eq('von_kunde', false)
    .eq('gelesen', false)

  return {
    session,
    projekt,
    raeume: raeumeMitProdukten,
    dokumente: dokumente ?? [],
    nachrichten: nachrichten ?? [],
    events: events ?? [],
  }
}

// ── PORTAL: PRODUKT FREIGEBEN ─────────────────────────────────

export async function portalProduktFreigeben(
  produktId: string,
  status: string
): Promise<void> {
  const session = await requireSession()
  const supabase = createAdminClient()

  // Ownership-Prüfung: Produkt → Raum → Projekt → Kunde
  const { data: produkt } = await supabase
    .from('produkte')
    .select('raum_id, raeume(projekt_id, projekte(kunde_id))')
    .eq('id', produktId)
    .maybeSingle()

  const raumData = Array.isArray(produkt?.raeume) ? produkt?.raeume[0] : produkt?.raeume
  const raw = raumData as { projekt_id: string; projekte: { kunde_id: string } | { kunde_id: string }[] | null } | null
  if (!raw) return
  const projekteRaw = raw.projekte
  const kundeId = Array.isArray(projekteRaw) ? projekteRaw[0]?.kunde_id : projekteRaw?.kunde_id
  if (kundeId !== session.kundeId) return

  await supabase
    .from('produkte')
    .update({ freigabe_status: status })
    .eq('id', produktId)

  // Aktivität loggen
  await supabase.from('client_aktivitaeten').insert({
    projekt_id:  raw.projekt_id,
    kunde_id:    session.kundeId,
    typ:         'freigabe',
    titel:       status === 'freigegeben' ? 'Produkt freigegeben' : status === 'abgelehnt' ? 'Produkt abgelehnt' : 'Produkt kommentiert',
  })
}

export async function portalAlleFreigeben(projektId: string): Promise<void> {
  const session = await requireSession()
  const supabase = createAdminClient()

  // Projekt gehört zum Kunden?
  const { data: projekt } = await supabase
    .from('projekte')
    .select('id')
    .eq('id', projektId)
    .eq('kunde_id', session.kundeId)
    .maybeSingle()
  if (!projekt) return

  // Räume → Produkte
  const { data: raeume } = await supabase
    .from('raeume')
    .select('id')
    .eq('projekt_id', projektId)
    .is('deleted_at', null)

  const raumIds = (raeume ?? []).map((r) => r.id)
  if (raumIds.length === 0) return

  await supabase
    .from('produkte')
    .update({ freigabe_status: 'freigegeben' })
    .in('raum_id', raumIds)
    .is('deleted_at', null)
    .or('freigabe_status.is.null,freigabe_status.eq.ausstehend')
}

// ── PORTAL: NACHRICHTEN ───────────────────────────────────────

export async function portalNachrichtSenden(
  prevState: PortalActionState,
  formData: FormData
): Promise<PortalActionState> {
  const session    = await requireSession()
  const projektId  = formData.get('projekt_id') as string
  const nachricht  = (formData.get('nachricht') as string ?? '').trim()

  if (!nachricht) return { fehler: 'Nachricht darf nicht leer sein.' }

  const supabase = createAdminClient()

  // Projekt gehört dem Kunden?
  const { data: projekt } = await supabase
    .from('projekte')
    .select('id')
    .eq('id', projektId)
    .eq('kunde_id', session.kundeId)
    .maybeSingle()
  if (!projekt) return { fehler: 'Kein Zugriff.' }

  await supabase.from('client_nachrichten').insert({
    projekt_id:     projektId,
    client_user_id: session.id,
    von_kunde:      true,
    nachricht,
  })

  return { erfolg: 'Nachricht gesendet.' }
}

// ── ADMIN: NACHRICHT AN KUNDEN ────────────────────────────────

export async function teamNachrichtSenden(
  projektId: string,
  nachricht: string
): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('client_nachrichten').insert({
    projekt_id: projektId,
    von_kunde:  false,
    nachricht,
  })
  revalidatePath(`/dashboard/projekte/${projektId}`)
}

// ── PORTAL: PROFIL ────────────────────────────────────────────

export async function portalProfilAktualisieren(
  prevState: PortalActionState,
  formData: FormData
): Promise<PortalActionState> {
  const session  = await requireSession()
  const vorname  = (formData.get('vorname')  as string ?? '').trim()
  const nachname = (formData.get('nachname') as string ?? '').trim()
  const telefon  = (formData.get('telefon')  as string ?? '').trim()

  if (!vorname || !nachname) return { fehler: 'Vor- und Nachname erforderlich.' }

  const supabase = createAdminClient()
  await supabase
    .from('client_users')
    .update({ vorname, nachname, telefon: telefon || null, updated_at: new Date().toISOString() })
    .eq('id', session.id)

  return { erfolg: 'Profil aktualisiert.' }
}

export async function portalPasswortAendern(
  prevState: PortalActionState,
  formData: FormData
): Promise<PortalActionState> {
  const session       = await requireSession()
  const altesPasswort = formData.get('altes_passwort') as string ?? ''
  const neuesPasswort = formData.get('neues_passwort') as string ?? ''
  const bestaetigung  = formData.get('bestaetigung')   as string ?? ''

  if (neuesPasswort.length < 8) return { fehler: 'Passwort muss mindestens 8 Zeichen haben.' }
  if (neuesPasswort !== bestaetigung) return { fehler: 'Passwörter stimmen nicht überein.' }

  const supabase = createAdminClient()
  const { data: user } = await supabase
    .from('client_users')
    .select('password_hash')
    .eq('id', session.id)
    .single()

  if (!user?.password_hash) return { fehler: 'Kein Passwort gesetzt.' }

  const gueltig = await bcrypt.compare(altesPasswort, user.password_hash)
  if (!gueltig) return { fehler: 'Aktuelles Passwort falsch.' }

  const hash = await bcrypt.hash(neuesPasswort, 12)
  await supabase
    .from('client_users')
    .update({ password_hash: hash, updated_at: new Date().toISOString() })
    .eq('id', session.id)

  return { erfolg: 'Passwort geändert.' }
}
