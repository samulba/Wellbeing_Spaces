'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { logoutAction } from '@/app/login/actions'
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
  PencilRuler,
  MessageCircle,
} from 'lucide-react'
import type { Rolle } from '@/lib/supabase/types'
import { ROLLEN_CONFIG } from '@/lib/permissions'

// ── Avatar-Hilfsfunktionen ───────────────────────────────────
const avatarFarben = [
  'bg-[#445c49]', 'bg-[#cba178]', 'bg-[#823509]',
  'bg-[#94c1a4]', 'bg-[#2d3e31]', 'bg-[#445c49]',
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
  userAvatarUrl,
  userRolle = 'admin',
  offeneFreigaben = 0,
  offeneAnfragen = 0,
  offeneNachrichten = 0,
  neuestesChangelogDatum = null,
}: {
  userEmail: string
  userName?: string
  userAvatarUrl?: string | null
  userRolle?: Rolle
  offeneFreigaben?: number
  offeneAnfragen?: number
  offeneNachrichten?: number
  neuestesChangelogDatum?: string | null
}) {
  const pathname = usePathname()
  const router   = useRouter()

  // "Neu seit..."-Badge: nur rendern wenn lokal gespeichertes Datum älter ist
  const [changelogNeu, setChangelogNeu] = useState(false)
  useEffect(() => {
    if (!neuestesChangelogDatum) { setChangelogNeu(false); return }
    const pruefe = () => {
      try {
        const seen = localStorage.getItem('changelog-last-seen')
        setChangelogNeu(!seen || new Date(seen) < new Date(neuestesChangelogDatum))
      } catch { setChangelogNeu(false) }
    }
    pruefe()
    const onSeen = () => pruefe()
    window.addEventListener('changelog:seen', onSeen)
    return () => window.removeEventListener('changelog:seen', onSeen)
  }, [neuestesChangelogDatum])

  // Im Raumplaner-Editor Sidebar komplett ausblenden (mehr Platz)
  const isPlanerEditor = /\/dashboard\/projekte\/[^/]+\/raeume\/[^/]+\/planer/.test(pathname)
  if (isPlanerEditor) return null

  const navLinks = [
    { label: 'Dashboard',  href: '/dashboard',            icon: LayoutDashboard, badge: 0 },
    { label: 'Kunden',     href: '/dashboard/kunden',     icon: Users,           badge: 0 },
    { label: 'Projekte',   href: '/dashboard/projekte',   icon: FolderOpen,      badge: 0 },
    { label: 'Partner',    href: '/dashboard/partner',    icon: Handshake,       badge: 0 },
    { label: 'Produkte',   href: '/dashboard/produkte',   icon: Package,         badge: 0 },
    { label: 'Raumplaner', href: '/dashboard/raumplaner', icon: PencilRuler,     badge: 0 },
    { label: 'Chats',      href: '/dashboard/chats',      icon: MessageCircle,   badge: offeneNachrichten },
    { label: 'Freigaben',  href: '/dashboard/freigaben',  icon: CheckSquare,     badge: offeneFreigaben },
    { label: 'Onboarding', href: '/dashboard/onboarding', icon: ClipboardList,   badge: offeneAnfragen },
    { label: 'Kategorien', href: '/dashboard/kategorien', icon: Tag,             badge: 0 },
  ]

  async function handleLogout() {
    // Server-Action räumt sowohl Supabase-Session als auch active_org_id-Cookie auf.
    await logoutAction()
    // Client-Session ebenfalls invalidieren (lokales LocalStorage etc.)
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
            href={changelogNeu ? '/dashboard/einstellungen?tab=changelog' : '/dashboard/einstellungen'}
            className={`flex items-center gap-2.5 px-3 py-[10px] rounded-lg text-[14px] font-medium transition-colors duration-150 ${
              pathname.startsWith('/dashboard/einstellungen')
                ? 'bg-white/[0.12] text-white'
                : 'text-white/55 hover:text-white hover:bg-white/[0.07]'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" strokeWidth={2} />
            <span className="flex-1">Einstellungen</span>
            {changelogNeu && (
              <span
                className="px-1.5 py-0.5 bg-wellbeing-green-light text-[#1a2e1e] text-[9px] font-bold rounded-full leading-none uppercase tracking-wider"
                title="Neue Änderungen seit deinem letzten Besuch"
              >
                Neu
              </span>
            )}
          </Link>
        </div>

        {/* Profil-Zeile + Abmelden-Icon */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-white/[0.06]">
          <Link
            href="/dashboard/einstellungen?tab=profil"
            className="flex items-center gap-3 flex-1 min-w-0 hover:bg-white/[0.04] rounded-lg px-1 py-1 transition-colors group"
          >
            {userAvatarUrl ? (
              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/10 shrink-0 bg-white/5">
                <Image
                  src={userAvatarUrl}
                  alt={displayName}
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0 ${farbe}`}
              >
                {kuerzel}
              </div>
            )}
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
            aria-label="Abmelden"
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
