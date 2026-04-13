'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import Image from 'next/image'

const APP_DOMAIN = 'app.wellbeing-spaces.de'

// ── Inner-Komponente (useSearchParams braucht Suspense) ───────

function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirectTo   = searchParams.get('redirect') ?? '/dashboard'
  const isExpired    = searchParams.get('expired') === 'true'

  const [email, setEmail]       = useState('')
  const [passwort, setPasswort] = useState('')
  const [fehler, setFehler]     = useState<string | null>(
    isExpired ? 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.' : null
  )
  const [laedt, setLaedt] = useState(false)

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

    // Domain-aware Redirect nach erfolgreichem Login
    const isMainDomain =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'wellbeing-spaces.de' ||
       window.location.hostname === 'www.wellbeing-spaces.de')

    if (isMainDomain) {
      // Cross-Domain: App-Subdomain aufrufen
      window.location.href = `https://${APP_DOMAIN}${redirectTo}`
    } else {
      // Same-Domain (App-Subdomain oder Dev)
      router.push(redirectTo)
      router.refresh()
    }
  }

  return (
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
            className="w-full pl-10 pr-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:bg-white focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition-all"
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
            className="w-full pl-10 pr-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:bg-white focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition-all"
          />
        </div>
      </div>

      {/* Fehler / Abgelaufene Session */}
      {fehler && (
        <div className={`flex items-start gap-2.5 text-xs rounded-xl px-4 py-3 border ${
          isExpired && !email
            ? 'text-amber-700 bg-amber-50 border-amber-100'
            : 'text-red-600 bg-red-50 border-red-100'
        }`}>
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {fehler}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={laedt}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#445c49] hover:bg-wellbeing-green active:bg-wellbeing-green-dark disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md mt-1"
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
  )
}

// ── Seite ─────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#F8F9FA' }}
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
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white rounded-2xl shadow-sm border border-gray-200 mb-5">
            <Image
              src="/logo-klein.png"
              alt="Wellbeing Spaces"
              width={36}
              height={36}
              className="w-9 h-9 object-contain"
            />
          </div>
          <h1 className="font-syne text-[22px] font-bold text-gray-900 leading-none tracking-tight">
            Wellbeing Spaces
          </h1>
          <p className="mt-2 text-sm text-gray-400">Melde dich mit deinem Account an</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-200/80 rounded-2xl shadow-md px-8 py-8">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Wellbeing Concepts · Internes Tool
        </p>
      </div>
    </div>
  )
}
