'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPortalSession } from '@/lib/portal-auth'
import { sendMail } from '@/lib/mail'
import { effektiverVpNetto } from '@/lib/preise'

/**
 * Ermittelt die Base-URL der App zuverlässig — zuerst aus NEXT_PUBLIC_APP_URL,
 * dann aus den Request-Headern (host + x-forwarded-proto), sonst fester
 * Production-Fallback. Verhindert den `localhost:3000`-Bug in Vercel.
 */
async function appBaseUrl(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  try {
    const h = await headers()
    const host  = h.get('x-forwarded-host') ?? h.get('host')
    const proto = h.get('x-forwarded-proto') ?? 'https'
    if (host && !host.includes('localhost')) return `${proto}://${host}`
  } catch { /* außerhalb Request-Kontext */ }
  return 'https://app.wellbeing-spaces.de'
}

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
): Promise<{ erfolg: boolean; einladungsLink?: string; mailGesendet?: boolean; fehler?: string }> {
  if (!email) return { erfolg: false, fehler: 'E-Mail erforderlich.' }

  const supabase = createAdminClient()

  // "kundeEinladen" legt den INHABER-Portal-Account an oder lädt ihn neu ein.
  // Weitere Mitarbeiter/Gäste werden später vom Inhaber selbst via
  // mitarbeiterEinladen() eingeladen — dort mit flexibler Rolle.
  const { data: existing } = await supabase
    .from('client_users')
    .select('id, aktiv, password_hash')
    .eq('kunde_id', kundeId)
    .eq('rolle', 'inhaber')
    .maybeSingle()

  const einladungsToken = crypto.randomUUID()
  const tokenGueltigBis = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  if (existing) {
    // Bestehenden Inhaber aktualisieren (neue Einladung)
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
        rolle:            'inhaber',
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
        rolle:            'inhaber',
        einladungs_token: einladungsToken,
        token_gueltig_bis: tokenGueltigBis,
      })

    if (error) return { erfolg: false, fehler: 'E-Mail bereits vergeben.' }
  }

  const baseUrl       = await appBaseUrl()
  const einladungsLink = `${baseUrl}/portal/einladung/${einladungsToken}`

  // Firmenname aus branding holen (für Mail-Text)
  let firmenname = 'Wellbeing Spaces'
  try {
    const { data } = await supabase.from('branding').select('firmenname').maybeSingle()
    if (data?.firmenname) firmenname = data.firmenname
  } catch { /* branding evtl. nicht konfiguriert */ }

  // E-Mail verschicken (Resend); bei fehlendem RESEND_API_KEY wird still übersprungen
  const empfaenger = [vorname, nachname].filter(Boolean).join(' ') || email
  const html = `
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f6ede2; margin: 0; padding: 32px;">
      <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 2px 10px rgba(0,0,0,0.04);">
        <h1 style="font-size: 20px; color: #2d3e31; margin: 0 0 16px;">Hallo ${escapeHtml(empfaenger)},</h1>
        <p style="font-size: 15px; color: #4b5563; line-height: 1.55; margin: 0 0 18px;">
          ${escapeHtml(firmenname)} hat einen eigenen Zugang im Kunden-Portal für dich eingerichtet.
          Dort kannst du dein Projekt verfolgen, Produkte freigeben und Nachrichten austauschen.
        </p>
        <p style="font-size: 15px; color: #4b5563; line-height: 1.55; margin: 0 0 24px;">
          Klicke auf den Button, um dein Passwort zu setzen und loszulegen:
        </p>
        <p style="text-align: center; margin: 0 0 24px;">
          <a href="${einladungsLink}" style="display: inline-block; background: #445c49; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 600; font-size: 15px;">
            Zugang aktivieren →
          </a>
        </p>
        <p style="font-size: 12px; color: #9ca3af; line-height: 1.5; margin: 0 0 8px;">
          Dieser Link ist 7 Tage gültig. Falls der Button nicht funktioniert, kopiere diese Adresse in deinen Browser:
        </p>
        <p style="font-size: 12px; color: #9ca3af; line-height: 1.5; word-break: break-all; margin: 0;">
          ${einladungsLink}
        </p>
      </div>
      <p style="text-align: center; font-size: 11px; color: #9ca3af; margin-top: 20px;">
        ${escapeHtml(firmenname)} · Kunden-Portal
      </p>
    </body></html>
  `

  const mailResult = await sendMail({
    to:      email.toLowerCase().trim(),
    subject: `Dein Zugang zum Kunden-Portal bei ${firmenname}`,
    html,
  })

  revalidatePath(`/dashboard/kunden/${kundeId}`)
  return {
    erfolg: true,
    einladungsLink,
    mailGesendet: mailResult.sent,
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    c === '&' ? '&amp;' :
    c === '<' ? '&lt;'  :
    c === '>' ? '&gt;'  :
    c === '"' ? '&quot;': '&#39;'
  ))
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
      // Freigabe-Status liegt seit Mig 076 auf raum_produkte (nicht produkte).
      const { data: rps } = await supabase
        .from('raum_produkte')
        .select('raum_id, freigabe_status, produkte(deleted_at)')
        .in('raum_id', raumIds)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const rp of ((rps ?? []) as any[])) {
        if (rp.produkte?.deleted_at != null) continue
        const pid = raumMap[rp.raum_id]
        if (!pid) continue
        if (!statsMap[pid]) statsMap[pid] = { gesamt: 0, ausstehend: 0, freigegeben: 0 }
        statsMap[pid].gesamt++
        if (!rp.freigabe_status || rp.freigabe_status === 'ausstehend') statsMap[pid].ausstehend++
        if (rp.freigabe_status === 'freigegeben') statsMap[pid].freigegeben++
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
  id: string            // produkte.id (eine Zeile je Produkt; Lieferstatus-Lookup nutzt raum_id:id)
  produkt_id: string
  name: string
  beschreibung: string | null
  bild_url: string | null
  kategorie: string | null
  menge: number | null
  einheit: string | null
  verkaufspreis: number | null    // effektiver Pro-Raum-Netto-Preis (Override + Rabatt)
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

  // Produkte (KEINE internen Felder!). Quelle ist die Junction `raum_produkte`
  // (seit Mig 038), NICHT die Legacy-Spalte produkte.raum_id. Pro (raum_id,
  // produkt_id) wird zu EINER Karte zusammengefasst (Mig 134 erlaubt Mehrfach-
  // Produkte): Menge summiert, Freigabe-Status konservativ aggregiert, Preis =
  // effektiver Pro-Raum-Netto (Override + Rabatt). raum_produkte hat KEIN
  // deleted_at → nur produkte.deleted_at filtern.
  let produkte: PortalProdukt[] = []
  if (raumIds.length > 0) {
    const { data } = await supabase
      .from('raum_produkte')
      .select('raum_id, produkt_id, menge, verkaufspreis_override, rabatt_prozent, freigabe_status, produkte(id, name, beschreibung, bild_url, kategorie, einheit, verkaufspreis, deleted_at, reihenfolge)')
      .in('raum_id', raumIds)
      .order('reihenfolge', { referencedTable: 'produkte' })

    // Status-Aggregation: nur freigegeben, wenn ALLE Instanzen freigegeben sind.
    const statusRang = (s: string | null): number =>
      ({ ausstehend: 0, abgelehnt: 1, ueberarbeitung: 2, freigegeben: 3 }[s ?? 'ausstehend'] ?? 0)
    const aggStatus = (a: string | null, b: string | null): string => {
      // 'ausstehend' dominiert; sonst der „niedrigste" Status (offen vor erledigt).
      if (a === 'ausstehend' || b === 'ausstehend') return 'ausstehend'
      return statusRang(a) <= statusRang(b) ? (a ?? 'ausstehend') : (b ?? 'ausstehend')
    }

    const byKey = new Map<string, PortalProdukt>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const rp of ((data ?? []) as any[])) {
      const p = rp.produkte
      if (!p || p.deleted_at != null) continue
      const key = `${rp.raum_id}:${rp.produkt_id}`
      const vpNetto = effektiverVpNetto(
        { verkaufspreis_override: rp.verkaufspreis_override, rabatt_prozent: rp.rabatt_prozent },
        p.verkaufspreis ?? null,
      )
      const vorhanden = byKey.get(key)
      if (vorhanden) {
        vorhanden.menge = (vorhanden.menge ?? 0) + (rp.menge ?? 0)
        vorhanden.freigabe_status = aggStatus(vorhanden.freigabe_status, rp.freigabe_status)
      } else {
        byKey.set(key, {
          id:              p.id,
          produkt_id:      p.id,
          name:            p.name,
          beschreibung:    p.beschreibung ?? null,
          bild_url:        p.bild_url ?? null,
          kategorie:       p.kategorie ?? null,
          menge:           rp.menge ?? 0,
          einheit:         p.einheit ?? null,
          verkaufspreis:   vpNetto,
          freigabe_status: rp.freigabe_status ?? 'ausstehend',
          raum_id:         rp.raum_id,
        })
      }
    }
    produkte = Array.from(byKey.values())
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

  // Nachrichten (inkl. Anhang-Metadaten seit Mig. 080)
  const { data: nachrichten } = await supabase
    .from('client_nachrichten')
    .select('id, nachricht, von_kunde, created_at, client_user_id, typ, anhang_pfad, anhang_typ, anhang_name, anhang_groesse, anhang_dauer')
    .eq('projekt_id', projektId)
    .order('created_at')

  // Timeline Events – nur für Kunde freigegebene Einträge
  const { data: events } = await supabase
    .from('timeline_events')
    .select('id, titel, typ, start_datum, end_datum, status, farbe')
    .eq('projekt_id', projektId)
    .eq('kunde_sichtbar', true)
    .order('start_datum')

  // ── Bestell-/Liefer-Status pro Produkt (Migration 076 + 100) ──
  // Lookup-Map raum_id:produkt_id → Status. Das Portal zeigt Produkte pro
  // produkt_id (eine Zeile je Produkt). Seit Mig 134 kann derselbe Artikel
  // MEHRFACH in einem Raum liegen → bei mehreren raum_produkte-Zeilen den
  // WEITESTEN Lieferstatus behalten (deterministisch, zeigt den Fortschritt),
  // statt der zufällig letzten Zeile.
  const bestellStatusMap: Record<string, {
    bestellstatus:           string
    bestellt_am:             string | null
    liefertermin:            string | null
    lieferung_erhalten_am:   string | null
  }> = {}
  // Höherer Rang = weiter fortgeschritten (für den Kunden relevanter zu sehen).
  const lieferRang = (s: string | null): number => ({
    ausstehend: 0, storniert: 0, bestellt: 1, mangel_gemeldet: 1,
    retoure_unterwegs: 2, retoure_erhalten: 2, teilgeliefert: 3,
    geliefert: 4, rechnung_erhalten: 5,
  }[s ?? 'ausstehend'] ?? 0)
  if (raumIds.length > 0) {
    const { data: rps } = await supabase
      .from('raum_produkte')
      .select('raum_id, produkt_id, bestellstatus, bestellt_am, liefertermin, lieferung_erhalten_am')
      .in('raum_id', raumIds)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const rp of ((rps ?? []) as any[])) {
      const key = `${rp.raum_id}:${rp.produkt_id}`
      const vorhanden = bestellStatusMap[key]
      if (vorhanden && lieferRang(rp.bestellstatus) <= lieferRang(vorhanden.bestellstatus)) continue
      bestellStatusMap[key] = {
        bestellstatus:         rp.bestellstatus ?? 'ausstehend',
        bestellt_am:           rp.bestellt_am ?? null,
        liefertermin:          rp.liefertermin ?? null,
        lieferung_erhalten_am: rp.lieferung_erhalten_am ?? null,
      }
    }
  }

  // ── Reklamationen (Migration 100) — nur kunde_sichtbar ──────
  type PortalReklamation = {
    id:               string
    raum_produkte_id: string
    raum_id:          string | null
    produkt_id:       string | null
    typ:              string
    beschreibung:     string
    status:           string
    loesung_typ:      string | null
    geloest_am:       string | null
    created_at:       string
  }
  let reklamationen: PortalReklamation[] = []
  if (raumIds.length > 0) {
    const { data: reks } = await supabase
      .from('produkt_reklamationen')
      .select(`
        id, raum_produkte_id, typ, beschreibung, status, loesung_typ, geloest_am, created_at,
        raum_produkte!inner(raum_id, produkte(id))
      `)
      .eq('kunde_sichtbar', true)
      .in('raum_produkte.raum_id', raumIds)
      .order('created_at', { ascending: false })
    if (reks) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reklamationen = (reks as any[]).map((r: any) => ({
        id:                r.id,
        raum_produkte_id:  r.raum_produkte_id,
        raum_id:           r.raum_produkte?.raum_id ?? null,
        produkt_id:        r.raum_produkte?.produkte?.id ?? null,
        typ:               r.typ,
        beschreibung:      r.beschreibung,
        status:            r.status,
        loesung_typ:       r.loesung_typ,
        geloest_am:        r.geloest_am,
        created_at:        r.created_at,
      }))
    }
  }

  // Nachrichten als gelesen markieren
  await supabase
    .from('client_nachrichten')
    .update({ gelesen: true, gelesen_am: new Date().toISOString() })
    .eq('projekt_id', projektId)
    .eq('von_kunde', false)
    .eq('gelesen', false)

  // Bestell-Gate (Migration 129) — defensiv: fehlt die Spalte, bleibt es false.
  let bestellungAusgeloest = false
  try {
    const { data: g } = await supabase
      .from('projekte').select('bestellung_ausgeloest_am').eq('id', projektId).maybeSingle()
    bestellungAusgeloest = !!(g as { bestellung_ausgeloest_am?: string | null } | null)?.bestellung_ausgeloest_am
  } catch { bestellungAusgeloest = false }

  return {
    session,
    projekt,
    raeume: raeumeMitProdukten,
    dokumente: dokumente ?? [],
    nachrichten: nachrichten ?? [],
    events: events ?? [],
    bestellStatusMap,
    reklamationen,
    bestellungAusgeloest,
  }
}

