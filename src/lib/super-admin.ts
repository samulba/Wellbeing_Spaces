/**
 * Super-Admin (= App-Owner) Pruefung.
 *
 * Whitelist via ENV-Variable SUPER_ADMIN_EMAILS (kommagetrennt).
 * Beispiel:  SUPER_ADMIN_EMAILS=samuel@…,wbc@…
 *
 * Super-Admin-Bereich ist /super-admin/* — geschuetzt durch Middleware
 * + isSuperAdmin()-Check in den Routes selber (Defense-in-depth).
 */

import { createClient } from '@/lib/supabase/server'

/** Liest die ENV-Liste, lowercased + getrimmt. */
function adminEmails(): Set<string> {
  const raw = process.env.SUPER_ADMIN_EMAILS?.trim() ?? ''
  if (!raw) return new Set()
  return new Set(
    raw.split(',')
       .map((s) => s.trim().toLowerCase())
       .filter(Boolean),
  )
}

/**
 * Prueft ob der aktuell eingeloggte User in der Super-Admin-Whitelist ist.
 * Failsafe: gibt false zurueck wenn ENV fehlt, User nicht eingeloggt etc.
 */
export async function isSuperAdmin(): Promise<boolean> {
  try {
    const liste = adminEmails()
    if (liste.size === 0) return false
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return false
    return liste.has(user.email.toLowerCase())
  } catch {
    return false
  }
}

/**
 * Wie isSuperAdmin(), aber prueft auch eine konkrete Email-Adresse
 * (z.B. fuer Mail-Trigger). Synchron, kein DB-Call.
 */
export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return adminEmails().has(email.toLowerCase())
}
