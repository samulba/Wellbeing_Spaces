'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Settings } from 'lucide-react'

const navLinks = [
  { label: 'Übersicht', href: '/dashboard' },
  { label: 'Kunden', href: '/dashboard/kunden' },
  { label: 'Projekte', href: '/dashboard/projekte' },
  { label: 'Partner', href: '/dashboard/partner' },
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
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const label = userName || userEmail
  const kuerzel = initials(userEmail, userName)
  const farbe = avatarFarbe(label)

  return (
    <aside className="w-60 shrink-0 bg-[#0F1117] flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/[0.06]">
        <span className="text-sm font-semibold tracking-tight text-white">
          Studio
        </span>
      </div>

      {/* Navigation */}
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
              className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                aktiv
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/[0.06]'
              }`}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* User / Logout */}
      <div className="px-3 py-4 border-t border-white/[0.06]">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/dashboard/profil"
            className="flex items-center gap-2.5 min-w-0 group"
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${farbe}`}
            >
              {kuerzel}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-white/70 group-hover:text-white/90 transition-colors truncate leading-none">
                {userName || userEmail.split('@')[0]}
              </p>
              {userName && (
                <p className="text-[10px] text-white/30 truncate mt-0.5 leading-none">
                  {userEmail}
                </p>
              )}
            </div>
          </Link>
          <div className="flex items-center gap-1 shrink-0">
            <Link
              href="/dashboard/einstellungen"
              className="p-1.5 text-white/30 hover:text-white/70 transition-colors rounded"
              title="Einstellungen"
            >
              <Settings className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={handleLogout}
              className="text-[10px] text-white/30 hover:text-white/60 transition-colors px-1.5 py-1"
              title="Abmelden"
            >
              ↩
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
