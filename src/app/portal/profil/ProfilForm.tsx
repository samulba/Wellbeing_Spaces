'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { portalProfilAktualisieren, portalPasswortAendern } from '@/app/actions/portal'
import type { ClientUser } from '@/lib/portal-auth'

function Btn({ label, prim }: { label: string; prim: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending}
      className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-opacity disabled:opacity-60"
      style={{ background: prim }}>
      {pending ? 'Speichern…' : label}
    </button>
  )
}

function Meldung({ state }: { state: { fehler?: string; erfolg?: string } | null }) {
  if (!state) return null
  if (state.fehler)  return <p className="text-xs text-red-500">{state.fehler}</p>
  if (state.erfolg)  return <p className="text-xs text-emerald-600">{state.erfolg}</p>
  return null
}

function Input({ label, name, defaultValue, type = 'text' }: { label: string; name: string; defaultValue?: string; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input name={name} type={type} defaultValue={defaultValue}
        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition" />
    </div>
  )
}

export default function ProfilForm({ session, prim }: { session: ClientUser; prim: string }) {
  const [profilState, profilAction] = useFormState(portalProfilAktualisieren, null)
  const [pwState, pwAction]         = useFormState(portalPasswortAendern, null)

  return (
    <div className="space-y-6">
      {/* Profil */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Persönliche Daten</h2>
        <form action={profilAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Vorname" name="vorname" defaultValue={session.vorname} />
            <Input label="Nachname" name="nachname" defaultValue={session.nachname} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">E-Mail</label>
            <p className="text-sm text-gray-500 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">{session.email}</p>
          </div>
          <div className="flex items-center justify-between">
            <Meldung state={profilState} />
            <Btn label="Speichern" prim={prim} />
          </div>
        </form>
      </div>

      {/* Passwort */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Passwort ändern</h2>
        <form action={pwAction} className="space-y-4">
          <Input label="Aktuelles Passwort"  name="altes_passwort" type="password" />
          <Input label="Neues Passwort"      name="neues_passwort" type="password" />
          <Input label="Passwort bestätigen" name="bestaetigung"   type="password" />
          <div className="flex items-center justify-between">
            <Meldung state={pwState} />
            <Btn label="Ändern" prim={prim} />
          </div>
        </form>
      </div>
    </div>
  )
}
