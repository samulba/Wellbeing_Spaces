'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Plus, ChevronRight, Calendar, List, X, Flag, Truck, Clock, Layers } from 'lucide-react'
import { eventErstellen, eventAktualisieren, eventLoeschen } from '@/app/actions/timeline'
import type { TimelineEvent, TimelineEventTyp, TimelineEventStatus } from '@/lib/supabase/types'
import { ConfirmModal } from '@/components/ConfirmModal'

// ── Konstanten ────────────────────────────────────────────────
const TYP_CONFIG: Record<TimelineEventTyp, { label: string; farbe: string; bgFarbe: string; icon: typeof Flag }> = {
  meilenstein: { label: 'Meilenstein', farbe: 'text-purple-600',  bgFarbe: 'bg-purple-100 border-purple-300',  icon: Flag  },
  lieferung:   { label: 'Lieferung',   farbe: 'text-blue-600',    bgFarbe: 'bg-blue-100 border-blue-300',      icon: Truck },
  termin:      { label: 'Termin',      farbe: 'text-emerald-600', bgFarbe: 'bg-emerald-100 border-emerald-300',icon: Clock },
  phase:       { label: 'Phase',       farbe: 'text-gray-600',    bgFarbe: 'bg-gray-100 border-gray-300',      icon: Layers},
}

const STATUS_CONFIG: Record<TimelineEventStatus, { label: string; klasse: string }> = {
  geplant:       { label: 'Geplant',       klasse: 'bg-gray-100 text-gray-600' },
  in_arbeit:     { label: 'In Arbeit',     klasse: 'bg-blue-50 text-blue-700' },
  abgeschlossen: { label: 'Abgeschlossen', klasse: 'bg-emerald-50 text-emerald-700' },
  verspaetet:    { label: 'Verspätet',     klasse: 'bg-red-50 text-red-700' },
}

const FARBEN_PALETTE = ['#445c49','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#10b981','#f97316','#6b7280']

const heute = new Date().toISOString().split('T')[0]

function verschiebeDatum(isoDatum: string, tageOffset: number): string {
  const d = new Date(isoDatum + 'T00:00:00')
  d.setDate(d.getDate() + tageOffset)
  return d.toISOString().split('T')[0]
}

