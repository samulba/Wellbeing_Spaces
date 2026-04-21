import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { organisationErstellen, userMitOrgVerknuepfen } from '@/app/actions/organisation'
import { erstelleStandardVorlagen, erstelleStandardOnboardingVorlagen, erstelleStandardKategorien } from '@/app/actions/vorlagen-seed'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)

    // Multi-Tenancy: Prüfen ob User bereits eine Org hat
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const admin = createAdminClient()

        // Hat der User bereits einen aktiven team_mitglieder-Eintrag mit Org?
        const { data: mitglied } = await admin
          .from('team_mitglieder')
          .select('id, organisation_id')
          .eq('user_id', user.id)
          .eq('status', 'aktiv')
          .maybeSingle()

        const hatOrg = mitglied?.organisation_id != null

        if (!hatOrg) {
          // Org-Name aus User-Metadaten oder E-Mail ableiten
          const vollname = (user.user_metadata?.full_name as string | undefined)?.trim()
          const emailPrefix = (user.email ?? '').split('@')[0]
          const orgName = vollname || emailPrefix || 'Meine Organisation'

          const orgId = await organisationErstellen(orgName)

          if (mitglied) {
            // Bestehender Eintrag ohne Org → Org nachträglich zuweisen
            await admin
              .from('team_mitglieder')
              .update({ organisation_id: orgId })
              .eq('id', mitglied.id)
          } else {
            // Noch kein Eintrag → neu als Admin anlegen
            await userMitOrgVerknuepfen(user.id, user.email ?? '', orgId)
          }

          // Standard-Vorlagen + Default-Kategorien für neue Organisation
          await erstelleStandardVorlagen(orgId)
          await erstelleStandardOnboardingVorlagen(orgId)
          await erstelleStandardKategorien(orgId)
        }
      }
    } catch (err) {
      // Fehler im Org-Setup darf den Login nicht blockieren
      console.error('[auth/callback] Org-Setup fehlgeschlagen:', err)
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
