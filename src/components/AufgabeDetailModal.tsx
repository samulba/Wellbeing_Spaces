'use client'

import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useModal } from '@/lib/hooks/useModal'
import { useRealtimeRefresh } from '@/lib/hooks/useRealtimeRefresh'
import {
  X, Calendar, Trash2, Plus, Check, Square, Paperclip, MessageCircle, Pencil,
  ChevronDown, AlertCircle, Loader2,
} from 'lucide-react'
import {
  aufgabeAktualisieren, aufgabeLoeschen, aufgabeChecklistAktualisieren,
  aufgabeAnhangHochladen, aufgabeAnhangSigniert, aufgabeAnhangEntfernen,
  aufgabenKommentareAbrufen, aufgabenKommentarAnlegen,
  aufgabenKommentarAktualisieren, aufgabenKommentarLoeschen,
  type AufgabePickerOptionen,
} from '@/app/actions/aufgaben'
import AufgabeVerknuepfungenPicker from '@/components/AufgabeVerknuepfungenPicker'
import AufgabeAssigneePicker from '@/components/AufgabeAssigneePicker'
import type {
  AufgabeMitDetails, AufgabeStatus, AufgabePrioritaet,
  AufgabeChecklistItem, AufgabeAnhang, AufgabeKommentar,
} from '@/lib/supabase/types'

const STATI: { id: AufgabeStatus; label: string; klasse: string }[] = [
  { id: 'backlog',   label: 'Offen',     klasse: 'bg-gray-100 text-gray-700' },
  { id: 'in_arbeit', label: 'In Arbeit', klasse: 'bg-blue-50 text-blue-700' },
  { id: 'review',    label: 'Review',    klasse: 'bg-amber-50 text-amber-700' },
  { id: 'erledigt',  label: 'Erledigt',  klasse: 'bg-emerald-50 text-emerald-700' },
]

const PRIOS: { id: AufgabePrioritaet; label: string; punkt: string }[] = [
  { id: 'niedrig',  label: 'Niedrig',  punkt: 'bg-gray-300' },
  { id: 'normal',   label: 'Normal',   punkt: 'bg-blue-400' },
  { id: 'hoch',     label: 'Hoch',     punkt: 'bg-amber-500' },
  { id: 'dringend', label: 'Dringend', punkt: 'bg-red-500' },
]

