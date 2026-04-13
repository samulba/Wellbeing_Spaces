'use client'

import { useState, useTransition } from 'react'
import {
  Mail, Phone, Users, FileText, MessageSquare, Circle,
  Plus, Trash2, CheckCircle, Clock, ChevronDown,
} from 'lucide-react'
import type { Kommunikation, KommunikationTyp, KommunikationRichtung } from '@/lib/supabase/types'
import {
  kommunikationAnlegen,
  kommunikationLoeschen,
  followUpErledigen,
} from '@/app/actions/kommunikation'

// ── Icons & Labels ────────────────────────────────────────────

const typConfig: Record<KommunikationTyp, { label: string; Icon: React.FC<{ className?: string }>; farbe: string }> = {
  email:     { label: 'E-Mail',   Icon: Mail,          farbe: 'text-blue-500   bg-blue-50' },
  anruf:     { label: 'Anruf',    Icon: Phone,         farbe: 'text-green-600  bg-green-50' },
  meeting:   { label: 'Meeting',  Icon: Users,         farbe: 'text-purple-600 bg-purple-50' },
  notiz:     { label: 'Notiz',    Icon: FileText,      farbe: 'text-amber-600  bg-amber-50' },
  sms:       { label: 'SMS',      Icon: MessageSquare, farbe: 'text-teal-600   bg-teal-50' },
  sonstiges: { label: 'Sonstiges',Icon: Circle,        farbe: 'text-gray-500   bg-gray-100' },
}

const TYPEN: KommunikationTyp[] = ['email', 'anruf', 'meeting', 'notiz', 'sms', 'sonstiges']

