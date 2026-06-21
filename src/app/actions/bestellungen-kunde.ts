// KEIN 'use server' — dies ist ein reines SERVER-Modul (kein Client-aufrufbarer
// Endpunkt). Grund: kundeBestellungBenachrichtigen nutzt den Admin-Client
// (RLS-Bypass) und nimmt eine projektId entgegen; als Server-Action wäre sie
// direkt vom Client mit fremder projektId aufrufbar (IDOR → fremde Celebration/
// Mail/Gate). `server-only` erzwingt das zur Build-Zeit. Aufruf ausschließlich
// server→server aus bestellungAusloesen.
import 'server-only'

/**
 * Kunden-Glückwunsch + Lieferübersicht-Anstoß, wenn eine Bestellung ausgelöst wird.
 * Wird NUR server→server aus bestellungAusloesen aufgerufen. Alles fail-safe:
 * keine Exception verlässt diese Funktion, die Bestellung selbst darf nie scheitern.
 * Idempotent: die große Celebration feuert genau EINMAL pro Projekt (DB-Guard über
 * projekte.bestellung_ausgeloest_am, Migration 129). KEINE Lieferantennamen an Kunden.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sendMail } from '@/lib/mail'
import { bestellAusgeloestMail } from '@/lib/mail-templates'

export async function kundeBestellungBenachrichtigen(
  projektId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _opts?: { bestellungId?: string },
): Promise<void> {
  try {
    const supabase = createAdminClient()

    // 1) Projekt-Stammdaten (sichere Spalten — existieren immer)
    const { data: projekt, error: pErr } = await supabase
      .from('projekte')
      .select('id, name, organisation_id, kunde_id')
      .eq('id', projektId)
      .maybeSingle()
    if (pErr || !projekt) return

    // 2) Gate (Migration 129): konditionales Update → nur der ERSTE Aufruf "gewinnt".
    //    Eigener try/catch: fehlt die Spalte (Pre-129), bleibt erstmalig=false.
    let erstmalig = false
    try {
      const { data: gated } = await supabase
        .from('projekte')
        .update({ bestellung_ausgeloest_am: new Date().toISOString() })
        .eq('id', projektId)
        .is('bestellung_ausgeloest_am', null)
        .select('id')
      erstmalig = (gated?.length ?? 0) > 0
    } catch { erstmalig = false }

    // 3) Leichter Aktivitäts-Eintrag (immer)
    try {
      await supabase.from('client_aktivitaeten').insert({
        projekt_id: projektId,
        kunde_id:   projekt.kunde_id ?? null,
        typ:        'bestellung',
        titel:      erstmalig ? 'Bestellung ausgelöst' : 'Lieferung aktualisiert',
      })
    } catch { /* ignore */ }

    if (!erstmalig) {
      revalidatePath(`/portal/projekte/${projektId}`)
      return
    }

    // 4) Erst-Bestellung → Glückwunsch (Chat-Bubble + Bell + E-Mail)
    const orgId = projekt.organisation_id as string | null

    try {
      await supabase.from('client_nachrichten').insert({
        organisation_id: orgId,
        projekt_id:      projektId,
        von_kunde:       false,
        nachricht:       '🎉 Glückwunsch! Ihre Bestellung wurde ausgelöst. Im Tab „Lieferungen" sehen Sie ab jetzt, was wann geliefert wird.',
        typ:             'text',
      })
    } catch { /* ignore */ }

    // Empfänger (Kunde + aktive Portal-Nutzer)
    let kundeName = 'zusammen'
    let kundeEmail: string | null = null
    try {
      if (projekt.kunde_id) {
        const { data: kunde } = await supabase
          .from('kunden').select('name, email').eq('id', projekt.kunde_id).maybeSingle()
        if (kunde?.name) kundeName = kunde.name
        kundeEmail = kunde?.email ?? null
      }
    } catch { /* ignore */ }

    let clientUsers: { id: string; email: string; vorname: string | null }[] = []
    try {
      if (projekt.kunde_id) {
        const { data: cu } = await supabase
          .from('client_users')
          .select('id, email, vorname, aktiv')
          .eq('kunde_id', projekt.kunde_id)
          .eq('aktiv', true)
        clientUsers = (cu ?? []) as typeof clientUsers
      }
    } catch { /* ignore */ }

    // In-App-Benachrichtigung je Portal-Nutzer
    for (const u of clientUsers) {
      try {
        await supabase.from('client_benachrichtigungen').insert({
          client_user_id: u.id,
          typ:            'bestellung',
          titel:          '🎉 Ihre Bestellung wurde ausgelöst',
          link:           `/portal/projekte/${projektId}`,
        })
      } catch { /* ignore */ }
    }

    // E-Mail (Kunde bevorzugt; sonst an die Portal-Nutzer)
    const empfaenger = Array.from(new Set(
      [kundeEmail, ...clientUsers.map((u) => u.email)].filter((e): e is string => !!e),
    ))
    if (empfaenger.length > 0) {
      try {
        const base = process.env.NEXT_PUBLIC_APP_URL?.trim() || ''
        const mail = bestellAusgeloestMail({
          empfaengerName: clientUsers[0]?.vorname || kundeName,
          projektName:    projekt.name ?? null,
          portalUrl:      `${base}/portal/projekte/${projektId}`,
        })
        // sendMail nimmt genau einen Empfänger → je Adresse einzeln verschicken.
        for (const to of empfaenger) {
          try { await sendMail({ to, subject: mail.subject, html: mail.html }) } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
    }

    revalidatePath(`/portal/projekte/${projektId}`)
    revalidatePath('/dashboard/chats')
  } catch {
    // Nie werfen — die Bestellung darf an der Benachrichtigung nie scheitern.
  }
}