// Produkt-Freigaben im Portal laufen ausschließlich über den geprüften
// Freigabe-Link (/freigabe/[token]); die Portal-Produktansicht ist read-only.
// Die früheren portalProduktFreigeben/portalAlleFreigeben schrieben in eine
// nicht existierende produkte.freigabe_status-Spalte (No-Op) und wurden entfernt.

// ── PORTAL: NACHRICHTEN ───────────────────────────────────────

const CHAT_BUCKET = 'chat-attachments'
const CHAT_MAX_SIZE = 50 * 1024 * 1024 // 50 MB
/**
 * Whitelist der erlaubten MIME-Typen fuer Chat-Anhaenge. Im Browser
 * ausfuehrbare Formate (HTML, SVG, JS, EXE) sind absichtlich NICHT
 * enthalten — sie koennten via Signed-URL Skripte ausliefern.
 */
const CHAT_ERLAUBTE_MIMES = new Set<string>([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
  'audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/ogg', 'audio/wav', 'audio/x-m4a', 'audio/aac',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv',
])

/**
 * Bestimmt den Typ einer Chat-Nachricht anhand des Datei-Mime-Types.
 * image/* → 'bild', audio/* → 'audio', sonst → 'datei'.
 */
function chatNachrichtTypFuer(mime: string | undefined): 'bild' | 'audio' | 'datei' {
  if (!mime) return 'datei'
  if (mime.startsWith('image/')) return 'bild'
  if (mime.startsWith('audio/')) return 'audio'
  return 'datei'
}

