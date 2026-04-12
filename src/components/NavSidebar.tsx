'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  Handshake,
  Package,
  CheckSquare,
  Tag,
  Settings,
  LogOut,
  ClipboardList,
} from 'lucide-react'
import type { Rolle } from '@/lib/supabase/types'
import { ROLLEN_CONFIG } from '@/lib/permissions'

// ── Avatar-Hilfsfunktionen ───────────────────────────────────
const avatarFarben = [
  'bg-wellbeing-green', 'bg-violet-500', 'bg-blue-500',
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
      <rect x="0" y="0" width="10" height="10" rx="2" fill="#ffffff" opacity="0.30" />
      <rect x="4" y="4" width="10" height="10" rx="2" fill="#ffffff" opacity="0.55" />
      <rect x="8" y="8" width="10" height="10" rx="2" fill="#ffffff" />
    </svg>
  )
}

// ── Komponente ───────────────────────────────────────────────
export default function NavSidebar({
  userEmail,
  userName,
  userRolle = 'admin',
  offeneFreigaben = 0,
  offeneAnfragen = 0,
}: {
  userEmail: string
  userName?: string
  userRolle?: Rolle
  offeneFreigaben?: number
  offeneAnfragen?: number
}) {
  const pathname = usePathname()
  const router   = useRouter()

  const navLinks = [
    { label: 'Dashboard',  href: '/dashboard',            icon: LayoutDashboard, badge: 0 },
    { label: 'Kunden',     href: '/dashboard/kunden',     icon: Users,           badge: 0 },
    { label: 'Projekte',   href: '/dashboard/projekte',   icon: FolderOpen,      badge: 0 },
    { label: 'Partner',    href: '/dashboard/partner',    icon: Handshake,       badge: 0 },
    { label: 'Produkte',   href: '/dashboard/produkte',   icon: Package,         badge: 0 },
    { label: 'Freigaben',  href: '/dashboard/freigaben',  icon: CheckSquare,     badge: offeneFreigaben },
    { label: 'Onboarding', href: '/dashboard/onboarding', icon: ClipboardList,   badge: offeneAnfragen },
    { label: 'Kategorien', href: '/dashboard/kategorien', icon: Tag,             badge: 0 },
  ]

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
    <aside className="w-72 shrink-0 bg-[#445c49] flex flex-col h-full">

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-[18px] border-b border-white/[0.06]">
        <DepthStackIcon />
        <span className="font-syne text-[16px] font-bold text-white tracking-tight leading-none">
          Wellbeing Spaces
        </span>
      </div>

      {/* Hauptnavigation */}
      <nav className="flex-1 px-3 pt-4 pb-2 space-y-0.5">
        {navLinks.map(({ label, href, icon: Icon, badge }) => {
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
                  ? 'bg-white/[0.12] text-white'
                  : 'text-white/55 hover:text-white hover:bg-white/[0.07]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={aktiv ? 2.5 : 2} />
              <span className="flex-1">{label}</span>
              {badge > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Trennlinie + unterer Bereich */}
      <div className="border-t border-white/[0.06]">

        {/* Einstellungen */}
        <div className="px-3 pt-2.5 pb-1">
          <Link
            href="/dashboard/einstellungen"
            className={`flex items-center gap-2.5 px-3 py-[10px] rounded-lg text-[14px] font-medium transition-colors duration-150 ${
              pathname.startsWith('/dashboard/einstellungen')
                ? 'bg-white/[0.12] text-white'
                : 'text-white/55 hover:text-white hover:bg-white/[0.07]'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" strokeWidth={2} />
            Einstellungen
          </Link>
        </div>

        {/* Profil-Zeile + Abmelden-Icon */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-white/[0.06]">
          <Link
            href="/dashboard/einstellungen?tab=profil"
            className="flex items-center gap-3 flex-1 min-w-0 hover:bg-white/[0.04] rounded-lg px-1 py-1 transition-colors group"
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
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wide leading-none">
                  {ROLLEN_CONFIG[userRolle]?.label ?? userRolle}
                </span>
              </div>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            title="Abmelden"
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors duration-150"
          >
            <LogOut className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

      </div>
    </aside>
  )
}
