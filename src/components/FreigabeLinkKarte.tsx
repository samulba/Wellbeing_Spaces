'use client'

import { useState, useTransition } from 'react'
import { tokenDeaktivieren, tokenErneuern } from '@/app/actions/freigabe-token'
import {
  freigabeTokenErstellen,
  freigabeScopeOptionenLaden,
  freigabeTokenLoeschen,
  type ScopeOptionenRaum,
} from '@/app/actions/freigaben'
import { pinSetzen } from '@/app/actions/projekte'
import {
  RefreshCw, Clock, Lock, LockOpen, Copy, Check, Eye, EyeOff,
  Share2, Layers, Home, ListChecks, Plus, Trash2, AlertTriangle,
} from 'lucide-react'
import { ConfirmModal } from '@/components/ConfirmModal'
import type { FreigabeScopeTyp } from '@/lib/supabase/types'

type TokenData = {
  id:          string
  token:       string
  gueltig_bis: string | null
  scope_typ:   FreigabeScopeTyp | null
  scope_ids:   string[] | null
  scope_bereich_ids?: string[] | null
  created_at:  string
}

interface Props {
  projektId:       string
  initialTokens:   TokenData[]
  raeume:          { id: string; name: string }[]
  initialHatPin?:  boolean
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

function scopeLabel(token: TokenData, raeume: { id: string; name: string }[]): { label: string; badgeCls: string; Icon: typeof Layers } {
  if (token.scope_typ === 'raum' && token.scope_ids && token.scope_ids.length > 0) {
    const raum = raeume.find((r) => r.id === token.scope_ids![0])
    return {
      label:    `Raum: ${raum?.name ?? 'unbekannt'}`,
      badgeCls: 'bg-blue-50 text-blue-700 border-blue-200',
      Icon:     Home,
    }
  }
  if (token.scope_typ === 'auswahl') {
    const anzahl = token.scope_ids?.length ?? 0
    const grp = token.scope_bereich_ids?.length ?? 0
    return {
      label:    `Auswahl: ${anzahl} Produkt${anzahl === 1 ? '' : 'e'}${grp > 0 ? ` · ${grp} Gruppe${grp === 1 ? '' : 'n'}` : ''}`,
      badgeCls: 'bg-purple-50 text-purple-700 border-purple-200',
      Icon:     ListChecks,
    }
  }
  return {
    label:    'Gesamtes Projekt',
    badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Icon:     Layers,
  }
}

export default function FreigabeLinkKarte({ projektId, initialTokens, raeume, initialHatPin = false }: Props) {
  // Token-Liste
  const [tokens, setTokens]         = useState<TokenData[]>(initialTokens)
  const [kopiertId, setKopiertId]   = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // PIN-State (projekt-weit)
  const [hatPin, setHatPin]               = useState(initialHatPin)
  const [pinEditMode, setPinEditMode]     = useState(false)
  const [pinInput, setPinInput]           = useState('')
  const [gespeicherterPin, setGespeicherterPin] = useState<string | null>(null)
  const [pinSichtbar, setPinSichtbar]     = useState(false)
  const [pinKopiert, setPinKopiert]       = useState(false)
  const [pinFehler, setPinFehler]         = useState<string | null>(null)
  const [toast, setToast]                 = useState<string | null>(null)
  const [confirmDeaktivId, setConfirmDeaktivId]   = useState<string | null>(null)
  const [confirmErneuernId, setConfirmErneuernId] = useState<string | null>(null)
  const [confirmLoeschenId, setConfirmLoeschenId] = useState<string | null>(null)

  // Create-Form State (Scope-Picker)
  const [scopeTyp, setScopeTyp]                 = useState<FreigabeScopeTyp>('projekt')
  const [scopeRaumId, setScopeRaumId]           = useState<string>('')
  const [scopeItemIds, setScopeItemIds]         = useState<string[]>([])
  const [scopeBereichIds, setScopeBereichIds]   = useState<string[]>([])
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
    if (neuerTyp !== 'auswahl') setScopeBereichIds([])
  }