/**
 * Upload-Helper: lädt eine Datei in den Chat-Bucket hoch und gibt die
 * Metadaten für den Nachricht-Insert zurück. Ownership wird durch den
 * aufrufenden Context geprüft (Portal oder Admin).
 */
async function chatAnhangHochladen(
  supabase: ReturnType<typeof createAdminClient>,
  file: File,
  orgId: string,
  projektId: string,
): Promise<{
  fehler?: string
  pfad?: string
  name?: string
  mime?: string
  groesse?: number
}> {
  if (file.size === 0)            return { fehler: 'Datei ist leer.' }
  if (file.size > CHAT_MAX_SIZE)  return { fehler: 'Datei ist zu groß (max. 50 MB).' }
  if (!CHAT_ERLAUBTE_MIMES.has(file.type)) {
    return { fehler: 'Dateityp nicht erlaubt. Erlaubt sind Bilder, Audio, PDF und Office-Dokumente.' }
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
  const pfad = `${orgId}/${projektId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`

  const { error } = await supabase.storage
    .from(CHAT_BUCKET)
    .upload(pfad, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })
  if (error) {
    console.error('[chatAnhangHochladen]', error)
    return { fehler: `Upload fehlgeschlagen: ${error.message}` }
  }
  return {
    pfad,
    name:    file.name,
    mime:    file.type || 'application/octet-stream',
    groesse: file.size,
  }
}

