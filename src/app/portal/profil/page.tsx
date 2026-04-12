import { redirect } from 'next/navigation'
import { getPortalSession } from '@/lib/portal-auth'
import { portalLogout } from '@/app/actions/portal'
import { brandingFuerToken } from '@/app/actions/branding'
import ProfilForm from './ProfilForm'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, LogOut } from 'lucide-react'

export default async function PortalProfilPage() {
  const [session, branding] = await Promise.all([
    getPortalSession(),
    brandingFuerToken(),
  ])

  if (!session) redirect('/portal/login')

  const firma = branding?.firmenname    ?? 'Wellbeing Spaces'
  const prim  = branding?.primary_color ?? '#445c49'

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding?.logo_url ? (
              <Image src={branding.logo_url} alt={firma} width={80} height={28} className="h-7 w-auto object-contain" />
            ) : (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: prim }}>
                {firma[0]}
              </div>
            )}
          </div>
          <form action={portalLogout}>
            <button type="submit" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition">
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:block">Abmelden</span>
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 sm:px-6 py-8">
        <Link href="/portal/dashboard" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 mb-6 transition">
          <ChevronLeft className="w-3 h-3" /> Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Mein Profil</h1>
        <ProfilForm session={session} prim={prim} />
      </main>
    </div>
  )
}
