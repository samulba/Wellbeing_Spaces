'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search, Bug, Lightbulb, HelpCircle, Heart, MoreHorizontal,
  Trash2, Send, Mail, Loader2, AlertCircle, Image as ImageIcon,
  Globe, Monitor, ListChecks, Plus,
} from 'lucide-react'
import {
  feedbackStatusAendern, feedbackPrioritaetAendern, feedbackInterneNotiz,
  feedbackAntworten, feedbackLoeschen, feedbackScreenshotSigniert,
  feedbackAlsAufgabeUebernehmen,
} from '@/app/actions/feedback'
import Link from 'next/link'
import type { FeedbackMitOrg, FeedbackStatus, FeedbackTyp, FeedbackPrioritaet } from '@/lib/supabase/types'

const TYP_INFO: Record<FeedbackTyp, { label: string; icon: React.ElementType; farbe: string; bg: string }> = {
  bug:       { label: 'Bug',       icon: Bug,            farbe: 'text-red-400',    bg: 'bg-red-500/10' },
  feature:   { label: 'Feature',   icon: Lightbulb,      farbe: 'text-amber-400',  bg: 'bg-amber-500/10' },
  frage:     { label: 'Frage',     icon: HelpCircle,     farbe: 'text-blue-400',   bg: 'bg-blue-500/10' },
  lob:       { label: 'Lob',       icon: Heart,          farbe: 'text-pink-400',   bg: 'bg-pink-500/10' },
  sonstiges: { label: 'Sonstiges', icon: MoreHorizontal, farbe: 'text-slate-400',  bg: 'bg-slate-500/10' },
}

const STATUS_LABEL: Record<FeedbackStatus, { label: string; klasse: string }> = {
  neu:        { label: 'Neu',        klasse: 'bg-blue-500/20 text-blue-300' },
  in_arbeit:  { label: 'In Arbeit',  klasse: 'bg-amber-500/20 text-amber-300' },
  erledigt:   { label: 'Erledigt',   klasse: 'bg-emerald-500/20 text-emerald-300' },
  abgelehnt:  { label: 'Abgelehnt',  klasse: 'bg-slate-500/20 text-slate-300' },
  duplikat:   { label: 'Duplikat',   klasse: 'bg-slate-500/20 text-slate-300' },
}

const PRIO_INFO: Record<FeedbackPrioritaet, { label: string; klasse: string }> = {
  niedrig:  { label: 'Niedrig',  klasse: 'bg-slate-500/10 text-slate-400' },
  normal:   { label: 'Normal',   klasse: 'bg-blue-500/10 text-blue-400' },
  hoch:     { label: 'Hoch',     klasse: 'bg-amber-500/10 text-amber-400' },
  kritisch: { label: 'Kritisch', klasse: 'bg-red-500/20 text-red-300' },
}

