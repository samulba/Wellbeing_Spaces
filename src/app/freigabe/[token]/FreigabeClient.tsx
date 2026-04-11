'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { Check, X, RefreshCw, ExternalLink, ChevronDown } from 'lucide-react'
import { freigabeStatusAendern } from '@/app/actions/freigabe'
import type { FreigabeRaum, FreigabeProdukt, ProduktStatus } from '@/lib/supabase/types'

// ── Konstanten ────────────────────────────────────────────────
const MWST = 0.19
const r2  = (n: number) => Math.round(n * 100) / 100
const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)

// ── Typen ─────────────────────────────────────────────────────
interface ProduktState {
  status: ProduktStatus
  kommentar: string
  aktiveAktion: 'ablehnen' | 'alternative' | null
  kommentarEingabe: string
}

interface Props {
  token: string
  projektName: string
  kundeName: string | null
  raeume: FreigabeRaum[]
}

// ── DepthStack-Logo ────────────────────────────────────────────
function Logo() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="10" height="10" rx="2" fill="#6366F1" opacity="0.30" />
      <rect x="4" y="4" width="10" height="10" rx="2" fill="#6366F1" opacity="0.55" />
      <rect x="8" y="8" width="10" height="10" rx="2" fill="#6366F1" />
    </svg>
  )
}

