import { redirect } from 'next/navigation'
import { getPortalSession } from '@/lib/portal-auth'
import { teamAbrufen } from '@/app/actions/portal'
import { brandingFuerToken } from '@/app/actions/branding'
import PortalShell from '@/components/portal/PortalShell'
import TeamClient from './TeamClient'

export default async function PortalTeamPage() {
  const session = await getPortalSession()
  if (!session) redirect('/portal/login')

  // Nur Inhaber dürfen das Team verwalten
  if (session.rolle !== 'inhaber') redirect('/portal/dashboard')

  const [team, branding] = await Promise.all([
    teamAbrufen(),
    brandingFuerToken(),
  ])

  return (
    <PortalShell active="team" session={session} branding={branding}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-50 mb-1.5">Team</p>
          <h1 className="text-2xl md:text-[30px] font-bold tracking-tight" style={{ color: 'var(--brand-text, #111827)' }}>
            Wer darf ins Portal?
          </h1>
          <p className="mt-2 text-sm opacity-70 max-w-xl">
            Lade Mitarbeiter oder Gäste in dein Kunden-Portal ein. Jeder bekommt eigene Login-Daten
            und nur die Rechte, die du vergibst.
          </p>
        </div>

        <TeamClient initialTeam={team} currentUserId={session.id} />
      </div>
    </PortalShell>
  )
}
