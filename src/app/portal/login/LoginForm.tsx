'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { portalLogin } from '@/app/actions/portal'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

function SubmitBtn({ prim }: { prim: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-3 text-sm font-semibold text-white rounded-xl transition-opacity disabled:opacity-60"
      style={{ background: prim }}
    >
      {pending ? 'Anmelden…' : 'Anmelden'}
    </button>
  )
}

export default function LoginForm({ prim }: { prim: string }) {
  const [state, action] = useFormState(portalLogin, null)
  const [zeigePw, setZeigePw] = useState(false)

  return (
    <form action={action} className="space-y-4">
      {state?.fehler && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {state.fehler}
        </div>
      )}

      <div className="relative">
        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="E-Mail-Adresse"
          className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:border-transparent transition"
          style={{ '--tw-ring-color': prim + '40' } as React.CSSProperties}
        />
      </div>

      <div className="relative">
        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          name="passwort"
          type={zeigePw ? 'text' : 'password'}
          autoComplete="current-password"
          required
          placeholder="Passwort"
          className="w-full pl-10 pr-10 py-3 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:border-transparent transition"
          style={{ '--tw-ring-color': prim + '40' } as React.CSSProperties}
        />
        <button
          type="button"
          onClick={() => setZeigePw((v) => !v)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {zeigePw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      <SubmitBtn prim={prim} />
    </form>
  )
}
