import { brandingFuerToken } from '@/app/actions/branding'
import Image from 'next/image'
import LoginForm from './LoginForm'

export default async function PortalLoginPage() {
  const branding = await brandingFuerToken()
  const firma    = branding?.firmenname ?? 'Wellbeing Spaces'
  const prim     = branding?.primary_color ?? '#445c49'
  const slogan   = (branding as { slogan?: string | null })?.slogan ?? null

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center px-4 py-12 overflow-hidden">
      {/* Subtiler Brand-Orb im Hintergrund */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full opacity-40 blur-[90px]"
        style={{ background: `radial-gradient(circle, rgba(var(--brand-primary-rgb), 0.35), transparent 70%)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-24 w-[420px] h-[420px] rounded-full opacity-30 blur-[80px]"
        style={{ background: `radial-gradient(circle, rgba(var(--brand-primary-rgb), 0.22), transparent 70%)` }}
      />
      {/* Dezentes Dot-Pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative w-full max-w-[400px]">
        {/* Logo / Marke */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-[72px] h-[72px] bg-white rounded-2xl shadow-lg shadow-black/5 border border-black/[0.04] mb-5">
            {branding?.logo_url ? (
              <Image
                src={branding.logo_url}
                alt={firma}
                width={56}
                height={56}
                className="w-14 h-14 object-contain"
                unoptimized
              />
            ) : (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                style={{ background: prim }}
              >
                {firma[0]?.toUpperCase() ?? 'K'}
              </div>
            )}
          </div>
          <h1 className="text-[22px] font-bold leading-none tracking-tight" style={{ color: 'var(--brand-text, #111827)' }}>
            {firma}
          </h1>
          {slogan ? (
            <p className="mt-2 text-sm opacity-60">{slogan}</p>
          ) : (
            <p className="mt-2 text-sm opacity-60">Kunden-Portal</p>
          )}
        </div>

        {/* Karte */}
        <div className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-black/[0.05] p-8">
          <div className="mb-5">
            <h2 className="text-base font-semibold" style={{ color: 'var(--brand-text, #111827)' }}>
              Willkommen zurück
            </h2>
            <p className="text-xs opacity-60 mt-0.5">
              Melde dich mit deiner E-Mail und deinem Passwort an.
            </p>
          </div>
          <LoginForm prim={prim} />
        </div>

        <p className="mt-6 text-center text-[11px] opacity-50">
          Probleme beim Anmelden? Kontaktiere {firma}.
        </p>
      </div>
    </div>
  )
}
