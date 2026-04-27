'use client'

import { useEffect, useRef, useState } from 'react'
import type { AufgabePickerTeamMitglied } from '@/app/actions/aufgaben'

/**
 * Textarea fuer Aufgaben-Kommentare mit @-Mention-Autocomplete.
 *
 * Beim Tippen von '@' oeffnet sich ein Dropdown mit Team-Mitgliedern,
 * gefiltert nach dem getippten Suchstring. Auswahl ersetzt den
 * @-Token durch '@vorname.nachname' (oder '@email-prefix') —
 * server-seitig wird daraus mention extrahiert + Notification gesendet.
 */
export default function AufgabeKommentarInput({
  value, onChange, onSubmit,
  team, currentUserId,
  disabled,
}: {
  value:    string
  onChange: (v: string) => void
  onSubmit: () => void
  team:     AufgabePickerTeamMitglied[]
  currentUserId: string | null
  disabled?: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionStart, setMentionStart] = useState(0)
  const [activeIdx, setActiveIdx] = useState(0)

  // Erkenne @-Pattern beim Tippen: aktueller Cursor steht hinter
  // einem '@<text>' wo <text> keine Whitespaces enthaelt
  function pruefeMention(text: string, cursor: number) {
    const vorCursor = text.slice(0, cursor)
    const match = vorCursor.match(/@([\wäöüß.\-_]*)$/i)
    if (match) {
      setMentionQuery(match[1])
      setMentionStart(cursor - match[0].length)
      setActiveIdx(0)
    } else {
      setMentionQuery(null)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value)
    pruefeMention(e.target.value, e.target.selectionStart)
  }

  // Andere User ausser dem aktuellen
  const verfuegbar = team.filter((t) => t.user_id !== currentUserId)

  function nameToken(t: AufgabePickerTeamMitglied): string {
    // Prio: vorname.nachname → email-prefix → user_id
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')
    const parts = t.name.split(' ').map(norm).filter(Boolean)
    if (parts.length >= 2) return parts.join('.')
    if (parts.length === 1) return parts[0]
    if (t.email) return norm(t.email.split('@')[0])
    return t.user_id.slice(0, 8)
  }

  const gefiltert = (
    mentionQuery !== null
      ? verfuegbar.filter((t) => {
          const q = mentionQuery.toLowerCase()
          return !q || t.name.toLowerCase().includes(q)
                    || (t.email ?? '').toLowerCase().includes(q)
                    || nameToken(t).includes(q)
        }).slice(0, 6)
      : []
  )

  function einfuegen(t: AufgabePickerTeamMitglied) {
    const token = '@' + nameToken(t) + ' '
    const neu = value.slice(0, mentionStart) + token + value.slice(mentionStart + 1 + (mentionQuery?.length ?? 0))
    onChange(neu)
    setMentionQuery(null)
    // Cursor nach das eingefuegte Token setzen
    setTimeout(() => {
      ref.current?.focus()
      const pos = mentionStart + token.length
      ref.current?.setSelectionRange(pos, pos)
    }, 0)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mentionQuery !== null && gefiltert.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => (i + 1) % gefiltert.length) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => (i - 1 + gefiltert.length) % gefiltert.length) }
      else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        einfuegen(gefiltert[activeIdx])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setMentionQuery(null)
      }
      return
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      onSubmit()
    }
  }

  // Dropdown schliessen wenn der Cursor woanders hin geht
  useEffect(() => {
    const t = ref.current
    if (!t) return
    const onSel = () => pruefeMention(t.value, t.selectionStart)
    t.addEventListener('keyup', onSel)
    t.addEventListener('click', onSel)
    return () => {
      t.removeEventListener('keyup', onSel)
      t.removeEventListener('click', onSel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="relative flex-1">
      <textarea
        ref={ref}
        rows={2}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Kommentar schreiben… (@ für Team-Mitglieder)"
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-wellbeing-green-light resize-none"
        disabled={disabled}
      />
      {mentionQuery !== null && gefiltert.length > 0 && (
        <div className="absolute z-30 left-0 right-0 bottom-full mb-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
          {gefiltert.map((t, idx) => (
            <button
              key={t.user_id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); einfuegen(t) }}
              className={
                'w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 ' +
                (idx === activeIdx ? 'bg-wellbeing-green/10 text-wellbeing-green-dark' : 'hover:bg-gray-50 text-gray-700')
              }
            >
              <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-medium shrink-0">
                {t.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)}
              </span>
              <span className="flex-1 min-w-0">
                <span className="font-medium">{t.name}</span>
                <span className="ml-1 text-[10px] text-gray-400">@{nameToken(t)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