// ── Hauptkomponente ───────────────────────────────────────────
export default function FreigabeClient({ token, projektName, kundeName, raeume }: Props) {
  const [state, setState] = useState<Record<string, ProduktState>>(() => {
    const init: Record<string, ProduktState> = {}
    for (const raum of raeume) {
      for (const p of raum.produkte) {
        init[p.id] = {
          status: p.status,
          kommentar: p.kommentar ?? '',
          aktiveAktion: null,
          kommentarEingabe: p.kommentar ?? '',
        }
      }
    }
    return init
  })

  const [isPending, startTransition] = useTransition()

  const alleProdukteFlach = raeume.flatMap((r) => r.produkte)
  const total             = alleProdukteFlach.length
  const freigegebenCount  = Object.values(state).filter((s) => s.status === 'freigegeben').length
  const fortschritt       = total > 0 ? Math.round((freigegebenCount / total) * 100) : 0
  const alleDone          = freigegebenCount === total && total > 0

  function speichereStatus(produktId: string, status: ProduktStatus, kommentar = '') {
    startTransition(async () => {
      const result = await freigabeStatusAendern(token, produktId, status, kommentar)
      if ('erfolg' in result) {
        setState((prev) => ({
          ...prev,
          [produktId]: { ...prev[produktId], status, kommentar, aktiveAktion: null, kommentarEingabe: kommentar },
        }))
      }
    })
  }

  function setAktion(produktId: string, aktion: 'ablehnen' | 'alternative' | null) {
    setState((prev) => ({
      ...prev,
      [produktId]: { ...prev[produktId], aktiveAktion: aktion },
    }))
  }

  function setKommentarEingabe(produktId: string, text: string) {
    setState((prev) => ({
      ...prev,
      [produktId]: { ...prev[produktId], kommentarEingabe: text },
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Sticky Header ─────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-3.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <Logo />
              <div className="min-w-0">
                <p className="text-[11px] text-gray-400 leading-none mb-0.5">Produktfreigabe</p>
                <h1 className="text-sm font-semibold text-gray-900 truncate leading-none">
                  {projektName}
                </h1>
              </div>
            </div>
            {/* Fortschritt-Badge */}
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <div className="text-right">
                <p className="text-[11px] text-gray-400 leading-none mb-0.5">Freigaben</p>
                <p className="text-sm font-bold text-gray-900 leading-none">
                  {freigegebenCount}<span className="text-gray-400 font-normal">/{total}</span>
                </p>
              </div>
              {/* Mini-Donut */}
              <svg width="32" height="32" viewBox="0 0 32 32" className="shrink-0">
                <circle cx="16" cy="16" r="12" fill="none" stroke="#F3F4F6" strokeWidth="4" />
                <circle
                  cx="16" cy="16" r="12" fill="none"
                  stroke={alleDone ? '#10B981' : '#6366F1'} strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 12}`}
                  strokeDashoffset={`${2 * Math.PI * 12 * (1 - fortschritt / 100)}`}
                  strokeLinecap="round"
                  style={{ transform: 'rotate(-90deg)', transformOrigin: '16px 16px', transition: 'stroke-dashoffset 0.6s ease' }}
                />
              </svg>
            </div>
          </div>

          {/* Fortschrittsbalken */}
          <div className="h-0.5 bg-gray-100 rounded-full overflow-hidden mb-0">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${fortschritt}%`, backgroundColor: alleDone ? '#10B981' : '#6366F1' }}
            />
          </div>
        </div>
      </header>

      {/* ── Inhalt ────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">

        {/* Intro-Box */}
        {!alleDone ? (
          <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 mb-6 shadow-sm">
            <p className="text-sm text-gray-700 leading-relaxed">
              Bitte prüfen Sie die folgenden Produkte und geben Sie diese frei oder lehnen Sie sie ab.
              {kundeName && <span className="text-gray-500"> · {kundeName}</span>}
            </p>
            <p className="text-xs text-gray-400 mt-1.5">
              {total - freigegebenCount} von {total} Produkt{total - freigegebenCount !== 1 ? 'en' : ''} noch ausstehend
            </p>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-5 mb-6 text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-emerald-800">Alle Produkte wurden freigegeben!</p>
            <p className="text-xs text-emerald-600 mt-1">Vielen Dank für Ihre Rückmeldung.</p>
          </div>
        )}

        {/* ── Räume + Produkte ───────────────────────────────── */}
        {raeume.map((raum) => {
          const aktiveProdukte = raum.produkte.filter((p) => state[p.id])
          if (aktiveProdukte.length === 0) return null
          return (
            <div key={raum.id} className="mb-8">
              <div className="flex items-center gap-3 mb-3 px-1">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{raum.name}</span>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">{aktiveProdukte.length} Produkt{aktiveProdukte.length !== 1 ? 'e' : ''}</span>
              </div>
              <div className="space-y-4">
                {aktiveProdukte.map((p) => (
                  <ProduktKarte
                    key={p.id}
                    produkt={p}
                    produktState={state[p.id]}
                    isPending={isPending}
                    onFreigeben={() => speichereStatus(p.id, 'freigegeben')}
                    onAktionWaehlen={(a) => setAktion(p.id, a)}
                    onKommentarChange={(t) => setKommentarEingabe(p.id, t)}
                    onSpeichern={(s) => speichereStatus(p.id, s, state[p.id].kommentarEingabe)}
                    onAbbrechen={() => setAktion(p.id, null)}
                  />
                ))}
              </div>
            </div>
          )
        })}

        {/* ── Footer ────────────────────────────────────────── */}
        <div className="text-center pt-8 pb-6 border-t border-gray-200 mt-4 space-y-2.5">
          <p className="text-xs text-gray-400">Alle Angaben sind unverbindlich.</p>
          <div className="flex items-center justify-center gap-4">
            <a href="/impressum"
              className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors">
              Impressum
            </a>
            <span className="text-gray-300">·</span>
            <a href="/datenschutz"
              className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors">
              Datenschutz
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Produktkarte ──────────────────────────────────────────────
interface ProduktKarteProps {
  produkt: FreigabeProdukt
  produktState: ProduktState
  isPending: boolean
  onFreigeben: () => void
  onAktionWaehlen: (a: 'ablehnen' | 'alternative') => void
  onKommentarChange: (t: string) => void
  onSpeichern: (s: ProduktStatus) => void
  onAbbrechen: () => void
}

function ProduktKarte({
  produkt, produktState, isPending,
  onFreigeben, onAktionWaehlen, onKommentarChange, onSpeichern, onAbbrechen,
}: ProduktKarteProps) {
  const { status, aktiveAktion, kommentarEingabe, kommentar } = produktState
  const [detailOffen, setDetailOffen] = useState(false)

  const vpBrutto      = r2((produkt.verkaufspreis ?? 0) * (1 + MWST))
  const gesamtBrutto  = r2(vpBrutto * produkt.menge)

  const statusCfg = {
    ausstehend:     { rand: 'border-gray-200',    bg: 'bg-white',         badgeCls: 'bg-gray-100 text-gray-500',        label: 'Ausstehend' },
    freigegeben:    { rand: 'border-emerald-200', bg: 'bg-emerald-50/40', badgeCls: 'bg-emerald-100 text-emerald-700',  label: 'Freigegeben' },
    abgelehnt:      { rand: 'border-red-200',     bg: 'bg-red-50/40',     badgeCls: 'bg-red-100 text-red-600',          label: 'Abgelehnt' },
    ueberarbeitung: { rand: 'border-amber-200',   bg: 'bg-amber-50/40',   badgeCls: 'bg-amber-100 text-amber-700',      label: 'Überarbeitung' },
  }
  const cfg = statusCfg[status] ?? statusCfg.ausstehend

  return (
    <div className={`border ${cfg.rand} ${cfg.bg} rounded-2xl overflow-hidden shadow-sm transition-all`}>

      {/* ── Produktbild (groß, oben) ──────────────────────── */}
      {produkt.bild_url && (
        <div className="w-full aspect-[16/9] sm:aspect-[2/1] overflow-hidden bg-gray-100">
          <Image
            src={produkt.bild_url}
            alt={produkt.name}
            width={800}
            height={400}
            className="w-full h-full object-cover"
            unoptimized
          />
        </div>
      )}

      <div className="p-5">
        {/* ── Kopf: Name + Status ───────────────────────── */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-gray-900 leading-snug">{produkt.name}</h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
              {produkt.kategorie && (
                <span className="text-xs text-gray-500">{produkt.kategorie}</span>
              )}
              <span className="text-xs text-gray-500">{produkt.menge} {produkt.einheit}</span>
              {produkt.produkt_url && (
                <a href={produkt.produkt_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 transition-colors">
                  <ExternalLink className="w-3 h-3" />
                  Produktlink
                </a>
              )}
            </div>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${cfg.badgeCls}`}>
            {cfg.label}
          </span>
        </div>

        {/* ── Beschreibung (einklappbar) ────────────────── */}
        {produkt.beschreibung && (
          <button
            type="button"
            onClick={() => setDetailOffen((v) => !v)}
            className="w-full text-left mb-3"
          >
            <div className={`text-sm text-gray-600 leading-relaxed overflow-hidden transition-all ${detailOffen ? '' : 'line-clamp-2'}`}>
              {produkt.beschreibung}
            </div>
            {produkt.beschreibung.length > 120 && (
              <span className="text-xs text-indigo-500 flex items-center gap-0.5 mt-0.5">
                {detailOffen ? 'Weniger' : 'Mehr'}
                <ChevronDown className={`w-3 h-3 transition-transform ${detailOffen ? 'rotate-180' : ''}`} />
              </span>
            )}
          </button>
        )}

        {/* ── Preise ────────────────────────────────────── */}
        {produkt.verkaufspreis != null ? (
          <div className="grid grid-cols-3 gap-2 mb-4 bg-gray-50 rounded-xl px-4 py-3">
            <PreisZeile label="Netto" wert={eur(produkt.verkaufspreis)} />
            <PreisZeile label="Brutto" wert={eur(vpBrutto)} />
            <PreisZeile label={produkt.menge > 1 ? `${produkt.menge}× Gesamt` : 'Gesamt'} wert={eur(gesamtBrutto)} hervorheben />
          </div>
        ) : (
          <p className="text-sm text-gray-400 mb-4">Preis auf Anfrage</p>
        )}

        {/* ── Kommentar anzeigen ────────────────────────── */}
        {kommentar && !aktiveAktion && (
          <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl">
            <p className="text-xs font-semibold text-amber-700 mb-0.5">Ihr Kommentar</p>
            <p className="text-sm text-amber-900 leading-relaxed">{kommentar}</p>
          </div>
        )}

        {/* ── Aktions-Buttons ───────────────────────────── */}
        {!aktiveAktion && (
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={onFreigeben}
              disabled={isPending}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
                status === 'freigegeben'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <Check className="w-4 h-4" />
              Freigeben
            </button>
            <button
              onClick={() => onAktionWaehlen('ablehnen')}
              disabled={isPending}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
                status === 'abgelehnt'
                  ? 'bg-red-600 text-white shadow-sm shadow-red-200'
                  : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
              }`}
            >
              <X className="w-4 h-4" />
              Ablehnen
            </button>
            <button
              onClick={() => onAktionWaehlen('alternative')}
              disabled={isPending}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
                status === 'ueberarbeitung'
                  ? 'bg-amber-500 text-white shadow-sm shadow-amber-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              Alternative
            </button>
          </div>
        )}

        {/* ── Kommentarfeld ─────────────────────────────── */}
        {aktiveAktion && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                {aktiveAktion === 'ablehnen' ? 'Grund für Ablehnung (optional)' : 'Was wünschen Sie stattdessen?'}
              </label>
              <textarea
                autoFocus
                rows={3}
                value={kommentarEingabe}
                onChange={(e) => onKommentarChange(e.target.value)}
                placeholder={
                  aktiveAktion === 'ablehnen'
                    ? 'z. B. Farbe passt nicht, anderes Modell gewünscht…'
                    : 'z. B. Bitte Alternative in Weiß…'
                }
                className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition resize-none"
              />
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={() => onSpeichern(aktiveAktion === 'ablehnen' ? 'abgelehnt' : 'ueberarbeitung')}
                disabled={isPending}
                className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all active:scale-[0.98]"
              >
                {isPending ? 'Wird gespeichert…' : 'Bestätigen'}
              </button>
              <button
                onClick={onAbbrechen}
                disabled={isPending}
                className="px-5 py-3.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl bg-white transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PreisZeile({ label, wert, hervorheben }: { label: string; wert: string; hervorheben?: boolean }) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-sm font-mono font-semibold ${hervorheben ? 'text-indigo-600' : 'text-gray-700'}`}>
        {wert}
      </p>
    </div>
  )
}
