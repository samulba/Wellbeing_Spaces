'use client'

import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { usePathname } from 'next/navigation'
import { useModal } from '@/lib/hooks/useModal'
import {
  MessageSquare, X, Bug, Lightbulb, HelpCircle, Heart, MoreHorizontal,
  Image as ImageIcon, Loader2, AlertCircle, CheckCircle2,
} from 'lucide-react'
import {
  feedbackEinreichen, feedbackScreenshotHochladen, feedbackScreenshotSigniert,
} from '@/app/actions/feedback'
import type { FeedbackTyp } from '@/lib/supabase/types'

const TYPEN: { id: FeedbackTyp; label: string; icon: React.ElementType; farbe: string; bg: string }[] = [
  { id: 'bug',       label: 'Bug',     icon: Bug,           farbe: 'text-red-600',     bg: 'bg-red-50' },
  { id: 'feature',   label: 'Feature', icon: Lightbulb,     farbe: 'text-amber-600',   bg: 'bg-amber-50' },
  { id: 'frage',     label: 'Frage',   icon: HelpCircle,    farbe: 'text-blue-600',    bg: 'bg-blue-50' },
  { id: 'lob',       label: 'Lob',     icon: Heart,         farbe: 'text-pink-600',    bg: 'bg-pink-50' },
  { id: 'sonstiges', label: 'Sonstiges', icon: MoreHorizontal, farbe: 'text-gray-600', bg: 'bg-gray-50' },
]

export default function FeedbackButton() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Im Raumplaner/Moodboard-Editor ausblenden — viel Overlay-UI dort
  const istEditor = /\/dashboard\/projekte\/[^/]+\/raeume\/[^/]+\/(planer|moodboard)/.test(pathname)
  if (istEditor) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Feedback geben"
        title="Feedback geben"
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-wellbeing-green hover:bg-wellbeing-green-dark text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
      >
        <MessageSquare className="w-5 h-5" />
      </button>
      {open && <FeedbackModal onClose={() => setOpen(false)} />}
    </>
  )
}

