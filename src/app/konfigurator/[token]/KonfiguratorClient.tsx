'use client'

import { useState, useTransition, useCallback } from 'react'
import Image from 'next/image'
import { Check, X, RefreshCw, HelpCircle, ChevronLeft, ChevronRight, MessageSquare, Send } from 'lucide-react'
import { produktAuswahlSpeichern, konfiguratorAbschliessen } from '@/app/actions/konfigurator'
import type { KonfiguratorDaten, KonfiguratorProdukt, AuswahlStatus } from '@/app/actions/konfigurator'
import type { Branding } from '@/lib/supabase/types'

const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)

// Importiere den Typ direkt aus den Actions
export type { KonfiguratorDaten }

// ── Status-Config ─────────────────────────────────────────────
const AKTIONEN = [
  { status: 'ausgewaehlt'           as AuswahlStatus, icon: Check,      label: 'Auswählen',  farbe: 'bg-emerald-500 text-white border-emerald-500', aktivFarbe: 'ring-emerald-300' },
  { status: 'abgelehnt'             as AuswahlStatus, icon: X,          label: 'Ablehnen',   farbe: 'bg-red-500 text-white border-red-500',         aktivFarbe: 'ring-red-300' },
  { status: 'alternative_gewuenscht'as AuswahlStatus, icon: RefreshCw,  label: 'Alternative',farbe: 'bg-amber-500 text-white border-amber-500',     aktivFarbe: 'ring-amber-300' },
  { status: 'unentschieden'         as AuswahlStatus, icon: HelpCircle, label: 'Offen',      farbe: 'bg-gray-200 text-gray-600 border-gray-200',    aktivFarbe: 'ring-gray-300' },
]

const KARTEN_BG: Record<AuswahlStatus, string> = {
  ausgewaehlt:            'border-emerald-300 bg-emerald-50/30',
  abgelehnt:              'border-red-300 bg-red-50/30',
  alternative_gewuenscht: 'border-amber-300 bg-amber-50/30',
  unentschieden:          'border-gray-200 bg-white',
}

