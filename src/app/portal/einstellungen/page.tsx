import { redirect } from 'next/navigation'
import { getPortalSession } from '@/lib/portal-auth'
import { brandingFuerToken } from '@/app/actions/branding'
import PortalShell from '@/components/portal/PortalShell'
import ProfilForm from '../profil/ProfilForm'

export default async function PortalEinstellungenPage() {
  const session = await getPortalSession()
  if (!session) redirect('/portal/login')

  const branding = await brandingFuerToken()
  const prim = branding?.primary_color ?? '#445c49'

  return (
    <PortalShell active="einstellungen" session={session} branding={branding}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-50 mb-1.5">Profil</p>
          <h1 className="text-2xl md:text-[30px] font-bold tracking-tight" style={{ color: 'var(--brand-text, #111827)' }}>
            Deine Einstellungen
          </h1>
          <p className="mt-2 text-sm opacity-70">
            Verwalte deine persönlichen Daten und Zugangsdaten.
          </p>
        </div>

        <ProfilForm session={session} prim={prim} />
      </div>
    </PortalShell>
  )
}