function FeedbackModal({ onClose }: { onClose: () => void }) {
  const titleId = useId()
  const modalRef = useModal(true, onClose)
  const [pending, startTransition] = useTransition()

  const [typ, setTyp] = useState<FeedbackTyp>('bug')
  const [titel, setTitel] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [screenshotPfad, setScreenshotPfad] = useState<string | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [erfolg, setErfolg] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-Kontext (URL + UserAgent) erst beim Mount lesen, sodass
  // SSR und Client uebereinstimmen
  const [url, setUrl] = useState('')
  const [userAgent, setUserAgent] = useState('')
  useEffect(() => {
    setUrl(window.location.href)
    setUserAgent(navigator.userAgent)
  }, [])

  async function handleScreenshot(file: File) {
    if (!file.type.startsWith('image/')) {
      setFehler('Nur Bilder erlaubt.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setFehler('Bild zu groß (max 10 MB).')
      return
    }
    setFehler(null)
    setUploading(true)
    const fd = new FormData()
    fd.append('datei', file)
    const res = await feedbackScreenshotHochladen(fd)
    setUploading(false)
    if (res.fehler) { setFehler(res.fehler); return }
    if (res.pfad) {
      setScreenshotPfad(res.pfad)
      const sig = await feedbackScreenshotSigniert(res.pfad)
      if (sig.url) setScreenshotPreview(sig.url)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void handleScreenshot(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) void handleScreenshot(file)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const t = titel.trim()
    const b = beschreibung.trim()
    if (!t) { setFehler('Titel darf nicht leer sein.'); return }
    if (!b) { setFehler('Beschreibung darf nicht leer sein.'); return }
    setFehler(null)
    startTransition(async () => {
      const res = await feedbackEinreichen({
        typ, titel: t, beschreibung: b,
        url:        url || null,
        user_agent: userAgent || null,
        screenshot: screenshotPfad,
      })
      if (res.fehler) { setFehler(res.fehler); return }
      setErfolg(true)
      setTimeout(onClose, 2200)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-lg max-h-[95vh] md:max-h-[88vh] bg-white rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fadeIn"
      >
        {erfolg ? (
          <div className="px-8 py-12 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">Danke für dein Feedback!</h3>
            <p className="text-sm text-gray-500">
              Wir lesen jedes Feedback und melden uns, falls Rückfragen offen sind.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 shrink-0">
              <h2 id={titleId} className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-wellbeing-green" /> Feedback geben
              </h2>
              <button
                onClick={onClose}
                aria-label="Schließen"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="px-4 md:px-6 py-5 space-y-4">
                {/* Typ-Auswahl */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Typ</label>
                  <div className="grid grid-cols-5 gap-2">
                    {TYPEN.map((t) => {
                      const aktiv = typ === t.id
                      const Icon = t.icon
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTyp(t.id)}
                          className={
                            'flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg border transition-all ' +
                            (aktiv
                              ? `${t.bg} ${t.farbe} border-current ring-2 ring-current/20`
                              : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50')
                          }
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-[10px] font-medium">{t.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Titel */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Titel</label>
                  <input
                    autoFocus
                    value={titel}
                    onChange={(e) => setTitel(e.target.value)}
                    placeholder={
                      typ === 'bug' ? 'z.B. Speichern-Button reagiert nicht'
                      : typ === 'feature' ? 'z.B. Möbel-Suche im Raumplaner'
                      : typ === 'frage' ? 'z.B. Wie funktioniert das Branding?'
                      : 'Kurz und prägnant…'
                    }
                    maxLength={200}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-wellbeing-green-light focus:ring-2 focus:ring-wellbeing-green/20"
                  />
                </div>

                {/* Beschreibung */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Beschreibung</label>
                  <textarea
                    rows={5}
                    value={beschreibung}
                    onChange={(e) => setBeschreibung(e.target.value)}
                    placeholder={
                      typ === 'bug'
                        ? 'Was ist passiert? Welche Schritte führen dazu? Was hattest du erwartet?'
                        : 'Beschreib so genau wie möglich…'
                    }
                    maxLength={8000}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-wellbeing-green-light resize-y"
                  />
                </div>

                {/* Screenshot */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">Screenshot (optional)</label>
                  {screenshotPreview ? (
                    <div className="relative inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={screenshotPreview} alt="Screenshot" className="max-h-40 rounded-lg border border-gray-200" />
                      <button
                        type="button"
                        onClick={() => { setScreenshotPfad(null); setScreenshotPreview(null) }}
                        aria-label="Screenshot entfernen"
                        className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-gray-200 rounded-full text-gray-400 hover:text-red-500 shadow flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-wellbeing-green-light hover:bg-wellbeing-green/5 transition-colors"
                    >
                      {uploading ? (
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                          <Loader2 className="w-4 h-4 animate-spin" /> Wird hochgeladen…
                        </div>
                      ) : (
                        <>
                          <ImageIcon className="w-5 h-5 mx-auto text-gray-400 mb-1" />
                          <p className="text-xs text-gray-500">
                            Bild hier ablegen oder klicken zum Hochladen<br />
                            <span className="text-gray-400">PNG/JPG, max. 10 MB</span>
                          </p>
                        </>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </div>
                  )}
                </div>

                {/* Auto-Kontext */}
                {url && (
                  <details className="text-[11px] text-gray-400">
                    <summary className="cursor-pointer hover:text-gray-600">Was wird automatisch mitgeschickt?</summary>
                    <div className="mt-2 pl-3 border-l-2 border-gray-100 space-y-1">
                      <p><span className="font-medium">URL:</span> <code className="break-all">{url}</code></p>
                      <p><span className="font-medium">Browser:</span> <code className="break-all">{userAgent}</code></p>
                    </div>
                  </details>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 md:px-6 py-3 border-t border-gray-100 shrink-0 flex items-center justify-between gap-3 bg-gray-50/40">
                <div className="text-xs">
                  {fehler && (
                    <span className="inline-flex items-center gap-1 text-red-600">
                      <AlertCircle size={12} /> {fehler}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
                  >Abbrechen</button>
                  <button
                    type="submit"
                    disabled={pending || uploading || !titel.trim() || !beschreibung.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm bg-wellbeing-green text-white rounded-lg hover:bg-wellbeing-green-dark disabled:opacity-50"
                  >
                    {pending ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}
                    Absenden
                  </button>
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
