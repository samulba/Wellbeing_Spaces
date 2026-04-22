'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, FileText, ChevronDown, Sparkles } from 'lucide-react'
import type { VertragsVorlage, VertragsVorlageKategorie } from '@/lib/supabase/types'
import { vorlageAnlegen, vorlageAktualisieren, vorlageLoeschen } from '@/app/actions/vertraege'
import { standardVorlagenErstellenAction } from '@/app/actions/vorlagen-seed'
import VertragsEditor from '@/components/VertragsEditor'

const KATEGORIEN: { value: VertragsVorlageKategorie; label: string }[] = [
  { value: 'projektvertrag', label: 'Projektvertrag' },
  { value: 'rahmenvertrag',  label: 'Rahmenvertrag' },
  { value: 'angebot',        label: 'Angebot' },
  { value: 'sonstiges',      label: 'Sonstiges' },
]

interface FormState {
  name: string
  beschreibung: string
  inhalt_html: string
  kategorie: VertragsVorlageKategorie | ''
  ist_standard: boolean
}

const leerForm = (): FormState => ({ name: '', beschreibung: '', inhalt_html: '', kategorie: '', ist_standard: false })

const inp = 'w-full px-2.5 py-2 text-xs bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition'

function VorlageFormular({
  initial,
  onSpeichern,
  onAbbrechen,
}: {
  initial: FormState
  onSpeichern: (f: FormState) => void
  onAbbrechen: () => void
}) {
  const [f, setF] = useState(initial)
  const istNeu = !initial.name && !initial.inhalt_html

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1 font-medium">Name *</label>
          <input type="text" value={f.name} onChange={(e) => setF((p) => ({ ...p, name: e.target.value }))} className={inp} placeholder="z.B. Projektvertrag Standard" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1 font-medium">Kategorie</label>
          <div className="relative">
            <select value={f.kategorie} onChange={(e) => setF((p) => ({ ...p, kategorie: e.target.value as VertragsVorlageKategorie | '' }))} className={`${inp} appearance-none pr-7`}>
              <option value="">keine</option>
              {KATEGORIEN.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1 font-medium">Beschreibung</label>
        <input type="text" value={f.beschreibung} onChange={(e) => setF((p) => ({ ...p, beschreibung: e.target.value }))} className={inp} placeholder="Kurze Beschreibung der Vorlage..." />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1 font-medium">Vertragstext *</label>
        <VertragsEditor
          value={f.inhalt_html}
          onChange={(html) => setF((p) => ({ ...p, inhalt_html: html }))}
          zeigeQuickStart={istNeu}
          onQuickStart={(v) => setF((p) => ({
            ...p,
            // Bei leerem Form auch Name + Beschreibung + Kategorie übernehmen
            name:         p.name         || v.name,
            beschreibung: p.beschreibung || v.beschreibung,
            kategorie:    p.kategorie    || v.kategorie,
          }))}
        />
      </div>

      <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={f.ist_standard}
          onChange={(e) => setF((p) => ({ ...p, ist_standard: e.target.checked }))}
          className="w-3.5 h-3.5 accent-wellbeing-green"
        />
        Als Standard-Vorlage markieren
      </label>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="button" onClick={onAbbrechen} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 transition-colors">
          Abbrechen
        </button>
        <button
          type="button"
          onClick={() => onSpeichern(f)}
          disabled={!f.name.trim() || !f.inhalt_html.trim()}
          className="px-4 py-1.5 text-xs font-medium bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          Speichern
        </button>
      </div>
    </div>
  )
}

