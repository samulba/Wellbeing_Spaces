'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, User, Users, X, UserCheck } from 'lucide-react'
import type { AufgabePickerTeamMitglied } from '@/app/actions/aufgaben'

/**
 * Picker fuer Aufgaben-Zuweisung:
 *  - Team-Mitglied (assignee_user_id)
 *  - ODER Kunde (assignee_kunde Toggle)
 *  - ODER Niemand
 *
 * Beide gleichzeitig zuzuweisen ist konzeptuell moeglich, aber UX-seitig
 * macht es keinen Sinn (Kunde sieht's im Portal, Team-Member intern).
 * Wenn 'An Kunde zuweisen' aktiviert wird, wird user_id automatisch
 * geleert; und umgekehrt.
 */
export default function AufgabeAssigneePicker({
  assigneeUserId,
  assigneeKunde,
  team,
  currentUserId,
  hasKunde,
  onChange,
  kompakt = false,
}: {
  assigneeUserId: string | null
  assigneeKunde:  boolean
  team:           AufgabePickerTeamMitglied[]
  currentUserId:  string | null
  /** Hat die Aufgabe einen verknuepften Kunden? Ohne kunde_id macht 'An Kunde zuweisen' keinen Sinn. */
  hasKunde:       boolean
  onChange: (patch: { assignee_user_id?: string | null; assignee_kunde?: boolean }) => void
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

  const aktiv = team.find((t) => t.user_id === assigneeUserId)
  const aktivLabel =
    assigneeKunde ? 'Kunde'
    : aktiv ? aktiv.name
    : null

  const gefiltert = suche.trim()
    ? team.filter((t) => t.name.toLowerCase().includes(suche.toLowerCase()) || (t.email ?? '').toLowerCase().includes(suche.toLowerCase()))
    : team

  function setUser(userId: string | null) {
    onChange({ assignee_user_id: userId, assignee_kunde: false })
    setOffen(false)
  }
  function setKunde() {
    onChange({ assignee_user_id: null, assignee_kunde: true })
    setOffen(false)
  }
  function clear() {
    onChange({ assignee_user_id: null, assignee_kunde: false })
    setOffen(false)
  }

  return (
    <div ref={ref} className="relative">
      {!kompakt && (
        <label className="block text-[11px] font-medium text-gray-500 uppercase mb-1.5 flex items-center gap-1.5">
          <UserCheck className="w-3 h-3" /> Zugewiesen an
        </label>
      )}
      <button
        type="button"
        onClick={() => setOffen((v) => !v)}
        className={
          'w-full flex items-center justify-between gap-2 px-3 py-1.5 text-sm border rounded-lg transition-colors ' +
          'border-gray-200 hover:bg-gray-50 ' +
          (offen ? 'border-wellbeing-green-light ring-2 ring-wellbeing-green/20' : '')
        }
      >
        {kompakt && <UserCheck className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
        {aktivLabel ? (
          <span className="flex items-center gap-2 flex-1 min-w-0">
            {assigneeKunde ? (
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-medium shrink-0">
                K
              </span>
            ) : (
              <Avatar tm={aktiv ?? null} size={20} />
            )}
            <span className="truncate text-gray-900">{aktivLabel}</span>
          </span>
        ) : (
          <span className="flex-1 text-left text-gray-400">Niemand</span>
        )}
        {aktivLabel && (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Zuweisung entfernen"
            onClick={(e) => { e.stopPropagation(); clear() }}
            className="text-gray-300 hover:text-gray-600"
          >
            <X size={12} />
          </span>
        )}
        <ChevronDown size={14} className="text-gray-400 shrink-0" />
      </button>
      {offen && (
        <div className="absolute z-30 mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-80 flex flex-col">
          {/* Quick-Aktionen */}
          {currentUserId && team.some((t) => t.user_id === currentUserId) && (
            <button
              onClick={() => setUser(currentUserId)}
              className={
                'w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 ' +
                (assigneeUserId === currentUserId ? 'bg-wellbeing-green/10 text-wellbeing-green-dark' : 'text-gray-700')
              }
            >
              <User size={14} className="text-wellbeing-green" /> Mir zuweisen
            </button>
          )}
          {hasKunde && (
            <button
              onClick={setKunde}
              className={
                'w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100 ' +
                (assigneeKunde ? 'bg-amber-50 text-amber-800' : 'text-gray-700')
              }
            >
              <Users size={14} className="text-amber-600" /> An Kunde zuweisen
            </button>
          )}
          {team.length > 5 && (
            <input
              autoFocus
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
              placeholder="Mitglied suchen…"
              className="w-full text-sm border-b border-gray-100 px-3 py-2 outline-none"
            />
          )}
          <ul className="overflow-y-auto">
            {gefiltert.length === 0 && (
              <li className="px-3 py-2 text-xs text-gray-400">Keine Mitglieder.</li>
            )}
            {gefiltert.map((t) => (
              <li key={t.user_id}>
                <button
                  onClick={() => setUser(t.user_id)}
                  className={
                    'w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-2 ' +
                    (assigneeUserId === t.user_id ? 'bg-wellbeing-green/10 text-wellbeing-green-dark' : 'text-gray-700')
                  }
                >
                  <Avatar tm={t} size={20} />
                  <span className="flex-1 min-w-0 truncate">{t.name}</span>
                  {t.user_id === currentUserId && (
                    <span className="text-[10px] text-gray-400">(du)</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function Avatar({ tm, size = 20 }: { tm: AufgabePickerTeamMitglied | null; size?: number }) {
  const initialen = tm
    ? tm.name.split(' ').filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'
  if (tm?.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={tm.avatarUrl}
        alt=""
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className="rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-medium shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >{initialen}</span>
  )
}