function formatDatum(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function isOverdue(datum: string) {
  return new Date(datum) < new Date()
}

// ── Haupt-Komponente ──────────────────────────────────────────

interface Props {
  kundeId: string
  initialEintraege: Kommunikation[]
}

export default function KommunikationBlock({ kundeId, initialEintraege }: Props) {
  const [eintraege, setEintraege] = useState(initialEintraege)
  const [filter, setFilter] = useState<KommunikationTyp | 'alle'>('alle')
  const [formOffen, setFormOffen] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // Formular-State
  const [typ, setTyp] = useState<KommunikationTyp>('notiz')
  const [richtung, setRichtung] = useState<KommunikationRichtung | ''>('')
  const [betreff, setBetreff] = useState('')
  const [inhalt, setInhalt] = useState('')
  const [kontaktperson, setKontaktperson] = useState('')
  const [datum, setDatum] = useState(new Date().toISOString().slice(0, 16))
  const [dauerMinuten, setDauerMinuten] = useState('')
  const [followUpDatum, setFollowUpDatum] = useState('')

  const sichtbar = filter === 'alle' ? eintraege : eintraege.filter((e) => e.typ === filter)

  function resetForm() {
    setTyp('notiz'); setRichtung(''); setBetreff(''); setInhalt('')
    setKontaktperson(''); setDatum(new Date().toISOString().slice(0, 16))
    setDauerMinuten(''); setFollowUpDatum(''); setFehler(null)
  }

  function handleAnlegen() {
    setFehler(null)
    startTransition(async () => {
      const res = await kommunikationAnlegen(kundeId, {
        typ,
        richtung: (richtung as KommunikationRichtung) || null,
        betreff: betreff || null,
        inhalt: inhalt || null,
        kontaktperson: kontaktperson || null,
        datum: datum ? new Date(datum).toISOString() : new Date().toISOString(),
        dauer_minuten: dauerMinuten ? parseInt(dauerMinuten) : null,
        follow_up_datum: followUpDatum || null,
        erledigt: false,
        projekt_id: null,
      })
      if (res.fehler) { setFehler(res.fehler); return }

      const neu: Kommunikation = {
        id: res.id ?? crypto.randomUUID(),
        organisation_id: '',
        kunde_id: kundeId,
        projekt_id: null,
        typ,
        richtung: (richtung as KommunikationRichtung) || null,
        betreff: betreff || null,
        inhalt: inhalt || null,
        kontaktperson: kontaktperson || null,
        user_id: null,
        datum: datum ? new Date(datum).toISOString() : new Date().toISOString(),
        dauer_minuten: dauerMinuten ? parseInt(dauerMinuten) : null,
        follow_up_datum: followUpDatum || null,
        erledigt: false,
        created_at: new Date().toISOString(),
      }
      setEintraege((prev) => [neu, ...prev])
      resetForm()
      setFormOffen(false)
    })
  }

  function handleLoeschen(id: string) {
    startTransition(async () => {
      const res = await kommunikationLoeschen(id, kundeId)
      if (!res.fehler) setEintraege((prev) => prev.filter((e) => e.id !== id))
    })
  }

  function handleFollowUpErledigen(id: string) {
    startTransition(async () => {
      const res = await followUpErledigen(id, kundeId)
      if (!res.fehler) {
        setEintraege((prev) => prev.map((e) => e.id === id ? { ...e, erledigt: true } : e))
      }
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Kommunikation</p>
          {eintraege.length > 0 && (
            <span className="text-[10px] text-gray-400">({eintraege.length})</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => { setFormOffen((v) => !v); setFehler(null) }}
          className="inline-flex items-center gap-1 text-xs text-wellbeing-green hover:text-wellbeing-green-dark font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Eintrag
        </button>
      </div>

      {/* Inline-Formular */}
      {formOffen && (
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60 space-y-3">
          {fehler && <p className="text-xs text-red-500">{fehler}</p>}

          {/* Typ-Auswahl */}
          <div className="flex flex-wrap gap-1.5">
            {TYPEN.map((t) => {
              const { label, Icon } = typConfig[t]
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTyp(t)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                    typ === t
                      ? 'bg-wellbeing-green text-white border-wellbeing-green'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 font-medium">Datum & Uhrzeit</label>
              <input type="datetime-local" value={datum} onChange={(e) => setDatum(e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 font-medium">Richtung</label>
              <div className="relative">
                <select value={richtung} onChange={(e) => setRichtung(e.target.value as KommunikationRichtung | '')} className={`${inp} appearance-none pr-7`}>
                  <option value="">–</option>
                  <option value="eingehend">Eingehend</option>
                  <option value="ausgehend">Ausgehend</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-gray-500 mb-1 font-medium">Betreff</label>
            <input type="text" value={betreff} onChange={(e) => setBetreff(e.target.value)} className={inp} placeholder="Kurze Zusammenfassung…" />
          </div>

          <div>
            <label className="block text-[10px] text-gray-500 mb-1 font-medium">Inhalt / Notiz</label>
            <textarea value={inhalt} onChange={(e) => setInhalt(e.target.value)} className={`${inp} resize-none`} rows={3} placeholder="Details, Gesprächsinhalt, nächste Schritte…" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 font-medium">Kontaktperson</label>
              <input type="text" value={kontaktperson} onChange={(e) => setKontaktperson(e.target.value)} className={inp} placeholder="Name…" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1 font-medium">Dauer (Min.)</label>
              <input type="number" min="1" value={dauerMinuten} onChange={(e) => setDauerMinuten(e.target.value)} className={`${inp} font-mono`} placeholder="30" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-gray-500 mb-1 font-medium">Follow-up Datum</label>
            <input type="date" value={followUpDatum} onChange={(e) => setFollowUpDatum(e.target.value)} className={inp} />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={() => { setFormOffen(false); resetForm() }} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Abbrechen
            </button>
            <button type="button" onClick={handleAnlegen} className="px-3 py-1.5 text-xs font-medium bg-wellbeing-green hover:bg-wellbeing-green-dark text-white rounded-lg transition-colors">
              Eintragen
            </button>
          </div>
        </div>
      )}

      {/* Filter-Tabs */}
      {eintraege.length > 0 && (
        <div className="flex gap-1 px-4 py-2 border-b border-gray-50 overflow-x-auto">
          {(['alle', ...TYPEN] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilter(t)}
              className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                filter === t
                  ? 'bg-wellbeing-green/10 text-wellbeing-green'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {t === 'alle' ? 'Alle' : typConfig[t].label}
            </button>
          ))}
        </div>
      )}

      {/* Timeline */}
      {sichtbar.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-xs text-gray-400">Noch keine Einträge.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
          {sichtbar.map((e) => {
            const { Icon, farbe } = typConfig[e.typ]
            const hatFollowUp = !!e.follow_up_datum && !e.erledigt
            const followUpFaellig = hatFollowUp && isOverdue(e.follow_up_datum!)
            return (
              <div key={e.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50/60 group transition-colors">
                {/* Typ-Icon */}
                <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${farbe}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>

                {/* Inhalt */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {e.betreff ? (
                      <p className="text-xs font-medium text-gray-800 truncate">{e.betreff}</p>
                    ) : (
                      <p className="text-xs text-gray-400 italic">{typConfig[e.typ].label}</p>
                    )}
                    {e.richtung && (
                      <span className="text-[10px] text-gray-400">({e.richtung})</span>
                    )}
                    {hatFollowUp && (
                      <button
                        type="button"
                        onClick={() => handleFollowUpErledigen(e.id)}
                        title="Follow-up erledigen"
                        className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-colors ${
                          followUpFaellig
                            ? 'bg-red-50 text-red-500 hover:bg-red-100'
                            : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                        }`}
                      >
                        <Clock className="w-2.5 h-2.5" />
                        {formatDatum(e.follow_up_datum!)}
                      </button>
                    )}
                    {e.erledigt && e.follow_up_datum && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 font-medium">
                        <CheckCircle className="w-2.5 h-2.5" />
                        Erledigt
                      </span>
                    )}
                  </div>
                  {e.inhalt && (
                    <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{e.inhalt}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] text-gray-400">
                      {formatDatum(e.datum)}
                      {e.dauer_minuten && ` · ${e.dauer_minuten} Min.`}
                      {e.kontaktperson && ` · ${e.kontaktperson}`}
                    </p>
                  </div>
                </div>

                {/* Löschen */}
                <button
                  type="button"
                  onClick={() => handleLoeschen(e.id)}
                  title="Eintrag löschen"
                  className="shrink-0 opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-400 transition-all mt-0.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const inp = 'w-full px-2.5 py-2 text-xs bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition'
