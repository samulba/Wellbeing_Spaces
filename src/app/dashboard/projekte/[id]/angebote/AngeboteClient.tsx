'use client'

import { useState, useTransition } from 'react'
import {
  Plus, Trash2, ChevronDown, Eye, ReceiptText,
  ArrowLeft, PenLine, Send, CheckCircle, XCircle, Clock, Layers,
} from 'lucide-react'
import type { Angebot, AngebotStatus, AngebotPosition } from '@/lib/supabase/types'
import {
  angebotErstellen,
  angebotAusProduktliste,
  angebotStatusAendern,
  angebotLoeschen,
} from '@/app/actions/angebote'
import { berechneAngebotSummen } from '@/lib/angebot-utils'

// ── Helpers ───────────────────────────────────────────────────

const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n)

const statusConfig: Record<AngebotStatus, { label: string; farbe: string; Icon: React.FC<{ className?: string }> }> = {
  entwurf:    { label: 'Entwurf',    farbe: 'bg-gray-100 text-gray-600',    Icon: PenLine },
  gesendet:   { label: 'Gesendet',   farbe: 'bg-blue-50 text-blue-700',     Icon: Send },
  angenommen: { label: 'Angenommen', farbe: 'bg-green-50 text-green-700',   Icon: CheckCircle },
  abgelehnt:  { label: 'Abgelehnt',  farbe: 'bg-red-50 text-red-600',       Icon: XCircle },
  abgelaufen: { label: 'Abgelaufen', farbe: 'bg-gray-100 text-gray-500',    Icon: Clock },
}
const STATUS_LIST: AngebotStatus[] = ['entwurf', 'gesendet', 'angenommen', 'abgelehnt', 'abgelaufen']

const inp = 'w-full px-2.5 py-2 text-xs bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition'

function neuePosition(index: number): AngebotPosition {
  return { id: `pos-${Date.now()}-${index}`, name: '', beschreibung: null, menge: 1, einheit: 'Stk', einzelpreis: 0, gesamtpreis: 0 }
}

// ── Positions-Zeile ───────────────────────────────────────────

