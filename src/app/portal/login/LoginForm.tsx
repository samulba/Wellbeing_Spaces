'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { portalLogin } from '@/app/actions/portal'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import { useState } from 'react'

function SubmitBtn({ prim }: { prim: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full inline-flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-xl transition-all disabled:opacity-60 shadow-sm hover:shadow-md active:scale-[0.99]"
      style={{ background: prim, color: 'var(--brand-button-text, #fff)' }}
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Anmelden…
        </>
      ) : (
        <>
          Anmelden
          <ArrowRight className="w-4 h-4" />
        </>
      )}
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

      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
          E-Mail
        </label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="deine@email.de"
            className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:bg-white focus:border-transparent focus:ring-2 transition"
            style={{ ['--tw-ring-color' as string]: prim + '33' } as React.CSSProperties}
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
          Passwort
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
          <input
            name="passwort"
            type={zeigePw ? 'text' : 'password'}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="w-full pl-10 pr-10 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:bg-white focus:border-transparent focus:ring-2 transition"
            style={{ ['--tw-ring-color' as string]: prim + '33' } as React.CSSProperties}
          />
          <button
            type="button"
            onClick={() => setZeigePw((v) => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
            aria-label={zeigePw ? 'Passwort verbergen' : 'Passwort anzeigen'}
          >
            {zeigePw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <SubmitBtn prim={prim} />
    </form>
  )
}
