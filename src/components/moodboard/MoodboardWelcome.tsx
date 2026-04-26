'use client'

/**
 * Welcome-Modal beim Oeffnen eines leeren Moodboards.
 * Bietet Quick-Start-Optionen + 6 Template-Cards.
 */

import { Plus, Upload, Link as LinkIcon, Sparkles, X, Lock } from 'lucide-react'
import { TEMPLATES, type MoodboardTemplate } from '@/lib/moodboard-templates'

interface Props {
  onLeer:           () => void
  onTemplateWaehlen: (t: MoodboardTemplate) => void
  onBildHochladen:  () => void
  onSchliessen:     () => void
}

export default function MoodboardWelcome({
  onLeer, onTemplateWaehlen, onBildHochladen, onSchliessen,
}: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 z-30">
      <div className="pointer-events-auto bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-wellbeing-green" />
              <span className="text-[11px] uppercase tracking-wider text-wellbeing-green font-semibold">
                Schnellstart
              </span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Wie möchtest du starten?</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Wähle einen Schnellstart oder ein Template — du kannst alles später frei anpassen.
            </p>
          </div>
          <button
            type="button"
            onClick={onSchliessen}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors shrink-0"
            aria-label="Schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick-Start-Optionen */}
        <div className="px-6 pt-5">
          <h3 className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2.5">
            Aktionen
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <QuickAction
              icon={<Plus className="w-4 h-4" />}
              label="Leer starten"
              hint="Komplett blanko"
              onClick={onLeer}
            />
            <QuickAction
              icon={<Upload className="w-4 h-4" />}
              label="Bild hochladen"
              hint="JPG / PNG"
              onClick={onBildHochladen}
            />
            <QuickAction
              icon={<LinkIcon className="w-4 h-4" />}
              label="Link einfügen"
              hint="Bald verfügbar"
              disabled
            />
            <QuickAction
              icon={<Sparkles className="w-4 h-4" />}
              label="Aus Projekt"
              hint="Bald verfügbar"
              disabled
            />
          </div>
        </div>

        {/* Templates */}
        <div className="px-6 pt-6 pb-6">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
              Templates
            </h3>
            <span className="text-[11px] text-gray-400">{TEMPLATES.length} Stilrichtungen</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TEMPLATES.map((t) => (
              <TemplateCard key={t.id} template={t} onClick={() => onTemplateWaehlen(t)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── QuickAction ─────────────────────────────────────────────────
function QuickAction({
  icon, label, hint, onClick, disabled,
}: {
  icon: React.ReactNode
  label: string
  hint: string
  onClick?: () => void
  disabled?: boolean
}) {
  if (disabled) {
    return (
      <div className="relative flex flex-col gap-1 px-3 py-3 border border-dashed border-gray-200 rounded-xl text-left bg-gray-50/40 cursor-not-allowed">
        <div className="flex items-center gap-1.5 text-gray-400">
          {icon}
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-[11px] text-gray-400 inline-flex items-center gap-1">
          <Lock className="w-2.5 h-2.5" /> {hint}
        </span>
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col gap-1 px-3 py-3 border border-gray-200 rounded-xl text-left hover:border-wellbeing-green/60 hover:bg-wellbeing-cream/40 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-1.5 text-wellbeing-green-dark group-hover:text-wellbeing-green">
        {icon}
        <span className="text-sm font-medium text-gray-800">{label}</span>
      </div>
      <span className="text-[11px] text-gray-500">{hint}</span>
    </button>
  )
}

// ── Template-Card ────────────────────────────────────────────────
function TemplateCard({
  template, onClick,
}: {
  template: MoodboardTemplate
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col text-left bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-wellbeing-green/60 hover:shadow-md transition-all"
    >
      {/* Vorschau-Streifen mit den Template-Farben */}
      <div className="h-20 flex">
        {template.vorschauFarben.map((farbe, i) => (
          <div
            key={i}
            className="flex-1 transition-transform group-hover:scale-y-105 origin-bottom"
            style={{ background: farbe }}
          />
        ))}
      </div>
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{template.emoji}</span>
          <span className="text-sm font-medium text-gray-900">{template.name}</span>
        </div>
        <p className="text-[11px] text-gray-500 mt-0.5 leading-snug line-clamp-2">
          {template.beschreibung}
        </p>
      </div>
    </button>
  )
}
