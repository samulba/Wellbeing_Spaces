'use client'

import { useState, useTransition } from 'react'
import {
  Monitor, Smartphone, Tablet, Globe, MapPin, Clock, LogOut, ShieldAlert,
} from 'lucide-react'
import { sessionBeenden, alleAnderenSessionsBeenden, type SessionInfo } from '@/app/actions/sessions'
import { ConfirmModal } from '@/components/ConfirmModal'

// ── User-Agent-Parser (leichtgewichtig, ohne externe Lib) ──
function parseUA(ua: string | null): { browser: string; os: string; device: 'desktop' | 'mobile' | 'tablet' } {
  if (!ua) return { browser: 'Unbekannt', os: 'Unbekannt', device: 'desktop' }

  let browser = 'Browser'
  if (/edg\//i.test(ua))                                 browser = 'Edge'
  else if (/chrome\//i.test(ua) && !/chromium/i.test(ua)) browser = 'Chrome'
  else if (/firefox\//i.test(ua))                         browser = 'Firefox'
  else if (/safari\//i.test(ua) && !/chrome/i.test(ua))   browser = 'Safari'
  else if (/opera|opr\//i.test(ua))                       browser = 'Opera'

  let os: string = 'Gerät'
  let device: 'desktop' | 'mobile' | 'tablet' = 'desktop'
  if      (/iphone|ipod/i.test(ua))   { os = 'iPhone';   device = 'mobile' }
  else if (/ipad/i.test(ua))          { os = 'iPad';     device = 'tablet' }
  else if (/android/i.test(ua) && /mobile/i.test(ua)) { os = 'Android';  device = 'mobile' }
  else if (/android/i.test(ua))       { os = 'Android-Tablet'; device = 'tablet' }
  else if (/mac os x/i.test(ua))      { os = 'macOS' }
  else if (/windows/i.test(ua))       { os = 'Windows' }
  else if (/linux/i.test(ua))         { os = 'Linux' }

  return { browser, os, device }
}

function formatAbstand(iso: string | null): string {
  if (!iso) return 'unbekannt'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000)             return 'gerade eben'
  const min = Math.floor(ms / 60_000)
  if (min < 60)                return `vor ${min} Min.`
  const h = Math.floor(min / 60)
  if (h < 24)                  return `vor ${h} Std.`
  const t = Math.floor(h / 24)
  if (t === 1)                 return 'gestern'
  if (t < 30)                  return `vor ${t} Tg.`
  const m = Math.floor(t / 30)
  if (m < 12)                  return `vor ${m} Mon.`
  return `vor ${Math.floor(m / 12)} J.`
}

function formatDatum(iso: string | null): string {
  if (!iso) return '–'
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

export default function SessionsListe({
  initialSessions,
}: {
  initialSessions: SessionInfo[]
}) {
  const [sessions, setSessions] = useState<SessionInfo[]>(initialSessions)
  const [loescheId, setLoescheId] = useState<string | null>(null)
  const [alleConfirm, setAlleConfirm] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const andereSessions = sessions.filter((s) => !s.istAktuell)

  function einzelneBeenden(id: string) {
    setFehler(null)
    startTransition(async () => {
      const r = await sessionBeenden(id)
      if (r.fehler) setFehler(r.fehler)
      else setSessions((prev) => prev.filter((s) => s.id !== id))
      setLoescheId(null)
    })
  }

  function alleAnderenBeenden() {
    setFehler(null)
    startTransition(async () => {
      const r = await alleAnderenSessionsBeenden()
      if (r.fehler) setFehler(r.fehler)
      else setSessions((prev) => prev.filter((s) => s.istAktuell))
      setAlleConfirm(false)
    })
  }

  if (sessions.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic">
        Keine aktiven Sessions gefunden.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {fehler && (
        <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <ShieldAlert className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700 leading-relaxed">{fehler}</p>
        </div>
      )}

      {sessions.map((s) => (
        <SessionKarte
          key={s.id}
          session={s}
          isPending={isPending}
          onBeenden={() => setLoescheId(s.id)}
        />
      ))}

      {andereSessions.length > 0 && (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={() => setAlleConfirm(true)}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-lg transition-colors disabled:opacity-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            Alle anderen Geräte abmelden ({andereSessions.length})
          </button>
        </div>
      )}

      <ConfirmModal
        isOpen={loescheId != null}
        variant="danger"
        title="Session beenden?"
        message="Das Gerät wird sofort abgemeldet und muss sich neu anmelden, um wieder zu arbeiten."
        confirmText="Abmelden"
        isLoading={isPending}
        onConfirm={() => loescheId && einzelneBeenden(loescheId)}
        onClose={() => setLoescheId(null)}
      />
      <ConfirmModal
        isOpen={alleConfirm}
        variant="danger"
        title="Alle anderen Geräte abmelden?"
        message="Du bleibst auf diesem Gerät eingeloggt. Alle anderen Browser, Tabs und Geräte werden sofort abgemeldet — falls jemand unbefugt eingeloggt war, ist er es danach nicht mehr."
        confirmText="Alle anderen abmelden"
        isLoading={isPending}
        onConfirm={alleAnderenBeenden}
        onClose={() => setAlleConfirm(false)}
      />
    </div>
  )
}

// ── Session-Karte ───────────────────────────────────────────
function SessionKarte({
  session: s,
  onBeenden,
  isPending,
}: {
  session:   SessionInfo
  onBeenden: () => void
  isPending: boolean
}) {
  const ua = parseUA(s.user_agent)
  const Icon = ua.device === 'mobile' ? Smartphone : ua.device === 'tablet' ? Tablet : Monitor
  const aktivVor = formatAbstand(s.refreshed_at ?? s.updated_at ?? s.created_at)

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
        s.istAktuell
          ? 'border-wellbeing-green/40 bg-wellbeing-green/5'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
          s.istAktuell ? 'bg-wellbeing-green text-white' : 'bg-gray-100 text-gray-500'
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900">
            {ua.browser} <span className="text-gray-400 font-normal">auf</span> {ua.os}
          </p>
          {s.istAktuell && (
            <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              Diese Sitzung
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap text-[11px] text-gray-500">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Aktiv {aktivVor}
          </span>
          <span className="inline-flex items-center gap-1">
            <Globe className="w-3 h-3" />
            Anmeldung {formatDatum(s.created_at)}
          </span>
          {s.ip && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {s.ip}
            </span>
          )}
        </div>
      </div>

      {!s.istAktuell && (
        <button
          type="button"
          onClick={onBeenden}
          disabled={isPending}
          className="text-xs font-medium text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-md px-2.5 py-1.5 transition-colors disabled:opacity-50 shrink-0"
        >
          Abmelden
        </button>
      )}
    </div>
  )
}
