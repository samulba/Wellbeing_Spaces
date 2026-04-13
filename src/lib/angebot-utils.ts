import type { AngebotPosition } from '@/lib/supabase/types'

export function berechneAngebotSummen(
  positionen: AngebotPosition[],
  mwstSatz: number,
  rabattProzent: number | null
): { nettoSumme: number; rabattBetrag: number; mwstBetrag: number; bruttoSumme: number } {
  const rohNetto    = positionen.reduce((s, p) => s + p.gesamtpreis, 0)
  const rabattBetrag = rabattProzent ? Math.round(rohNetto * (rabattProzent / 100) * 100) / 100 : 0
  const nettoSumme  = Math.round((rohNetto - rabattBetrag) * 100) / 100
  const mwstBetrag  = Math.round(nettoSumme * (mwstSatz / 100) * 100) / 100
  const bruttoSumme = Math.round((nettoSumme + mwstBetrag) * 100) / 100
  return { nettoSumme, rabattBetrag, mwstBetrag, bruttoSumme }
}
