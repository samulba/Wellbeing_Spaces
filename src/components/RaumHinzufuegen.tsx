'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import type { RaumActionState } from '@/app/actions/raeume'

function HinzufuegenButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
    >
      {pending ? '…' : 'Hinzufügen'}
    </button>
  )
}

interface Props {
  aktion: (prevState: RaumActionState, formData: FormData) => Promise<RaumActionState>
}

export default function RaumHinzufuegen({ aktion }: Props) {
  const [offen, setOffen] = useState(false)
  const [state, formAction] = useFormState(aktion, null)

  return (
    <div>
      {!offen ? (
        <button
          onClick={() => setOffen(true)}
          className="text-xs text-gray-400 hover:text-indigo-600 transition-colors"
        >
          + Raum hinzufügen
        </button>
      ) : (
        <form
          action={async (formData) => {
            await formAction(formData)
            if (!state?.fehler) setOffen(false)
          }}
          className="flex items-start gap-2 flex-wrap"
        >
          <div className="flex-1 min-w-48">
            <input
              name="name"
              type="text"
              required
              autoFocus
              placeholder="Raumname, z. B. Lobby"
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
            />
            {state?.fehler && (
              <p className="text-xs text-red-500 mt-1">{state.fehler}</p>
            )}
          </div>
          <HinzufuegenButton />
          <button
            type="button"
            onClick={() => setOffen(false)}
            className="px-4 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Abbrechen
          </button>
        </form>
      )}
    </div>
  )
}