export async function portalNachrichtSenden(
  prevState: PortalActionState,
  formData: FormData
): Promise<PortalActionState> {
  const session    = await requireSession()
  const projektId  = formData.get('projekt_id') as string
  const nachricht  = (formData.get('nachricht') as string ?? '').trim()
  const datei      = formData.get('datei') as File | null
  const audioDauer = parseFloat((formData.get('audio_dauer') as string) ?? '') || null

  if (!nachricht && (!datei || datei.size === 0)) {
    return { fehler: 'Nachricht darf nicht leer sein.' }
  }

  const supabase = createAdminClient()

  const { data: projekt } = await supabase
    .from('projekte')
    .select('id, organisation_id')
    .eq('id', projektId)
    .eq('kunde_id', session.kundeId)
    .maybeSingle()
  if (!projekt) return { fehler: 'Kein Zugriff.' }

  // Anhang hochladen wenn vorhanden
  let anhang: Awaited<ReturnType<typeof chatAnhangHochladen>> | null = null
  let typ: 'text' | 'bild' | 'datei' | 'audio' = 'text'
  if (datei && datei.size > 0) {
    anhang = await chatAnhangHochladen(supabase, datei, projekt.organisation_id as string, projektId)
    if (anhang.fehler) return { fehler: anhang.fehler }
    typ = chatNachrichtTypFuer(anhang.mime)
  }

  const { error } = await supabase.from('client_nachrichten').insert({
    organisation_id: projekt.organisation_id,
    projekt_id:      projektId,
    client_user_id:  session.id,
    von_kunde:       true,
    nachricht:       nachricht || null,
    typ,
    anhang_pfad:     anhang?.pfad    ?? null,
    anhang_typ:      anhang?.mime    ?? null,
    anhang_name:     anhang?.name    ?? null,
    anhang_groesse:  anhang?.groesse ?? null,
    anhang_dauer:    typ === 'audio' ? audioDauer : null,
  })
  if (error) {
    // Cleanup bei DB-Fehler
    if (anhang?.pfad) await supabase.storage.from(CHAT_BUCKET).remove([anhang.pfad])
    return { fehler: error.message }
  }

  return { erfolg: 'Nachricht gesendet.' }
}