// ── Produktkarte ──────────────────────────────────────────────
function ProduktKarte({
  produkt,
  status,
  kommentar,
  showPrices,
  allowAlternatives,
  onStatusChange,
  onKommentarChange,
}: {
  produkt: KonfiguratorProdukt
  status: AuswahlStatus
  kommentar: string
  showPrices: boolean
  allowAlternatives: boolean
  onStatusChange: (s: AuswahlStatus) => void
  onKommentarChange: (k: string) => void
}) {
  const [bildOffen, setBildOffen]       = useState(false)
  const [kommentarOffen, setKommentarOffen] = useState(false)

  const sichtbareAktionen = allowAlternatives
    ? AKTIONEN
    : AKTIONEN.filter((a) => a.status !== 'alternative_gewuenscht')

  return (
    <div className={`rounded-2xl border-2 transition-all duration-300 overflow-hidden ${KARTEN_BG[status]}`}>
      {/* Bild */}
      {produkt.bild_url && (
        <div
          className="relative w-full aspect-[4/3] bg-gray-100 cursor-pointer overflow-hidden"
          onClick={() => setBildOffen(true)}
        >
          <Image
            src={produkt.bild_url}
            alt={produkt.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 50vw"
          />
          {status === 'ausgewaehlt' && (
            <div className="absolute inset-0 bg-emerald-500/10 flex items-end p-3">
              <span className="bg-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <Check className="w-3 h-3" /> Ausgewählt
              </span>
            </div>
          )}
          {status === 'abgelehnt' && (
            <div className="absolute inset-0 bg-red-500/10 flex items-end p-3">
              <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <X className="w-3 h-3" /> Abgelehnt
              </span>
            </div>
          )}
        </div>
      )}

      {/* Vollbild-Modal */}
      {bildOffen && produkt.bild_url && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setBildOffen(false)}
        >
          <div className="relative w-full max-w-2xl aspect-[4/3]">
            <Image src={produkt.bild_url} alt={produkt.name} fill className="object-contain" />
          </div>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-sm font-semibold text-gray-900 leading-snug">{produkt.name}</h3>
          {showPrices && produkt.verkaufspreis != null && (
            <span className="shrink-0 text-sm font-bold text-gray-900 font-mono">
              {eur(produkt.verkaufspreis * produkt.menge)}
            </span>
          )}
        </div>
        {produkt.beschreibung && (
          <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">{produkt.beschreibung}</p>
        )}
        <p className="text-xs text-gray-400 mb-4">
          {produkt.menge} {produkt.einheit}
          {produkt.kategorie && ` · ${produkt.kategorie}`}
        </p>

        {/* Aktions-Buttons */}
        <div className="grid grid-cols-2 gap-2 mb-3 sm:grid-cols-4">
          {sichtbareAktionen.map((aktion) => {
            const Icon = aktion.icon
            const istAktiv = status === aktion.status
            return (
              <button
                key={aktion.status}
                onClick={() => onStatusChange(aktion.status)}
                className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-xs font-medium transition-all duration-200 ${
                  istAktiv
                    ? `${aktion.farbe} ring-2 ring-offset-1 ${aktion.aktivFarbe} scale-[1.03]`
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {aktion.label}
              </button>
            )
          })}
        </div>

        {/* Kommentar */}
        <button
          onClick={() => setKommentarOffen((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {kommentar ? 'Kommentar bearbeiten' : 'Kommentar hinzufügen'}
        </button>

        {kommentarOffen && (
          <textarea
            rows={2}
            value={kommentar}
            onChange={(e) => onKommentarChange(e.target.value)}
            placeholder="Ihr Kommentar zu diesem Produkt…"
            className="mt-2 w-full px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition resize-none"
          />
        )}
      </div>
    </div>
  )
}

// ── Abschluss-Modal ───────────────────────────────────────────
function AbschlussModal({
  zusammenfassung,
  showPrices,
  onAbschliessen,
  onClose,
}: {
  zusammenfassung: {
    ausgewaehlt: number; abgelehnt: number; alternative: number; offen: number; summe: number
  }
  showPrices: boolean
  onAbschliessen: (notizen: string) => void
  onClose: () => void
}) {
  const [notizen,   setNotizen]   = useState('')
  const [isPending, startTransition] = useTransition()

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-5 text-center">Auswahl abschließen</h2>

        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { label: 'Ausgewählt',    value: zusammenfassung.ausgewaehlt, farbe: 'text-emerald-600' },
            { label: 'Abgelehnt',     value: zusammenfassung.abgelehnt,   farbe: 'text-red-500' },
            { label: 'Alternative',   value: zusammenfassung.alternative,  farbe: 'text-amber-600' },
            { label: 'Noch offen',    value: zusammenfassung.offen,        farbe: 'text-gray-400' },
          ].map((s) => (
            <div key={s.label} className="bg-gray-50 rounded-xl px-4 py-3 text-center">
              <p className={`text-2xl font-bold ${s.farbe}`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {showPrices && zusammenfassung.summe > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-5 text-center">
            <p className="text-xs text-emerald-600 mb-0.5">Ausgewählte Produkte</p>
            <p className="text-2xl font-bold text-emerald-700 font-mono">{eur(zusammenfassung.summe)}</p>
          </div>
        )}

        <div className="mb-5">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Abschließende Notizen <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            rows={3}
            value={notizen}
            onChange={(e) => setNotizen(e.target.value)}
            placeholder="Haben Sie noch Anmerkungen oder Wünsche für uns?"
            className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition resize-none"
          />
        </div>

        {zusammenfassung.offen > 0 && (
          <div className="flex items-center gap-2 mb-4 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            <HelpCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700">
              {zusammenfassung.offen} Produkt{zusammenfassung.offen !== 1 ? 'e' : ''} noch offen — trotzdem abschließen?
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-sm font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 rounded-xl transition">Zurück</button>
          <button
            onClick={() => startTransition(() => onAbschliessen(notizen))}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 rounded-xl transition"
          >
            <Send className="w-4 h-4" />
            {isPending ? 'Wird gesendet…' : 'Abschließen'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Haupt-Komponente ──────────────────────────────────────────
export default function KonfiguratorClient({
  token,
  daten,
  branding,
}: {
  token: string
  daten: KonfiguratorDaten
  branding: Branding | null
}) {
  const { session, projektName, raeume } = daten
  const prim       = branding?.primary_color ?? '#445c49'
  const firmenname = branding?.firmenname    ?? 'Wellbeing Spaces'

  // State: status + kommentar pro Produkt
  const [auswahlState, setAuswahlState] = useState<Record<string, AuswahlStatus>>(() => {
    const init: Record<string, AuswahlStatus> = {}
    for (const raum of raeume) {
      for (const p of raum.produkte) {
        init[p.id] = (daten.auswahl[p.id]?.status ?? 'unentschieden') as AuswahlStatus
      }
    }
    return init
  })

  const [kommentarState, setKommentarState] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const raum of raeume) {
      for (const p of raum.produkte) {
        init[p.id] = daten.auswahl[p.id]?.kunde_kommentar ?? ''
      }
    }
    return init
  })

  const [aktiverRaumIdx,   setAktiverRaumIdx]   = useState(0)
  const [abschlussOffen,   setAbschlussOffen]   = useState(false)
  const [abgeschlossen,    setAbgeschlossen]     = useState(false)
  const [,                 startTransition]      = useTransition()

  const alleProdukte = raeume.flatMap((r) => r.produkte)
  const gesamt       = alleProdukte.length

  const counts = {
    ausgewaehlt:            Object.values(auswahlState).filter((s) => s === 'ausgewaehlt').length,
    abgelehnt:              Object.values(auswahlState).filter((s) => s === 'abgelehnt').length,
    alternative:            Object.values(auswahlState).filter((s) => s === 'alternative_gewuenscht').length,
    offen:                  Object.values(auswahlState).filter((s) => s === 'unentschieden').length,
  }
  const bewertet = gesamt - counts.offen

  const summAusgewaehlt = alleProdukte
    .filter((p) => auswahlState[p.id] === 'ausgewaehlt')
    .reduce((sum, p) => sum + (p.verkaufspreis ?? 0) * p.menge, 0)

  const budgetUeberschritten = session.budget_limit != null && summAusgewaehlt > session.budget_limit

  const handleStatusChange = useCallback((produktId: string, status: AuswahlStatus) => {
    setAuswahlState((prev) => ({ ...prev, [produktId]: status }))
    startTransition(async () => {
      await produktAuswahlSpeichern(token, produktId, status, kommentarState[produktId] ?? '')
    })
  }, [token, kommentarState])

  const handleKommentarChange = useCallback((produktId: string, kommentar: string) => {
    setKommentarState((prev) => ({ ...prev, [produktId]: kommentar }))
    // Debounce via blur – speichern wenn Fokus verlassen
  }, [])

  async function handleAbschliessen(notizen: string) {
    await konfiguratorAbschliessen(token, notizen)
    setAbschlussOffen(false)
    setAbgeschlossen(true)
  }

  if (abgeschlossen) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Auswahl übermittelt!</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Vielen Dank für Ihre Auswahl. Wir werden Ihre Entscheidungen in die Planung übernehmen.
          </p>
          {(branding?.show_powered_by ?? true) && (
            <p className="text-[10px] text-gray-300 mt-8">Powered by Wellbeing Spaces</p>
          )}
        </div>
      </div>
    )
  }

  const aktiverRaum = raeume[aktiverRaumIdx]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {abschlussOffen && (
        <AbschlussModal
          zusammenfassung={{ ...counts, summe: summAusgewaehlt }}
          showPrices={session.show_prices}
          onAbschliessen={handleAbschliessen}
          onClose={() => setAbschlussOffen(false)}
        />
      )}

      {/* ── Sticky Header ─────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            {/* Logo + Projekt */}
            <div className="flex items-center gap-2.5 min-w-0">
              {branding?.logo_url ? (
                <Image src={branding.logo_url} alt={firmenname} width={22} height={22} className="rounded object-contain shrink-0" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 18 18" fill="none" className="shrink-0">
                  <rect x="0" y="0" width="10" height="10" rx="2" fill={prim} opacity="0.30" />
                  <rect x="4" y="4" width="10" height="10" rx="2" fill={prim} opacity="0.55" />
                  <rect x="8" y="8" width="10" height="10" rx="2" fill={prim} />
                </svg>
              )}
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 leading-none">Produkt-Konfigurator</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{projektName}</p>
              </div>
            </div>

            {/* Budget + Fortschritt */}
            <div className="flex items-center gap-3 shrink-0 ml-2">
              {session.show_prices && (
                <div className="text-right hidden sm:block">
                  <p className={`text-sm font-bold font-mono ${budgetUeberschritten ? 'text-red-500' : 'text-gray-900'}`}>
                    {eur(summAusgewaehlt)}
                  </p>
                  {session.budget_limit && (
                    <p className="text-[10px] text-gray-400">von {eur(session.budget_limit)}</p>
                  )}
                </div>
              )}
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">{bewertet}<span className="text-gray-400 font-normal">/{gesamt}</span></p>
                <p className="text-[10px] text-gray-400">bewertet</p>
              </div>
            </div>
          </div>

          {/* Fortschrittsbalken */}
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden -mx-0 mb-0">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${gesamt > 0 ? Math.round((bewertet / gesamt) * 100) : 0}%`, backgroundColor: prim }}
            />
          </div>
        </div>
      </header>

      {/* ── Budget-Warnung ─────────────────────────────────────── */}
      {budgetUeberschritten && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 text-center">
          <p className="text-xs text-red-600 font-medium">
            Budget überschritten! Ausgewählt: {eur(summAusgewaehlt)} / Limit: {eur(session.budget_limit!)}
          </p>
        </div>
      )}

      <div className="max-w-2xl mx-auto w-full px-4 py-4 flex-1 flex flex-col">

        {/* ── Raum-Tabs ──────────────────────────────────────────── */}
        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1 scrollbar-hide">
          {raeume.map((raum, idx) => {
            const raumGesamt      = raum.produkte.length
            const raumBewertet    = raum.produkte.filter((p) => auswahlState[p.id] !== 'unentschieden').length
            const istAktiv        = idx === aktiverRaumIdx
            return (
              <button
                key={raum.id}
                onClick={() => setAktiverRaumIdx(idx)}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-xl transition-all ${
                  istAktiv
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
                }`}
              >
                {raum.name}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  raumBewertet === raumGesamt
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {raumBewertet}/{raumGesamt}
                </span>
              </button>
            )
          })}
        </div>

        {/* ── Raum-Navigation (Mobile) ─────────────────────────── */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setAktiverRaumIdx((i) => Math.max(0, i - 1))}
            disabled={aktiverRaumIdx === 0}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 disabled:opacity-30 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-semibold text-gray-900">{aktiverRaum.name}</h2>
          <button
            onClick={() => setAktiverRaumIdx((i) => Math.min(raeume.length - 1, i + 1))}
            disabled={aktiverRaumIdx === raeume.length - 1}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 disabled:opacity-30 transition"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* ── Produktkarten ─────────────────────────────────────── */}
        <div className="space-y-4 flex-1">
          {aktiverRaum.produkte.map((produkt) => (
            <ProduktKarte
              key={produkt.id}
              produkt={produkt}
              status={auswahlState[produkt.id] ?? 'unentschieden'}
              kommentar={kommentarState[produkt.id] ?? ''}
              showPrices={session.show_prices}
              allowAlternatives={session.allow_alternatives}
              onStatusChange={(s) => handleStatusChange(produkt.id, s)}
              onKommentarChange={(k) => handleKommentarChange(produkt.id, k)}
            />
          ))}
        </div>

        {/* ── Nächster Raum / Abschließen ──────────────────────── */}
        <div className="sticky bottom-0 pt-4 pb-2 bg-gray-50">
          {aktiverRaumIdx < raeume.length - 1 ? (
            <button
              onClick={() => setAktiverRaumIdx((i) => i + 1)}
              className="w-full py-4 text-sm font-semibold text-white rounded-2xl transition-all shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
              style={{ backgroundColor: prim }}
            >
              Weiter: {raeume[aktiverRaumIdx + 1].name} →
            </button>
          ) : (
            <button
              onClick={() => setAbschlussOffen(true)}
              className="w-full py-4 text-sm font-semibold text-white rounded-2xl transition-all shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
              style={{ backgroundColor: prim }}
            >
              Auswahl abschließen ({bewertet}/{gesamt} bewertet)
            </button>
          )}

          {/* Mobile Budget */}
          {session.show_prices && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className={`text-xs font-semibold ${budgetUeberschritten ? 'text-red-500' : 'text-gray-500'}`}>
                Ausgewählt: {eur(summAusgewaehlt)}
              </span>
              {session.budget_limit && (
                <span className="text-xs text-gray-400">/ {eur(session.budget_limit)} Budget</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