export default function VertragsVorlagenVerwaltung({ initialVorlagen }: { initialVorlagen: VertragsVorlage[] }) {
  const [vorlagen, setVorlagen] = useState(initialVorlagen)
  const [modus, setModus] = useState<'liste' | 'neu' | { bearbeiten: VertragsVorlage }>('liste')
  const [fehler, setFehler] = useState<string | null>(null)
  const [seedMsg, setSeedMsg] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleStandardVorlagen() {
    setFehler(null)
    setSeedMsg(null)
    startTransition(async () => {
      const res = await standardVorlagenErstellenAction()
      if (res.fehler) { setFehler(res.fehler); return }
      if (res.erstellt === 0) {
        setFehler('Es sind bereits Vorlagen vorhanden.')
        return
      }
      setSeedMsg(`${res.erstellt} Standard-Vorlagen wurden erfolgreich angelegt.`)
      // Seite neu laden damit neue Vorlagen sichtbar sind
      window.location.reload()
    })
  }

  function handleNeu(f: FormState) {
    setFehler(null)
    startTransition(async () => {
      const res = await vorlageAnlegen({
        name: f.name.trim(),
        beschreibung: f.beschreibung || null,
        inhalt_html: f.inhalt_html,
        kategorie: (f.kategorie as VertragsVorlageKategorie) || null,
        ist_standard: f.ist_standard,
      })
      if (res.fehler) { setFehler(res.fehler); return }
      const neu: VertragsVorlage = {
        id: res.id ?? crypto.randomUUID(),
        organisation_id: '',
        name: f.name.trim(),
        beschreibung: f.beschreibung || null,
        inhalt_html: f.inhalt_html,
        platzhalter: null,
        kategorie: (f.kategorie as VertragsVorlageKategorie) || null,
        ist_standard: f.ist_standard,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setVorlagen((prev) =>
        f.ist_standard ? [neu, ...prev.map((v) => ({ ...v, ist_standard: false }))] : [neu, ...prev]
      )
      setModus('liste')
    })
  }

  function handleBearbeiten(vorlage: VertragsVorlage, f: FormState) {
    setFehler(null)
    startTransition(async () => {
      const res = await vorlageAktualisieren(vorlage.id, {
        name: f.name.trim(),
        beschreibung: f.beschreibung || null,
        inhalt_html: f.inhalt_html,
        kategorie: (f.kategorie as VertragsVorlageKategorie) || null,
        ist_standard: f.ist_standard,
      })
      if (res.fehler) { setFehler(res.fehler); return }
      setVorlagen((prev) =>
        prev.map((v) =>
          v.id === vorlage.id
            ? { ...v, name: f.name.trim(), beschreibung: f.beschreibung || null, inhalt_html: f.inhalt_html, kategorie: (f.kategorie as VertragsVorlageKategorie) || null, ist_standard: f.ist_standard }
            : f.ist_standard ? { ...v, ist_standard: false } : v
        )
      )
      setModus('liste')
    })
  }

  function handleLoeschen(id: string) {
    startTransition(async () => {
      const res = await vorlageLoeschen(id)
      if (!res.fehler) setVorlagen((prev) => prev.filter((v) => v.id !== id))
    })
  }

  if (modus === 'neu') {
    return (
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Neue Vorlage</h3>
        {fehler && <p className="mb-3 text-xs text-red-500">{fehler}</p>}
        <VorlageFormular initial={leerForm()} onSpeichern={handleNeu} onAbbrechen={() => setModus('liste')} />
      </div>
    )
  }

  if (typeof modus === 'object' && 'bearbeiten' in modus) {
    const v = modus.bearbeiten
    return (
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Vorlage bearbeiten</h3>
        {fehler && <p className="mb-3 text-xs text-red-500">{fehler}</p>}
        <VorlageFormular
          initial={{ name: v.name, beschreibung: v.beschreibung ?? '', inhalt_html: v.inhalt_html, kategorie: v.kategorie ?? '', ist_standard: v.ist_standard }}
          onSpeichern={(f) => handleBearbeiten(v, f)}
          onAbbrechen={() => setModus('liste')}
        />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-500">
          {vorlagen.length} {vorlagen.length === 1 ? 'Vorlage' : 'Vorlagen'}
        </p>
        <div className="flex items-center gap-2">
          {vorlagen.length === 0 && (
            <button
              type="button"
              onClick={handleStandardVorlagen}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-wellbeing-green border border-wellbeing-green/30 hover:bg-wellbeing-green/5 rounded-lg transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" /> Standard-Vorlagen laden
            </button>
          )}
          <button
            type="button"
            onClick={() => setModus('neu')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-wellbeing-green hover:bg-wellbeing-green-dark text-white rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Neue Vorlage
          </button>
        </div>
      </div>

      {fehler && <p className="mb-3 text-xs text-red-500">{fehler}</p>}
      {seedMsg && <p className="mb-3 text-xs text-wellbeing-green">{seedMsg}</p>}

      {vorlagen.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-xl py-12 text-center">
          <FileText className="w-7 h-7 text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-400 mb-3">Noch keine Vorlagen angelegt.</p>
          <button
            type="button"
            onClick={handleStandardVorlagen}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-wellbeing-green hover:bg-wellbeing-green-dark text-white rounded-lg transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" /> 3 Standard-Vorlagen laden
          </button>
          <p className="mt-3 text-[11px] text-gray-300">oder</p>
          <button
            type="button"
            onClick={() => setModus('neu')}
            className="mt-2 text-xs text-wellbeing-green hover:text-wellbeing-green-dark font-medium transition-colors"
          >
            Leere Vorlage erstellen
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {vorlagen.map((v) => (
            <div key={v.id} className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl group hover:shadow-sm transition-shadow">
              <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                <FileText className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-gray-800 truncate">{v.name}</p>
                  {v.ist_standard && (
                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-wellbeing-green/10 text-wellbeing-green font-medium">Standard</span>
                  )}
                  {v.kategorie && (
                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 capitalize">
                      {v.kategorie.replace('_', ' ')}
                    </span>
                  )}
                </div>
                {v.beschreibung && (
                  <p className="text-[11px] text-gray-400 truncate mt-0.5">{v.beschreibung}</p>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  type="button"
                  onClick={() => setModus({ bearbeiten: v })}
                  className="p-1.5 text-gray-400 hover:text-wellbeing-green hover:bg-gray-50 rounded-lg transition-all"
                  title="Bearbeiten"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleLoeschen(v.id)}
                  className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-gray-50 rounded-lg transition-all"
                  title="Löschen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
