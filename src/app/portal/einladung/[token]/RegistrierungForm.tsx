'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { portalRegistrieren } from '@/app/actions/portal'
import { User, Lock, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

function SubmitBtn({ prim }: { prim: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending}
      className="w-full py-3 text-sm font-semibold text-white rounded-xl transition-opacity disabled:opacity-60"
      style={{ background: prim }}>
      {pending ? 'Konto wird erstellt…' : 'Konto erstellen & anmelden'}
    </button>
  )
}

export default function RegistrierungForm({
  einladungsToken,
  initialVorname,
  initialNachname,
  prim,
}: {
  einladungsToken: string
  initialVorname: string
  initialNachname: string
  prim: string
}) {
  const [state, action] = useFormState(portalRegistrieren, null)
  const [zeigePw, setZeigePw] = useState(false)

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="einladungs_token" value={einladungsToken} />

      {state?.fehler && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {state.fehler}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input name="vorname" type="text" required placeholder="Vorname"
            defaultValue={initialVorname}
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 transition"
            style={{ '--tw-ring-color': prim + '40' } as React.CSSProperties}
          />
        </div>
        <input name="nachname" type="text" required placeholder="Nachname"
          defaultValue={initialNachname}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 transition"
          style={{ '--tw-ring-color': prim + '40' } as React.CSSProperties}
        />
      </div>

      <div className="relative">
        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input name="passwort" type={zeigePw ? 'text' : 'password'} required
          placeholder="Passwort (min. 8 Zeichen)"
          className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 transition"
          style={{ '--tw-ring-color': prim + '40' } as React.CSSProperties}
        />
        <button type="button" onClick={() => setZeigePw((v) => !v)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {zeigePw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      <div className="relative">
        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input name="passwort2" type={zeigePw ? 'text' : 'password'} required
          placeholder="Passwort bestätigen"
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 transition"
          style={{ '--tw-ring-color': prim + '40' } as React.CSSProperties}
        />
      </div>

      <SubmitBtn prim={prim} />
    </form>
  )
}
