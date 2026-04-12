'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { updateProfil, updatePasswort, type ProfilActionState } from '@/app/actions/profil'

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
    >
      {pending ? 'Speichern…' : label}
    </button>
  )
}

function Meldung({ state }: { state: ProfilActionState }) {
  if (!state) return null
  if (state.fehler)
    return <p className="text-xs text-red-500 mt-2">{state.fehler}</p>
  if (state.erfolg)
    return <p className="text-xs text-emerald-600 mt-2">{state.erfolg}</p>
  return null
}

export default function ProfilFormular({
  email,
  name,
}: {
  email: string
  name: string
}) {
  const [profilState, profilAction] = useFormState(updateProfil, null)
  const [passwortState, passwortAction] = useFormState(updatePasswort, null)

  return (
    <div className="space-y-6">
      {/* Profil */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
          Kontoinformationen
        </h2>
        <form action={profilAction} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <input
              name="name"
              defaultValue={name}
              placeholder="Vollständiger Name"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green-light"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">E-Mail</label>
            <input
              name="email"
              type="email"
              defaultValue={email}
              required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green-light"
            />
          </div>
          <div className="flex items-center gap-3">
            <SubmitButton label="Speichern" />
            <Meldung state={profilState} />
          </div>
        </form>
      </div>

      {/* Passwort */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
          Passwort ändern
        </h2>
        <form action={passwortAction} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Neues Passwort</label>
            <input
              name="passwort"
              type="password"
              required
              minLength={6}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green-light"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Bestätigung</label>
            <input
              name="bestaetigung"
              type="password"
              required
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green-light"
            />
          </div>
          <div className="flex items-center gap-3">
            <SubmitButton label="Passwort ändern" />
            <Meldung state={passwortState} />
          </div>
        </form>
      </div>
    </div>
  )
}
