/**
 * Feature-Flags fuer optional aktivierbare Bereiche.
 *
 * Bereiche, die hier `false` sind, werden in der UI ausgeblendet, ihre
 * Routen leiten zur Settings-Startseite weiter. Datenmodelle, APIs,
 * Komponenten und gespeicherte Werte bleiben unveraendert — sodass ein
 * Reaktivieren durch Umlegen des Flags auf `true` ohne weitere
 * Code-Aenderungen reicht.
 */
export const FEATURE_FLAGS: Record<FeatureKey, boolean> = {
  /** Branding-Tab (Farben/Logo) in den Einstellungen. */
  branding:   false,
  /** Abrechnungs-Tab (Plan/Stripe) in den Einstellungen. */
  abrechnung: false,
}

export type FeatureKey = 'branding' | 'abrechnung'

export function istAktiviert(feature: FeatureKey): boolean {
  return FEATURE_FLAGS[feature] === true
}
