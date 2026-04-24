'use client'

import { useEffect, useState } from 'react'
import {
  X, ChevronRight, ChevronLeft, Sparkles, CheckSquare, MessageSquare,
} from 'lucide-react'

const SEEN_KEY = 'portal-welcome-seen-v1'

type Step = {
  Icon:       typeof Sparkles
  eyebrow:    string
  titel:      string
  text:       string
  bildUrl?:   string // Optional Hero-Bild für diesen Step (Branding)
}

export default function PortalWelcomeModal({
  firma,
  primColor,
  welcomeText,
}: {
  firma:        string
  primColor:    string
  welcomeText?: string | null
}) {
  const [offen, setOffen] = useState(false)
  const [step,  setStep]  = useState(0)

  useEffect(() => {
    // Einmalig auf Client prüfen, ob User den Flow bereits gesehen hat
    try {
      if (typeof window === 'undefined') return
      const gesehen = window.localStorage.getItem(SEEN_KEY)
      if (!gesehen) setOffen(true)
    } catch { /* localStorage evtl. disabled */ }
  }, [])

  function schliessen() {
    try { window.localStorage.setItem(SEEN_KEY, new Date().toISOString()) } catch {}
    setOffen(false)
  }

  if (!offen) return null

  const steps: Step[] = [
    {
      Icon:    Sparkles,
      eyebrow: `Willkommen bei ${firma}`,
      titel:   welcomeText?.trim() || 'Schön, dass du da bist!',
      text:    'Hier siehst du deine laufenden Projekte auf einen Blick — Fortschritt, offene Freigaben und direkter Kontakt zu uns. Alles an einem Ort.',
    },
    {
      Icon:    CheckSquare,
      eyebrow: 'Schritt 1',
      titel:   'Produkte freigeben',
      text:    'Wir schlagen dir Möbel, Leuchten und Materialien für deine Räume vor. Du gehst durch die Liste und entscheidest pro Produkt: freigeben, ablehnen oder überarbeiten lassen. So bestimmst du mit.',
    },
    {
      Icon:    MessageSquare,
      eyebrow: 'Schritt 2',
      titel:   'Direkter Chat statt E-Mail-Ping-Pong',
      text:    'Fragen zu einem Produkt? Ideen, Anmerkungen, Inspirations-Bilder? Schreib direkt im Projekt-Chat. Wir sehen das und antworten — ohne dass was im Posteingang untergeht.',
    },
  ]

  const aktuell   = steps[step]
  const letzter   = step === steps.length - 1
  const { Icon }  = aktuell

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-titel"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={schliessen}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Skip-Button */}
        <button
          type="button"
          onClick={schliessen}
          aria-label="Einführung überspringen"
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Illustration / Icon-Bereich */}
        <div
          className="h-36 flex items-center justify-center relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${primColor}10, ${primColor}25)` }}
        >
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ backgroundColor: primColor }}
          >
            <Icon className="w-10 h-10 text-white" strokeWidth={1.8} />
          </div>
          {/* Dekorative Blobs */}
          <div
            className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-30 blur-2xl pointer-events-none"
            style={{ backgroundColor: primColor }}
          />
          <div
            className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-20 blur-2xl pointer-events-none"
            style={{ backgroundColor: primColor }}
          />
        </div>

        {/* Content */}
        <div className="px-8 pt-6 pb-4">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
            style={{ color: primColor }}
          >
            {aktuell.eyebrow}
          </p>
          <h2
            id="welcome-titel"
            className="font-syne text-xl font-bold text-gray-900 leading-tight tracking-tight mb-3"
          >
            {aktuell.titel}
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            {aktuell.text}
          </p>
        </div>

        {/* Footer: Progress-Dots + Nav */}
        <div className="px-6 pb-6 pt-3 flex items-center justify-between gap-4">
          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                aria-label={`Zu Schritt ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === step
                    ? 'w-6'
                    : 'w-1.5 bg-gray-200 hover:bg-gray-300'
                }`}
                style={i === step ? { backgroundColor: primColor } : undefined}
              />
            ))}
          </div>

          {/* Prev / Next */}
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Zurück"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {!letzter ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-opacity hover:opacity-90"
                style={{ backgroundColor: primColor }}
              >
                Weiter
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={schliessen}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-opacity hover:opacity-90"
                style={{ backgroundColor: primColor }}
              >
                Los geht&rsquo;s
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
