'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  Handshake,
  CheckSquare,
  Tag,
  Settings,
  LogOut,
} from 'lucide-react'

// ── Nav-Konfiguration ────────────────────────────────────────
const navLinks = [
  { label: 'Dashboard',  href: '/dashboard',            icon: LayoutDashboard },
  { label: 'Kunden',     href: '/dashboard/kunden',     icon: Users },
  { label: 'Projekte',   href: '/dashboard/projekte',   icon: FolderOpen },
  { label: 'Partner',    href: '/dashboard/partner',    icon: Handshake },
  { label: 'Freigaben',  href: '/dashboard/freigaben',  icon: CheckSquare },
  { label: 'Kategorien', href: '/dashboard/kategorien', icon: Tag },
]

// ── Avatar-Hilfsfunktionen ───────────────────────────────────
const avatarFarben = [
  'bg-indigo-500', 'bg-violet-500', 'bg-blue-500',
  'bg-emerald-500', 'bg-rose-500', 'bg-amber-500',
]

function avatarFarbe(s: string) {
  return avatarFarben[s.charCodeAt(0) % avatarFarben.length]
}

function initials(email: string, name?: string) {
  if (name) return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
  return email.split('@')[0].slice(0, 2).toUpperCase()
}

// ── Depth-Stack Icon (3 gestaffelte Quadrate, links-oben → rechts-unten) ───
function DepthStackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="10" height="10" rx="2" fill="#6366F1" opacity="0.30" />
      <rect x="4" y="4" width="10" height="10" rx="2" fill="#6366F1" opacity="0.55" />
      <rect x="8" y="8" width="10" height="10" rx="2" fill="#6366F1" />
    </svg>
  )
}

// ── Komponente ───────────────────────────────────────────────
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
    <aside className="w-72 shrink-0 bg-[#0F1117] flex flex-col h-full">

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-[18px] border-b border-white/[0.06]">
        <DepthStackIcon />
        <span className="font-syne text-[16px] font-bold text-white tracking-tight leading-none">
          WBC Studio
        </span>
      </div>

      {/* Hauptnavigation */}
      <nav className="flex-1 px-3 pt-4 pb-2 space-y-0.5">
        {navLinks.map(({ label, href, icon: Icon }) => {
          const aktiv =
            href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-[10px] rounded-lg text-[14px] font-medium transition-colors duration-150 ${
                aktiv
                  ? 'bg-[#6366F1] text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={aktiv ? 2.5 : 2} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Trennlinie + unterer Bereich */}
      <div className="border-t border-white/[0.06]">

        {/* Profil-Zeile */}
        <Link
          href="/dashboard/profil"
          className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.04] transition-colors group border-b border-white/[0.06]"
        >
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0 ${farbe}`}
          >
            {kuerzel}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-white/80 group-hover:text-white transition-colors truncate leading-none">
              {displayName}
            </p>
            <p className="text-[11px] text-white/40 truncate mt-1 leading-none">
              {userEmail}
            </p>
          </div>
        </Link>

        {/* Einstellungen + Abmelden */}
        <div className="px-3 py-2.5 space-y-0.5">
          <Link
            href="/dashboard/einstellungen"
            className={`flex items-center gap-2.5 px-3 py-[10px] rounded-lg text-[14px] font-medium transition-colors duration-150 ${
              pathname.startsWith('/dashboard/einstellungen')
                ? 'bg-[#6366F1] text-white'
                : 'text-white/50 hover:text-white hover:bg-white/10'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" strokeWidth={2} />
            Einstellungen
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-[10px] rounded-lg text-[14px] font-medium text-white/50 hover:text-white hover:bg-white/10 transition-colors duration-150"
          >
            <LogOut className="w-4 h-4 shrink-0" strokeWidth={2} />
            Abmelden
          </button>
        </div>

      </div>
    </aside>
  )
}