export default function AufgabeDetailModal({
  aufgabe,
  open,
  onClose,
  pickerOptionen,
}: {
  aufgabe: AufgabeMitDetails | null
  open: boolean
  onClose: () => void
  pickerOptionen?: AufgabePickerOptionen
}) {
  const router = useRouter()
  const titleId = useId()
  const modalRef = useModal(open, () => onClose())
  const [pending, startTransition] = useTransition()
  const [fehler, setFehler] = useState<string | null>(null)

  // Lokaler Zustand fuer Inline-Edits (Auto-Save bei Blur)
  const [titel, setTitel] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [status, setStatus] = useState<AufgabeStatus>('backlog')
  const [prioritaet, setPrioritaet] = useState<AufgabePrioritaet>('normal')
  const [faelligAm, setFaelligAm] = useState<string>('')
  const [checklist, setChecklist] = useState<AufgabeChecklistItem[]>([])
  const [neuesItem, setNeuesItem] = useState('')
  const [kommentare, setKommentare] = useState<AufgabeKommentar[]>([])
  const [neuerKommentar, setNeuerKommentar] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Beim Oeffnen: Felder aus Aufgabe befuellen + Kommentare laden
  useEffect(() => {
    if (!aufgabe || !open) return
    setTitel(aufgabe.titel)
    setBeschreibung(aufgabe.beschreibung ?? '')
    setStatus(aufgabe.status)
    setPrioritaet(aufgabe.prioritaet)
    setFaelligAm(aufgabe.faellig_am ?? '')
    setChecklist(aufgabe.checklist)
    setFehler(null)
    void aufgabenKommentareAbrufen(aufgabe.id).then(setKommentare)
  }, [aufgabe, open])

  // Live-Kommentare: Subscribe so lange Modal offen ist
  useRealtimeRefresh({
    channelName: `aufgabe-kommentare-${aufgabe?.id ?? 'none'}`,
    table:       'aufgaben_kommentare',
    filter:      aufgabe ? `aufgabe_id=eq.${aufgabe.id}` : undefined,
    debounceMs:  300,
    enabled:     !!aufgabe && open,
    onChange:    () => {
      if (aufgabe) void aufgabenKommentareAbrufen(aufgabe.id).then(setKommentare)
    },
  })

  if (!open || !aufgabe) return null

  // ─── Helpers ────────────────────────────────────────────────
  function speichern(patch: Parameters<typeof aufgabeAktualisieren>[1]) {
    if (!aufgabe) return
    startTransition(async () => {
      const res = await aufgabeAktualisieren(aufgabe.id, patch)
      if (res.fehler) setFehler(res.fehler)
      else { setFehler(null); router.refresh() }
    })
  }

  function speichereChecklist(neu: AufgabeChecklistItem[]) {
    if (!aufgabe) return
    setChecklist(neu)
    startTransition(async () => {
      const res = await aufgabeChecklistAktualisieren(aufgabe.id, neu)
      if (res.fehler) setFehler(res.fehler)
    })
  }

  async function handleAnhangChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !aufgabe) return
    const fd = new FormData()
    fd.append('datei', file)
    startTransition(async () => {
      const res = await aufgabeAnhangHochladen(aufgabe.id, fd)
      if (res.fehler) setFehler(res.fehler)
      else router.refresh()
    })
    e.target.value = ''
  }

  async function handleKommentarSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!aufgabe) return
    const text = neuerKommentar.trim()
    if (!text) return
    startTransition(async () => {
      const res = await aufgabenKommentarAnlegen(aufgabe.id, text)
      if (res.fehler) { setFehler(res.fehler); return }
      setNeuerKommentar('')
      const liste = await aufgabenKommentareAbrufen(aufgabe.id)
      setKommentare(liste)
    })
  }

  function handleLoeschen() {
    if (!aufgabe) return
    if (!confirm('Aufgabe wirklich löschen?')) return
    startTransition(async () => {
      const res = await aufgabeLoeschen(aufgabe.id)
      if (res.fehler) setFehler(res.fehler)
      else { onClose(); router.refresh() }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-3xl max-h-[88vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fadeIn"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex-1 min-w-0">
            <input
              id={titleId}
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              onBlur={() => titel.trim() && titel !== aufgabe.titel && speichern({ titel })}
              className="w-full text-lg font-semibold text-gray-900 outline-none focus:bg-gray-50 rounded px-1 -ml-1"
              placeholder="Titel der Aufgabe"
            />
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 flex-wrap">
              {aufgabe.projekt && <span>Projekt: <span className="text-gray-600">{aufgabe.projekt.name}</span></span>}
              {aufgabe.kunde && <span>· Kunde: <span className="text-gray-600">{aufgabe.kunde.name}</span></span>}
              {aufgabe.raum && <span>· Raum: <span className="text-gray-600">{aufgabe.raum.name}</span></span>}
              {aufgabe.quelle !== 'manuell' && (
                <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                  ⚡ Auto: {aufgabe.quelle}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <button
              onClick={handleLoeschen}
              aria-label="Aufgabe löschen"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              aria-label="Schließen"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body — scrollbar */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            {/* Linke 2/3 — Beschreibung, Checkliste, Kommentare */}
            <div className="md:col-span-2 px-6 py-5 space-y-6 border-r border-gray-100">
              {/* Beschreibung */}
              <section>
                <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">Beschreibung</h3>
                <textarea
                  rows={4}
                  value={beschreibung}
                  onChange={(e) => setBeschreibung(e.target.value)}
                  onBlur={() => beschreibung !== (aufgabe.beschreibung ?? '') && speichern({ beschreibung: beschreibung || null })}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-wellbeing-green-light focus:ring-2 focus:ring-wellbeing-green/20 resize-y"
                  placeholder="Notizen, Details, Kontext…"
                />
              </section>

              {/* Checkliste */}
              <section>
                <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">
                  Checkliste {checklist.length > 0 && (
                    <span className="text-gray-400 normal-case">
                      ({checklist.filter((c) => c.erledigt).length}/{checklist.length})
                    </span>
                  )}
                </h3>
                <ul className="space-y-1.5">
                  {checklist.map((item) => (
                    <li key={item.id} className="flex items-start gap-2 group">
                      <button
                        onClick={() => speichereChecklist(checklist.map((c) =>
                          c.id === item.id ? { ...c, erledigt: !c.erledigt } : c,
                        ))}
                        className="mt-0.5 text-gray-400 hover:text-wellbeing-green"
                      >
                        {item.erledigt ? <Check size={16} className="text-wellbeing-green" /> : <Square size={16} />}
                      </button>
                      <span className={'flex-1 text-sm ' + (item.erledigt ? 'line-through text-gray-400' : 'text-gray-700')}>
                        {item.text}
                      </span>
                      <button
                        onClick={() => speichereChecklist(checklist.filter((c) => c.id !== item.id))}
                        aria-label="Item entfernen"
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const txt = neuesItem.trim()
                    if (!txt) return
                    const neu: AufgabeChecklistItem = {
                      id: 'c-' + Math.random().toString(36).slice(2, 10),
                      text: txt, erledigt: false,
                      position: checklist.length,
                    }
                    speichereChecklist([...checklist, neu])
                    setNeuesItem('')
                  }}
                  className="flex items-center gap-2 mt-2"
                >
                  <Plus size={14} className="text-gray-400" />
                  <input
                    value={neuesItem}
                    onChange={(e) => setNeuesItem(e.target.value)}
                    placeholder="Neues Item hinzufügen…"
                    className="flex-1 text-sm border-0 outline-none placeholder:text-gray-400"
                  />
                </form>
              </section>

              {/* Anhaenge */}
              <section>
                <h3 className="text-xs font-medium text-gray-500 uppercase mb-2 flex items-center gap-2">
                  <Paperclip size={12} /> Anhänge
                  {aufgabe.anhang_urls.length > 0 && <span className="text-gray-400 normal-case">({aufgabe.anhang_urls.length})</span>}
                </h3>
                <div className="space-y-1.5">
                  {aufgabe.anhang_urls.map((a, i) => (
                    <AnhangZeile
                      key={i} anhang={a}
                      onLoeschen={() => {
                        if (!confirm(`'${a.name}' wirklich loeschen?`)) return
                        startTransition(async () => {
                          const res = await aufgabeAnhangEntfernen(aufgabe.id, a.url)
                          if (res.fehler) setFehler(res.fehler)
                          else { setFehler(null); router.refresh() }
                        })
                      }}
                    />
                  ))}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleAnhangChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 inline-flex items-center gap-2 text-xs text-gray-500 hover:text-wellbeing-green"
                >
                  <Plus size={14} /> Datei hinzufügen
                </button>
              </section>

              {/* Kommentare */}
              <section>
                <h3 className="text-xs font-medium text-gray-500 uppercase mb-2 flex items-center gap-2">
                  <MessageCircle size={12} /> Kommentare
                  {kommentare.length > 0 && <span className="text-gray-400 normal-case">({kommentare.length})</span>}
                </h3>
                <ul className="space-y-3">
                  {kommentare.map((k) => (
                    <KommentarZeile
                      key={k.id} kommentar={k}
                      currentUserId={pickerOptionen?.currentUserId ?? null}
                      onAktualisieren={async (text) => {
                        const res = await aufgabenKommentarAktualisieren(k.id, text)
                        if (res.fehler) { setFehler(res.fehler); return false }
                        const liste = await aufgabenKommentareAbrufen(aufgabe.id)
                        setKommentare(liste)
                        return true
                      }}
                      onLoeschen={async () => {
                        if (!confirm('Kommentar wirklich loeschen?')) return
                        const res = await aufgabenKommentarLoeschen(k.id)
                        if (res.fehler) { setFehler(res.fehler); return }
                        const liste = await aufgabenKommentareAbrufen(aufgabe.id)
                        setKommentare(liste)
                      }}
                    />
                  ))}
                  {kommentare.length === 0 && (
                    <li className="text-sm text-gray-400 italic">Noch keine Kommentare.</li>
                  )}
                </ul>
                <form onSubmit={handleKommentarSubmit} className="mt-3 flex items-end gap-2">
                  <textarea
                    rows={2}
                    value={neuerKommentar}
                    onChange={(e) => setNeuerKommentar(e.target.value)}
                    placeholder="Kommentar schreiben…"
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-wellbeing-green-light resize-none"
                  />
                  <button
                    type="submit"
                    disabled={pending || !neuerKommentar.trim()}
                    className="px-3 py-2 text-sm bg-wellbeing-green text-white rounded-lg hover:bg-wellbeing-green-dark disabled:opacity-40 disabled:cursor-not-allowed"
                  >Senden</button>
                </form>
              </section>
            </div>

            {/* Rechts 1/3 — Status, Prio, Faelligkeit */}
            <aside className="px-6 py-5 space-y-5 bg-gray-50/40">
              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Status</label>
                <Dropdown
                  current={STATI.find((s) => s.id === status)?.label ?? ''}
                  options={STATI.map((s) => ({ id: s.id, label: s.label, klasse: s.klasse }))}
                  onSelect={(id) => {
                    const neu = id as AufgabeStatus
                    setStatus(neu)
                    speichern({ status: neu })
                  }}
                />
              </div>

              {/* Prio */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Priorität</label>
                <div className="space-y-1">
                  {PRIOS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setPrioritaet(p.id); speichern({ prioritaet: p.id }) }}
                      className={
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ' +
                        (prioritaet === p.id ? 'bg-wellbeing-green/10 text-wellbeing-green-dark' : 'hover:bg-gray-100 text-gray-700')
                      }
                    >
                      <span className={`w-2 h-2 rounded-full ${p.punkt}`} />
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Faelligkeit */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-2">
                  <Calendar className="inline w-3 h-3 mr-1" /> Fälligkeit
                </label>
                <input
                  type="date"
                  value={faelligAm}
                  onChange={(e) => setFaelligAm(e.target.value)}
                  onBlur={() => faelligAm !== (aufgabe.faellig_am ?? '') && speichern({ faellig_am: faelligAm || null })}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-wellbeing-green-light"
                />
              </div>

              {/* Verknuepfungen */}
              {pickerOptionen && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Verknüpfungen</label>
                  <AufgabeVerknuepfungenPicker
                    projektId={aufgabe.projekt_id}
                    kundeId={aufgabe.kunde_id}
                    raumId={aufgabe.raum_id}
                    projekte={pickerOptionen.projekte}
                    kunden={pickerOptionen.kunden}
                    raeume={pickerOptionen.raeume}
                    kompakt
                    onChange={(patch) => speichern(patch)}
                  />
                </div>
              )}

              {/* Zugewiesen an */}
              {pickerOptionen && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Zugewiesen an</label>
                  <AufgabeAssigneePicker
                    assigneeUserId={aufgabe.assignee_user_id}
                    assigneeKunde={aufgabe.assignee_kunde}
                    team={pickerOptionen.team}
                    currentUserId={pickerOptionen.currentUserId}
                    hasKunde={!!aufgabe.kunde_id}
                    onChange={(patch) => speichern(patch)}
                  />
                </div>
              )}

              {/* Sichtbarkeit fuer Kunde (auch wenn nicht assignee) */}
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aufgabe.sichtbar_fuer_kunde}
                    onChange={(e) => speichern({ sichtbar_fuer_kunde: e.target.checked })}
                    className="rounded text-wellbeing-green focus:ring-wellbeing-green/20"
                  />
                  Im Portal sichtbar (zur Info)
                </label>
              </div>

              <div className="pt-3 border-t border-gray-200 text-xs text-gray-400">
                Erstellt: {formatDateTime(aufgabe.created_at)}<br />
                Aktualisiert: {formatDateTime(aufgabe.updated_at)}
              </div>
            </aside>
          </div>
        </div>

        {/* Footer / Status-Bar */}
        <div className="px-6 py-2 border-t border-gray-100 shrink-0 flex items-center justify-between text-xs">
          {fehler ? (
            <span className="inline-flex items-center gap-1 text-red-600"><AlertCircle size={12} /> {fehler}</span>
          ) : pending ? (
            <span className="inline-flex items-center gap-1 text-gray-400"><Loader2 size={12} className="animate-spin" /> speichert…</span>
          ) : (
            <span className="text-gray-400">Änderungen werden automatisch gespeichert</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Hilfs-Komponenten ─────────────────────────────────────────
function Dropdown({
  current, options, onSelect,
}: {
  current: string
  options: { id: string; label: string; klasse?: string }[]
  onSelect: (id: string) => void
}) {
  const [offen, setOffen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOffen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
      >
        <span>{current}</span>
        <ChevronDown size={14} className="text-gray-400" />
      </button>
      {offen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOffen(false)} />
          <ul className="absolute z-20 mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {options.map((o) => (
              <li key={o.id}>
                <button
                  onClick={() => { onSelect(o.id); setOffen(false) }}
                  className={'w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-2 ' + (o.klasse ?? '')}
                >
                  <span className="px-1.5 py-0.5 rounded text-xs font-medium">{o.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function KommentarZeile({
  kommentar, currentUserId, onAktualisieren, onLoeschen,
}: {
  kommentar: AufgabeKommentar
  currentUserId: string | null
  onAktualisieren: (text: string) => Promise<boolean>
  onLoeschen: () => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(kommentar.inhalt)
  const [pending, setPending] = useState(false)
  const istEigener = !!currentUserId && kommentar.autor_user_id === currentUserId

  async function handleSave() {
    const t = text.trim()
    if (!t || t === kommentar.inhalt) { setEditing(false); return }
    setPending(true)
    const ok = await onAktualisieren(t)
    setPending(false)
    if (ok) setEditing(false)
  }

  return (
    <li className="flex items-start gap-2 group">
      <div className={
        'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ' +
        (kommentar.ist_kunde ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700')
      }>
        {(kommentar.autor_name ?? '?').slice(0, 1).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 flex items-center gap-2">
          <span className="font-medium text-gray-700">{kommentar.autor_name ?? 'Unbekannt'}</span>
          {kommentar.ist_kunde && <span className="text-amber-600">(Kunde)</span>}
          <span className="text-gray-400">{relativeZeit(kommentar.created_at)}</span>
          {istEigener && !editing && (
            <span className="ml-auto opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
              <button
                onClick={() => { setText(kommentar.inhalt); setEditing(true) }}
                aria-label="Bearbeiten"
                className="text-gray-400 hover:text-wellbeing-green p-0.5"
              >
                <Pencil size={11} />
              </button>
              <button
                onClick={onLoeschen}
                aria-label="Loeschen"
                className="text-gray-400 hover:text-red-500 p-0.5"
              >
                <Trash2 size={11} />
              </button>
            </span>
          )}
        </p>
        {editing ? (
          <div className="mt-1">
            <textarea
              rows={2}
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setEditing(false)
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave()
              }}
              className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-wellbeing-green-light resize-y"
            />
            <div className="flex items-center gap-2 mt-1 text-xs">
              <button
                onClick={handleSave}
                disabled={pending || !text.trim()}
                className="bg-wellbeing-green text-white px-3 py-1 rounded-md hover:bg-wellbeing-green-dark disabled:opacity-50"
              >Speichern</button>
              <button
                onClick={() => setEditing(false)}
                className="text-gray-500 hover:text-gray-700 px-2 py-1"
              >Abbrechen</button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-800 whitespace-pre-wrap mt-0.5">{kommentar.inhalt}</p>
        )}
      </div>
    </li>
  )
}

function AnhangZeile({ anhang, onLoeschen }: {
  anhang: AufgabeAnhang
  onLoeschen: () => void
}) {
  const [laden, setLaden] = useState(false)
  async function oeffnen() {
    setLaden(true)
    const res = await aufgabeAnhangSigniert(anhang.url)
    setLaden(false)
    if (res.url) window.open(res.url, '_blank')
  }
  return (
    <div className="group flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-50 px-2 py-1.5 rounded">
      <button
        onClick={oeffnen}
        className="flex items-center gap-2 flex-1 min-w-0 text-left hover:text-wellbeing-green"
      >
        {laden ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} className="text-gray-400" />}
        <span className="truncate">{anhang.name}</span>
        {anhang.size != null && (
          <span className="text-xs text-gray-400 shrink-0">{(anhang.size / 1024).toFixed(0)} KB</span>
        )}
      </button>
      <button
        onClick={onLoeschen}
        aria-label="Anhang loeschen"
        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 p-1 transition-opacity"
      >
        <X size={14} />
      </button>
    </div>
  )
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function relativeZeit(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'gerade eben'
  if (min < 60) return `vor ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `vor ${h} Std`
  const d = Math.floor(h / 24)
  if (d < 7) return `vor ${d} Tg`
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
}
