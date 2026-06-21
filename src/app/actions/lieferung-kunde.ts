// KEIN 'use server' — reines SERVER-Modul (kein Client-aufrufbarer Endpunkt).
// Nutzt den Admin-Client (RLS-Bypass) + nimmt eine projektId entgegen; als
// Server-Action wäre das ein IDOR. `server-only` erzwingt das zur Build-Zeit.
// Aufruf ausschließlich server→server aus bestellungVersandt / bestellungGeliefert.
import 'server-only'

/**
 * Informiert den Kunden im Portal über einen Liefer-Meilenstein.
 * Fail-safe (nie throw) — eine Statusänderung der Bestellung darf hieran
 * niemals scheitern. KEINE Lieferantennamen an den Kunden (Sourcing verborgen).
 *
 *  - 'versandt'  → leichte Aktivität „Lieferung unterwegs"
 *  - 'geliefert' → Aktivität + Chat-Nachricht „angekommen" + Glocke je Portal-Nutzer
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export type LieferMeilenstein = 'versandt' | 'geliefert'

export async function kundeLieferungBenachrichtigen(
  projektId: string,
  milestone: LieferMeilenstein,
): Promise<void> {
  try {
    const supabase = createAdminClient()

    const { data: projekt, error: pErr } = await supabase
      .from('projekte')
      .select('id, name, organisation_id, kunde_id')
      .eq('id', projektId)
      .maybeSingle()
    if (pErr || !projekt) return

    const orgId = projekt.organisation_id as string | null

    // Immer: leichter Aktivitäts-Eintrag.
    try {
      await supabase.from('client_aktivitaeten').insert({
        projekt_id: projektId,
        kunde_id:   projekt.kunde_id ?? null,
        typ:        'lieferung',
        titel:      milestone === 'geliefert' ? 'Lieferung angekommen' : 'Lieferung unterwegs',
      })
    } catch { /* ignore */ }

    // Nur bei 'geliefert': freudige Chat-Bubble + Glocke je aktivem Portal-Nutzer.
    if (milestone === 'geliefert') {
      try {
        await supabase.from('client_nachrichten').insert({
          organisation_id: orgId,
          projekt_id:      projektId,
          von_kunde:       false,
          nachricht:       '📦 Gute Nachrichten! Eine Lieferung für Ihr Projekt ist angekommen. Den aktuellen Stand sehen Sie jederzeit im Tab „Lieferungen".',
          typ:             'text',
        })
      } catch { /* ignore */ }

      try {
        if (projekt.kunde_id) {
          const { data: cu } = await supabase
            .from('client_users')
            .select('id')
            .eq('kunde_id', projekt.kunde_id)
            .eq('aktiv', true)
          for (const u of (cu ?? []) as { id: string }[]) {
            try {
              await supabase.from('client_benachrichtigungen').insert({
                client_user_id: u.id,
                typ:            'lieferung',
                titel:          '📦 Eine Lieferung ist angekommen',
                link:           `/portal/projekte/${projektId}`,
              })
            } catch { /* ignore */ }
          }
        }
      } catch { /* ignore */ }
    }

    revalidatePath(`/portal/projekte/${projektId}`)
  } catch (e) {
    // Nie werfen — die Statusänderung der Bestellung darf hieran nie scheitern.
    console.error('[kundeLieferungBenachrichtigen]', e)
  }
}
