'use server'

import { createClient } from '@/lib/supabase/server'
import { resolvePartnerKonditionen } from '@/lib/partner-konditionen'
import type { PartnerKondition, ResolvedPartnerKonditionen } from '@/lib/supabase/types'

/**
 * Lädt die Konditionen eines Partners und löst sie für ein Produkt (Kategorie) auf.
 * Wird vom ProduktFormular für den Hinweis + Button „Vom Partner übernehmen" genutzt.
 * RLS scoped automatisch auf die eigene Org. Fail-safe: Fehler → leeres Ergebnis.
 */
export async function getResolvedKonditionenFuerProdukt(
  partnerId: string | null,
  kategorieName: string | null,
): Promise<ResolvedPartnerKonditionen> {
  if (!partnerId) return resolvePartnerKonditionen([], kategorieName)
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('partner_konditionen')
      .select('*')
      .eq('partner_id', partnerId)
      .eq('aktiv', true)
    return resolvePartnerKonditionen((data ?? []) as PartnerKondition[], kategorieName)
  } catch {
    return resolvePartnerKonditionen([], kategorieName)
  }
}