function formatDatum(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function istUeberfaellig(event: TimelineEvent): boolean {
  if (event.status === 'abgeschlossen') return false
  const ref = event.end_datum ?? event.start_datum
  return ref < heute
}

// ── Event-Modal ───────────────────────────────────────────────
export function EventModal({
  projektId,
  event,
  alleEvents,
  onClose,
  onSave,
  onDelete,
  defaultRaumId,
}: {
  projektId: string
  event: Partial<TimelineEvent> | null
  alleEvents: TimelineEvent[]
  onClose: () => void
  onSave: (event: TimelineEvent) => void
  onDelete?: (id: string) => void
  /** Wenn gesetzt: neues Event wird diesem Raum zugeordnet */
  defaultRaumId?: string
}) {
  const isNeu = !event?.id
  const istAutoEvent = !!event?.quelle && event.quelle !== 'manuell'
  const [form, setForm] = useState({
    titel:          event?.titel          ?? '',
    beschreibung:   event?.beschreibung   ?? '',
    typ:            event?.typ            ?? 'termin' as TimelineEventTyp,
    start_datum:    event?.start_datum    ?? heute,
    end_datum:      event?.end_datum      ?? '',
    status:         event?.status         ?? 'geplant' as TimelineEventStatus,
    farbe:          event?.farbe          ?? '',
    verantwortlich: event?.verantwortlich ?? '',
    erinnerung_tage:event?.erinnerung_tage?.toString() ?? '',
    abhaengig_von:  event?.abhaengig_von  ?? [],
    kunde_sichtbar: event?.kunde_sichtbar ?? true,
  })
  const [isPending, startTransition] = useTransition()
  const [fehler, setFehler] = useState<string | null>(null)
  const [confirmLoeschen, setConfirmLoeschen] = useState(false)

  function handleSpeichern() {
    if (!form.titel.trim()) { setFehler('Titel ist erforderlich.'); return }
    if (!form.start_datum)  { setFehler('Datum ist erforderlich.'); return }
    startTransition(async () => {
      // Meilensteine haben kein Ende — Ende = Start, damit Gantt + List korrekt rendern
      const istMeilenstein = form.typ === 'meilenstein'
      const daten: Record<string, unknown> = {
        titel:          form.titel.trim(),
        beschreibung:   form.beschreibung || null,
        typ:            form.typ,
        start_datum:    form.start_datum,
        end_datum:      istMeilenstein ? null : (form.end_datum || null),
        status:         form.status,
        farbe:          form.farbe || null,
        verantwortlich: form.verantwortlich || null,
        erinnerung_tage:form.erinnerung_tage ? parseInt(form.erinnerung_tage) : null,
        kunde_sichtbar: form.kunde_sichtbar,
      }
      // abhaengig_von nur senden wenn wirklich Abhängigkeiten gesetzt sind —
      // vermeidet Schema-Cache-Fehler wenn die Spalte evtl. nicht existiert,
      // und reduziert unnötige Payload-Größe.
      if (form.abhaengig_von.length > 0) {
        daten.abhaengig_von = form.abhaengig_von
      }
      // Bei neuem Event + defaultRaumId (aus RaumEventButton) den Raum mitgeben.
      // Beim Bearbeiten lassen wir raum_id unberührt.
      if (isNeu && defaultRaumId) {
        daten.raum_id = defaultRaumId
      } else if (!isNeu && event?.raum_id) {
        daten.raum_id = event.raum_id
      }
      if (isNeu) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = await eventErstellen(projektId, daten as any)
        if (res.fehler || !res.id) {
          setFehler(res.fehler ?? 'Event konnte nicht erstellt werden.')
          return
        }
        onSave({
          id: res.id, projekt_id: projektId, reihenfolge: 0,
          quelle: 'manuell', quelle_id: null,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          ...daten,
        } as unknown as TimelineEvent)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = await eventAktualisieren(event!.id!, projektId, daten as any)
        if (res.fehler) {
          setFehler(res.fehler)
          return
        }
        onSave({ ...event, ...daten } as unknown as TimelineEvent)
      }
      onClose()
    })
  }

  function handleLoeschen() {
    if (!event?.id) return
    startTransition(async () => {
      await eventLoeschen(event.id!, projektId)
      onDelete?.(event.id!)
      onClose()
    })
    setConfirmLoeschen(false)
  }

  const set = <K extends keyof typeof form>(key: K, val: typeof form[K]) =>
    setForm((f) => ({ ...f, [key]: val }))

  return (
    <>
    <ConfirmModal
      isOpen={confirmLoeschen}
      onClose={() => setConfirmLoeschen(false)}
      onConfirm={handleLoeschen}
      title="Event löschen"
      message={`„${event?.titel ?? 'Dieses Event'}" wird unwiderruflich gelöscht.`}
      confirmText="Löschen"
      isLoading={isPending}
    />
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">{isNeu ? 'Neues Event' : 'Event bearbeiten'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quelle-Badge bei Auto-Events */}
        {istAutoEvent && (
          <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 flex items-start gap-2.5">
            <span className="text-amber-600 mt-0.5 shrink-0">⚡</span>
            <div className="flex-1 text-xs text-amber-800 leading-relaxed">
              <strong className="font-semibold">Auto-Event aus: {event?.quelle}</strong><br />
              Titel und Datum werden automatisch aus der Quelle synchronisiert. Manuelle Änderungen werden beim nächsten Sync überschrieben.
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Titel */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Titel *</label>
            <input type="text" value={form.titel} onChange={(e) => set('titel', e.target.value)}
              placeholder="z.B. Lieferung Möbel Wohnzimmer"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition"
            />
          </div>

          {/* Typ */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Typ</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(TYP_CONFIG) as [TimelineEventTyp, typeof TYP_CONFIG[TimelineEventTyp]][]).map(([typ, cfg]) => {
                const Icon = cfg.icon
                return (
                  <button
                    key={typ}
                    type="button"
                    onClick={() => set('typ', typ)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                      form.typ === typ
                        ? `border-current ${cfg.farbe} ${cfg.bgFarbe}`
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Datum */}
          {form.typ === 'phase' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Startdatum *</label>
                <input type="date" value={form.start_datum} onChange={(e) => set('start_datum', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Enddatum</label>
                <input type="date" value={form.end_datum} onChange={(e) => set('end_datum', e.target.value)}
                  min={form.start_datum}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Datum *</label>
              <input type="date" value={form.start_datum} onChange={(e) => set('start_datum', e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition"
              />
            </div>
          )}

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value as TimelineEventStatus)}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition">
              {(Object.entries(STATUS_CONFIG) as [TimelineEventStatus, typeof STATUS_CONFIG[TimelineEventStatus]][]).map(([s, cfg]) => (
                <option key={s} value={s}>{cfg.label}</option>
              ))}
            </select>
          </div>

          {/* Beschreibung */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Beschreibung</label>
            <textarea rows={2} value={form.beschreibung} onChange={(e) => set('beschreibung', e.target.value)}
              placeholder="Optionale Details…"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition resize-none"
            />
          </div>

          {/* Verantwortlich + Farbe */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Verantwortlich</label>
              <input type="text" value={form.verantwortlich} onChange={(e) => set('verantwortlich', e.target.value)}
                placeholder="z.B. Max M."
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Farbe</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {FARBEN_PALETTE.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => set('farbe', f === form.farbe ? '' : f)}
                    className={`w-6 h-6 rounded-full transition-all ${form.farbe === f ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : ''}`}
                    style={{ backgroundColor: f }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Abhängigkeiten (Multi-Select) */}
          {alleEvents.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Hängt ab von
                <span className="ml-1 text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-xl bg-gray-50 p-2 space-y-1">
                {alleEvents
                  .filter((e) => e.id !== event?.id)
                  .map((e) => {
                    const selected = form.abhaengig_von.includes(e.id)
                    return (
                      <label
                        key={e.id}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                          selected ? 'bg-wellbeing-green/10' : 'hover:bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(ev) => {
                            const next = ev.target.checked
                              ? [...form.abhaengig_von, e.id]
                              : form.abhaengig_von.filter((id) => id !== e.id)
                            set('abhaengig_von', next)
                          }}
                          className="w-3.5 h-3.5 accent-wellbeing-green"
                        />
                        <span className="text-xs text-gray-700 flex-1 truncate">{e.titel}</span>
                        <span className="text-[10px] text-gray-400 tabular-nums">{formatDatum(e.start_datum)}</span>
                      </label>
                    )
                  })
                }
                {alleEvents.filter((e) => e.id !== event?.id).length === 0 && (
                  <p className="text-[11px] text-gray-400 text-center py-2">Keine anderen Events zum Verknüpfen.</p>
                )}
              </div>
            </div>
          )}

          {/* Kunde-sichtbar Toggle */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
            <button
              type="button"
              onClick={() => set('kunde_sichtbar', !form.kunde_sichtbar)}
              className={`shrink-0 mt-0.5 flex items-center p-0 border-0 rounded-full transition-colors cursor-pointer ${
                form.kunde_sichtbar ? 'bg-wellbeing-green justify-end pr-[3px]' : 'bg-gray-300 justify-start pl-[3px]'
              }`}
              style={{ width: 40, height: 22, boxSizing: 'border-box' }}
              role="switch"
              aria-checked={form.kunde_sichtbar}
            >
              <span
                className="block bg-white rounded-full shadow-sm"
                style={{ width: 16, height: 16 }}
              />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">Für Kunde im Portal sichtbar</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Aus, wenn dieses Event nur intern ist (z.B. Bestellung, internes Meeting).
              </p>
            </div>
          </div>
        </div>

        {fehler && <p className="text-xs text-red-500 mt-3">{fehler}</p>}

        <div className="flex gap-3 mt-6">
          {!isNeu && (
            <button onClick={() => setConfirmLoeschen(true)} disabled={isPending}
              className="px-4 py-2.5 text-xs font-medium text-red-500 border border-red-200 hover:bg-red-50 rounded-xl transition disabled:opacity-50">
              Löschen
            </button>
          )}
          <div className="flex-1 flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 rounded-xl transition">Abbrechen</button>
            <button onClick={handleSpeichern} disabled={isPending}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 rounded-xl transition">
              {isPending ? 'Speichern…' : isNeu ? 'Erstellen' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

// ── Gantt-Chart ───────────────────────────────────────────────
function GanttChart({
  events,
  onEventClick,
  onEventMove,
}: {
  events: TimelineEvent[]
  onEventClick: (e: TimelineEvent) => void
  onEventMove?: (id: string, neuStart: string, neuEnde: string | null, tageOffset: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Drag-State: aktuell gezogener Event + Pixel-Offset
  const [drag, setDrag] = useState<{ id: string; startX: number; dxPx: number } | null>(null)

  // Zeitbereich berechnen (auch bei leeren events)
  const tagBreite = 32

  const alleStartDaten = events.length > 0 ? events.map((e) => e.start_datum) : [heute]
  const alleEndDaten   = events.length > 0 ? events.map((e) => e.end_datum ?? e.start_datum) : [heute]
  const minDatum       = alleStartDaten.reduce((a, b) => a < b ? a : b)
  const maxDatum       = alleEndDaten.reduce((a, b) => a > b ? a : b)

  const startDate = new Date(Math.min(new Date(minDatum).getTime(), new Date(heute).getTime()))
  const endDate   = new Date(Math.max(new Date(maxDatum).getTime(), new Date(heute).getTime()))
  startDate.setDate(startDate.getDate() - 7)
  endDate.setDate(endDate.getDate() + 14)

  const totalTage = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000)

  function datumZuX(datumStr: string): number {
    const d = new Date(datumStr + 'T00:00:00')
    return Math.round((d.getTime() - startDate.getTime()) / 86400000) * tagBreite
  }

  const monate: { label: string; x: number; breite: number }[] = []
  const cursor = new Date(startDate)
  cursor.setDate(1)
  while (cursor <= endDate) {
    const monatStart = new Date(cursor)
    const monatEnde  = new Date(cursor)
    monatEnde.setMonth(monatEnde.getMonth() + 1)
    const xStart = datumZuX(monatStart.toISOString().split('T')[0])
    const xEnde  = datumZuX(monatEnde.toISOString().split('T')[0])
    monate.push({
      label: monatStart.toLocaleDateString('de-DE', { month: 'long', year: '2-digit' }),
      x: Math.max(0, xStart),
      breite: xEnde - Math.max(0, xStart),
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  // Wochen-Markierungen (alle Montage)
  const wochen: { x: number; label: string }[] = []
  const wCursor = new Date(startDate)
  // zum nächsten Montag vorspringen
  while (wCursor.getDay() !== 1) wCursor.setDate(wCursor.getDate() + 1)
  while (wCursor <= endDate) {
    wochen.push({
      x: datumZuX(wCursor.toISOString().split('T')[0]),
      label: wCursor.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
    })
    wCursor.setDate(wCursor.getDate() + 7)
  }

  const heuteX      = datumZuX(heute)
  const totalBreite = totalTage * tagBreite

  // Heute-Linie initial sichtbar machen (Hook IMMER vor returns)
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = Math.max(0, heuteX - 200)
    }
  }, [heuteX])

  // ── Event-Position-Lookup (für Abhängigkeits-Pfeile) ──────────
  // events sind schon nach start_datum sortiert → Index = Zeile
  const rowHoehe = 44
  const achsenHoehe = 36
  const eventIndex = new Map(events.map((e, i) => [e.id, i]))
  function eventMitte(e: TimelineEvent): { xStart: number; xEnde: number; y: number } {
    const xStart = datumZuX(e.start_datum)
    const xEnde  = e.typ === 'meilenstein'
      ? xStart + tagBreite / 2
      : datumZuX(e.end_datum ?? e.start_datum) + tagBreite
    const y = achsenHoehe + (eventIndex.get(e.id) ?? 0) * rowHoehe + rowHoehe / 2
    return { xStart, xEnde, y }
  }

  // ── Drag-Handler (window-Listener) ────────────────────────────
  useEffect(() => {
    if (!drag) return
    function onMove(ev: MouseEvent) {
      setDrag((d) => d ? { ...d, dxPx: ev.clientX - d.startX } : d)
    }
    function onUp() {
      setDrag((d) => {
        if (d && onEventMove) {
          const tageOffset = Math.round(d.dxPx / tagBreite)
          if (tageOffset !== 0) {
            const ev = events.find((e) => e.id === d.id)
            if (ev) {
              const neuStart = verschiebeDatum(ev.start_datum, tageOffset)
              const neuEnde  = ev.end_datum ? verschiebeDatum(ev.end_datum, tageOffset) : null
              onEventMove(d.id, neuStart, neuEnde, tageOffset)
            }
          }
        }
        return null
      })
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, events, onEventMove])

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-gray-200 bg-white">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Calendar className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-700 mb-1">Noch keine Ereignisse</p>
        <p className="text-xs text-gray-400 max-w-xs text-center">
          Lege den ersten Meilenstein, Liefertermin oder eine Phase an — die Gantt-Ansicht wird dann aktiv.
        </p>
      </div>
    )
  }

  const chartHoehe = achsenHoehe + events.length * rowHoehe + 16
  const SIDEBAR_BREITE = 260

  return (
    <div className="flex rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* ── Linke Sidebar: Event-Namen (sticky beim horizontalen Scroll) ── */}
      <div
        className="shrink-0 border-r border-gray-200 bg-gray-50/40"
        style={{ width: SIDEBAR_BREITE }}
      >
        {/* Header (gleiche Höhe wie Zeitachse rechts) */}
        <div
          className="sticky top-0 z-20 bg-gray-50/90 backdrop-blur-md border-b border-gray-200 px-4 flex items-center"
          style={{ height: achsenHoehe }}
        >
          <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
            Ereignis ({events.length})
          </span>
        </div>
        {/* Namen-Liste */}
        {events.map((event, idx) => {
          const cfg = TYP_CONFIG[event.typ]
          const stCfg = STATUS_CONFIG[event.status]
          const Icon = cfg.icon
          const ueberfaellig = istUeberfaellig(event)
          const istAuto = event.quelle && event.quelle !== 'manuell'
          return (
            <button
              key={event.id}
              type="button"
              onClick={() => onEventClick(event)}
              className={`w-full flex items-center gap-2 px-3 text-left transition-colors ${
                idx % 2 === 0 ? '' : 'bg-gray-50/60'
              } ${ueberfaellig ? 'hover:bg-red-50/50' : 'hover:bg-wellbeing-green/5'}`}
              style={{ height: rowHoehe }}
            >
              <div
                className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 border ${cfg.bgFarbe}`}
                style={event.farbe ? { backgroundColor: event.farbe + '22', borderColor: event.farbe + '66' } : undefined}
              >
                <Icon className={`w-3.5 h-3.5 ${cfg.farbe}`} style={event.farbe ? { color: event.farbe } : undefined} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <p className={`text-xs font-medium truncate ${ueberfaellig ? 'text-red-700' : 'text-gray-900'}`}>
                    {event.titel}
                  </p>
                  {istAuto && <span className="text-[10px] text-amber-600" title="Auto-Event">⚡</span>}
                </div>
                <span className={`inline-block mt-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded ${stCfg.klasse}`}>
                  {stCfg.label}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Rechte Spalte: Scrollbare Zeitleiste ── */}
      <div className="flex-1 overflow-x-auto" ref={containerRef}>
        <div style={{ minWidth: totalBreite + 80, position: 'relative' }}>
        {/* Zeitachse: Monats-Zeile + Wochen-Zeile */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200" style={{ height: achsenHoehe }}>
          {/* Monats-Blöcke (obere Hälfte) */}
          <div className="relative border-b border-gray-100" style={{ height: achsenHoehe / 2 }}>
            {monate.map((m, i) => (
              <div
                key={i}
                className="absolute flex items-center text-[11px] font-semibold text-gray-700 capitalize border-l border-gray-100 h-full px-2"
                style={{ left: m.x, width: m.breite }}
              >
                {m.label}
              </div>
            ))}
          </div>
          {/* Wochen-Ticks (untere Hälfte) */}
          <div className="relative" style={{ height: achsenHoehe / 2 }}>
            {wochen.map((w, i) => (
              <div
                key={i}
                className="absolute text-[9px] text-gray-400 tabular-nums border-l border-gray-100 h-full pl-1 flex items-center"
                style={{ left: w.x }}
              >
                {w.label}
              </div>
            ))}
          </div>
          {/* Heute-Markierung in Achse */}
          <div className="absolute top-0 bottom-0 flex flex-col items-center" style={{ left: heuteX - 1, width: 2 }}>
            <div className="w-full h-full bg-red-400/70" />
            <div className="absolute -top-0.5 -translate-x-1/2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ left: 1 }}>
              HEUTE
            </div>
          </div>
        </div>

        {/* Hintergrund-Grid: Wochen als vertikale Linien */}
        <div className="absolute pointer-events-none" style={{ left: 0, top: achsenHoehe, width: totalBreite, height: chartHoehe - achsenHoehe }}>
          {wochen.map((w, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 border-l border-gray-100"
              style={{ left: w.x }}
            />
          ))}
          {/* Heute-Linie */}
          <div className="absolute top-0 bottom-0 w-px bg-red-300/60" style={{ left: heuteX }} />
        </div>

        {/* Abhängigkeits-Pfeile (SVG-Overlay, non-interactive) */}
        <svg
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ width: totalBreite + 200, height: achsenHoehe + events.length * rowHoehe + 16, zIndex: 5 }}
        >
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6 Z" fill="#94c1a4" />
            </marker>
            <marker id="arrowhead-warn" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6 Z" fill="#ef4444" />
            </marker>
          </defs>
          {events.flatMap((child) =>
            (child.abhaengig_von ?? []).map((parentId) => {
              const parent = events.find((e) => e.id === parentId)
              if (!parent) return null
              const p = eventMitte(parent)
              const c = eventMitte(child)
              const konflikt = new Date(child.start_datum) < new Date(parent.end_datum ?? parent.start_datum)
              const mx = (p.xEnde + c.xStart) / 2
              const color = konflikt ? '#ef4444' : '#94c1a4'
              return (
                <path
                  key={`${parent.id}-${child.id}`}
                  d={`M ${p.xEnde} ${p.y} C ${mx} ${p.y}, ${mx} ${c.y}, ${c.xStart - 4} ${c.y}`}
                  stroke={color}
                  strokeWidth="1.5"
                  fill="none"
                  strokeDasharray={konflikt ? '4 3' : undefined}
                  opacity="0.75"
                  markerEnd={`url(#${konflikt ? 'arrowhead-warn' : 'arrowhead'})`}
                />
              )
            })
          )}
        </svg>

        {/* Event-Zeilen */}
        {events.map((event, idx) => {
          const cfg       = TYP_CONFIG[event.typ]
          const x         = datumZuX(event.start_datum)
          const endX      = datumZuX(event.end_datum ?? event.start_datum)
          const istMeilenstein = event.typ === 'meilenstein'
          // Balken-Mindestbreite deutlich erhöht, damit Name reinpasst
          const rohBreite = endX - x + tagBreite
          const breite    = istMeilenstein ? 14 : Math.max(80, rohBreite)
          const breiteFuerLabel = istMeilenstein ? 0 : rohBreite
          const labelInBalken = !istMeilenstein && breiteFuerLabel >= 120
          const ueberfaellig = istUeberfaellig(event)
          const farbe     = event.farbe ?? (cfg.farbe.includes('purple') ? '#8b5cf6' : cfg.farbe.includes('blue') ? '#3b82f6' : cfg.farbe.includes('emerald') ? '#10b981' : '#6b7280')
          const istAuto   = event.quelle && event.quelle !== 'manuell'
          const istDragging = drag?.id === event.id
          const dragX     = istDragging ? drag.dxPx : 0

          function handleMouseDown(ev: React.MouseEvent) {
            if (!onEventMove || istAuto) return
            ev.preventDefault()
            setDrag({ id: event.id, startX: ev.clientX, dxPx: 0 })
          }

          return (
            <div
              key={event.id}
              className={`relative transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/40'} hover:bg-wellbeing-green/5`}
              style={{ height: rowHoehe }}
            >
              {istMeilenstein ? (
                <>
                  {/* Diamant für Meilenstein */}
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rotate-45 transition-transform shadow-sm ${
                      istAuto ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
                    } ${istDragging ? '' : 'hover:scale-125'} ${istAuto ? 'ring-2 ring-amber-300 ring-offset-1' : ''}`}
                    style={{ left: x + tagBreite / 2 + dragX, backgroundColor: farbe, zIndex: istDragging ? 20 : 10 }}
                    onMouseDown={handleMouseDown}
                    onClick={() => { if (!istDragging) onEventClick(event) }}
                    title={istAuto ? `${event.titel} (Auto-Sync aus ${event.quelle})` : event.titel}
                  />
                  {/* Label rechts vom Diamant */}
                  <button
                    type="button"
                    onClick={() => onEventClick(event)}
                    className="absolute top-1/2 -translate-y-1/2 text-[11px] font-medium truncate max-w-[200px] hover:underline text-left"
                    style={{ left: x + tagBreite / 2 + 14 + dragX, color: ueberfaellig ? '#ef4444' : farbe }}
                  >
                    {ueberfaellig && '⚠ '}{event.titel}
                  </button>
                </>
              ) : (
                <>
                  {/* Balken */}
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 h-7 rounded-lg transition-all flex items-center overflow-hidden shadow-sm ${
                      labelInBalken ? 'px-2.5' : ''
                    } ${istAuto ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'} ${istDragging ? 'opacity-60 ring-2 ring-wellbeing-green' : 'hover:shadow'}`}
                    style={{
                      left: x + dragX,
                      width: breite,
                      backgroundColor: farbe + 'dd',
                      border: istAuto ? `1.5px dashed ${farbe}` : `1.5px solid ${farbe}`,
                      zIndex: istDragging ? 20 : 10,
                    }}
                    onMouseDown={handleMouseDown}
                    onClick={() => { if (!istDragging) onEventClick(event) }}
                    title={`${event.titel}${istAuto ? ` (Auto-Sync aus ${event.quelle})` : ''}`}
                  >
                    {labelInBalken && (
                      <>
                        {istAuto && <span className="text-[10px] text-white/90 mr-1">⚡</span>}
                        <span className="text-[11px] font-medium text-white truncate whitespace-nowrap">
                          {ueberfaellig && '⚠ '}{event.titel}
                        </span>
                      </>
                    )}
                  </div>
                  {/* Label rechts wenn Balken zu kurz */}
                  {!labelInBalken && (
                    <button
                      type="button"
                      onClick={() => onEventClick(event)}
                      className="absolute top-1/2 -translate-y-1/2 text-[11px] font-medium truncate max-w-[200px] hover:underline text-left flex items-center gap-1"
                      style={{ left: x + breite + 8 + dragX, color: ueberfaellig ? '#ef4444' : farbe }}
                    >
                      {istAuto && <span>⚡</span>}
                      {ueberfaellig && <span>⚠</span>}
                      {event.titel}
                    </button>
                  )}
                </>
              )}
            </div>
          )
        })}

          {/* Puffer */}
          <div style={{ height: 16 }} />
        </div>
      </div>
    </div>
  )
}

// ── Listenansicht ─────────────────────────────────────────────
function kurzesDatum(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  const h = new Date(heute + 'T00:00:00')
  const diffTage = Math.round((d.getTime() - h.getTime()) / (1000 * 60 * 60 * 24))
  if (diffTage === 0) return 'Heute'
  if (diffTage === 1) return 'Morgen'
  if (diffTage === -1) return 'Gestern'
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
}

function ListenAnsicht({ events, onEventClick }: { events: TimelineEvent[]; onEventClick: (e: TimelineEvent) => void }) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Calendar className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-700 mb-1">Noch keine Ereignisse in diesem Zeitraum</p>
        <p className="text-xs text-gray-400 max-w-xs">
          Füge Meilensteine, Lieferungen oder Phasen hinzu, um den Projektverlauf zu planen.
        </p>
      </div>
    )
  }

  // Gruppiert nach Monat
  const gruppen: Record<string, TimelineEvent[]> = {}
  for (const ev of events) {
    const monat = ev.start_datum.slice(0, 7)
    if (!gruppen[monat]) gruppen[monat] = []
    gruppen[monat].push(ev)
  }

  return (
    <div className="space-y-8">
      {Object.entries(gruppen).sort(([a], [b]) => a.localeCompare(b)).map(([monat, evs]) => {
        const [jahr, mon] = monat.split('-')
        const monatLabel  = new Date(parseInt(jahr), parseInt(mon) - 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
        const monatOffen     = evs.filter((e) => e.status !== 'abgeschlossen').length
        const monatErledigt  = evs.filter((e) => e.status === 'abgeschlossen').length
        return (
          <div key={monat}>
            {/* Monats-Header mit Stats */}
            <div className="flex items-baseline justify-between mb-3 pb-2 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 tracking-tight">{monatLabel}</h3>
              <div className="flex items-center gap-3 text-[11px] text-gray-400">
                <span>{evs.length} {evs.length === 1 ? 'Ereignis' : 'Ereignisse'}</span>
                {monatErledigt > 0 && <span className="text-emerald-600">{monatErledigt} erledigt</span>}
                {monatOffen > 0 && <span className="text-amber-600">{monatOffen} offen</span>}
              </div>
            </div>

            {/* Event-Liste mit Zeitstrahl */}
            <div className="relative pl-6">
              {/* Vertikale Linie links */}
              <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gray-200" />

              <div className="space-y-2">
                {evs.map((ev) => {
                  const cfg         = TYP_CONFIG[ev.typ]
                  const statusCfg   = STATUS_CONFIG[ev.status]
                  const ueberfaellig= istUeberfaellig(ev)
                  const Icon        = cfg.icon
                  const mehrtaegig  = ev.end_datum && ev.end_datum !== ev.start_datum
                  return (
                    <div key={ev.id} className="relative">
                      {/* Datum-Punkt auf der Zeitleiste */}
                      <div
                        className={`absolute -left-6 top-3 w-[18px] h-[18px] rounded-full border-2 bg-white flex items-center justify-center ${
                          ueberfaellig
                            ? 'border-red-400'
                            : ev.status === 'abgeschlossen'
                              ? 'border-emerald-400'
                              : 'border-gray-300'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          ueberfaellig
                            ? 'bg-red-400'
                            : ev.status === 'abgeschlossen'
                              ? 'bg-emerald-400'
                              : 'bg-gray-300'
                        }`} />
                      </div>
                      <button
                        onClick={() => onEventClick(ev)}
                        className={`w-full flex items-center gap-3 bg-white border rounded-xl px-4 py-3 text-left group transition-all ${
                          ueberfaellig
                            ? 'border-red-200 hover:border-red-300'
                            : 'border-gray-200 hover:border-wellbeing-green/40 hover:shadow-sm'
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${cfg.bgFarbe}`}
                          style={ev.farbe ? { backgroundColor: ev.farbe + '22', borderColor: ev.farbe + '66', color: ev.farbe } : undefined}
                        >
                          <Icon className={`w-4 h-4 ${!ev.farbe ? cfg.farbe : ''}`} style={ev.farbe ? { color: ev.farbe } : undefined} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-sm font-medium truncate ${
                              ueberfaellig ? 'text-red-700' : 'text-gray-900'
                            } group-hover:text-wellbeing-green transition-colors`}>
                              {ev.titel}
                            </p>
                            {ueberfaellig && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                                Überfällig
                              </span>
                            )}
                            {ev.quelle && ev.quelle !== 'manuell' && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
                                Auto
                              </span>
                            )}
                          </div>
                          {ev.beschreibung && (
                            <p className="text-[11px] text-gray-500 truncate mt-0.5">{ev.beschreibung}</p>
                          )}
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
                            <span className="tabular-nums">{kurzesDatum(ev.start_datum)}</span>
                            {mehrtaegig && (
                              <>
                                <span>→</span>
                                <span className="tabular-nums">{kurzesDatum(ev.end_datum!)}</span>
                              </>
                            )}
                            {ev.verantwortlich && (
                              <>
                                <span>·</span>
                                <span className="truncate">{ev.verantwortlich}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${statusCfg.klasse}`}>
                          {statusCfg.label}
                        </span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Haupt-Komponente ──────────────────────────────────────────
export default function TimelineView({
  projektId,
  projektName,
  initialEvents,
  raeume,
}: {
  projektId: string
  projektName: string
  initialEvents: TimelineEvent[]
  raeume?: { id: string; name: string }[]
}) {
  const searchParams = useSearchParams()
  const initialRaum  = searchParams?.get('raum')
  const [events,      setEvents]      = useState(initialEvents)
  const [ansicht,     setAnsicht]     = useState<'gantt' | 'liste'>('gantt')
  const [modalEvent,  setModalEvent]  = useState<Partial<TimelineEvent> | null | false>(false) // false = geschlossen
  const [filterStatus, setFilterStatus] = useState<'alle' | 'offen' | 'ueberfaellig'>('alle')
  const [filterRaum,   setFilterRaum]   = useState<string | 'alle'>(initialRaum ?? 'alle')
  const [kaskaden, setKaskaden] = useState(false)

  /**
   * Balken im Gantt wurde per Drag verschoben. Wenn kaskaden=true werden
   * alle (transitiv) abhängigen Events um denselben Offset mitverschoben.
   */
  async function handleEventMove(id: string, neuStart: string, neuEnde: string | null, tageOffset: number) {
    // Lokale Updates in einem Rutsch sammeln
    const ids = new Set<string>([id])
    if (kaskaden) {
      // transitive Abhängigkeits-Kinder einsammeln
      let geaendert = true
      while (geaendert) {
        geaendert = false
        for (const e of events) {
          if (ids.has(e.id)) continue
          if ((e.abhaengig_von ?? []).some((parentId) => ids.has(parentId))) {
            ids.add(e.id)
            geaendert = true
          }
        }
      }
    }

    // Optimistisches State-Update
    setEvents((prev) => prev.map((e) => {
      if (!ids.has(e.id)) return e
      if (e.id === id) return { ...e, start_datum: neuStart, end_datum: neuEnde }
      // abhängiges Event: gleicher Offset
      return {
        ...e,
        start_datum: verschiebeDatum(e.start_datum, tageOffset),
        end_datum:   e.end_datum ? verschiebeDatum(e.end_datum, tageOffset) : null,
      }
    }).sort((a, b) => a.start_datum.localeCompare(b.start_datum)))

    // Server-Updates parallel
    await Promise.all(Array.from(ids).map((eid) => {
      const ev = events.find((e) => e.id === eid)
      if (!ev) return Promise.resolve()
      const start = eid === id ? neuStart : verschiebeDatum(ev.start_datum, tageOffset)
      const ende  = eid === id ? neuEnde  : (ev.end_datum ? verschiebeDatum(ev.end_datum, tageOffset) : null)
      return eventAktualisieren(eid, projektId, { start_datum: start, end_datum: ende })
    }))
  }

  const gefilterteEvents = events.filter((e) => {
    if (filterStatus === 'offen' && e.status === 'abgeschlossen') return false
    if (filterStatus === 'ueberfaellig' && !istUeberfaellig(e))   return false
    if (filterRaum !== 'alle') {
      if (filterRaum === 'projekt') return !e.raum_id
      if (e.raum_id !== filterRaum) return false
    }
    return true
  })

  const ueberfaelligCount = events.filter(istUeberfaellig).length

  function handleSave(saved: TimelineEvent) {
    setEvents((prev) => {
      const idx = prev.findIndex((e) => e.id === saved.id)
      if (idx >= 0) {
        const neu = [...prev]
        neu[idx] = saved
        return neu
      }
      return [...prev, saved].sort((a, b) => a.start_datum.localeCompare(b.start_datum))
    })
  }

  function handleDelete(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <>
      {modalEvent !== false && (
        <EventModal
          projektId={projektId}
          event={modalEvent}
          alleEvents={events}
          onClose={() => setModalEvent(false)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href={`/dashboard/projekte/${projektId}`} className="hover:text-wellbeing-green transition-colors">
            {projektName}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-900 font-medium">Timeline</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Kaskaden-Toggle (nur im Gantt sinnvoll) */}
          {ansicht === 'gantt' && (
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer pr-2 select-none"
              title="Wenn aktiv, werden beim Verschieben eines Events auch alle davon abhängigen Events um denselben Zeitraum verschoben.">
              <input
                type="checkbox"
                checked={kaskaden}
                onChange={(e) => setKaskaden(e.target.checked)}
                className="w-3.5 h-3.5 accent-wellbeing-green"
              />
              Abhängige mitverschieben
            </label>
          )}
          {/* Ansicht-Toggle */}
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setAnsicht('gantt')}
              className={`px-3 py-1.5 transition-colors ${ansicht === 'gantt' ? 'bg-wellbeing-green text-white' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
              title="Gantt"
            >
              <Calendar className="w-4 h-4" />
            </button>
            <button
              onClick={() => setAnsicht('liste')}
              className={`px-3 py-1.5 border-l border-gray-200 transition-colors ${ansicht === 'liste' ? 'bg-wellbeing-green text-white' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
              title="Liste"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => setModalEvent({})}
            className="flex items-center gap-1.5 px-4 py-2 bg-wellbeing-green hover:bg-wellbeing-green-dark text-white text-sm font-medium rounded-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            Event
          </button>
        </div>
      </div>

      {/* Filter + Stats */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 bg-white shrink-0">
        {[
          { key: 'alle',          label: `Alle (${events.length})` },
          { key: 'offen',         label: `Offen (${events.filter((e) => e.status !== 'abgeschlossen').length})` },
          { key: 'ueberfaellig',  label: `Überfällig (${ueberfaelligCount})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key as typeof filterStatus)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              filterStatus === key
                ? key === 'ueberfaellig' && ueberfaelligCount > 0
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : 'bg-wellbeing-green/10 text-wellbeing-green border border-wellbeing-green/20'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Raum-Filter */}
      {raeume && raeume.length > 0 && (
        <div className="flex items-center gap-2 px-6 py-2.5 border-b border-gray-100 bg-gray-50/40 shrink-0 overflow-x-auto">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 shrink-0">Raum</span>
          {[
            { key: 'alle' as const, label: 'Alle' },
            { key: 'projekt' as const, label: 'Projekt-Ebene' },
            ...raeume.map((r) => ({ key: r.id, label: r.name })),
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterRaum(key)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
                filterRaum === key
                  ? 'bg-wellbeing-green text-white'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Inhalt */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {gefilterteEvents.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              {events.length === 0 ? 'Noch keine Events angelegt.' : 'Keine Events für den gewählten Filter.'}
            </p>
            {events.length === 0 && (
              <button onClick={() => setModalEvent({})} className="mt-3 text-sm text-wellbeing-green underline underline-offset-2">
                Erstes Event erstellen
              </button>
            )}
          </div>
        ) : ansicht === 'gantt' ? (
          <GanttChart
            events={gefilterteEvents}
            onEventClick={(e) => setModalEvent(e)}
            onEventMove={handleEventMove}
          />
        ) : (
          <ListenAnsicht events={gefilterteEvents} onEventClick={(e) => setModalEvent(e)} />
        )}
      </div>
    </>
  )
}
