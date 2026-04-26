'use client'

import { ChevronDown, FolderOpen, User, Layers, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type {
  AufgabePickerProjekt, AufgabePickerKunde, AufgabePickerRaum,
} from '@/app/actions/aufgaben'

/**
 * Wiederverwendbarer Picker-Block fuer Projekt + Kunde + Raum.
 *
 * - Projekt-Auswahl filtert Raum-Optionen automatisch
 * - Projekt-Auswahl setzt kunde_id automatisch (kann manuell ueberschrieben werden)
 * - Wenn kein Projekt gewaehlt: alle Raeume verfuegbar (organisationsweit)
 */
export default function AufgabeVerknuepfungenPicker({
  projektId, kundeId, raumId,
  projekte, kunden, raeume,
  onChange,
  kompakt = false,
}: {
  projektId: string | null
  kundeId:   string | null
  raumId:    string | null
  projekte:  AufgabePickerProjekt[]
  kunden:    AufgabePickerKunde[]
  raeume:    AufgabePickerRaum[]
  onChange:  (patch: { projekt_id?: string | null; kunde_id?: string | null; raum_id?: string | null }) => void
  kompakt?:  boolean
}) {
  const verfuegbareRaeume = projektId
    ? raeume.filter((r) => r.projekt_id === projektId)
    : raeume

  function handleProjektChange(neueProjektId: string | null) {
    if (neueProjektId === projektId) return
    const projekt = projekte.find((p) => p.id === neueProjektId)
    // Auto-Kunden-Sync: wenn neues Projekt gewaehlt + Projekt hat kunde_id +
    // bisher kein Kunde gesetzt ODER bisheriger Kunde war der vom alten Projekt,
    // dann uebernehme den neuen Projekt-Kunden
    const altesProjekt = projekte.find((p) => p.id === projektId)
    const sollteAutoSync = !kundeId || (altesProjekt && altesProjekt.kunde_id === kundeId)
    const neuerKunde = sollteAutoSync ? (projekt?.kunde_id ?? kundeId ?? null) : kundeId
    // Raum zuruecksetzen, wenn er nicht zum neuen Projekt gehoert
    const aktuellerRaum = raumId ? raeume.find((r) => r.id === raumId) : null
    const neuerRaum = aktuellerRaum && neueProjektId && aktuellerRaum.projekt_id !== neueProjektId
      ? null : raumId
    onChange({ projekt_id: neueProjektId, kunde_id: neuerKunde ?? null, raum_id: neuerRaum })
  }

  return (
    <div className={kompakt ? 'space-y-2' : 'space-y-3'}>
      <PickerDropdown
        label="Projekt"
        icon={FolderOpen}
        value={projektId}
        valueLabel={projekte.find((p) => p.id === projektId)?.name ?? null}
        options={projekte.map((p) => ({ id: p.id, label: p.name }))}
        onSelect={handleProjektChange}
        placeholder="Kein Projekt"
        kompakt={kompakt}
      />
      <PickerDropdown
        label="Kunde"
        icon={User}
        value={kundeId}
        valueLabel={kunden.find((k) => k.id === kundeId)?.name ?? null}
        options={kunden.map((k) => ({ id: k.id, label: k.name }))}
        onSelect={(id) => onChange({ kunde_id: id })}
        placeholder="Kein Kunde"
        kompakt={kompakt}
      />
      <PickerDropdown
        label="Raum"
        icon={Layers}
        value={raumId}
        valueLabel={raeume.find((r) => r.id === raumId)?.name ?? null}
        options={verfuegbareRaeume.map((r) => ({ id: r.id, label: r.name }))}
        onSelect={(id) => onChange({ raum_id: id })}
        placeholder={projektId ? 'Kein Raum' : 'Erst Projekt waehlen'}
        disabled={!projektId && verfuegbareRaeume.length === 0}
        kompakt={kompakt}
      />
    </div>
  )
}

function PickerDropdown({
  label, icon: Icon, value, valueLabel, options, onSelect,
  placeholder, disabled, kompakt,
}: {
  label: string
  icon: React.ElementType
  value: string | null
  valueLabel: string | null
  options: { id: string; label: string }[]
  onSelect: (id: string | null) => void
  placeholder: string
  disabled?: boolean
  kompakt?: boolean
}) {
  const [offen, setOffen] = useState(false)
  const [suche, setSuche] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!offen) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOffen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [offen])

  const gefiltert = suche.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(suche.toLowerCase()))
    : options

  return (
    <div ref={ref} className="relative">
      {!kompakt && (
        <label className="block text-[11px] font-medium text-gray-500 uppercase mb-1.5 flex items-center gap-1.5">
          <Icon className="w-3 h-3" /> {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => !disabled && setOffen((v) => !v)}
        disabled={disabled}
        className={
          'w-full flex items-center justify-between gap-2 px-3 py-1.5 text-sm border rounded-lg transition-colors ' +
          (disabled ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                    : 'border-gray-200 hover:bg-gray-50 ' + (offen ? 'border-wellbeing-green-light ring-2 ring-wellbeing-green/20' : ''))
        }
      >
        {kompakt && <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
        <span className={'flex-1 text-left truncate ' + (valueLabel ? 'text-gray-900' : 'text-gray-400')}>
          {valueLabel ?? placeholder}
        </span>
        {valueLabel && !disabled && (
          <span
            role="button"
            tabIndex={-1}
            aria-label={`${label} entfernen`}
            onClick={(e) => { e.stopPropagation(); onSelect(null) }}
            className="text-gray-300 hover:text-gray-600"
          >
            <X size={12} />
          </span>
        )}
        <ChevronDown size={14} className="text-gray-400 shrink-0" />
      </button>
      {offen && (
        <div className="absolute z-30 mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-72 flex flex-col">
          {options.length > 5 && (
            <input
              autoFocus
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
              placeholder="Suchen…"
              className="w-full text-sm border-b border-gray-100 px-3 py-2 outline-none"
            />
          )}
          <ul className="overflow-y-auto">
            {gefiltert.length === 0 && (
              <li className="px-3 py-2 text-xs text-gray-400">Keine Treffer.</li>
            )}
            {gefiltert.map((o) => (
              <li key={o.id}>
                <button
                  onClick={() => { onSelect(o.id); setOffen(false); setSuche('') }}
                  className={
                    'w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ' +
                    (value === o.id ? 'bg-wellbeing-green/10 text-wellbeing-green-dark' : 'text-gray-700')
                  }
                >{o.label}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
