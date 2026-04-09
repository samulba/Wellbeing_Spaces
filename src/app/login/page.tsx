'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [passwort, setPasswort] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)
  const [laedt, setLaedt] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setFehler(null)
    setLaedt(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: passwort,
    })

    if (error) {
      setFehler('E-Mail oder Passwort ungültig.')
      setLaedt(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Titel */}
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-800">
            WBC Studio
          </h1>
          <p className="mt-1 text-sm text-stone-400">Internes Verwaltungstool</p>
        </div>

        {/* Login-Formular */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-stone-500 mb-1.5 uppercase tracking-wide"
            >
              E-Mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-white border border-stone-200 rounded-lg text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent transition"
              placeholder="name@wellbeing-concepts.de"
            />
          </div>

          <div>
            <label
              htmlFor="passwort"
              className="block text-xs font-medium text-stone-500 mb-1.5 uppercase tracking-wide"
            >
              Passwort
            </label>
            <input
              id="passwort"
              type="password"
              autoComplete="current-password"
              required
              value={passwort}
              onChange={(e) => setPasswort(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-white border border-stone-200 rounded-lg text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent transition"
              placeholder="••••••••"
            />
          </div>

          {fehler && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {fehler}
            </p>
          )}

          <button
            type="submit"
            disabled={laedt}
            className="w-full py-2.5 px-4 bg-stone-800 hover:bg-stone-700 disabled:bg-stone-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {laedt ? 'Anmelden…' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  )
}
