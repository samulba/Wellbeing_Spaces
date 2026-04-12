import { createAdminClient } from '@/lib/supabase/admin'
import { vorlageZuTokenLaden } from '@/app/actions/onboarding'
import { brandingFuerToken } from '@/app/actions/branding'
import OnboardingFormular from './OnboardingFormular'
import type { OnboardingVorlage, Branding } from '@/lib/supabase/types'

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
    const br = await brandingFuerToken()
    return <Fehlerseite branding={br} />
  }

  // Bereits ausgefüllt (Kunde hat Formular abgesendet)
  if (anfrage.kunde_name) {
    const br = await brandingFuerToken()
    return <BereitsAusgefuellt branding={br} />
  }

  // Vorlage + Branding parallel laden
  const [vorlage, branding] = await Promise.all([
    anfrage.vorlage_id ? vorlageZuTokenLaden(params.token) : Promise.resolve(null),
    brandingFuerToken(),
  ])

  return <OnboardingFormular token={params.token} vorlage={vorlage as OnboardingVorlage | null} branding={branding} />
}

// ── Fehler-Seite ──────────────────────────────────────────────
function Fehlerseite({ branding }: { branding: Branding | null }) {
  const bg = branding?.background_color ?? '#f6ede2'
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: bg }}>
      <div className="max-w-sm text-center">
        <LogoKlein branding={branding} />
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
function BereitsAusgefuellt({ branding }: { branding: Branding | null }) {
  const bg   = branding?.background_color ?? '#f6ede2'
  const prim = branding?.primary_color    ?? '#445c49'
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: bg }}>
      <div className="max-w-sm text-center">
        <LogoKlein branding={branding} />
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mt-6 mb-4" style={{ backgroundColor: `${prim}1a` }}>
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: prim }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Bereits eingereicht</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          Ihre Anfrage wurde bereits erfolgreich übermittelt.
          Wir melden uns bald bei Ihnen.
        </p>
        {(branding?.show_powered_by ?? true) && (
          <p className="text-[10px] text-gray-300 mt-8">Powered by Wellbeing Spaces</p>
        )}
      </div>
    </div>
  )
}

function LogoKlein({ branding }: { branding: Branding | null }) {
  const prim = branding?.primary_color ?? '#445c49'
  const name = branding?.firmenname   ?? 'Wellbeing Spaces'
  return (
    <div className="flex items-center justify-center gap-2.5">
      {branding?.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={branding.logo_url} alt={name} width={28} height={28} className="rounded object-contain" />
      ) : (
        <svg width="22" height="22" viewBox="0 0 18 18" fill="none">
          <rect x="0" y="0" width="10" height="10" rx="2" fill={prim} opacity="0.30" />
          <rect x="4" y="4" width="10" height="10" rx="2" fill={prim} opacity="0.55" />
          <rect x="8" y="8" width="10" height="10" rx="2" fill={prim} />
        </svg>
      )}
      <span className="font-syne text-base font-bold tracking-tight" style={{ color: prim }}>{name}</span>
    </div>
  )
}
