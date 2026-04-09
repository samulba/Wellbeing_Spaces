'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navLinks = [
  { label: 'Übersicht', href: '/dashboard' },
  { label: 'Kunden', href: '/dashboard/kunden' },
  { label: 'Projekte', href: '/dashboard/projekte' },
  { label: 'Partner', href: '/dashboard/partner' },
]

export default function NavSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-stone-100 flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-stone-100">
        <span className="text-base font-semibold text-stone-800 tracking-tight">
          WBC Studio
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
              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                aktiv
                  ? 'bg-stone-100 text-stone-800 font-medium'
                  : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50'
              }`}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* User / Logout */}
      <div className="px-4 py-4 border-t border-stone-100">
        <p className="text-xs text-stone-400 truncate mb-2">{userEmail}</p>
        <button
          onClick={handleLogout}
          className="text-xs text-stone-400 hover:text-stone-700 transition-colors"
        >
          Abmelden
        </button>
      </div>
    </aside>
  )
}
