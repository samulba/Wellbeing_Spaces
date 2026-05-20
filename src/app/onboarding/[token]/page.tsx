import { createAdminClient } from '@/lib/supabase/admin'
import { vorlageZuTokenLaden } from '@/app/actions/onboarding'
import { brandingFuerToken } from '@/app/actions/branding'
import OnboardingFormular from './OnboardingFormular'
import type { OnboardingVorlage, Branding } from '@/lib/supabase/types'

// Erzwingt SSR bei jedem Request — verhindert dass ein bereits eingereichtes
// Formular dem Kunden dank Cache nochmal als "leer" gerendert wird.
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Props {
  params: { token: string }
  searchParams: { vorschau?: string }
}

export default async function OnboardingPage({ params, searchParams }: Props) {
  const supabase = createAdminClient()
  const vorschauModus = searchParams?.vorschau === '1'

  const { data: anfrage } = await supabase
    .from('onboarding_anfragen')
    .select('id, status, antworten, vorlage_id, gueltig_bis, auto_save, kunde_name, kunde_email, kunde_telefon, projekt_name, projekt_adresse, raumtypen, budget_min, budget_max, zeitrahmen, stil_praeferenzen, notizen, fortschritt, aktuelle_sektion')
    .eq('token', params.token)
    .maybeSingle()

  // Token-Branch 1: gar nicht gefunden
  if (!anfrage) {
    const br = await brandingFuerToken()
    return <Fehlerseite branding={br} title="Link nicht gefunden" text="Dieser Onboarding-Link existiert nicht oder wurde geloescht." />
  }

  // Token-Branch 2: vom Admin abgelehnt
  if (anfrage.status === 'abgelehnt') {
    const br = await brandingFuerToken()
    return <Fehlerseite branding={br} title="Link deaktiviert" text="Dieser Onboarding-Link wurde deaktiviert. Bitte wende dich an deinen Innenarchitekten fuer einen neuen Link." />
  }

  // Token-Branch 3: abgelaufen
  if (anfrage.status === 'abgelaufen' || (anfrage.gueltig_bis && new Date(anfrage.gueltig_bis) < new Date())) {
    const br = await brandingFuerToken()
    return <Fehlerseite branding={br} title="Link abgelaufen" text="Dieser Onboarding-Link ist nicht mehr gueltig. Bitte wende dich an deinen Innenarchitekten fuer einen neuen Link." />
  }

  // Token-Branch 4: bereits eingereicht
  // Status 'eingereicht' (Kunde hat abgeschickt, Admin verarbeitet noch)
  // oder 'abgeschlossen' (Admin hat Kunde angelegt) blockieren das
  // Formular fuer erneuten Submit. kunde_name allein blockiert nicht
  // (kann Prefill sein, Bug 1). Im Vorschau-Modus (?vorschau=1) wird das
  // Formular trotzdem gerendert, damit Admin Anfragen einsehen kann.
  if (!vorschauModus && (anfrage.status === 'eingereicht' || anfrage.status === 'abgeschlossen' || anfrage.antworten)) {
    const br = await brandingFuerToken()
    return <BereitsAusgefuellt branding={br} />
  }

  // Vorlage + Branding parallel laden
  const [vorlage, branding] = await Promise.all([
    anfrage.vorlage_id ? vorlageZuTokenLaden(params.token) : Promise.resolve(null),
    brandingFuerToken(),
  ])

  // Auto-Save-State + Stammdaten-Prefill an Customer-Form weiterreichen,
  // damit der Kunde nach Reload nicht von vorne anfangen muss.
  const initialAntworten = (anfrage.auto_save as Record<string, unknown> | null) ?? null
  const initialStammdaten = {
    kunde_name:        anfrage.kunde_name        ?? null,
    kunde_email:       anfrage.kunde_email       ?? null,
    kunde_telefon:     anfrage.kunde_telefon     ?? null,
    projekt_name:      anfrage.projekt_name      ?? null,
    projekt_adresse:   anfrage.projekt_adresse   ?? null,
    raumtypen:         (anfrage.raumtypen as string[] | null) ?? null,
    budget_min:        anfrage.budget_min        ?? null,
    budget_max:        anfrage.budget_max        ?? null,
    zeitrahmen:        anfrage.zeitrahmen        ?? null,
    stil_praeferenzen: anfrage.stil_praeferenzen ?? null,
    notizen:           anfrage.notizen           ?? null,
  }
  const initialFortschritt = (anfrage.fortschritt as number | null) ?? 0
  const initialSektion = (anfrage.aktuelle_sektion as number | null) ?? 0

  return (
    <OnboardingFormular
      token={params.token}
      vorlage={vorlage as OnboardingVorlage | null}
      branding={branding}
      vorschauModus={vorschauModus}
      initialAntworten={initialAntworten}
      initialStammdaten={initialStammdaten}
      initialFortschritt={initialFortschritt}
      initialSektion={initialSektion}
    />
  )
}

// ── Fehler-Seite ──────────────────────────────────────────────
function Fehlerseite({
  branding,
  title = 'Link nicht verfügbar',
  text = 'Dieser Onboarding-Link ist ungültig oder wurde deaktiviert. Bitte wende dich an deinen Innenarchitekten.',
}: {
  branding: Branding | null
  title?: string
  text?:  string
}) {
  const bg = branding?.background_color ?? '#f6ede2'
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: bg }}>
      <div className="max-w-sm text-center">
        <LogoKlein branding={branding} />
        <h1 className="text-xl font-semibold text-gray-900 mb-2 mt-6">{title}</h1>
        <p className="text-sm text-gray-500 leading-relaxed">{text}</p>
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
