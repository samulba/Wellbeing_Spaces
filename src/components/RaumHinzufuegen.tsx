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
      className="px-4 py-2 bg-stone-800 hover:bg-stone-700 disabled:bg-stone-300 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
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
          className="text-xs text-stone-500 hover:text-stone-800 transition-colors"
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
              className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent transition"
            />
            {state?.fehler && (
              <p className="text-xs text-red-500 mt-1">{state.fehler}</p>
            )}
          </div>
          <HinzufuegenButton />
          <button
            type="button"
            onClick={() => setOffen(false)}
            className="px-4 py-2 text-sm text-stone-400 hover:text-stone-700 transition-colors"
          >
            Abbrechen
          </button>
        </form>
      )}
    </div>
  )
}
