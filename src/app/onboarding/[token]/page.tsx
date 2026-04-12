import { createAdminClient } from '@/lib/supabase/admin'
import { vorlageZuTokenLaden } from '@/app/actions/onboarding'
import OnboardingFormular from './OnboardingFormular'
import type { OnboardingVorlage } from '@/lib/supabase/types'

interface Props {
  params: { token: string }
}

export default async function OnboardingPage({ params }: Props) {
  const supabase = createAdminClient()

  const { data: anfrage } = await supabase
    .from('onboarding_anfragen')
    .select('id, status, kunde_name, vorlage_id')
    .eq('token', params.token)
    .single()

  if (!anfrage || anfrage.status === 'abgelehnt') {
    return <Fehlerseite />
  }

  // Bereits ausgefüllt (Kunde hat Formular abgesendet)
  if (anfrage.kunde_name) {
    return <BereitsAusgefuellt />
  }

  // Vorlage laden (null wenn Standard / keine Vorlage)
  const vorlage: OnboardingVorlage | null = anfrage.vorlage_id
    ? await vorlageZuTokenLaden(params.token)
    : null

  return <OnboardingFormular token={params.token} vorlage={vorlage} />
}

// ── Fehler-Seite ──────────────────────────────────────────────
function Fehlerseite() {
  return (
    <div className="min-h-screen bg-[#f6ede2] flex items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <LogoKlein />
        <h1 className="text-xl font-semibold text-gray-900 mb-2 mt-6">Link nicht verfügbar</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          Dieser Onboarding-Link ist ungültig oder wurde deaktiviert.
          Bitte wende dich an deinen Innenarchitekten.
        </p>
      </div>
    </div>
  )
}

// ── Bereits ausgefüllt ────────────────────────────────────────
function BereitsAusgefuellt() {
  return (
    <div className="min-h-screen bg-[#f6ede2] flex items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <LogoKlein />
        <div className="w-14 h-14 bg-wellbeing-green/10 rounded-2xl flex items-center justify-center mx-auto mt-6 mb-4">
          <svg className="w-7 h-7 text-wellbeing-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Bereits eingereicht</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          Ihre Anfrage wurde bereits erfolgreich übermittelt.
          Wir melden uns bald bei Ihnen.
        </p>
      </div>
    </div>
  )
}

function LogoKlein() {
  return (
    <div className="flex items-center justify-center gap-2.5">
      <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
        <rect x="0" y="0" width="10" height="10" rx="2" fill="#445c49" opacity="0.30" />
        <rect x="4" y="4" width="10" height="10" rx="2" fill="#445c49" opacity="0.55" />
        <rect x="8" y="8" width="10" height="10" rx="2" fill="#445c49" />
      </svg>
      <span className="font-syne text-base font-bold text-[#2d3e31] tracking-tight">Wellbeing Spaces</span>
    </div>
  )
}
