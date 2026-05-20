'use client'

import { useMemo } from 'react'
import { Check, ChevronLeft, User, Mail, Phone, Home, MapPin, Euro, Clock, Palette, MessageSquare, AlertTriangle } from 'lucide-react'
import { useModal } from '@/lib/hooks/useModal'
import DynamischeAntwortenAnzeige from '@/components/onboarding/DynamischeAntwortenAnzeige'
import type { OnboardingVorlage, OnboardingDatei, Branding } from '@/lib/supabase/types'

export interface ReviewStammdaten {
  kunde_name?: string | null
  kunde_email?: string | null
  kunde_telefon?: string | null
  projekt_name?: string | null
  projekt_adresse?: string | null
  raumtypen?: string[] | null
  budget_min?: number | null
  budget_max?: number | null
  zeitrahmen?: string | null
  stil_praeferenzen?: string | null
  notizen?: string | null
}

interface Props {
  anfrageId?: string                                // optional — fuer DynamischeAntwortenAnzeige
  vorlage?:   OnboardingVorlage | null
  antworten?: Record<string, unknown> | null
  stammdaten: ReviewStammdaten
  branding?:  Branding | null
  isPending:  boolean
  fehler?:    string | null
  onZurueck:  () => void
  onAbsenden: () => void
}

function formatBudget(min: number | null | undefined, max: number | null | undefined): string | null {
  const fmt = (n: number) => n.toLocaleString('de-DE')
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)} €`
  if (min != null)                return `ab ${fmt(min)} €`
  if (max != null)                return `bis ${fmt(max)} €`
  return null
}

export default function OnboardingReviewModal({
  anfrageId, vorlage, antworten, stammdaten, branding, isPending, fehler, onZurueck, onAbsenden,
}: Props) {
  const ref  = useModal(true, onZurueck)
  const prim = branding?.primary_color ?? '#445c49'

  // Files aus antworten ableiten (jeder upload-typ-Wert ist OnboardingDatei[])
  const dateien = useMemo<OnboardingDatei[]>(() => {
    if (!antworten) return []
    const out: OnboardingDatei[] = []
    for (const v of Object.values(antworten)) {
      if (Array.isArray(v)) {
        for (const item of v) {
          if (item && typeof item === 'object' && 'id' in item && 'storage_pfad' in item) {
            out.push(item as OnboardingDatei)
          }
        }
      }
    }
    return out
  }, [antworten])

  const budgetText = formatBudget(stammdaten.budget_min, stammdaten.budget_max)
  const hatStamm =
    !!stammdaten.kunde_name || !!stammdaten.kunde_email || !!stammdaten.kunde_telefon ||
    !!stammdaten.projekt_name || !!stammdaten.projekt_adresse ||
    (stammdaten.raumtypen?.length ?? 0) > 0 ||
    !!budgetText || !!stammdaten.zeitrahmen ||
    !!stammdaten.stil_praeferenzen || !!stammdaten.notizen

  const hatAntworten = !!antworten && Object.keys(antworten).length > 0

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onZurueck() }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-titel"
        className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="shrink-0 px-5 sm:px-6 py-4 border-b border-gray-100 flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${prim}1a`, color: prim }}
          >
            <Check className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="review-titel" className="text-base sm:text-lg font-semibold text-gray-900 leading-tight">
              Überprüfe deine Angaben
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Sieh dir alles in Ruhe durch — danach senden wir deine Anfrage verbindlich ab.
            </p>
          </div>
        </div>

        {/* Body — scrollbar */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
          {hatStamm && (
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Stammdaten
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {stammdaten.kunde_name && (
                  <DetailZeile icon={<User className="w-3.5 h-3.5" />} label="Name" text={stammdaten.kunde_name} />
                )}
                {stammdaten.kunde_email && (
                  <DetailZeile icon={<Mail className="w-3.5 h-3.5" />} label="E-Mail" text={stammdaten.kunde_email} />
                )}
                {stammdaten.kunde_telefon && (
                  <DetailZeile icon={<Phone className="w-3.5 h-3.5" />} label="Telefon" text={stammdaten.kunde_telefon} />
                )}
                {stammdaten.projekt_name && (
                  <DetailZeile icon={<Home className="w-3.5 h-3.5" />} label="Projektname" text={stammdaten.projekt_name} />
                )}
                {stammdaten.projekt_adresse && (
                  <DetailZeile icon={<MapPin className="w-3.5 h-3.5" />} label="Adresse" text={stammdaten.projekt_adresse} />
                )}
                {budgetText && (
                  <DetailZeile icon={<Euro className="w-3.5 h-3.5" />} label="Budget" text={budgetText} />
                )}
                {stammdaten.zeitrahmen && (
                  <DetailZeile icon={<Clock className="w-3.5 h-3.5" />} label="Zeitrahmen" text={stammdaten.zeitrahmen} />
                )}
                {stammdaten.stil_praeferenzen && (
                  <DetailZeile icon={<Palette className="w-3.5 h-3.5" />} label="Stil" text={stammdaten.stil_praeferenzen} />
                )}
                {stammdaten.notizen && (
                  <DetailZeile icon={<MessageSquare className="w-3.5 h-3.5" />} label="Notizen" text={stammdaten.notizen} />
                )}
              </div>
              {stammdaten.raumtypen && stammdaten.raumtypen.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-[11px] text-gray-400 mb-1.5">Räume</p>
                  <div className="flex flex-wrap gap-1.5">
                    {stammdaten.raumtypen.map((rt) => (
                      <span key={rt} className="text-xs bg-white border border-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                        {rt}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {hatAntworten && (
            <DynamischeAntwortenAnzeige
              anfrageId={anfrageId ?? ''}
              vorlage={vorlage ?? null}
              antworten={antworten ?? null}
              dateien={dateien}
              ohneDownload
            />
          )}

          {!hatStamm && !hatAntworten && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Keine Angaben gefunden. Bitte gehe zurück und fülle das Formular aus.</span>
            </div>
          )}

          {fehler && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{fehler}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 sm:px-6 py-3 border-t border-gray-100 flex items-center gap-2 bg-gray-50/50 sm:rounded-b-2xl">
          <button
            type="button"
            onClick={onZurueck}
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:border-gray-300 disabled:opacity-50 rounded-xl transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Zurück bearbeiten
          </button>
          <button
            type="button"
            onClick={onAbsenden}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 rounded-xl transition-opacity"
            style={{ backgroundColor: prim }}
          >
            {isPending ? 'Wird gesendet…' : (
              <>Verbindlich absenden <Check className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function DetailZeile({ icon, label, text }: { icon: React.ReactNode; label: string; text: string }) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      <span className="text-gray-400 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-gray-400 leading-none">{label}</p>
        <p className="text-sm text-gray-700 truncate">{text}</p>
      </div>
    </div>
  )
}