// ── ADMIN: NACHRICHT AN KUNDEN ────────────────────────────────

/**
 * Admin sendet Nachricht an Kunden-Portal.
 * Org-Check als Defense-in-Depth + organisation_id in Insert (wichtig
 * für RLS auf client_nachrichten seit Mig. 068).
 */
export async function teamNachrichtSenden(
  projektId: string,
  formData: FormData,
): Promise<{ fehler?: string }> {
  const text       = ((formData.get('nachricht') as string) ?? '').trim()
  const datei      = formData.get('datei') as File | null
  const audioDauer = parseFloat((formData.get('audio_dauer') as string) ?? '') || null

  if (!text && (!datei || datei.size === 0)) {
    return { fehler: 'Nachricht darf nicht leer sein.' }
  }

  const { getOrganisationId } = await import('@/lib/supabase/server')
  let orgId: string
  try { orgId = await getOrganisationId() } catch { return { fehler: 'Nicht angemeldet.' } }

  const supabase = createAdminClient()

  const { data: projekt } = await supabase
    .from('projekte').select('id').eq('id', projektId).eq('organisation_id', orgId).maybeSingle()
  if (!projekt) return { fehler: 'Projekt nicht gefunden.' }

  // Anhang hochladen
  let anhang: Awaited<ReturnType<typeof chatAnhangHochladen>> | null = null
  let typ: 'text' | 'bild' | 'datei' | 'audio' = 'text'
  if (datei && datei.size > 0) {
    anhang = await chatAnhangHochladen(supabase, datei, orgId, projektId)
    if (anhang.fehler) return { fehler: anhang.fehler }
    typ = chatNachrichtTypFuer(anhang.mime)
  }

  const { error } = await supabase.from('client_nachrichten').insert({
    organisation_id: orgId,
    projekt_id:      projektId,
    von_kunde:       false,
    nachricht:       text || null,
    typ,
    anhang_pfad:     anhang?.pfad    ?? null,
    anhang_typ:      anhang?.mime    ?? null,
    anhang_name:     anhang?.name    ?? null,
    anhang_groesse:  anhang?.groesse ?? null,
    anhang_dauer:    typ === 'audio' ? audioDauer : null,
  })
  if (error) {
    if (anhang?.pfad) await supabase.storage.from(CHAT_BUCKET).remove([anhang.pfad])
    return { fehler: 'Fehler beim Senden.' }
  }

  revalidatePath(`/dashboard/projekte/${projektId}`)
  return {}
}

/**
 * Signed URL für einen Chat-Anhang erzeugen (5 Minuten gültig).
 * Wird vom Client gebraucht um Bilder/Audio anzuzeigen und Dateien
 * herunterzuladen. Org-Check + projekt-Zugehörigkeit als Defense-in-Depth.
 */
export async function chatAnhangSignedUrl(
  nachrichtId: string,
): Promise<{ url?: string; fehler?: string }> {
  const { getOrganisationId } = await import('@/lib/supabase/server')
  let orgId: string
  try { orgId = await getOrganisationId() } catch { return { fehler: 'Nicht angemeldet.' } }

  const supabase = createAdminClient()
  const { data: n } = await supabase
    .from('client_nachrichten')
    .select('anhang_pfad, anhang_name, organisation_id')
    .eq('id', nachrichtId)
    .eq('organisation_id', orgId)
    .maybeSingle()
  if (!n?.anhang_pfad) return { fehler: 'Anhang nicht gefunden.' }

  const { data, error } = await supabase.storage
    .from(CHAT_BUCKET)
    .createSignedUrl(n.anhang_pfad as string, 300, {
      download: n.anhang_name as string | undefined,
    })
  if (error || !data) return { fehler: error?.message ?? 'Fehler beim Erstellen der URL.' }
  return { url: data.signedUrl }
}

/**
 * Signed URL für Portal-Seite (Kunde). Prüft kunde_id gegen Session.
 */
