'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { freigabeStatusAendern } from '@/app/actions/freigabe'
import type { FreigabeRaum, FreigabeProdukt, ProduktStatus } from '@/lib/supabase/types'

// ── Konstanten ────────────────────────────────────────────────
const MWST = 0.19
const r2 = (n: number) => Math.round(n * 100) / 100
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
  const total = alleProdukteFlach.length
  const freigegebenCount = Object.values(state).filter((s) => s.status === 'freigegeben').length
  const fortschritt = total > 0 ? Math.round((freigegebenCount / total) * 100) : 0

  function speichereStatus(
    produktId: string,
    status: ProduktStatus,
    kommentar = ''
  ) {
    startTransition(async () => {
      const result = await freigabeStatusAendern(token, produktId, status, kommentar)
      if ('erfolg' in result) {
        setState((prev) => ({
          ...prev,
          [produktId]: {
            ...prev[produktId],
            status,
            kommentar,
            aktiveAktion: null,
            kommentarEingabe: kommentar,
          },
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
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-widest mb-0.5">WBC Studio</p>
            <h1 className="text-base font-semibold text-stone-800">{projektName}</h1>
            {kundeName && <p className="text-xs text-stone-400">{kundeName}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs text-stone-400 mb-0.5">Freigaben</p>
            <p className="text-sm font-semibold text-stone-700">
              {freigegebenCount} / {total}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Fortschrittsbalken */}
        <div className="bg-white border border-stone-100 rounded-xl p-5 mb-8">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-stone-700">Gesamtfortschritt</p>
            <p className="text-sm font-semibold text-stone-600">{fortschritt} %</p>
          </div>
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-400 rounded-full transition-all duration-500"
              style={{ width: `${fortschritt}%` }}
            />
          </div>
          <p className="text-xs text-stone-400 mt-2">
            {freigegebenCount === total && total > 0
              ? '✓ Alle Produkte wurden freigegeben.'
              : `Noch ${total - freigegebenCount} Produkt${total - freigegebenCount !== 1 ? 'e' : ''} ausstehend`}
          </p>
        </div>

        {/* Räume + Produkte */}
        {raeume.map((raum) => {
          const aktiveProdukte = raum.produkte.filter((p) => state[p.id])
          if (aktiveProdukte.length === 0) return null
          return (
            <div key={raum.id} className="mb-10">
              <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3 px-1">
                {raum.name}
              </h2>
              <div className="space-y-3">
                {aktiveProdukte.map((p) => (
                  <ProduktKarte
                    key={p.id}
                    produkt={p}
                    produktState={state[p.id]}
                    isPending={isPending}
                    onFreigeben={() => speichereStatus(p.id, 'freigegeben')}
                    onAktionWaehlen={(a) => setAktion(p.id, a)}
                    onKommentarChange={(t) => setKommentarEingabe(p.id, t)}
                    onSpeichern={(status) =>
                      speichereStatus(p.id, status, state[p.id].kommentarEingabe)
                    }
                    onAbbrechen={() => setAktion(p.id, null)}
                  />
                ))}
              </div>
            </div>
          )
        })}

        {/* Fußzeile */}
        <div className="text-center pt-8 pb-4 border-t border-stone-100 mt-8">
          <p className="text-xs text-stone-400">
            Erstellt mit WBC Studio · Alle Angaben sind unverbindlich.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Produktkarte ──────────────────────────────────────────────
function ProduktKarte({
  produkt,
  produktState,
  isPending,
  onFreigeben,
  onAktionWaehlen,
  onKommentarChange,
  onSpeichern,
  onAbbrechen,
}: {
  produkt: FreigabeProdukt
  produktState: ProduktState
  isPending: boolean
  onFreigeben: () => void
  onAktionWaehlen: (a: 'ablehnen' | 'alternative') => void
  onKommentarChange: (t: string) => void
  onSpeichern: (s: ProduktStatus) => void
  onAbbrechen: () => void
}) {
  const { status, aktiveAktion, kommentarEingabe, kommentar } = produktState

  const vpBrutto = r2((produkt.verkaufspreis ?? 0) * (1 + MWST))
  const gesamtBrutto = r2(vpBrutto * produkt.menge)

  const statusConfig: Record<ProduktStatus, { rand: string; bg: string; label: string; icon: string }> = {
    ausstehend:     { rand: 'border-stone-200',  bg: 'bg-white',       label: 'Ausstehend',   icon: '○' },
    freigegeben:    { rand: 'border-green-200',  bg: 'bg-green-50/50', label: 'Freigegeben',  icon: '✓' },
    abgelehnt:      { rand: 'border-red-200',    bg: 'bg-red-50/30',   label: 'Abgelehnt',    icon: '✗' },
    ueberarbeitung: { rand: 'border-amber-200',  bg: 'bg-amber-50/30', label: 'Überarbeitung',icon: '↩' },
  }
  const cfg = statusConfig[status] ?? statusConfig.ausstehend

  return (
    <div className={`border ${cfg.rand} ${cfg.bg} rounded-xl overflow-hidden transition-all`}>
      <div className="p-5">
        {/* Produktkopf */}
        <div className="flex items-start gap-4">
          {/* Bild */}
          {produkt.bild_url && (
            <Image
              src={produkt.bild_url}
              alt={produkt.name}
              width={64}
              height={64}
              className="object-cover rounded-lg border border-stone-100 shrink-0"
              unoptimized
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-stone-800 leading-snug">
                  {produkt.name}
                </h3>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {produkt.kategorie && (
                    <span className="text-xs text-stone-400">{produkt.kategorie}</span>
                  )}
                  <span className="text-xs text-stone-400">
                    {produkt.menge} {produkt.einheit}
                  </span>
                  {produkt.produkt_url && (
                    <a href={produkt.produkt_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-stone-400 hover:text-stone-600 underline underline-offset-2">
                      Produktlink ↗
                    </a>
                  )}
                </div>
              </div>
              {/* Status-Badge */}
              <span className={`text-xs font-medium shrink-0 flex items-center gap-1 ${
                status === 'freigegeben' ? 'text-green-600' :
                status === 'abgelehnt' ? 'text-red-500' :
                status === 'ueberarbeitung' ? 'text-amber-600' : 'text-stone-400'
              }`}>
                <span>{cfg.icon}</span>
                <span>{cfg.label}</span>
              </span>
            </div>

            {/* Beschreibung */}
            {produkt.beschreibung && (
              <p className="text-xs text-stone-500 mt-2 leading-relaxed">{produkt.beschreibung}</p>
            )}
          </div>
        </div>

        {/* Preise */}
        {produkt.verkaufspreis != null ? (
          <div className="flex items-end justify-between mt-4 pt-4 border-t border-stone-100/80">
            <div className="flex items-center gap-5">
              <PreisZeile label="Preis netto" wert={eur(produkt.verkaufspreis)} />
              <PreisZeile label="Preis brutto" wert={eur(vpBrutto)} />
              {produkt.menge > 1 && (
                <PreisZeile label={`Gesamt (${produkt.menge}×)`} wert={eur(gesamtBrutto)} hervorheben />
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-stone-400 mt-3 pt-3 border-t border-stone-100">
            Preis auf Anfrage
          </p>
        )}

        {/* Kundenkommentar anzeigen (falls vorhanden + keine aktive Eingabe) */}
        {kommentar && !aktiveAktion && (
          <div className="mt-3 pt-3 border-t border-stone-100">
            <p className="text-xs text-stone-500 bg-stone-50 rounded-lg px-3 py-2 leading-relaxed">
              <span className="font-medium text-stone-600">Ihr Kommentar: </span>
              {kommentar}
            </p>
          </div>
        )}

        {/* Aktions-Buttons */}
        {!aktiveAktion && (
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <button
              onClick={onFreigeben}
              disabled={isPending}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                status === 'freigegeben'
                  ? 'bg-green-500 text-white ring-2 ring-green-400 ring-offset-1'
                  : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
              }`}
            >
              <span>✓</span> Freigeben
            </button>
            <button
              onClick={() => onAktionWaehlen('ablehnen')}
              disabled={isPending}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                status === 'abgelehnt'
                  ? 'bg-red-500 text-white ring-2 ring-red-400 ring-offset-1'
                  : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
              }`}
            >
              <span>✗</span> Ablehnen
            </button>
            <button
              onClick={() => onAktionWaehlen('alternative')}
              disabled={isPending}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                status === 'ueberarbeitung'
                  ? 'bg-amber-500 text-white ring-2 ring-amber-400 ring-offset-1'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <span>↩</span> Alternative bestimmen
            </button>
          </div>
        )}

        {/* Kommentarfeld für Ablehnen / Alternative */}
        {aktiveAktion && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1.5">
                {aktiveAktion === 'ablehnen'
                  ? 'Grund für Ablehnung (optional)'
                  : 'Was wünschen Sie stattdessen?'}
              </label>
              <textarea
                autoFocus
                rows={3}
                value={kommentarEingabe}
                onChange={(e) => onKommentarChange(e.target.value)}
                placeholder={
                  aktiveAktion === 'ablehnen'
                    ? 'z. B. Farbe passt nicht, anderes Modell gewünscht…'
                    : 'z. B. Bitte Alternative in Weiß, anderer Hersteller…'
                }
                className="w-full px-3 py-2.5 text-sm bg-white border border-stone-200 rounded-lg text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent transition resize-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  onSpeichern(aktiveAktion === 'ablehnen' ? 'abgelehnt' : 'ueberarbeitung')
                }
                disabled={isPending}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 disabled:bg-stone-300 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {isPending ? 'Wird gespeichert…' : 'Bestätigen'}
              </button>
              <button
                onClick={onAbbrechen}
                disabled={isPending}
                className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700 transition-colors"
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
    <div>
      <p className="text-xs text-stone-400">{label}</p>
      <p className={`text-sm font-mono ${hervorheben ? 'font-semibold text-stone-800' : 'text-stone-600'}`}>
        {wert}
      </p>
    </div>
  )
}
