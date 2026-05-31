import 'server-only'
import { cookies } from 'next/headers'
import { createHmac, createHash, timingSafeEqual } from 'crypto'

/**
 * Signiertes, httpOnly-Cookie als ECHTER Datentresor für PIN-geschützte
 * Freigabe-Links: Der Server gibt die Produktdaten erst frei, wenn ein
 * gültiges Cookie vorliegt (gesetzt nach korrekter PIN in `pinPruefen`).
 *
 * - Wert = HMAC-SHA256(`token:pin`, SERVICE_ROLE_KEY) → nicht fälschbar,
 *   an die AKTUELLE PIN gebunden (PIN-Wechsel invalidiert alte Sessions).
 * - httpOnly → per JS/DevTools nicht lesbar oder fälschbar.
 */

const MAXAGE = 60 * 60 * 12 // 12 Stunden

function secret(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? null
}

function cookieName(token: string): string {
  return `fg_${createHash('sha256').update(token).digest('hex').slice(0, 16)}`
}

function signatur(token: string, pin: string): string | null {
  const s = secret()
  if (!s) return null
  return createHmac('sha256', s).update(`${token}:${pin}`).digest('hex')
}

/** Nach korrekter PIN aufrufen (in einer Server-Action). */
export function pinCookieSetzen(token: string, pin: string): void {
  const sig = signatur(token, pin)
  if (!sig) return
  cookies().set(cookieName(token), sig, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/freigabe',
    maxAge: MAXAGE,
  })
}

/** Im Server-Component prüfen, ob die PIN für diesen Token bereits bestätigt ist. */
export function pinCookieGueltig(token: string, pin: string | null): boolean {
  if (!pin) return false
  const sig = signatur(token, pin)
  if (!sig) return false
  const vorhanden = cookies().get(cookieName(token))?.value
  if (!vorhanden) return false
  const a = Buffer.from(vorhanden)
  const b = Buffer.from(sig)
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
