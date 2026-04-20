import { Info, Eye, EyeOff } from 'lucide-react'

/**
 * Dezentes amber-Banner für Produkt-Vermerke (Migration 058).
 *
 * In Designer-Views:
 *   - Text immer sichtbar
 *   - Kleines Auge-Icon zeigt, ob der Vermerk auch Kunden angezeigt wird
 * In Kunden-Views (Freigabe/Konfigurator/Portal):
 *   - NUR rendern, wenn der Designer "sichtbar=true" gesetzt hat — dann kein
 *     Auge-Icon, damit der Banner dem Kunden wie ein inhaltlicher Hinweis
 *     erscheint, nicht wie ein Tool-Status.
 */
export default function HinweisBanner({
  text,
  fuerKunden,
  showSichtbarkeit = false,
  className = '',
}: {
  text: string
  /** True = Vermerk ist auch für Kunden sichtbar (hinweis_extern_sichtbar) */
  fuerKunden?: boolean
  /** True = zeigt das Auge-Icon neben dem Text (nur in Designer-Views sinnvoll) */
  showSichtbarkeit?: boolean
  className?: string
}) {
  if (!text) return null
  return (
    <div
      className={`flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 ${className}`}
      role="note"
    >
      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
      <p className="text-[12px] leading-snug flex-1">{text}</p>
      {showSichtbarkeit && (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-widest text-amber-700 shrink-0"
          title={fuerKunden ? 'Auch für Kunden sichtbar' : 'Nur intern sichtbar'}
        >
          {fuerKunden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          {fuerKunden ? 'Kunde' : 'Intern'}
        </span>
      )}
    </div>
  )
}
