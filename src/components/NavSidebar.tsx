'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Settings, LogOut } from 'lucide-react'

const navLinks = [
  { label: 'Übersicht', href: '/dashboard' },
  { label: 'Kunden',    href: '/dashboard/kunden' },
  { label: 'Projekte',  href: '/dashboard/projekte' },
  { label: 'Partner',   href: '/dashboard/partner' },
]

const avatarFarben = [
  'bg-indigo-500',
  'bg-violet-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-amber-500',
]

function avatarFarbe(s: string) {
  return avatarFarben[s.charCodeAt(0) % avatarFarben.length]
}

function initials(email: string, name?: string) {
  if (name) return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
  return email.split('@')[0].slice(0, 2).toUpperCase()
}

export default function NavSidebar({
  userEmail,
  userName,
}: {
  userEmail: string
  userName?: string
}) {
  const pathname = usePathname()
  const router   = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const displayName = userName || userEmail.split('@')[0]
  const kuerzel     = initials(userEmail, userName)
  const farbe       = avatarFarbe(userEmail)

  return (
    <aside className="w-60 shrink-0 bg-[#0F1117] flex flex-col h-full">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <span className="text-sm font-semibold tracking-tight text-white">Studio</span>
      </div>

      {/* Hauptnavigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navLinks.map((link) => {
          const aktiv =
            link.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(link.href)

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center px-3 py-2 rounded-md text-[14px] font-medium transition-colors ${
                aktiv
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/[0.06]'
              }`}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* Unterer Bereich */}
      <div className="border-t border-white/[0.06]">

        {/* Profil */}
        <Link
          href="/dashboard/profil"
          className="flex items-center gap-3 px-4 py-4 hover:bg-white/[0.04] transition-colors group border-b border-white/[0.06]"
        >
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${farbe}`}
          >
            {kuerzel}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-white/75 group-hover:text-white/90 transition-colors truncate leading-none">
              {displayName}
            </p>
            {userName && (
              <p className="text-[11px] text-white/35 truncate mt-1 leading-none">
                {userEmail}
              </p>
            )}
          </div>
        </Link>

        {/* Einstellungen + Abmelden */}
        <div className="px-3 py-2 space-y-0.5">
          <Link
            href="/dashboard/einstellungen"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[14px] font-medium transition-colors ${
              pathname.startsWith('/dashboard/einstellungen')
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:text-white/80 hover:bg-white/[0.06]'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            Einstellungen
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[14px] font-medium text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Abmelden
          </button>
        </div>

      </div>
    </aside>
  )
}
