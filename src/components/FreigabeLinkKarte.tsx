'use client'

import { useState, useTransition } from 'react'
import { tokenDeaktivieren, tokenErneuern } from '@/app/actions/freigabe-token'
import {
  freigabeTokenErstellen,
  freigabeScopeOptionenLaden,
  type ScopeOptionenRaum,
} from '@/app/actions/freigaben'
import { pinSetzen } from '@/app/actions/projekte'
import { RefreshCw, Clock, Lock, LockOpen, Copy, Check, Eye, EyeOff, Share2, Layers, Home, ListChecks } from 'lucide-react'
import { ConfirmModal } from '@/components/ConfirmModal'
import type { FreigabeScopeTyp } from '@/lib/supabase/types'

interface Props {
  projektId: string
  initialToken: { id: string; token: string; gueltig_bis: string | null } | null
  initialHatPin?: boolean
}

function restlaufzeit(gueltigBis: string | null): { tage: number; text: string; farbe: string } | null {
  if (!gueltigBis) return null
  const diff = new Date(gueltigBis).getTime() - Date.now()
  if (diff <= 0) return { tage: 0, text: 'Abgelaufen', farbe: 'text-red-500' }
  const tage = Math.ceil(diff / 86_400_000)
  const text = tage === 1 ? 'noch 1 Tag' : `noch ${tage} Tage`
  const farbe = tage <= 3 ? 'text-red-500' : tage <= 7 ? 'text-amber-600' : 'text-emerald-600'
  return { tage, text, farbe }
}

