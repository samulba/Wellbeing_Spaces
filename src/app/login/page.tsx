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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-indigo-600 rounded-xl mb-4">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Studio</h1>
          <p className="mt-1 text-sm text-gray-500">Internes Projekt-Tool</p>
        </div>

        {/* Login-Formular */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-gray-700 mb-1.5"
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
                className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
                placeholder="name@beispiel.de"
              />
            </div>

            <div>
              <label
                htmlFor="passwort"
                className="block text-xs font-medium text-gray-700 mb-1.5"
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
                className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
                placeholder="••••••••"
              />
            </div>

            {fehler && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                {fehler}
              </p>
            )}

            <button
              type="submit"
              disabled={laedt}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {laedt ? 'Anmelden…' : 'Anmelden'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
