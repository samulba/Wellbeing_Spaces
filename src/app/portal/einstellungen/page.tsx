import { redirect } from 'next/navigation'
import { getPortalSession } from '@/lib/portal-auth'
import { brandingFuerToken } from '@/app/actions/branding'
import PortalShell from '@/components/portal/PortalShell'
import ProfilForm from '../profil/ProfilForm'
import { Settings } from 'lucide-react'

export default async function PortalEinstellungenPage() {
  const session = await getPortalSession()
  if (!session) redirect('/portal/login')

  const branding = await brandingFuerToken()
  const prim     = branding?.primary_color  ?? '#445c49'
  const gradFrom = branding?.accent_gradient_from ?? null
  const gradTo   = branding?.accent_gradient_to ?? null

  return (
    <PortalShell active="einstellungen" session={session} branding={branding}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">

        {/* Hero-Band */}
        <section
          className="relative overflow-hidden rounded-3xl mb-6 md:mb-8"
          style={{ background: `linear-gradient(135deg, ${gradFrom ?? prim} 0%, ${gradTo ?? prim} 100%)` }}
        >
          <div aria-hidden className="absolute -top-20 -right-16 w-80 h-80 rounded-full bg-white/15 blur-3xl" />
          <div aria-hidden className="absolute -bottom-16 -left-10 w-52 h-52 rounded-full bg-white/10 blur-2xl" />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
          <div className="relative p-8 md:p-10 lg:p-12 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center">
            <div className="text-white min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70 mb-3">
                Einstellungen
              </p>
              <h1
                className="font-bold leading-[1.02] tracking-tight break-words"
                style={{ fontSize: 'clamp(32px, 5vw, 56px)' }}
              >
                Dein Profil.
              </h1>
              <p className="mt-4 text-[15px] md:text-[17px] text-white/85 leading-relaxed max-w-2xl">
                Verwalte deine persönlichen Daten, Zugangsdaten und Präferenzen.
              </p>
            </div>
            <div className="w-20 h-20 rounded-3xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0 text-white">
              <Settings className="w-9 h-9" />
            </div>
          </div>
        </section>

        <div className="max-w-3xl">
          <ProfilForm session={session} prim={prim} />
        </div>
      </div>
    </PortalShell>
  )
}
