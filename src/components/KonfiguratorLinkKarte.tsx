'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Settings2, Copy, Check, ExternalLink, X, ChevronDown, ChevronUp, CheckCircle2, Clock, ReceiptText } from 'lucide-react'
import { konfiguratorErstellen, konfiguratorAuswahlZuAngebot } from '@/app/actions/konfigurator'
import type { KonfiguratorSession } from '@/lib/supabase/types'

const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

const statusBadge = (s: KonfiguratorSession['status']) => {
  if (s === 'abgeschlossen') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (s === 'abgelaufen')    return 'bg-gray-100 text-gray-500 border-gray-200'
  return 'bg-blue-50 text-blue-700 border-blue-200'
}
const statusLabel = (s: KonfiguratorSession['status']) => {
  if (s === 'abgeschlossen') return 'Abgeschlossen'
  if (s === 'abgelaufen')    return 'Abgelaufen'
  return 'Aktiv'
}

// ── Modal zum Erstellen ───────────────────────────────────────
function ErstellenModal({
  projektId,
  onClose,
  onErstellt,
}: {
  projektId: string
  onClose: () => void
  onErstellt: () => void
}) {
  const [budgetLimit,       setBudgetLimit]       = useState('')
  const [showPrices,        setShowPrices]        = useState(true)
  const [allowAlternatives, setAllowAlternatives] = useState(true)
  const [expiresAt,         setExpiresAt]         = useState('')
  const [isPending,         startTransition]      = useTransition()

  function handleErstellen() {
    startTransition(async () => {
      await konfiguratorErstellen(projektId, {
        budgetLimit:      budgetLimit ? parseInt(budgetLimit) : null,
        showPrices,
        allowAlternatives,
        expiresAt:        expiresAt || null,
      })
      onErstellt()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Kunden-Konfigurator erstellen</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Budget */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Budget-Limit (optional)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
              <input
                type="number"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
                placeholder="z.B. 20000"
                className="w-full pl-7 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Wird dem Kunden als Budgetvorgabe angezeigt.</p>
          </div>

          {/* Ablaufdatum */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Ablaufdatum (optional)</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition"
            />
          </div>

          {/* Toggles */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <Toggle
              label="Preise anzeigen"
              beschreibung="Verkaufspreise für den Kunden sichtbar"
              checked={showPrices}
              onChange={setShowPrices}
            />
            <Toggle
              label="Alternative anfragen erlauben"
              beschreibung="Kunden können &bdquo;Alternative gewünscht&ldquo; wählen"
              checked={allowAlternatives}
              onChange={setAllowAlternatives}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 rounded-xl transition">Abbrechen</button>
          <button
            onClick={handleErstellen}
            disabled={isPending}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 rounded-xl transition"
          >
            {isPending ? 'Wird erstellt…' : 'Link erstellen'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Toggle({ label, beschreibung, checked, onChange }: {
  label: string; beschreibung: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className="relative shrink-0 cursor-pointer"
        style={{ width: '36px', height: '20px' }}
      >
        <div className={`w-9 h-5 rounded-full transition-colors ${checked ? 'bg-wellbeing-green' : 'bg-gray-200'}`} />
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </div>
      <div>
        <p className="text-sm text-gray-700 font-medium">{label}</p>
        <p className="text-xs text-gray-400">{beschreibung}</p>
      </div>
    </label>
  )
}

// ── Link-Kopieren ─────────────────────────────────────────────
function LinkKopieren({ token }: { token: string }) {
  const [kopiert, setKopiert] = useState(false)
  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/konfigurator/${token}`

  function kopieren() {
    navigator.clipboard.writeText(url).then(() => {
      setKopiert(true)
      setTimeout(() => setKopiert(false), 2000)
    })
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <code className="flex-1 px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-600 truncate">
        /konfigurator/{token.slice(0, 12)}…
      </code>
      <button
        onClick={kopieren}
        className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-wellbeing-green border border-wellbeing-green/30 rounded-lg hover:bg-wellbeing-green/5 transition"
      >
        {kopiert ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {kopiert ? 'Kopiert!' : 'Kopieren'}
      </button>
      <a
        href={`/konfigurator/${token}`}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 p-1.5 text-gray-400 hover:text-wellbeing-green rounded-lg hover:bg-gray-50 transition"
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  )
}

// ── Session-Zeile ─────────────────────────────────────────────
function SessionZeile({
  session,
  projektId,
  onErgebnisAnzeigen,
}: {
  session: KonfiguratorSession
  projektId: string
  onErgebnisAnzeigen: (id: string) => void
}) {
  const router = useRouter()
  const [offen, setOffen] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const datum = new Date(session.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })

  function handleZuAngebot() {
    setFehler(null)
    startTransition(async () => {
      const res = await konfiguratorAuswahlZuAngebot(session.id)
      if (res.fehler) { setFehler(res.fehler); return }
      router.push(`/dashboard/projekte/${projektId}/angebote`)
    })
  }

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOffen((v) => !v)}
        className="w-full flex items-center justify-between px-3.5 py-3 hover:bg-gray-50 transition text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusBadge(session.status)}`}>
            {statusLabel(session.status)}
          </span>
          <span className="text-xs text-gray-500">{datum}</span>
          {session.budget_limit && (
            <span className="text-xs text-gray-400">· {eur(session.budget_limit)} Budget</span>
          )}
        </div>
        {offen ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
      </button>
      {offen && (
        <div className="px-3.5 pb-3.5 space-y-2.5 border-t border-gray-100 pt-3">
          <LinkKopieren token={session.token} />
          {session.status === 'abgeschlossen' && (
            <>
              <button
                onClick={() => onErgebnisAnzeigen(session.id)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Ergebnis ansehen
              </button>
              <button
                onClick={handleZuAngebot}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-wellbeing-green border border-wellbeing-green/30 rounded-lg hover:bg-wellbeing-green/5 transition disabled:opacity-50"
              >
                <ReceiptText className="w-3.5 h-3.5" />
                {isPending ? 'Angebot wird erstellt…' : 'Angebot aus Auswahl erstellen'}
              </button>
            </>
          )}
          {fehler && <p className="text-xs text-red-500">{fehler}</p>}
          {session.kunde_notizen && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              <p className="text-[10px] font-medium text-amber-600 mb-0.5">Notizen vom Kunden</p>
              <p className="text-xs text-amber-700 leading-relaxed">{session.kunde_notizen}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Haupt-Komponente ──────────────────────────────────────────
export default function KonfiguratorLinkKarte({
  projektId,
  initialSessions,
  onErgebnisAnzeigen,
}: {
  projektId: string
  initialSessions: KonfiguratorSession[]
  onErgebnisAnzeigen?: (sessionId: string) => void
}) {
  const [sessions]        = useState(initialSessions)
  const [modalOffen,  setModalOffen]  = useState(false)

  function handleErstellt() {
    setModalOffen(false)
    window.location.reload()
  }

  const aktiveSession = sessions.find((s) => s.status === 'aktiv')

  return (
    <>
      {modalOffen && (
        <ErstellenModal
          projektId={projektId}
          onClose={() => setModalOffen(false)}
          onErstellt={() => handleErstellt()}
        />
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Kunden-Konfigurator</h2>
          <button
            onClick={() => setModalOffen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-wellbeing-green border border-wellbeing-green/30 hover:bg-wellbeing-green/5 rounded-lg transition"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Neu
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-5">
            <p className="text-xs text-gray-400">Noch kein Konfigurator-Link erstellt.</p>
            <button
              onClick={() => setModalOffen(true)}
              className="mt-2 text-xs text-wellbeing-green underline underline-offset-2"
            >
              Ersten Link erstellen
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <SessionZeile
                key={s.id}
                session={s}
                projektId={projektId}
                onErgebnisAnzeigen={onErgebnisAnzeigen ?? (() => {})}
              />
            ))}
          </div>
        )}

        {aktiveSession && (
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
            <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <p className="text-xs text-blue-600">Aktiver Konfigurator läuft — Kunde kann gerade auswählen.</p>
          </div>
        )}
      </div>
    </>
  )
}