  function toggleItem(id: string) {
    setScopeItemIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }
  function toggleBereich(id: string) {
    setScopeBereichIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // ── Aktionen ──────────────────────────────────────────────────
  function handleGenerieren() {
    setErstellenFehler(null)
    let scopeIds: string[] = []
    let bereichIds: string[] = []
    if (scopeTyp === 'raum') {
      if (!scopeRaumId) { setScopeFehler('Bitte einen Raum auswählen.'); return }
      scopeIds = [scopeRaumId]
    } else if (scopeTyp === 'auswahl') {
      if (scopeItemIds.length === 0 && scopeBereichIds.length === 0) { setScopeFehler('Bitte mindestens ein Produkt oder eine Gruppe auswählen.'); return }
      scopeIds = scopeItemIds
      bereichIds = scopeBereichIds
    }
    setScopeFehler(null)

    startTransition(async () => {
      const result = await freigabeTokenErstellen(projektId, scopeTyp, scopeIds, bereichIds)
      if ('token' in result) {
        const neu: TokenData = {
          id:          '',
          token:       result.token,
          gueltig_bis: null,
          scope_typ:   scopeTyp,
          scope_ids:   scopeIds,
          scope_bereich_ids: bereichIds,
          created_at:  new Date().toISOString(),
        }
        setTokens((prev) => [neu, ...prev])
        setScopeTyp('projekt')
        setScopeRaumId('')
        setScopeItemIds([])
        setScopeBereichIds([])
        showToast('✓ Freigabelink erstellt')
      } else {
        setErstellenFehler(result.fehler)
      }
    })
  }

  async function handleKopieren(token: TokenData) {
    const url = `${window.location.origin}/freigabe/${token.token}`
    await navigator.clipboard.writeText(url)
    setKopiertId(token.token)
    setTimeout(() => setKopiertId(null), 2000)
  }

  function handleDeaktivieren(tokenId: string) {
    if (!tokenId) return
    startTransition(async () => {
      await tokenDeaktivieren(tokenId, projektId)
      setTokens((prev) => prev.filter((t) => t.id !== tokenId))
    })
    setConfirmDeaktivId(null)
  }

  function handleLoeschen(tokenId: string) {
    if (!tokenId) return
    startTransition(async () => {
      await freigabeTokenLoeschen(tokenId, projektId)
      setTokens((prev) => prev.filter((t) => t.id !== tokenId))
    })
    setConfirmLoeschenId(null)
  }

  function handleErneuern(tokenId: string) {
    if (!tokenId) return
    startTransition(async () => {
      const result = await tokenErneuern(projektId, tokenId)
      if ('token' in result) {
        setTokens((prev) => prev.map((t) =>
          t.id === tokenId
            ? { ...t, token: result.token, gueltig_bis: null }
            : t
        ))
        showToast('✓ Link erneuert')
      }
    })
    setConfirmErneuernId(null)
  }

  // ── PIN ──────────────────────────────────────────────────────
  function handlePinSpeichern() {
    const pin = pinInput.trim()
    if (!/^\d{4,6}$/.test(pin)) { setPinFehler('PIN muss 4–6 Ziffern enthalten.'); return }
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

  const hatProjektToken = tokens.some((t) => t.scope_typ === 'projekt' || t.scope_typ == null)

  return (
    <>
      <ConfirmModal
        isOpen={confirmDeaktivId !== null}
        onClose={() => setConfirmDeaktivId(null)}
        onConfirm={() => confirmDeaktivId && handleDeaktivieren(confirmDeaktivId)}
        title="Freigabe-Link deaktivieren"
        message="Der Link wird sofort ungültig. Kunden können diesen Freigabe-Link nicht mehr öffnen."
        confirmText="Deaktivieren"
        variant="warning"
        isLoading={isPending}
      />
      <ConfirmModal
        isOpen={confirmErneuernId !== null}
        onClose={() => setConfirmErneuernId(null)}
        onConfirm={() => confirmErneuernId && handleErneuern(confirmErneuernId)}
        title="Freigabe-Link erneuern"
        message="Der alte Link wird ungültig. Der neue Link muss dem Kunden neu geschickt werden."
        confirmText="Erneuern"
        variant="warning"
        isLoading={isPending}
      />
      <ConfirmModal
        isOpen={confirmLoeschenId !== null}
        onClose={() => setConfirmLoeschenId(null)}
        onConfirm={() => confirmLoeschenId && handleLoeschen(confirmLoeschenId)}
        title="Freigabe-Link endgültig löschen"
        message="Der Link wird vollständig entfernt (nicht nur deaktiviert) und verschwindet aus der Liste. Das kann nicht rückgängig gemacht werden."
        confirmText="Endgültig löschen"
        variant="danger"
        isLoading={isPending}
      />

      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm relative">
        {toast && (
          <div className="absolute top-3 right-3 px-3 py-1.5 bg-wellbeing-green text-white text-xs font-medium rounded-lg shadow-md animate-fadeIn z-10">
            {toast}
          </div>
        )}

        <h2 className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
          <Share2 className="w-3.5 h-3.5" />
          Kunden-Freigabelinks
          {tokens.length > 0 && (
            <span className="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-wellbeing-green/10 text-wellbeing-green">
              {tokens.length}
            </span>
          )}
        </h2>

        {tokens.length > 0 && (
          <ul className="space-y-2.5 mb-5">
            {tokens.map((t) => {
              const scope = scopeLabel(t, raeume)
              const ScopeIcon = scope.Icon
              const laufzeit = restlaufzeit(t.gueltig_bis)
              const url = typeof window !== 'undefined' ? `${window.location.origin}/freigabe/${t.token}` : ''
              return (
                <li key={t.token} className="border border-gray-200 rounded-lg p-3 bg-gray-50/40">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${scope.badgeCls}`}>
                      <ScopeIcon className="w-3 h-3" />
                      {scope.label}
                    </span>
                    {laufzeit && (
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${laufzeit.farbe}`}>
                        <Clock className="w-3 h-3" />
                        {laufzeit.text}
                      </span>
                    )}
                  </div>
                  {t.scope_typ === 'auswahl' && (t.scope_ids?.length ?? 0) === 0 && (t.scope_bereich_ids?.length ?? 0) === 0 && (
                    <div className="flex items-start gap-1.5 mb-2 text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-md px-2 py-1.5">
                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                      <span>Keine Produkte ausgewählt — dieser Link zeigt dem Kunden nichts. Bitte deaktivieren und einen neuen Link mit Auswahl erstellen.</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={url}
                      className="flex-1 px-2.5 py-1.5 text-[11px] text-gray-600 bg-white border border-gray-200 rounded-md font-mono truncate focus:outline-none"
                    />
                    <button
                      onClick={() => handleKopieren(t)}
                      className={`px-2.5 py-1.5 text-[11px] font-medium rounded-md border transition-colors whitespace-nowrap ${
                        kopiertId === t.token
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {kopiertId === t.token ? '✓ Kopiert' : 'Kopieren'}
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-gray-400 hover:text-wellbeing-green underline underline-offset-2 transition-colors"
                    >
                      Vorschau öffnen ↗
                    </a>
                    {t.id && (
                      <>
                        <button
                          onClick={() => setConfirmErneuernId(t.id)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 text-[11px] text-wellbeing-green hover:text-wellbeing-green-dark transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Erneuern
                        </button>
                        <button
                          onClick={() => setConfirmDeaktivId(t.id)}
                          disabled={isPending}
                          title="Link ungültig machen (bleibt im Archiv)"
                          className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-amber-600 transition-colors ml-auto"
                        >
                          <EyeOff className="w-3 h-3" />
                          Deaktivieren
                        </button>
                        <button
                          onClick={() => setConfirmLoeschenId(t.id)}
                          disabled={isPending}
                          title="Link endgültig löschen"
                          className="inline-flex items-center gap-1 text-[11px] text-red-400/70 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          Löschen
                        </button>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <div className={tokens.length > 0 ? 'pt-4 border-t border-gray-100' : ''}>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Plus className="w-3 h-3" />
            Neuen Link erstellen
          </p>

          <div className="mb-4">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Umfang</label>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { typ: 'projekt' as const, icon: Layers,     label: 'Projekt' },
                { typ: 'raum'    as const, icon: Home,       label: 'Raum' },
                { typ: 'auswahl' as const, icon: ListChecks, label: 'Auswahl' },
              ]).map(({ typ, icon: Icon, label }) => {
                const aktiv = scopeTyp === typ
                const disabled = typ === 'projekt' && hatProjektToken
                return (
                  <button
                    key={typ}
                    type="button"
                    onClick={() => !disabled && handleScopeWechsel(typ)}
                    disabled={disabled}
                    title={disabled ? 'Pro Projekt kann es nur einen Projekt-Link geben.' : undefined}
                    className={`flex flex-col items-center gap-1 px-2 py-2.5 text-[11px] font-medium rounded-lg border transition-colors ${
                      aktiv
                        ? 'bg-wellbeing-green text-white border-wellbeing-green'
                        : disabled
                        ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                )
              })}
            </div>
            {scopeTyp === 'projekt' && hatProjektToken && (
              <p className="mt-2 text-[11px] text-amber-600">
                Es gibt bereits einen Projekt-Link. Deaktiviere ihn zuerst oder wähle &bdquo;Raum&ldquo; / &bdquo;Auswahl&ldquo;.
              </p>
            )}
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
                    {/* Ganze Gruppen (Migration 116) — über den Einzelprodukten */}
                    {r.bereiche.map((b) => (
                      <label key={b.id} className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer bg-wellbeing-cream/20 hover:bg-wellbeing-green/5">
                        <input
                          type="checkbox"
                          checked={scopeBereichIds.includes(b.id)}
                          onChange={() => toggleBereich(b.id)}
                          className="rounded border-gray-300 text-wellbeing-green focus:ring-wellbeing-green/30"
                        />
                        <Layers className="w-3 h-3 text-wellbeing-green shrink-0" />
                        <span className="flex-1 font-medium text-wellbeing-green-dark">Ganze Gruppe: {b.name}</span>
                      </label>
                    ))}
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
                  {scopeItemIds.length} Produkt{scopeItemIds.length === 1 ? '' : 'e'}
                  {scopeBereichIds.length > 0 && ` · ${scopeBereichIds.length} Gruppe${scopeBereichIds.length === 1 ? '' : 'n'}`} ausgewählt
                </div>
              )}
            </div>
          )}

          {scopeFehler && <p className="text-xs text-red-500 mb-3">{scopeFehler}</p>}
          {erstellenFehler && <p className="text-xs text-red-500 mb-3">{erstellenFehler}</p>}

          <button
            onClick={handleGenerieren}
            disabled={isPending || (scopeTyp === 'projekt' && hatProjektToken)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {isPending ? 'Wird erstellt…' : 'Freigabelink erstellen'}
          </button>
        </div>

        {/* PIN-Schutz (projekt-weit) */}
        <div className="border-t border-gray-100 pt-4 mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
              {hatPin
                ? <Lock className="w-3.5 h-3.5 text-wellbeing-green" />
                : <LockOpen className="w-3.5 h-3.5 text-gray-400" />
              }
              PIN-Schutz <span className="text-gray-400 font-normal">(gilt für alle Links)</span>
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
                  className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 rounded-lg transition-colors disabled:opacity-50"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
