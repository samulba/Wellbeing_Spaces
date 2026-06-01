'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Package, Plus, Loader2, ShoppingCart, FolderOpen, Check,
} from 'lucide-react'
import {
  bestellungAnlegen, positionHinzufuegen,
} from '@/app/actions/lieferanten-bestellungen'
import type { LieferantenBestellungStatus } from '@/lib/supabase/types'
import { einkaufNettoNachRabatt } from '@/lib/preise'

export type PartnerOption = { id: string; name: string }

export type ProduktKandidat = {
  raum_produkt_id: string
  menge: number
  produkt: {
    id: string
    name: string
    bild_url: string | null
    einheit: string
    einkaufspreis: number | null
    einkaufsrabatt_prozent: number | null
    verkaufspreis: number | null
  }
  raum: { id: string; name: string; projekt_id: string; projekt_name: string | null } | null
}

export type OffeneBestellung = {
  id: string
  bestellnummer: string | null
  status: LieferantenBestellungStatus
  gesamtpreis_netto: number
}

interface Props {
  partner: PartnerOption[]
  aktiverPartner: PartnerOption | null
  kandidaten: ProduktKandidat[]
  offeneBestellungen: OffeneBestellung[]
}

export default function BestellungNeuClient({
  aktiverPartner, kandidaten, offeneBestellungen,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [fehler, setFehler] = useState<string | null>(null)

  // Auswahl-State pro Kandidat
  const [auswahl, setAuswahl] = useState<Record<string, { menge: number; preis: number }>>(() => {
    const init: Record<string, { menge: number; preis: number }> = {}
    for (const k of kandidaten) {
      init[k.raum_produkt_id] = {
        menge: k.menge,
        preis: einkaufNettoNachRabatt(k.produkt.einkaufspreis, k.produkt.einkaufsrabatt_prozent),
      }
    }
    return init
  })
  const [ausgewaehlt, setAusgewaehlt] = useState<Set<string>>(() => new Set(kandidaten.map((k) => k.raum_produkt_id)))

  const [liefertermin, setLiefertermin] = useState('')
  const [notizen, setNotizen] = useState('')

  const summe = useMemo(() => {
    return Array.from(ausgewaehlt).reduce((s, id) => {
      const a = auswahl[id]
      if (!a) return s
      return s + a.menge * a.preis
    }, 0)
  }, [auswahl, ausgewaehlt])

  function toggleProdukt(id: string) {
    setAusgewaehlt((prev) => {
      const neu = new Set(prev)
      if (neu.has(id)) neu.delete(id)
      else neu.add(id)
      return neu
    })
  }

  function handleAlleAuswaehlen() {
    setAusgewaehlt(new Set(kandidaten.map((k) => k.raum_produkt_id)))
  }
  function handleAlleAbwaehlen() {
    setAusgewaehlt(new Set())
  }

  function handleAnlegen() {
    setFehler(null)
    if (!aktiverPartner) { setFehler('Kein Lieferant gewählt.'); return }
    if (ausgewaehlt.size === 0) { setFehler('Mindestens ein Produkt auswählen.'); return }

    const ids = Array.from(ausgewaehlt.values())
    const positionen = ids.map((id) => {
      const a = auswahl[id]
      return {
        raumProduktId:   id,
        menge:           a?.menge ?? 1,
        einzelpreisNetto: a?.preis ?? 0,
      }
    })

    startTransition(async () => {
      const r = await bestellungAnlegen({
        partnerId:    aktiverPartner.id,
        positionen,
        liefertermin: liefertermin || null,
        notizen:      notizen || null,
      })
      if (r.fehler) { setFehler(r.fehler); return }
      router.push(`/dashboard/bestellungen/${r.id}`)
    })
  }

  function handleAnExistierenderHinzufuegen(bestellungId: string) {
    setFehler(null)
    if (ausgewaehlt.size === 0) { setFehler('Mindestens ein Produkt auswählen.'); return }
    startTransition(async () => {
      let fehlerCount = 0
      const ids = Array.from(ausgewaehlt.values())
      for (const id of ids) {
        const a = auswahl[id]
        const r = await positionHinzufuegen({
          bestellungId,
          raumProduktId:    id,
          menge:            a?.menge ?? 1,
          einzelpreisNetto: a?.preis ?? 0,
        })
        if (r.fehler) fehlerCount++
      }
      if (fehlerCount > 0) {
        setFehler(`${fehlerCount} Position${fehlerCount === 1 ? '' : 'en'} konnte${fehlerCount === 1 ? '' : 'n'} nicht hinzugefügt werden (möglicherweise schon enthalten).`)
      } else {
        router.push(`/dashboard/bestellungen/${bestellungId}`)
      }
    })
  }

  return (
    <div className="flex-1 overflow-y-auto animate-fadeIn">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/bestellungen"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" /> Bestellungen
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-lg font-semibold text-gray-900">Neue Bestellung</h1>
          {aktiverPartner && (
            <span className="text-sm text-gray-500">· {aktiverPartner.name}</span>
          )}
        </div>
      </div>

      <div className="px-6 py-6 max-w-5xl mx-auto space-y-5">
        {/* Sammelbestellungs-Vorschlag */}
        {offeneBestellungen.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-2 mb-3">
              <ShoppingCart className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-900">Offene Bestellungen bei diesem Lieferanten</p>
                <p className="text-xs text-amber-800 mt-0.5">
                  Du kannst die ausgewählten Produkte zu einer existierenden Entwurfs-/Bestätigt-Bestellung hinzufügen
                  (Sammelbestellung) oder eine neue anlegen.
                </p>
              </div>
            </div>
            <div className="space-y-1">
              {offeneBestellungen.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleAnExistierenderHinzufuegen(b.id)}
                  disabled={pending || ausgewaehlt.size === 0}
                  className="w-full flex items-center gap-3 px-3 py-2 bg-white hover:bg-amber-100 border border-amber-200 rounded-lg text-left transition-colors disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span className="text-sm text-gray-900 flex-1">{b.bestellnummer ?? 'Entwurf'} ({b.status})</span>
                  <span className="text-xs text-gray-600 tabular-nums">{b.gesamtpreis_netto.toFixed(2)} €</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Produkte-Auswahl */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Verfügbare Produkte</h2>
              <p className="text-xs text-gray-500">
                {kandidaten.length} freigegebene Produkte mit Status &bdquo;ausstehend&ldquo; bei {aktiverPartner?.name ?? '—'}
              </p>
            </div>
            {kandidaten.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={handleAlleAuswaehlen}
                  className="text-wellbeing-green hover:underline"
                >
                  Alle auswählen
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={handleAlleAbwaehlen}
                  className="text-gray-500 hover:underline"
                >
                  Keine
                </button>
              </div>
            )}
          </div>
          {kandidaten.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-500 text-center">
              Keine offenen Produkte für diesen Lieferanten.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {kandidaten.map((k) => {
                const aktiv = ausgewaehlt.has(k.raum_produkt_id)
                const a = auswahl[k.raum_produkt_id]
                return (
                  <div
                    key={k.raum_produkt_id}
                    className={`flex items-center gap-3 px-5 py-3 transition-colors ${
                      aktiv ? 'bg-wellbeing-cream/30' : 'hover:bg-gray-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleProdukt(k.raum_produkt_id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        aktiv
                          ? 'bg-wellbeing-green border-wellbeing-green text-white'
                          : 'border-gray-300 hover:border-wellbeing-green'
                      }`}
                    >
                      {aktiv && <Check className="w-3 h-3" />}
                    </button>
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-50 border border-gray-200 shrink-0 flex items-center justify-center">
                      {k.produkt.bild_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={k.produkt.bild_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{k.produkt.name}</div>
                      {k.raum && (
                        <div className="text-xs text-gray-500 truncate inline-flex items-center gap-1 mt-0.5">
                          <FolderOpen className="w-3 h-3 text-gray-400" />
                          {k.raum.projekt_name} · {k.raum.name}
                        </div>
                      )}
                    </div>
                    <input
                      type="number"
                      value={a?.menge ?? 1}
                      onChange={(e) => setAuswahl((prev) => ({
                        ...prev,
                        [k.raum_produkt_id]: { ...prev[k.raum_produkt_id], menge: Number(e.target.value) || 0 },
                      }))}
                      disabled={!aktiv}
                      className="w-16 px-2 py-1 text-sm border border-gray-200 rounded text-right disabled:bg-gray-50 disabled:text-gray-400"
                    />
                    <span className="text-xs text-gray-500 shrink-0">{k.produkt.einheit}</span>
                    <input
                      type="number"
                      step="0.01"
                      value={a?.preis ?? 0}
                      onChange={(e) => setAuswahl((prev) => ({
                        ...prev,
                        [k.raum_produkt_id]: { ...prev[k.raum_produkt_id], preis: Number(e.target.value) || 0 },
                      }))}
                      disabled={!aktiv}
                      placeholder="EP"
                      className="w-20 px-2 py-1 text-sm border border-gray-200 rounded text-right disabled:bg-gray-50 disabled:text-gray-400"
                    />
                    <span className="text-xs text-gray-500 shrink-0">€</span>
                  </div>
                )
              })}
            </div>
          )}
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
            <span className="text-sm text-gray-700">
              {ausgewaehlt.size} {ausgewaehlt.size === 1 ? 'Produkt' : 'Produkte'} ausgewählt
            </span>
            <span className="text-base font-semibold text-gray-900 tabular-nums">{summe.toFixed(2)} €</span>
          </div>
        </div>

        {/* Meta-Daten */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-1">Liefertermin (geplant)</span>
            <input
              type="date"
              value={liefertermin}
              onChange={(e) => setLiefertermin(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-wellbeing-green focus:ring-2 focus:ring-wellbeing-green/20"
            />
          </label>
          <label className="block sm:col-span-1">
            <span className="block text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-1">Notizen</span>
            <textarea
              value={notizen}
              onChange={(e) => setNotizen(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-wellbeing-green focus:ring-2 focus:ring-wellbeing-green/20 resize-none"
            />
          </label>
        </div>

        {/* Aktionen */}
        {fehler && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{fehler}</p>
        )}
        <div className="flex justify-end gap-2">
          <Link
            href="/dashboard/bestellungen"
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Abbrechen
          </Link>
          <button
            type="button"
            onClick={handleAnlegen}
            disabled={pending || ausgewaehlt.size === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-wellbeing-green hover:bg-wellbeing-green-dark text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Bestellung anlegen ({ausgewaehlt.size})
          </button>
        </div>
      </div>
    </div>
  )
}