function PositionZeile({
  pos,
  onChange,
  onLoeschen,
}: {
  pos: AngebotPosition
  onChange: (updated: AngebotPosition) => void
  onLoeschen: () => void
}) {
  function update(field: Partial<AngebotPosition>) {
    const next = { ...pos, ...field }
    next.gesamtpreis = Math.round(next.menge * next.einzelpreis * 100) / 100
    onChange(next)
  }

  return (
    <tr className="group border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
      <td className="py-2 px-3">
        <input type="text" value={pos.name} onChange={(e) => update({ name: e.target.value })} className={`${inp} text-[11px]`} placeholder="Bezeichnung" />
        <input type="text" value={pos.beschreibung ?? ''} onChange={(e) => update({ beschreibung: e.target.value || null })} className={`${inp} text-[10px] mt-1 text-gray-400`} placeholder="Beschreibung (optional)" />
      </td>
      <td className="py-2 px-2 w-20">
        <input type="number" min="0" step="0.01" value={pos.menge} onChange={(e) => update({ menge: parseFloat(e.target.value) || 0 })} className={`${inp} text-center text-[11px] font-mono`} />
      </td>
      <td className="py-2 px-2 w-20">
        <input type="text" value={pos.einheit} onChange={(e) => update({ einheit: e.target.value })} className={`${inp} text-center text-[11px]`} placeholder="Stk" />
      </td>
      <td className="py-2 px-2 w-28">
        <input type="number" min="0" step="0.01" value={pos.einzelpreis} onChange={(e) => update({ einzelpreis: parseFloat(e.target.value) || 0 })} className={`${inp} text-right text-[11px] font-mono`} />
      </td>
      <td className="py-2 px-3 w-28 text-right">
        <span className="text-xs font-mono font-medium text-gray-800">{eur(pos.gesamtpreis)}</span>
      </td>
      <td className="py-2 px-2 w-8">
        <button type="button" onClick={onLoeschen} className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-400 transition-all rounded">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  )
}

// ── Angebot-Formular ──────────────────────────────────────────

interface FormProps {
  projektId: string
  kundeId: string
  kundeName: string
  defaultMwst: number
  onSpeichern: (angebot: Angebot) => void
  onAbbrechen: () => void
}

function AngebotFormular({ projektId, kundeId, kundeName, defaultMwst, onSpeichern, onAbbrechen }: FormProps) {
  const [titel, setTitel] = useState('')
  const [einleitung, setEinleitung] = useState('')
  const [positionen, setPositionen] = useState<AngebotPosition[]>([neuePosition(0)])
  const [mwstSatz, setMwstSatz] = useState(defaultMwst)
  const [rabattProzent, setRabattProzent] = useState('')
  const [gueltigBis, setGueltigBis] = useState('')
  const [anmerkungen, setAnmerkungen] = useState('')
  const [agbText, setAgbText] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const summen = berechneAngebotSummen(positionen, mwstSatz, rabattProzent ? parseFloat(rabattProzent) : null)

  function updatePosition(index: number, updated: AngebotPosition) {
    setPositionen((prev) => prev.map((p, i) => i === index ? updated : p))
  }

  function addPosition() {
    setPositionen((prev) => [...prev, neuePosition(prev.length)])
  }

  function removePosition(index: number) {
    setPositionen((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSpeichern() {
    if (!titel.trim()) { setFehler('Bitte einen Titel eingeben.'); return }
    if (positionen.length === 0) { setFehler('Mindestens eine Position ist erforderlich.'); return }
    setFehler(null)

    startTransition(async () => {
      const res = await angebotErstellen({
        projekt_id: projektId,
        kunde_id: kundeId,
        titel: titel.trim(),
        einleitung: einleitung || null,
        positionen,
        mwst_satz: mwstSatz,
        rabatt_prozent: rabattProzent ? parseFloat(rabattProzent) : null,
        gueltig_bis: gueltigBis || null,
        anmerkungen: anmerkungen || null,
        agb_text: agbText || null,
      })
      if (res.fehler) { setFehler(res.fehler); return }

      const neu: Angebot = {
        id: res.id ?? crypto.randomUUID(),
        organisation_id: '',
        projekt_id: projektId,
        kunde_id: kundeId,
        nummer: '—',
        titel: titel.trim(),
        einleitung: einleitung || null,
        positionen,
        netto_summe: summen.nettoSumme,
        mwst_satz: mwstSatz,
        mwst_betrag: summen.mwstBetrag,
        brutto_summe: summen.bruttoSumme,
        rabatt_prozent: rabattProzent ? parseFloat(rabattProzent) : null,
        rabatt_betrag: summen.rabattBetrag || null,
        status: 'entwurf',
        gueltig_bis: gueltigBis || null,
        pdf_url: null,
        anmerkungen: anmerkungen || null,
        agb_text: agbText || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      onSpeichern(neu)
    })
  }

  return (
    <div className="space-y-6">
      {fehler && <p className="text-xs text-red-500">{fehler}</p>}

      {/* Kopf */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">Kunde</label>
            <p className="text-sm font-medium text-gray-800">{kundeName}</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">Gültig bis</label>
            <input type="date" value={gueltigBis} onChange={(e) => setGueltigBis(e.target.value)} className={inp} />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1 font-medium">Titel *</label>
          <input type="text" value={titel} onChange={(e) => setTitel(e.target.value)} className={inp} placeholder="z.B. Angebot Wohnzimmergestaltung" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1 font-medium">Einleitung</label>
          <textarea value={einleitung} onChange={(e) => setEinleitung(e.target.value)} className={`${inp} resize-none`} rows={3} placeholder="Anschreiben oder Einleitung des Angebots..." />
        </div>
      </div>

      {/* Positionen */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Positionen</p>
          <button type="button" onClick={addPosition} className="inline-flex items-center gap-1 text-xs text-wellbeing-green hover:text-wellbeing-green-dark font-medium transition-colors">
            <Plus className="w-3.5 h-3.5" /> Position hinzufügen
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="text-left px-3 py-2">Bezeichnung</th>
                <th className="text-center px-2 py-2 w-20">Menge</th>
                <th className="text-center px-2 py-2 w-20">Einheit</th>
                <th className="text-right px-2 py-2 w-28">Einzelpreis</th>
                <th className="text-right px-3 py-2 w-28">Gesamt</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {positionen.map((pos, i) => (
                <PositionZeile key={pos.id} pos={pos} onChange={(u) => updatePosition(i, u)} onLoeschen={() => removePosition(i)} />
              ))}
            </tbody>
          </table>
          {positionen.length === 0 && (
            <div className="py-6 text-center">
              <p className="text-xs text-gray-400">Noch keine Positionen.</p>
            </div>
          )}
        </div>
      </div>

      {/* Summen + Optionen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Optionen */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Optionen</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">MwSt. (%)</label>
              <input type="number" min="0" max="100" step="0.1" value={mwstSatz} onChange={(e) => setMwstSatz(parseFloat(e.target.value) || 0)} className={`${inp} font-mono`} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Rabatt (%)</label>
              <input type="number" min="0" max="100" step="0.1" value={rabattProzent} onChange={(e) => setRabattProzent(e.target.value)} className={`${inp} font-mono`} placeholder="0" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">Anmerkungen</label>
            <textarea value={anmerkungen} onChange={(e) => setAnmerkungen(e.target.value)} className={`${inp} resize-none`} rows={3} placeholder="Zahlungskonditionen, Hinweise..." />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">AGB-Text</label>
            <textarea value={agbText} onChange={(e) => setAgbText(e.target.value)} className={`${inp} resize-none text-[11px]`} rows={3} placeholder="Allgemeine Geschäftsbedingungen..." />
          </div>
        </div>

        {/* Summen-Box */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-4">Zusammenfassung</p>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Zwischensumme</span>
              <span className="font-mono">{eur(positionen.reduce((s, p) => s + p.gesamtpreis, 0))}</span>
            </div>
            {summen.rabattBetrag > 0 && (
              <div className="flex justify-between text-xs text-red-500">
                <span>Rabatt ({rabattProzent}%)</span>
                <span className="font-mono">−{eur(summen.rabattBetrag)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-gray-600 border-t border-gray-100 pt-2">
              <span>Netto</span>
              <span className="font-mono">{eur(summen.nettoSumme)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>zzgl. {mwstSatz}% MwSt.</span>
              <span className="font-mono">{eur(summen.mwstBetrag)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-gray-900 border-t border-gray-200 pt-3 mt-3">
              <span>Brutto</span>
              <span className="font-mono text-wellbeing-green">{eur(summen.bruttoSumme)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Aktionen */}
      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={onAbbrechen} className="text-xs text-gray-400 hover:text-gray-600 px-4 py-2 transition-colors">Abbrechen</button>
        <button type="button" onClick={handleSpeichern} className="px-5 py-2 text-xs font-medium bg-wellbeing-green hover:bg-wellbeing-green-dark text-white rounded-lg transition-colors">
          Angebot erstellen
        </button>
      </div>
    </div>
  )
}

// ── Angebot-Detail ────────────────────────────────────────────

function AngebotDetail({ angebot, onZurueck }: { angebot: Angebot; onZurueck: () => void }) {
  return (
    <div className="space-y-4">
      <button type="button" onClick={onZurueck} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-wellbeing-green transition-colors mb-2">
        <ArrowLeft className="w-3.5 h-3.5" /> Zurück zur Liste
      </button>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-mono text-gray-400 mb-1">{angebot.nummer}</p>
            <h2 className="text-base font-semibold text-gray-900">{angebot.titel}</h2>
            {angebot.einleitung && <p className="text-xs text-gray-500 mt-2 leading-relaxed whitespace-pre-wrap">{angebot.einleitung}</p>}
          </div>
          <div className="shrink-0 text-right space-y-1">
            {(() => { const { label, farbe, Icon } = statusConfig[angebot.status]; return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${farbe}`}><Icon className="w-3 h-3" />{label}</span> })()}
            {angebot.gueltig_bis && <p className="text-[11px] text-gray-400">Gültig bis {new Date(angebot.gueltig_bis + 'T00:00:00').toLocaleDateString('de-DE')}</p>}
            <p className="text-[11px] text-gray-400">{new Date(angebot.created_at).toLocaleDateString('de-DE')}</p>
          </div>
        </div>
      </div>

      {/* Positionen */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Positionen</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-[10px] text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-2">Bezeichnung</th>
              <th className="text-center px-3 py-2 w-20">Menge</th>
              <th className="text-center px-3 py-2 w-20">Einheit</th>
              <th className="text-right px-3 py-2 w-28">Einzelpreis</th>
              <th className="text-right px-5 py-2 w-32">Gesamt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {angebot.positionen.map((pos) => (
              <tr key={pos.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-3">
                  <p className="text-xs font-medium text-gray-800">{pos.name}</p>
                  {pos.beschreibung && <p className="text-[11px] text-gray-400 mt-0.5">{pos.beschreibung}</p>}
                </td>
                <td className="px-3 py-3 text-center text-xs font-mono text-gray-700">{pos.menge}</td>
                <td className="px-3 py-3 text-center text-xs text-gray-500">{pos.einheit}</td>
                <td className="px-3 py-3 text-right text-xs font-mono text-gray-700">{eur(pos.einzelpreis)}</td>
                <td className="px-5 py-3 text-right text-xs font-mono font-semibold text-gray-800">{eur(pos.gesamtpreis)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summen */}
      <div className="flex justify-end">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm w-80 space-y-2">
          {angebot.rabatt_betrag && angebot.rabatt_betrag > 0 && (
            <div className="flex justify-between text-xs text-red-500">
              <span>Rabatt ({angebot.rabatt_prozent}%)</span>
              <span className="font-mono">−{eur(angebot.rabatt_betrag)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs text-gray-600">
            <span>Netto</span>
            <span className="font-mono">{eur(angebot.netto_summe ?? 0)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>zzgl. {angebot.mwst_satz}% MwSt.</span>
            <span className="font-mono">{eur(angebot.mwst_betrag ?? 0)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-gray-900 border-t border-gray-200 pt-3">
            <span>Brutto</span>
            <span className="font-mono text-wellbeing-green">{eur(angebot.brutto_summe ?? 0)}</span>
          </div>
        </div>
      </div>

      {/* Anmerkungen / AGB */}
      {(angebot.anmerkungen || angebot.agb_text) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {angebot.anmerkungen && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Anmerkungen</p>
              <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{angebot.anmerkungen}</p>
            </div>
          )}
          {angebot.agb_text && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">AGB</p>
              <p className="text-xs text-gray-500 whitespace-pre-wrap leading-relaxed">{angebot.agb_text}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Haupt-Komponente ──────────────────────────────────────────

type Ansicht = 'liste' | 'formular' | { detail: Angebot }

interface Props {
  projektId: string
  kundeId: string
  kundeName: string
  initialAngebote: Angebot[]
  defaultMwst: number
}

export default function AngeboteClient({ projektId, kundeId, kundeName, initialAngebote, defaultMwst }: Props) {
  const [angebote, setAngebote] = useState(initialAngebote)
  const [ansicht, setAnsicht] = useState<Ansicht>('liste')
  const [fehler, setFehler] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleNeu(angebot: Angebot) {
    setAngebote((prev) => [angebot, ...prev])
    setAnsicht('liste')
  }

  function handleAusProduktliste() {
    setFehler(null)
    startTransition(async () => {
      const res = await angebotAusProduktliste(projektId, kundeId, defaultMwst)
      if (res.fehler) { setFehler(res.fehler); return }
      // Reload-Trick: add placeholder, user sees it on next full load
      const platzhalter: Angebot = {
        id: res.id ?? crypto.randomUUID(),
        organisation_id: '', projekt_id: projektId, kunde_id: kundeId,
        nummer: '—', titel: `Angebot – aus Produktliste`,
        einleitung: null, positionen: [], netto_summe: null, mwst_satz: defaultMwst,
        mwst_betrag: null, brutto_summe: null, rabatt_prozent: null, rabatt_betrag: null,
        status: 'entwurf', gueltig_bis: null, pdf_url: null, anmerkungen: null, agb_text: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }
      setAngebote((prev) => [platzhalter, ...prev])
    })
  }

  function handleStatusAendern(id: string, status: AngebotStatus) {
    startTransition(async () => {
      const res = await angebotStatusAendern(id, status, projektId)
      if (!res.fehler) setAngebote((prev) => prev.map((a) => a.id === id ? { ...a, status } : a))
    })
  }

  function handleLoeschen(id: string) {
    startTransition(async () => {
      const res = await angebotLoeschen(id, projektId)
      if (!res.fehler) setAngebote((prev) => prev.filter((a) => a.id !== id))
    })
  }

  if (ansicht === 'formular') {
    return (
      <AngebotFormular
        projektId={projektId}
        kundeId={kundeId}
        kundeName={kundeName}
        defaultMwst={defaultMwst}
        onSpeichern={handleNeu}
        onAbbrechen={() => setAnsicht('liste')}
      />
    )
  }

  if (typeof ansicht === 'object' && 'detail' in ansicht) {
    return <AngebotDetail angebot={ansicht.detail} onZurueck={() => setAnsicht('liste')} />
  }

  // ── Liste ────────────────────────────────────────────────────
  return (
    <>
      {fehler && <p className="mb-4 text-xs text-red-500">{fehler}</p>}

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{angebote.length} {angebote.length === 1 ? 'Angebot' : 'Angebote'}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAusProduktliste}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-lg transition-all"
          >
            <Layers className="w-3.5 h-3.5" />
            Aus Produktliste
          </button>
          <button
            type="button"
            onClick={() => setAnsicht('formular')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-wellbeing-green hover:bg-wellbeing-green-dark text-white rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Neues Angebot
          </button>
        </div>
      </div>

      {angebote.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl py-16 text-center shadow-sm">
          <ReceiptText className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Noch keine Angebote für dieses Projekt.</p>
          <button
            type="button"
            onClick={() => setAnsicht('formular')}
            className="mt-4 inline-flex items-center gap-1 text-xs text-wellbeing-green hover:text-wellbeing-green-dark font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Erstes Angebot erstellen
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {angebote.map((a) => {
            const { label, farbe, Icon } = statusConfig[a.status]
            return (
              <div
                key={a.id}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4 group hover:shadow-md transition-shadow"
              >
                <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                  <ReceiptText className="w-4 h-4 text-gray-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-mono text-gray-400">{a.nummer}</p>
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">{a.titel}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {new Date(a.created_at).toLocaleDateString('de-DE')}
                    {a.gueltig_bis && ` · Gültig bis ${new Date(a.gueltig_bis + 'T00:00:00').toLocaleDateString('de-DE')}`}
                    {a.brutto_summe != null && ` · ${eur(a.brutto_summe)} brutto`}
                  </p>
                </div>

                {/* Status-Dropdown */}
                <div className="relative shrink-0">
                  <div className="group/status relative">
                    <button type="button" className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${farbe}`}>
                      <Icon className="w-3 h-3" />{label}<ChevronDown className="w-3 h-3 opacity-50" />
                    </button>
                    <div className="hidden group-hover/status:block absolute right-0 top-full mt-1 z-10 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[160px]">
                      {STATUS_LIST.filter((s) => s !== a.status).map((s) => {
                        const cfg = statusConfig[s]
                        return (
                          <button key={s} type="button" onClick={() => handleStatusAendern(a.id, s)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                            <cfg.Icon className="w-3.5 h-3.5 text-gray-400" />{cfg.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Aktionen */}
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => setAnsicht({ detail: a })} title="Anzeigen" className="p-1.5 text-gray-400 hover:text-wellbeing-green hover:bg-gray-50 rounded-lg transition-all">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => handleLoeschen(a.id)} title="Löschen" className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-gray-50 rounded-lg transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
