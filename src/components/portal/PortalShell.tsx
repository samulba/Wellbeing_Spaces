import { portalLogout } from '@/app/actions/portal'
import Link from 'next/link'
import Image from 'next/image'
import { LayoutGrid, Users, Settings, LogOut } from 'lucide-react'
import type { ClientUser } from '@/lib/portal-auth'
import type { Branding } from '@/lib/supabase/types'

/**
 * Gemeinsames Shell für alle eingeloggten Portal-Seiten.
 * - Desktop: Sticky-Header oben mit Branding links + Tabs mittig + Profil rechts
 * - Mobile:  Sticky-Header kompakt + feste Bottom-Navigation mit 4 Tabs
 * - Branding: Logo / Firmenname / Slogan / Farben kommen aus `branding`
 */

type NavKey = 'dashboard' | 'team' | 'nachrichten' | 'einstellungen'

const NAV: { key: NavKey; label: string; href: string; Icon: typeof LayoutGrid }[] = [
  { key: 'dashboard',     label: 'Übersicht',   href: '/portal/dashboard',     Icon: LayoutGrid    },
  { key: 'team',          label: 'Team',        href: '/portal/team',          Icon: Users         },
  { key: 'einstellungen', label: 'Profil',      href: '/portal/einstellungen', Icon: Settings      },
]

function initials(vorname: string, nachname: string, email: string): string {
  const v = vorname?.trim()
  const n = nachname?.trim()
  if (v || n) return `${v?.[0] ?? ''}${n?.[0] ?? ''}`.toUpperCase() || email.slice(0, 2).toUpperCase()
  return email.slice(0, 2).toUpperCase()
}

export default function PortalShell({
  active,
  session,
  branding,
  children,
}: {
  active: NavKey
  session: ClientUser
  branding: Branding | null
  children: React.ReactNode
}) {
  const firma   = branding?.firmenname ?? 'Kunden-Portal'
  const slogan  = branding?.slogan     ?? null
  const prim    = branding?.primary_color ?? '#445c49'

  // Team-Tab wird nur dem Inhaber gezeigt (Rollen-Gating)
  const sichtbareNav = NAV.filter((n) => n.key !== 'team' || session.rolle === 'inhaber')

  const kuerzel = initials(session.vorname, session.nachname, session.email)

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {/* ── Sticky Header ───────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-black/[0.06]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Branding */}
          <Link href="/portal/dashboard" className="flex items-center gap-3 min-w-0 group">
            {branding?.logo_url ? (
              <Image
                src={branding.logo_url}
                alt={firma}
                width={120}
                height={36}
                className="h-9 w-auto object-contain"
                unoptimized
              />
            ) : (
              <div
                className="w-9 h-9 brand-radius-sm flex items-center justify-center text-white text-sm font-bold shrink-0"
                style={{ background: prim }}
              >
                {firma[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0 hidden sm:block">
              <p className="text-sm font-semibold text-gray-900 truncate leading-none">{firma}</p>
              {slogan && <p className="text-[10px] opacity-50 mt-0.5 truncate">{slogan}</p>}
            </div>
          </Link>

          {/* Desktop-Tabs */}
          <nav className="hidden md:flex items-center gap-1">
            {sichtbareNav.map(({ key, label, href, Icon }) => {
              const aktiv = key === active
              return (
                <Link
                  key={key}
                  href={href}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium transition-colors brand-radius-sm ${
                    aktiv
                      ? 'bg-black/[0.06] text-gray-900'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-black/[0.03]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* Profil + Logout */}
          <div className="flex items-center gap-1 shrink-0">
            <Link
              href="/portal/einstellungen"
              title={`${session.vorname || session.email}${session.rolle === 'inhaber' ? ' · Inhaber' : ''}`}
              className="relative group inline-flex items-center gap-2 pl-1.5 pr-2 py-1 brand-radius-sm hover:bg-black/[0.04] transition-colors"
            >
              {session.avatarUrl ? (
                <div className="w-8 h-8 rounded-full overflow-hidden border border-black/10 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={session.avatarUrl} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                  style={{ background: prim }}
                >
                  {kuerzel}
                </div>
              )}
              <span className="hidden lg:inline text-[13px] font-medium text-gray-700 truncate max-w-[100px]">
                {session.vorname || session.email.split('@')[0]}
              </span>
            </Link>
            <form action={portalLogout}>
              <button
                type="submit"
                title="Abmelden"
                className="flex items-center justify-center w-9 h-9 text-gray-400 hover:text-red-500 brand-radius-sm hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* ── Content ────────────────────────────────────── */}
      <main>{children}</main>

      {/* ── Mobile Bottom-Nav ──────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md border-t border-black/[0.08] pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-3 gap-1 px-2 py-1.5">
          {sichtbareNav.map(({ key, label, href, Icon }) => {
            const aktiv = key === active
            return (
              <Link
                key={key}
                href={href}
                className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg transition-colors ${
                  aktiv
                    ? 'text-gray-900'
                    : 'text-gray-400 hover:text-gray-700 active:bg-black/[0.04]'
                }`}
                style={aktiv ? { color: prim } : undefined}
              >
                <Icon className="w-5 h-5" strokeWidth={aktiv ? 2.4 : 2} />
                <span className={`text-[10px] ${aktiv ? 'font-semibold' : 'font-medium'}`}>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export { type NavKey }