export default function FeedbackInbox({ feedbacks }: { feedbacks: FeedbackMitOrg[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [auswahlId, setAuswahlId] = useState<string | null>(feedbacks[0]?.id ?? null)
  const auswahl = feedbacks.find((f) => f.id === auswahlId) ?? null

  // Wenn aktuelle Auswahl nicht mehr in Liste, neue erste setzen
  useEffect(() => {
    if (auswahlId && !feedbacks.find((f) => f.id === auswahlId)) {
      setAuswahlId(feedbacks[0]?.id ?? null)
    }
  }, [feedbacks, auswahlId])

  function setUrlFilter(key: string, val: string) {
    const sp = new URLSearchParams(searchParams.toString())
    if (val === '' || val === 'alle') sp.delete(key)
    else sp.set(key, val)
    router.replace(`/super-admin/feedback?${sp.toString()}`)
  }

  const aktiverStatus = searchParams.get('status') ?? 'alle'
  const aktiverTyp    = searchParams.get('typ')    ?? 'alle'
  const aktiveSuche   = searchParams.get('suche')  ?? ''

  // Lokaler Such-State + Debounce in URL
  const [sucheLokal, setSucheLokal] = useState(aktiveSuche)
  useEffect(() => {
    const t = setTimeout(() => {
      if (sucheLokal !== aktiveSuche) setUrlFilter('suche', sucheLokal)
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sucheLokal])

  return (
    <div className="h-full flex">
      {/* Linke Spalte: Liste */}
      <aside className="w-[380px] shrink-0 border-r border-slate-800 flex flex-col bg-slate-900">
        {/* Filter-Bar */}
        <div className="p-3 border-b border-slate-800 space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Suchen…"
              value={sucheLokal}
              onChange={(e) => setSucheLokal(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 outline-none focus:border-slate-600"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {(['alle', 'neu', 'in_arbeit', 'erledigt'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setUrlFilter('status', s)}
                className={
                  'px-2 py-1 text-[11px] rounded ' +
                  (aktiverStatus === s
                    ? 'bg-amber-400 text-slate-900 font-medium'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200')
                }
              >
                {s === 'alle' ? 'Alle' : STATUS_LABEL[s as FeedbackStatus].label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {(['alle', 'bug', 'feature', 'frage', 'lob'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setUrlFilter('typ', t)}
                className={
                  'px-2 py-1 text-[11px] rounded ' +
                  (aktiverTyp === t
                    ? 'bg-amber-400 text-slate-900 font-medium'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200')
                }
              >
                {t === 'alle' ? 'Alle Typen' : TYP_INFO[t as FeedbackTyp].label}
              </button>
            ))}
          </div>
        </div>

        {/* Liste */}
        {feedbacks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <p className="text-sm text-slate-500">Kein Feedback gefunden.</p>
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto divide-y divide-slate-800">
            {feedbacks.map((f) => (
              <ListenEintrag
                key={f.id}
                feedback={f}
                aktiv={auswahlId === f.id}
                onClick={() => setAuswahlId(f.id)}
              />
            ))}
          </ul>
        )}
      </aside>

      {/* Rechte Spalte: Detail */}
      <section className="flex-1 overflow-y-auto">
        {auswahl ? (
          <DetailAnsicht feedback={auswahl} />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            Wähle ein Feedback aus.
          </div>
        )}
      </section>
    </div>
  )
}

function ListenEintrag({
  feedback, aktiv, onClick,
}: {
  feedback: FeedbackMitOrg
  aktiv: boolean
  onClick: () => void
}) {
  const typ = TYP_INFO[feedback.typ]
  const status = STATUS_LABEL[feedback.status]
  const TypIcon = typ.icon
  return (
    <li>
      <button
        onClick={onClick}
        className={
          'w-full text-left px-3 py-3 hover:bg-slate-800 transition-colors flex items-start gap-3 ' +
          (aktiv ? 'bg-slate-800 border-l-2 border-amber-400 -ml-px' : '')
        }
      >
        <span className={`w-7 h-7 rounded-lg ${typ.bg} ${typ.farbe} flex items-center justify-center shrink-0`}>
          <TypIcon className="w-3.5 h-3.5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-100 truncate">{feedback.titel}</p>
          <p className="text-[10px] text-slate-500 mt-0.5 truncate">
            {feedback.user_name ?? feedback.user_email ?? 'Anonym'}
            {feedback.organisation?.name && <span> · {feedback.organisation.name}</span>}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${status.klasse}`}>
              {status.label}
            </span>
            <span className="text-[10px] text-slate-500">
              {relZeit(feedback.created_at)}
            </span>
          </div>
        </div>
      </button>
    </li>
  )
}

function DetailAnsicht({ feedback }: { feedback: FeedbackMitOrg }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [fehler, setFehler] = useState<string | null>(null)
  const [notiz, setNotiz] = useState(feedback.interne_notiz ?? '')
  const [antwort, setAntwort] = useState(feedback.antwort ?? '')
  const [sendeMail, setSendeMail] = useState(true)
  const [shotUrl, setShotUrl] = useState<string | null>(null)

  // Notiz/Antwort-State auf neues Feedback resetten
  useEffect(() => {
    setNotiz(feedback.interne_notiz ?? '')
    setAntwort(feedback.antwort ?? '')
    setShotUrl(null)
    setFehler(null)
    if (feedback.screenshot_url) {
      void feedbackScreenshotSigniert(feedback.screenshot_url).then((r) => {
        if (r.url) setShotUrl(r.url)
      })
    }
  }, [feedback.id, feedback.interne_notiz, feedback.antwort, feedback.screenshot_url])

  function setStatus(s: FeedbackStatus) {
    startTransition(async () => {
      const r = await feedbackStatusAendern(feedback.id, s)
      if (r.fehler) setFehler(r.fehler)
      else router.refresh()
    })
  }

  function setPrio(p: FeedbackPrioritaet) {
    startTransition(async () => {
      const r = await feedbackPrioritaetAendern(feedback.id, p)
      if (r.fehler) setFehler(r.fehler)
      else router.refresh()
    })
  }

  function speichereNotiz() {
    if (notiz === (feedback.interne_notiz ?? '')) return
    startTransition(async () => {
      const r = await feedbackInterneNotiz(feedback.id, notiz.trim() || null)
      if (r.fehler) setFehler(r.fehler)
      else router.refresh()
    })
  }

  function sendeAntwort() {
    if (!antwort.trim()) return
    startTransition(async () => {
      const r = await feedbackAntworten(feedback.id, antwort, { sendeMail })
      if (r.fehler) setFehler(r.fehler)
      else router.refresh()
    })
  }

  function loeschen() {
    if (!window.confirm('Feedback endgültig löschen?')) return
    startTransition(async () => {
      const r = await feedbackLoeschen(feedback.id)
      if (r.fehler) setFehler(r.fehler)
      else router.refresh()
    })
  }

  function alsAufgabe() {
    startTransition(async () => {
      const r = await feedbackAlsAufgabeUebernehmen(feedback.id)
      if (r.fehler) setFehler(r.fehler)
      else router.refresh()
    })
  }

  const typ = TYP_INFO[feedback.typ]
  const TypIcon = typ.icon

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <span className={`w-12 h-12 rounded-xl ${typ.bg} ${typ.farbe} flex items-center justify-center shrink-0`}>
          <TypIcon className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-slate-100">{feedback.titel}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {feedback.user_name ?? 'Anonym'}
            {feedback.user_email && <span className="ml-1">({feedback.user_email})</span>}
            {feedback.organisation?.name && <span> · {feedback.organisation.name}</span>}
            <span> · {new Date(feedback.created_at).toLocaleString('de-DE')}</span>
          </p>
        </div>
        <button
          onClick={loeschen}
          aria-label="Löschen"
          className="text-slate-500 hover:text-red-400 p-1.5 rounded hover:bg-slate-800"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Status + Prio Toggles */}
      <div className="flex flex-wrap gap-3 bg-slate-800/40 rounded-xl p-3 border border-slate-800">
        <div>
          <p className="text-[10px] text-slate-500 uppercase mb-1.5">Status</p>
          <div className="flex flex-wrap gap-1">
            {(Object.keys(STATUS_LABEL) as FeedbackStatus[]).map((s) => {
              const aktiv = feedback.status === s
              const cfg = STATUS_LABEL[s]
              return (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  disabled={pending}
                  className={
                    'px-2 py-1 text-[11px] rounded font-medium transition-colors ' +
                    (aktiv ? cfg.klasse : 'bg-slate-700 text-slate-400 hover:bg-slate-600')
                  }
                >{cfg.label}</button>
              )
            })}
          </div>
        </div>
        <div className="w-px bg-slate-700" />
        <div>
          <p className="text-[10px] text-slate-500 uppercase mb-1.5">Priorität</p>
          <div className="flex flex-wrap gap-1">
            {(Object.keys(PRIO_INFO) as FeedbackPrioritaet[]).map((p) => {
              const aktiv = feedback.prioritaet === p
              const cfg = PRIO_INFO[p]
              return (
                <button
                  key={p}
                  onClick={() => setPrio(p)}
                  disabled={pending}
                  className={
                    'px-2 py-1 text-[11px] rounded font-medium transition-colors ' +
                    (aktiv ? cfg.klasse : 'bg-slate-700 text-slate-400 hover:bg-slate-600')
                  }
                >{cfg.label}</button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Beschreibung */}
      <section>
        <h2 className="text-[10px] text-slate-500 uppercase mb-1.5">Beschreibung</h2>
        <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-800 text-sm text-slate-200 whitespace-pre-wrap">
          {feedback.beschreibung}
        </div>
      </section>

      {/* Als Aufgabe uebernehmen */}
      <section>
        {feedback.aufgabe_id ? (
          <Link
            href="/dashboard/aufgaben"
            className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300"
          >
            <ListChecks size={12} /> Als Aufgabe uebernommen — im Kanban oeffnen →
          </Link>
        ) : (
          <button
            onClick={alsAufgabe}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg disabled:opacity-50"
          >
            {pending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Als Aufgabe in mein Kanban uebernehmen
          </button>
        )}
      </section>

      {/* Screenshot */}
      {feedback.screenshot_url && (
        <section>
          <h2 className="text-[10px] text-slate-500 uppercase mb-1.5 inline-flex items-center gap-1">
            <ImageIcon size={10} /> Screenshot
          </h2>
          {shotUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shotUrl} alt="" className="max-h-96 rounded-xl border border-slate-800" />
          ) : (
            <p className="text-xs text-slate-500">Lädt…</p>
          )}
        </section>
      )}

      {/* Auto-Kontext */}
      {(feedback.url || feedback.user_agent) && (
        <details className="bg-slate-800/40 rounded-xl border border-slate-800 px-4 py-2 text-xs text-slate-400">
          <summary className="cursor-pointer hover:text-slate-200 inline-flex items-center gap-1.5">
            <ListChecks size={12} /> Auto-Kontext
          </summary>
          <div className="mt-2 space-y-1">
            {feedback.url && (
              <p className="inline-flex items-start gap-2">
                <Globe size={12} className="mt-0.5 shrink-0" />
                <code className="text-slate-300 break-all text-[11px]">{feedback.url}</code>
              </p>
            )}
            {feedback.user_agent && (
              <p className="inline-flex items-start gap-2">
                <Monitor size={12} className="mt-0.5 shrink-0" />
                <code className="text-slate-300 break-all text-[11px]">{feedback.user_agent}</code>
              </p>
            )}
          </div>
        </details>
      )}

      {/* Interne Notiz */}
      <section>
        <h2 className="text-[10px] text-slate-500 uppercase mb-1.5">Interne Notiz (nur Backstage)</h2>
        <textarea
          rows={3}
          value={notiz}
          onChange={(e) => setNotiz(e.target.value)}
          onBlur={speichereNotiz}
          placeholder="Triage-Notiz, Reproduktions-Schritte etc."
          className="w-full text-sm bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-slate-600 text-slate-100 placeholder:text-slate-500 resize-y"
        />
      </section>

      {/* Antwort an User */}
      <section>
        <h2 className="text-[10px] text-slate-500 uppercase mb-1.5">Antwort an User</h2>
        {feedback.antwort && (
          <div className="mb-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 text-xs text-emerald-300">
            Bereits beantwortet am {feedback.beantwortet_am && new Date(feedback.beantwortet_am).toLocaleString('de-DE')}
          </div>
        )}
        <textarea
          rows={4}
          value={antwort}
          onChange={(e) => setAntwort(e.target.value)}
          placeholder="Deine Antwort an den User…"
          className="w-full text-sm bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-slate-600 text-slate-100 placeholder:text-slate-500 resize-y"
        />
        <div className="flex items-center justify-between mt-2">
          <label className="inline-flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={sendeMail}
              onChange={(e) => setSendeMail(e.target.checked)}
              className="rounded"
            />
            <Mail size={11} /> E-Mail an User senden
          </label>
          <button
            onClick={sendeAntwort}
            disabled={pending || !antwort.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm bg-amber-400 hover:bg-amber-300 text-slate-900 font-medium rounded-lg disabled:opacity-50"
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {feedback.antwort ? 'Antwort aktualisieren' : 'Antwort senden'}
          </button>
        </div>
      </section>

      {fehler && (
        <p className="inline-flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle size={12} /> {fehler}
        </p>
      )}
    </div>
  )
}

function relZeit(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'gerade eben'
  if (min < 60) return `vor ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `vor ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `vor ${d}d`
  return new Date(iso).toLocaleDateString('de-DE')
}