export default function FreigabeLinkKarte({ projektId, initialToken, initialHatPin = false }: Props) {
  // Token state
  const [tokenData, setTokenData]   = useState(initialToken)
  const [kopiert, setKopiert]       = useState(false)
  const [isPending, startTransition] = useTransition()

  // PIN state
  const [hatPin, setHatPin]               = useState(initialHatPin)
  const [pinEditMode, setPinEditMode]     = useState(false)
  const [pinInput, setPinInput]           = useState('')
  const [gespeicherterPin, setGespeicherterPin] = useState<string | null>(null)
  const [pinSichtbar, setPinSichtbar]     = useState(false)
  const [pinKopiert, setPinKopiert]       = useState(false)
  const [pinFehler, setPinFehler]         = useState<string | null>(null)
  const [toast, setToast]                 = useState<string | null>(null)
  const [confirmDeaktivieren, setConfirmDeaktivieren] = useState(false)
  const [confirmErneuern, setConfirmErneuern]         = useState(false)

  // Scope-Picker State (Mig 081)
  const [scopeTyp, setScopeTyp]                 = useState<FreigabeScopeTyp>('projekt')
  const [scopeRaumId, setScopeRaumId]           = useState<string>('')
  const [scopeItemIds, setScopeItemIds]         = useState<string[]>([])
  const [scopeOptionen, setScopeOptionen]       = useState<ScopeOptionenRaum[] | null>(null)
  const [scopeFehler, setScopeFehler]           = useState<string | null>(null)
  const [erstellenFehler, setErstellenFehler]   = useState<string | null>(null)

  async function scopeOptionenLadenWennNoetig(neuerTyp: FreigabeScopeTyp) {
    if (neuerTyp === 'projekt' || scopeOptionen !== null) return
    const data = await freigabeScopeOptionenLaden(projektId)
    setScopeOptionen(data)
    if (neuerTyp === 'raum' && data.length > 0) setScopeRaumId(data[0].id)
  }

  function handleScopeWechsel(neuerTyp: FreigabeScopeTyp) {
    setScopeTyp(neuerTyp)
    setScopeFehler(null)
    setErstellenFehler(null)
    if (neuerTyp !== 'projekt') scopeOptionenLadenWennNoetig(neuerTyp)
    if (neuerTyp === 'projekt') { setScopeItemIds([]); setScopeRaumId('') }
  }

  function toggleItem(id: string) {
    setScopeItemIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const freigabeUrl = tokenData
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/freigabe/${tokenData.token}`
    : null

  const laufzeit = tokenData ? restlaufzeit(tokenData.gueltig_bis) : null

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // ── Token-Aktionen ────────────────────────────────────────────
  function handleGenerieren() {
    setErstellenFehler(null)

    // Scope validieren
    let scopeIds: string[] = []
    if (scopeTyp === 'raum') {
      if (!scopeRaumId) { setScopeFehler('Bitte einen Raum auswählen.'); return }
      scopeIds = [scopeRaumId]
    } else if (scopeTyp === 'auswahl') {
      if (scopeItemIds.length === 0) { setScopeFehler('Bitte mindestens ein Produkt auswählen.'); return }
      scopeIds = scopeItemIds
    }
    setScopeFehler(null)

    startTransition(async () => {
      const result = await freigabeTokenErstellen(projektId, scopeTyp, scopeIds)
      if ('token' in result) {
        setTokenData({ id: '', token: result.token, gueltig_bis: null })
      } else {
        setErstellenFehler(result.fehler)
      }
    })
  }

  async function handleKopieren() {
    if (!freigabeUrl) return
    await navigator.clipboard.writeText(freigabeUrl)
    setKopiert(true)
    setTimeout(() => setKopiert(false), 2000)
  }

  function handleDeaktivieren() {
    if (!tokenData?.id) return
    startTransition(async () => {
      await tokenDeaktivieren(tokenData.id, projektId)
      setTokenData(null)
    })
    setConfirmDeaktivieren(false)
  }

  function handleErneuern() {
    if (!tokenData?.id) return
    startTransition(async () => {
      const result = await tokenErneuern(projektId, tokenData.id)
      if ('token' in result) {
        setTokenData({ id: '', token: result.token, gueltig_bis: null })
      }
    })
    setConfirmErneuern(false)
  }

  // ── PIN-Aktionen ──────────────────────────────────────────────
  function handlePinSpeichern() {
    const pin = pinInput.trim()
    if (!/^\d{4,6}$/.test(pin)) {
      setPinFehler('PIN muss 4–6 Ziffern enthalten.')
      return
    }
    startTransition(async () => {
      await pinSetzen(projektId, pin)
      setHatPin(true)
      setPinEditMode(false)
      setPinInput('')
      setPinFehler(null)
      setGespeicherterPin(pin)
      setPinSichtbar(false)
      showToast('✓ PIN aktiviert')
    })
  }

  function handlePinEntfernen() {
    startTransition(async () => {
      await pinSetzen(projektId, null)
      setHatPin(false)
      setPinEditMode(false)
      setPinInput('')
      setGespeicherterPin(null)
      setPinFehler(null)
      showToast('PIN entfernt')
    })
  }

  function handlePinKopieren() {
    if (!gespeicherterPin) return
    navigator.clipboard.writeText(gespeicherterPin).then(() => {
      setPinKopiert(true)
      setTimeout(() => setPinKopiert(false), 2000)
    })
  }

  return (
    <>
    <ConfirmModal
      isOpen={confirmDeaktivieren}
      onClose={() => setConfirmDeaktivieren(false)}
      onConfirm={handleDeaktivieren}
      title="Freigabe-Link deaktivieren"
      message="Der Link wird sofort ungültig. Kunden können den Freigabe-Link nicht mehr öffnen."
      confirmText="Deaktivieren"
      variant="warning"
      isLoading={isPending}
    />
    <ConfirmModal
      isOpen={confirmErneuern}
      onClose={() => setConfirmErneuern(false)}
      onConfirm={handleErneuern}
      title="Freigabe-Link erneuern"
      message="Der alte Link wird ungültig. Bitte teile den neuen Link mit dem Kunden."
      confirmText="Erneuern"
      variant="warning"
      isLoading={isPending}
    />
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm relative">
      {/* Toast */}
      {toast && (
        <div className="absolute top-3 right-3 px-3 py-1.5 bg-wellbeing-green text-white text-xs font-medium rounded-lg shadow-md animate-fadeIn z-10">
          {toast}
        </div>
      )}

      {/* Header */}
      <h2 className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
        <Share2 className="w-3.5 h-3.5" />
        Kunden-Freigabelink
      </h2>

      {!tokenData ? (
        <div>
          <p className="text-sm text-gray-500 mb-4 leading-relaxed">
            Erstellen Sie einen Link, den Sie an Ihren Kunden senden können.
          </p>

          {/* Scope-Auswahl (Projekt / Raum / Auswahl) */}
          <div className="mb-4">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Umfang</label>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { typ: 'projekt' as const, icon: Layers,     label: 'Projekt' },
                { typ: 'raum'    as const, icon: Home,       label: 'Raum' },
                { typ: 'auswahl' as const, icon: ListChecks, label: 'Auswahl' },
              ]).map(({ typ, icon: Icon, label }) => (
                <button
                  key={typ}
                  type="button"
                  onClick={() => handleScopeWechsel(typ)}
                  className={`flex flex-col items-center gap-1 px-2 py-2.5 text-[11px] font-medium rounded-lg border transition-colors ${
                    scopeTyp === typ
                      ? 'bg-wellbeing-green text-white border-wellbeing-green'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {scopeTyp === 'raum' && scopeOptionen && (
            <div className="mb-4">
              {scopeOptionen.length === 0 ? (
                <p className="text-xs text-amber-600">Keine Räume im Projekt vorhanden.</p>
              ) : (
                <select
                  value={scopeRaumId}
                  onChange={(e) => setScopeRaumId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green/30"
                >
                  {scopeOptionen.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.items.length} Produkt{r.items.length === 1 ? '' : 'e'})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {scopeTyp === 'auswahl' && scopeOptionen && (
            <div className="mb-4 max-h-60 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
              {scopeOptionen.length === 0 ? (
                <p className="text-xs text-amber-600 p-3">Keine Produkte im Projekt vorhanden.</p>
              ) : (
                scopeOptionen.map((r) => (
                  <div key={r.id}>
                    <p className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50">{r.name}</p>
                    {r.items.length === 0 ? (
                      <p className="px-3 py-2 text-[11px] text-gray-400 italic">keine Produkte</p>
                    ) : r.items.map((it) => (
                      <label key={it.id} className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={scopeItemIds.includes(it.id)}
                          onChange={() => toggleItem(it.id)}
                          className="rounded border-gray-300 text-wellbeing-green focus:ring-wellbeing-green/30"
                        />
                        <span className="flex-1">{it.name}</span>
                        <span className="text-gray-400">{it.menge}{it.einheit ? ` ${it.einheit}` : ''}</span>
                      </label>
                    ))}
                  </div>
                ))
              )}
              {scopeOptionen.length > 0 && (
                <div className="px-3 py-1.5 text-[10px] text-gray-500 bg-gray-50 text-right">
                  {scopeItemIds.length} ausgewählt
                </div>
              )}
            </div>
          )}

          {scopeFehler && <p className="text-xs text-red-500 mb-3">{scopeFehler}</p>}
          {erstellenFehler && <p className="text-xs text-red-500 mb-3">{erstellenFehler}</p>}

          <button
            onClick={handleGenerieren}
            disabled={isPending}
            className="px-4 py-2.5 bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
          >
            {isPending ? 'Wird erstellt…' : 'Freigabelink erstellen'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* URL + Kopieren */}
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={freigabeUrl ?? ''}
              className="flex-1 px-3 py-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg font-mono truncate focus:outline-none"
            />
            <button
              onClick={handleKopieren}
              className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                kopiert
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {kopiert ? '✓ Kopiert' : 'Kopieren'}
            </button>
          </div>

          {/* Restlaufzeit */}
          {laufzeit && (
            <div className={`flex items-center gap-1.5 text-xs ${laufzeit.farbe}`}>
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="font-medium">{laufzeit.text}</span>
            </div>
          )}

          {/* Aktionen */}
          <div className="flex items-center gap-3 flex-wrap">
            <a
              href={freigabeUrl ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-wellbeing-green underline underline-offset-2 transition-colors"
            >
              Vorschau öffnen ↗
            </a>
            {tokenData.id && (
              <>
                <button
                  onClick={() => setConfirmErneuern(true)}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 text-xs text-wellbeing-green hover:text-wellbeing-green-dark transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  Erneuern
                </button>
                <button
                  onClick={() => setConfirmDeaktivieren(true)}
                  disabled={isPending}
                  className="text-xs text-red-400/60 hover:text-red-500 transition-colors"
                >
                  Deaktivieren
                </button>
              </>
            )}
          </div>

          {/* ── PIN-Schutz ────────────────────────────────────── */}
          <div className="border-t border-gray-100 pt-3 mt-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                {hatPin
                  ? <Lock className="w-3.5 h-3.5 text-wellbeing-green" />
                  : <LockOpen className="w-3.5 h-3.5 text-gray-400" />
                }
                PIN-Schutz
              </span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                hatPin
                  ? 'bg-wellbeing-green/10 text-wellbeing-green'
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {hatPin ? 'Aktiv' : 'Inaktiv'}
              </span>
            </div>

            {!pinEditMode ? (
              <div>
                {/* Gespeicherter PIN anzeigen */}
                {gespeicherterPin && (
                  <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-wellbeing-green/5 border border-wellbeing-green/20 rounded-lg">
                    <span className="font-mono text-sm font-bold text-wellbeing-green-dark tracking-[0.25em] flex-1">
                      {pinSichtbar ? gespeicherterPin : '·'.repeat(gespeicherterPin.length)}
                    </span>
                    <button onClick={() => setPinSichtbar(v => !v)} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                      {pinSichtbar ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={handlePinKopieren} className="p-1 text-gray-400 hover:text-wellbeing-green transition-colors">
                      {pinKopiert ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setPinEditMode(true); setPinFehler(null) }}
                    disabled={isPending}
                    className="px-3 py-1.5 text-xs font-medium bg-wellbeing-green hover:bg-wellbeing-green-dark text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {hatPin ? 'PIN ändern' : 'PIN einrichten'}
                  </button>
                  {hatPin && (
                    <button
                      onClick={handlePinEntfernen}
                      disabled={isPending}
                      className="px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-600 border border-red-200 hover:border-red-300 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isPending ? '…' : 'Entfernen'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, '')); setPinFehler(null) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handlePinSpeichern() }}
                  placeholder="4–6 stellige PIN"
                  autoFocus
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green-light font-mono tracking-[0.3em] text-center"
                />
                {pinFehler && <p className="text-xs text-red-500">{pinFehler}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={handlePinSpeichern}
                    disabled={isPending}
                    className="px-3 py-1.5 text-xs font-medium bg-wellbeing-green hover:bg-wellbeing-green-dark text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isPending ? '…' : 'Speichern'}
                  </button>
                  <button
                    onClick={() => { setPinEditMode(false); setPinInput(''); setPinFehler(null) }}
                    disabled={isPending}
                    className="px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg transition-colors"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  )
}
