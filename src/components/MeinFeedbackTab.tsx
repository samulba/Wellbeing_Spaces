'use client'

import { useEffect, useState } from 'react'
import {
  MessageSquare, Bug, Lightbulb, HelpCircle, Heart, MoreHorizontal,
  Loader2, Image as ImageIcon,
} from 'lucide-react'
import { getMeinFeedback, feedbackScreenshotSigniert } from '@/app/actions/feedback'
import type { Feedback, FeedbackTyp, FeedbackStatus } from '@/lib/supabase/types'

const TYP_INFO: Record<FeedbackTyp, { label: string; icon: React.ElementType; farbe: string; bg: string }> = {
  bug:       { label: 'Bug',     icon: Bug,            farbe: 'text-red-600',    bg: 'bg-red-50' },
  feature:   { label: 'Feature', icon: Lightbulb,      farbe: 'text-amber-600',  bg: 'bg-amber-50' },
  frage:     { label: 'Frage',   icon: HelpCircle,     farbe: 'text-blue-600',   bg: 'bg-blue-50' },
  lob:       { label: 'Lob',     icon: Heart,          farbe: 'text-pink-600',   bg: 'bg-pink-50' },
  sonstiges: { label: 'Sonstiges', icon: MoreHorizontal, farbe: 'text-gray-600', bg: 'bg-gray-50' },
}

const STATUS_LABEL: Record<FeedbackStatus, { label: string; klasse: string }> = {
  neu:        { label: 'Neu',        klasse: 'bg-blue-50 text-blue-700' },
  in_arbeit:  { label: 'In Arbeit',  klasse: 'bg-amber-50 text-amber-700' },
  erledigt:   { label: 'Erledigt',   klasse: 'bg-emerald-50 text-emerald-700' },
  abgelehnt:  { label: 'Abgelehnt',  klasse: 'bg-gray-100 text-gray-600' },
  duplikat:   { label: 'Duplikat',   klasse: 'bg-gray-100 text-gray-600' },
}

export default function MeinFeedbackTab() {
  const [items, setItems] = useState<Feedback[] | null>(null)

  useEffect(() => {
    void getMeinFeedback().then(setItems)
  }, [])

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-gray-900">Mein Feedback</h2>
        <p className="text-xs text-gray-500 mt-1">
          Alle Feedback-Einreichungen, die du über den Feedback-Button gemacht hast — inkl. Status und unserer Antwort.
        </p>
      </div>

      {items === null ? (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" /> Lädt…
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Noch kein Feedback eingereicht.</p>
          <p className="text-xs text-gray-400 mt-1">
            Klick unten rechts auf den Feedback-Button um Bugs zu melden, Features zu wünschen oder Fragen zu stellen.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((f) => <FeedbackEintrag key={f.id} feedback={f} />)}
        </ul>
      )}
    </div>
  )
}

function FeedbackEintrag({ feedback }: { feedback: Feedback }) {
  const typ = TYP_INFO[feedback.typ]
  const status = STATUS_LABEL[feedback.status]
  const TypIcon = typ.icon
  const [expanded, setExpanded] = useState(false)
  const [shotUrl, setShotUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!expanded || !feedback.screenshot_url || shotUrl) return
    void feedbackScreenshotSigniert(feedback.screenshot_url).then((r) => {
      if (r.url) setShotUrl(r.url)
    })
  }, [expanded, feedback.screenshot_url, shotUrl])

  return (
    <li className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3"
      >
        <span className={`w-8 h-8 rounded-lg ${typ.bg} ${typ.farbe} flex items-center justify-center shrink-0`}>
          <TypIcon className="w-4 h-4" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{feedback.titel}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {typ.label} · {new Date(feedback.created_at).toLocaleDateString('de-DE', {
              day: '2-digit', month: 'short', year: 'numeric',
            })}
            {feedback.antwort && <span className="text-emerald-600"> · Beantwortet</span>}
          </p>
        </div>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${status.klasse} shrink-0`}>
          {status.label}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/40 space-y-3">
          <div>
            <p className="text-[11px] font-medium text-gray-500 uppercase mb-1">Beschreibung</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{feedback.beschreibung}</p>
          </div>

          {feedback.screenshot_url && (
            <div>
              <p className="text-[11px] font-medium text-gray-500 uppercase mb-1 flex items-center gap-1">
                <ImageIcon size={10} /> Screenshot
              </p>
              {shotUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shotUrl} alt="" className="max-h-60 rounded-lg border border-gray-200" />
              ) : (
                <p className="text-xs text-gray-400">Lädt…</p>
              )}
            </div>
          )}

          {feedback.antwort && (
            <div className="bg-wellbeing-green/5 border border-wellbeing-green/20 rounded-lg p-3">
              <p className="text-[11px] font-medium text-wellbeing-green-dark uppercase mb-1">
                Antwort vom Team
                {feedback.beantwortet_am && (
                  <span className="text-gray-400 normal-case ml-2">
                    · {new Date(feedback.beantwortet_am).toLocaleDateString('de-DE')}
                  </span>
                )}
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{feedback.antwort}</p>
            </div>
          )}
        </div>
      )}
    </li>
  )
}