export async function portalAnhangSignedUrl(
  nachrichtId: string,
): Promise<{ url?: string; fehler?: string }> {
  const session = await requireSession()
  const supabase = createAdminClient()

  // Nachricht + zugehöriges Projekt laden und prüfen ob Kunde Zugriff hat
  const { data: n } = await supabase
    .from('client_nachrichten')
    .select('anhang_pfad, anhang_name, projekt_id, projekte!inner(kunde_id)')
    .eq('id', nachrichtId)
    .maybeSingle()
  if (!n?.anhang_pfad) return { fehler: 'Anhang nicht gefunden.' }

  const kundeIdVomProjekt = (n.projekte as unknown as { kunde_id: string } | null)?.kunde_id
  if (kundeIdVomProjekt !== session.kundeId) return { fehler: 'Kein Zugriff.' }

  const { data, error } = await supabase.storage
    .from(CHAT_BUCKET)
    .createSignedUrl(n.anhang_pfad as string, 300, {
      download: n.anhang_name as string | undefined,
    })
  if (error || !data) return { fehler: error?.message ?? 'Fehler beim Erstellen der URL.' }
  return { url: data.signedUrl }
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

// ═══════════════════════════════════════════════════════════════
// TEAM: Portal-Mitarbeiter verwalten (nur durch Inhaber)
// ═══════════════════════════════════════════════════════════════

export type PortalRolle = 'inhaber' | 'mitarbeiter' | 'gast'

export type TeamMitgliedRow = {
  id: string
  email: string
  vorname: string
  nachname: string
  rolle: PortalRolle
  aktiv: boolean
  letzter_login: string | null
  einladung_offen: boolean
  erstellt_am: string
}

export async function teamAbrufen(): Promise<TeamMitgliedRow[]> {
  const session = await getPortalSession()
  if (!session) return []

  const admin = createAdminClient()
  const { data } = await admin
    .from('client_users')
    .select('id, email, vorname, nachname, rolle, aktiv, letzter_login, einladungs_token, token_gueltig_bis, password_hash, created_at')
    .eq('kunde_id', session.kundeId)
    .order('rolle')
    .order('created_at')

  return ((data ?? []) as Array<{
    id: string; email: string; vorname: string; nachname: string
    rolle: PortalRolle; aktiv: boolean; letzter_login: string | null
    einladungs_token: string | null; token_gueltig_bis: string | null
    password_hash: string | null; created_at: string
  }>).map((r) => ({
    id:              r.id,
    email:           r.email,
    vorname:         r.vorname,
    nachname:        r.nachname,
    rolle:           r.rolle,
    aktiv:           r.aktiv,
    letzter_login:   r.letzter_login,
    einladung_offen: !!r.einladungs_token && !r.password_hash,
    erstellt_am:     r.created_at,
  }))
}

export async function mitarbeiterEinladen(daten: {
  email: string
  vorname: string
  nachname: string
  rolle: Exclude<PortalRolle, 'inhaber'>
}): Promise<{ erfolg: boolean; einladungsLink?: string; mailGesendet?: boolean; fehler?: string }> {
  const session = await getPortalSession()
  if (!session) return { erfolg: false, fehler: 'Nicht angemeldet.' }
  if (session.rolle !== 'inhaber') {
    return { erfolg: false, fehler: 'Nur der Inhaber kann Mitglieder einladen.' }
  }

  const email = daten.email.toLowerCase().trim()
  if (!email) return { erfolg: false, fehler: 'E-Mail erforderlich.' }

  const admin = createAdminClient()

  // Existiert die E-Mail schon (global)?
  const { data: existing } = await admin
    .from('client_users')
    .select('id, kunde_id, aktiv')
    .eq('email', email)
    .maybeSingle()

  if (existing && existing.kunde_id !== session.kundeId) {
    return { erfolg: false, fehler: 'Diese E-Mail ist bereits in einem anderen Kunden-Portal registriert.' }
  }

  const einladungsToken = crypto.randomUUID()
  const tokenGueltigBis = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  if (existing) {
    const { error } = await admin
      .from('client_users')
      .update({
        vorname:          daten.vorname.trim(),
        nachname:         daten.nachname.trim(),
        rolle:            daten.rolle,
        einladungs_token: einladungsToken,
        token_gueltig_bis: tokenGueltigBis,
        aktiv:            true,
        eingeladen_von:   session.id,
        updated_at:       new Date().toISOString(),
      })
      .eq('id', existing.id as string)
    if (error) return { erfolg: false, fehler: error.message }
  } else {
    const { error } = await admin
      .from('client_users')
      .insert({
        kunde_id:         session.kundeId,
        email,
        vorname:          daten.vorname.trim(),
        nachname:         daten.nachname.trim(),
        rolle:            daten.rolle,
        einladungs_token: einladungsToken,
        token_gueltig_bis: tokenGueltigBis,
        eingeladen_von:   session.id,
        preise_anzeigen:  session.preiseAnzeigen,
      })
    if (error) return { erfolg: false, fehler: error.message }
  }

  // Link bauen
  const baseUrl = await appBaseUrl()
  const einladungsLink = `${baseUrl}/portal/einladung/${einladungsToken}`

  // Einladungs-Mail
  const firmenname = 'Kunden-Portal'
  const inhaberName = [session.vorname, session.nachname].filter(Boolean).join(' ') || session.email
  const html = `
    <!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#f6ede2;margin:0;padding:32px;">
      <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 2px 10px rgba(0,0,0,0.04);">
        <h1 style="font-size:20px;color:#2d3e31;margin:0 0 16px;">Hallo ${escapeHtml(daten.vorname || email)},</h1>
        <p style="font-size:15px;color:#4b5563;line-height:1.55;margin:0 0 18px;">
          ${escapeHtml(inhaberName)} hat dich als <strong>${daten.rolle === 'gast' ? 'Gast' : 'Mitarbeiter'}</strong> zum Kunden-Portal eingeladen.
        </p>
        <p style="font-size:15px;color:#4b5563;line-height:1.55;margin:0 0 24px;">
          Klicke auf den Button, um dein Passwort zu setzen und loszulegen:
        </p>
        <p style="text-align:center;margin:0 0 24px;">
          <a href="${einladungsLink}" style="display:inline-block;background:#445c49;color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:600;font-size:15px;">
            Zugang aktivieren →
          </a>
        </p>
        <p style="font-size:12px;color:#9ca3af;line-height:1.5;margin:0 0 8px;">Dieser Link ist 7 Tage gültig.</p>
        <p style="font-size:12px;color:#9ca3af;word-break:break-all;margin:0;">${einladungsLink}</p>
      </div>
    </body></html>`

  const mail = await sendMail({
    to:      email,
    subject: `Einladung zum ${firmenname}`,
    html,
  })

  revalidatePath('/portal/team')
  return { erfolg: true, einladungsLink, mailGesendet: mail.sent }
}

export async function mitarbeiterRolleAendern(
  mitgliedId: string,
  neueRolle: PortalRolle,
): Promise<{ fehler?: string }> {
  const session = await getPortalSession()
  if (!session) return { fehler: 'Nicht angemeldet.' }
  if (session.rolle !== 'inhaber') return { fehler: 'Keine Berechtigung.' }

  if (mitgliedId === session.id && neueRolle !== 'inhaber') {
    return { fehler: 'Du kannst deine eigene Inhaber-Rolle nicht downgraden.' }
  }

  const admin = createAdminClient()
  // Ownership-Check: Mitglied muss zum selben Kunden gehören
  const { data: m } = await admin
    .from('client_users')
    .select('id, kunde_id')
    .eq('id', mitgliedId)
    .maybeSingle()
  if (!m || m.kunde_id !== session.kundeId) return { fehler: 'Mitglied nicht gefunden.' }

  const { error } = await admin
    .from('client_users')
    .update({ rolle: neueRolle, updated_at: new Date().toISOString() })
    .eq('id', mitgliedId)
  if (error) return { fehler: error.message }

  revalidatePath('/portal/team')
  return {}
}

export async function mitarbeiterEntfernen(mitgliedId: string): Promise<{ fehler?: string }> {
  const session = await getPortalSession()
  if (!session) return { fehler: 'Nicht angemeldet.' }
  if (session.rolle !== 'inhaber') return { fehler: 'Keine Berechtigung.' }
  if (mitgliedId === session.id) return { fehler: 'Du kannst dich nicht selbst entfernen.' }

  const admin = createAdminClient()
  const { data: m } = await admin
    .from('client_users')
    .select('id, kunde_id, rolle')
    .eq('id', mitgliedId)
    .maybeSingle()
  if (!m || m.kunde_id !== session.kundeId) return { fehler: 'Mitglied nicht gefunden.' }
  if (m.rolle === 'inhaber') return { fehler: 'Inhaber kann nicht entfernt werden.' }

  const { error } = await admin
    .from('client_users')
    .update({ aktiv: false, session_token: null, einladungs_token: null, updated_at: new Date().toISOString() })
    .eq('id', mitgliedId)
  if (error) return { fehler: error.message }

  revalidatePath('/portal/team')
  return {}
}

// ── PORTAL: AUFGABEN (Migration 102) ──────────────────────────

export interface PortalAufgabe {
  id:                 string
  titel:              string
  beschreibung:       string | null
  status:             'backlog' | 'in_arbeit' | 'review' | 'erledigt'
  prioritaet:         'niedrig' | 'normal' | 'hoch' | 'dringend'
  faellig_am:         string | null
  erledigt_am:        string | null
  assignee_kunde:     boolean
  projekt_id:         string | null
  projekt_name:       string | null
  raum_id:            string | null
  raum_name:          string | null
  checklist_offen:    number
  checklist_gesamt:   number
  anhang_count:       number
  created_at:         string
}

/** Aufgaben fuer den eingeloggten Portal-Kunden. */
export async function portalAufgabenAbrufen(projektId?: string): Promise<PortalAufgabe[]> {
  const session = await requireSession()
  const supabase = createAdminClient()

  let q = supabase
    .from('aufgaben')
    .select(`
      id, titel, beschreibung, status, prioritaet, faellig_am, erledigt_am,
      assignee_kunde, projekt_id, raum_id, checklist, anhang_urls, created_at,
      projekt:projekte(name),
      raum:raeume(name)
    `)
    .eq('kunde_id', session.kundeId)
    .or('assignee_kunde.eq.true,sichtbar_fuer_kunde.eq.true')
    .order('faellig_am', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (projektId) q = q.eq('projekt_id', projektId)

  const { data, error } = await q
  if (error || !data) return []

  type Row = {
    id: string; titel: string; beschreibung: string | null
    status: PortalAufgabe['status']; prioritaet: PortalAufgabe['prioritaet']
    faellig_am: string | null; erledigt_am: string | null
    assignee_kunde: boolean; projekt_id: string | null; raum_id: string | null
    checklist: { erledigt: boolean }[] | null
    anhang_urls: unknown[] | null
    created_at: string
    projekt: { name: string | null } | null
    raum:    { name: string | null } | null
  }
  return (data as unknown as Row[]).map((r) => ({
    id:               r.id,
    titel:            r.titel,
    beschreibung:     r.beschreibung,
    status:           r.status,
    prioritaet:       r.prioritaet,
    faellig_am:       r.faellig_am,
    erledigt_am:      r.erledigt_am,
    assignee_kunde:   r.assignee_kunde,
    projekt_id:       r.projekt_id,
    projekt_name:     r.projekt?.name ?? null,
    raum_id:          r.raum_id,
    raum_name:        r.raum?.name ?? null,
    checklist_offen:  (r.checklist ?? []).filter((c) => !c.erledigt).length,
    checklist_gesamt: (r.checklist ?? []).length,
    anhang_count:     (r.anhang_urls ?? []).length,
    created_at:       r.created_at,
  }))
}

/** Aufgabe als erledigt/nicht erledigt markieren — nur eigene assignee_kunde-Aufgaben. */
export async function portalAufgabeErledigen(aufgabeId: string): Promise<{ fehler?: string }> {
  const session = await requireSession()
  const supabase = createAdminClient()

  const { data: a } = await supabase
    .from('aufgaben')
    .select('id, assignee_kunde, kunde_id, status')
    .eq('id', aufgabeId)
    .maybeSingle()
  if (!a) return { fehler: 'Aufgabe nicht gefunden.' }
  if (a.kunde_id !== session.kundeId) return { fehler: 'Keine Berechtigung.' }
  if (!a.assignee_kunde) return { fehler: 'Diese Aufgabe ist dir nicht zugewiesen.' }

  const neu = a.status === 'erledigt' ? 'in_arbeit' : 'erledigt'
  const update: Record<string, unknown> = { status: neu }
  if (neu === 'erledigt') update.erledigt_am = new Date().toISOString()
  else update.erledigt_am = null

  const { error } = await supabase
    .from('aufgaben')
    .update(update)
    .eq('id', aufgabeId)
    .eq('kunde_id', session.kundeId)
  if (error) return { fehler: 'Status konnte nicht aktualisiert werden.' }

  revalidatePath('/portal/dashboard')
  revalidatePath('/portal/aufgaben')
  return {}
}

/** Kommentar zu einer Aufgabe vom Kunden hinzufuegen. */
export async function portalAufgabeKommentar(
  aufgabeId: string, inhalt: string,
): Promise<{ fehler?: string }> {
  const text = inhalt.trim()
  if (!text) return { fehler: 'Kommentar darf nicht leer sein.' }
  if (text.length > 4000) return { fehler: 'Kommentar zu lang.' }

  const session = await requireSession()
  const supabase = createAdminClient()

  const { data: a } = await supabase
    .from('aufgaben')
    .select('id, kunde_id, organisation_id, assignee_kunde, sichtbar_fuer_kunde')
    .eq('id', aufgabeId)
    .maybeSingle()
  if (!a) return { fehler: 'Aufgabe nicht gefunden.' }
  if (a.kunde_id !== session.kundeId) return { fehler: 'Keine Berechtigung.' }
  if (!a.assignee_kunde && !a.sichtbar_fuer_kunde) return { fehler: 'Keine Berechtigung.' }

  const autorName = `${session.vorname} ${session.nachname}`.trim() || session.email
  const { error } = await supabase
    .from('aufgaben_kommentare')
    .insert({
      organisation_id: a.organisation_id,
      aufgabe_id:      aufgabeId,
      autor_user_id:   null,
      autor_name:      autorName,
      ist_kunde:       true,
      inhalt:          text,
    })
  if (error) return { fehler: 'Kommentar konnte nicht gespeichert werden.' }

  revalidatePath('/portal/aufgaben')
  return {}
}
