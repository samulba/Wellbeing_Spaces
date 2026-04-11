'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react'

function DepthStackIcon({ size = 28 }: { size?: number }) {
  const s = size
  const sq = Math.round(s * 0.556)   // ~10/18
  return (
    <svg width={s} height={s} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width={sq} height={sq} rx="2" fill="#6366F1" opacity="0.30" />
      <rect x="4" y="4" width={sq} height={sq} rx="2" fill="#6366F1" opacity="0.55" />
      <rect x="8" y="8" width={sq} height={sq} rx="2" fill="#6366F1" />
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [passwort, setPasswort] = useState('')
  const [fehler, setFehler]     = useState<string | null>(null)
  const [laedt, setLaedt]       = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setFehler(null)
    setLaedt(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password: passwort })

    if (error) {
      setFehler('E-Mail oder Passwort ungültig.')
      setLaedt(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#F4F5F7' }}
    >
      {/* Subtiles Hintergrundmuster */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, #CBD5E1 1px, transparent 0)',
          backgroundSize: '28px 28px',
          opacity: 0.45,
        }}
      />

      <div className="relative w-full max-w-[380px]">

        {/* Logo-Bereich */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white rounded-2xl shadow-sm border border-gray-200 mb-5">
            <DepthStackIcon size={28} />
          </div>
          <h1 className="font-syne text-[22px] font-bold text-gray-900 leading-none tracking-tight">
            WBC Studio
          </h1>
          <p className="mt-2 text-sm text-gray-400">Melde dich mit deinem Account an</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-200/80 rounded-2xl shadow-md px-8 py-8">
          <form onSubmit={handleLogin} className="space-y-5">

            {/* E-Mail */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-gray-600 mb-2 tracking-wide uppercase">
                E-Mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@beispiel.de"
                  className="w-full pl-10 pr-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
              </div>
            </div>

            {/* Passwort */}
            <div>
              <label htmlFor="passwort" className="block text-xs font-semibold text-gray-600 mb-2 tracking-wide uppercase">
                Passwort
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                <input
                  id="passwort"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={passwort}
                  onChange={(e) => setPasswort(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
              </div>
            </div>

            {/* Fehlermeldung */}
            {fehler && (
              <div className="flex items-center gap-2.5 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                {fehler}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={laedt}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#6366F1] hover:bg-indigo-600 active:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md mt-1"
            >
              {laedt ? (
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
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Wellbeing Concepts · Internes Tool
        </p>
      </div>
    </div>
  )
}
