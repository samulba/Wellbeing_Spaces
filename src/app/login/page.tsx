'use client'

import { Suspense, useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { loginAction, pruefeFirmaSlug } from './actions'
import {
  Mail, Lock, ArrowRight, Loader2, AlertCircle, Eye, EyeOff,
  ArrowLeft, CheckCircle, Building2,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const APP_DOMAIN    = 'app.wellbeing-spaces.de'
const MAIN_WEBSITE  = 'https://wellbeing-spaces.de'

// ── Passwort-Reset Modal ──────────────────────────────────────

function PasswortResetModal({ onClose }: { onClose: () => void }) {
  const [resetEmail, setResetEmail] = useState('')
  const [laedt,      setLaedt]      = useState(false)
  const [erfolg,     setErfolg]     = useState(false)
  const [fehler,     setFehler]     = useState<string | null>(null)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setFehler(null)
    setLaedt(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/einstellungen?tab=profil`,
    })
    setLaedt(false)
    if (error) {
      setFehler('Fehler beim Senden. Bitte versuche es erneut.')
    } else {
      setErfolg(true)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" aria-hidden />
      <div className="relative w-full max-w-[380px] bg-white rounded-2xl shadow-2xl border border-gray-100 p-7">
        <h2 className="font-syne font-bold text-[18px] text-gray-900 mb-1.5">Passwort zurücksetzen</h2>
        <p className="text-[13px] text-gray-400 mb-5">
          Gib deine E-Mail ein. Wir senden dir einen Link zum Zurücksetzen.
        </p>

        {erfolg ? (
          <div className="flex flex-col items-center text-center gap-3 py-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-[15px] mb-1">E-Mail gesendet!</p>
              <p className="text-[13px] text-gray-400">Prüfe deinen Posteingang und klicke den Link.</p>
            </div>
            <button
              onClick={onClose}
              className="mt-2 px-5 py-2.5 bg-[#445c49] text-white text-[13px] font-semibold rounded-xl hover:bg-[#2d3e31] transition-colors"
            >
              Schließen
            </button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
              <input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="deine@email.de"
                className="w-full pl-10 pr-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#445c49]/20 focus:border-[#445c49] transition-all"
              />
            </div>
            {fehler && (
              <p className="text-[12px] text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{fehler}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-[13px] font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={laedt}
                className="flex-1 py-2.5 bg-[#445c49] hover:bg-[#2d3e31] disabled:opacity-60 text-white text-[13px] font-semibold rounded-xl transition-colors"
              >
                {laedt ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Link senden'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Stage 1: Firmen-Slug eingeben ─────────────────────────────

function FirmaWaehlen({
  initialSlug,
  initialError,
  onErfolg,
}: {
  initialSlug:  string
  initialError: string | null
  onErfolg:     (slug: string, name: string) => void
}) {
  const [slug,      setSlug]      = useState(initialSlug)
  const [fehler,    setFehler]    = useState<string | null>(initialError)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFehler(null)
    startTransition(async () => {
      const result = await pruefeFirmaSlug(slug)
      if (!result.exists || !result.orgId || !result.orgName) {
        setFehler(result.fehler ?? 'Diese Firma existiert nicht.')
        return
      }
      onErfolg(slug.trim().toLowerCase(), result.orgName)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Icon + Intro */}
      <div className="flex flex-col items-center text-center pb-1">
        <div className="w-12 h-12 rounded-2xl bg-wellbeing-green/10 flex items-center justify-center mb-3">
          <Building2 className="w-5 h-5 text-wellbeing-green" />
        </div>
        <h2 className="font-syne text-[16px] font-semibold text-gray-900 leading-tight">
          Bei welcher Firma?
        </h2>
        <p className="text-[12px] text-gray-400 mt-1 leading-relaxed max-w-[260px]">
          Gib den Firmen-Slug ein, den du von deinem Admin bekommen hast.
        </p>
      </div>

      {/* Slug-Eingabe: groß, mittig, mono */}
      <div>
        <input
          id="firma"
          type="text"
          autoComplete="organization"
          autoFocus
          required
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          placeholder="firma-slug"
          className="w-full px-4 py-3.5 text-center text-[15px] font-mono tracking-wide bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:bg-white focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition-all"
        />

        {/* Live-URL-Vorschau (nur wenn etwas getippt wurde) */}
        <div className="mt-2.5 text-center text-[11px] font-mono h-4">
          {slug ? (
            <span className="text-gray-300">
              {APP_DOMAIN}/
              <span className="text-wellbeing-green font-semibold">{slug}</span>
            </span>
          ) : null}
        </div>
      </div>

      {fehler && (
        <div className="flex items-start gap-2.5 text-xs rounded-xl px-4 py-3 border text-red-600 bg-red-50 border-red-100">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {fehler}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || !slug}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#445c49] hover:bg-wellbeing-green active:bg-wellbeing-green-dark disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md"
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Prüfe…
          </>
        ) : (
          <>
            Weiter
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      {/* Footer-Hilfe */}
      <p className="text-center text-[11px] text-gray-300 pt-1">
        Du hast noch keinen Slug? Frag deinen Admin.
      </p>
    </form>
  )
}

// ── Stage 2: E-Mail + Passwort (Branded) ──────────────────────

function AnmeldenForm({
  slug,
  orgName,
  onZurueck,
}: {
  slug:      string
  orgName:   string
  onZurueck: () => void
}) {
  const searchParams = useSearchParams()
  const redirectTo   = searchParams.get('redirect') ?? '/dashboard'
  const isExpired    = searchParams.get('expired') === 'true'

  const [email,        setEmail]        = useState('')
  const [passwort,     setPasswort]     = useState('')
  const [showPasswort, setShowPasswort] = useState(false)
  const [showReset,    setShowReset]    = useState(false)
  const [fehler,       setFehler]       = useState<string | null>(
    isExpired ? 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.' : null
  )
  const [isPending, startTransition] = useTransition()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setFehler(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.set('firma',    slug)
      formData.set('email',    email)
      formData.set('passwort', passwort)

      const result = await loginAction(formData)
      if (result.fehler) {
        setFehler(result.fehler)
        return
      }

      const isMainDomain =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'wellbeing-spaces.de' ||
         window.location.hostname === 'www.wellbeing-spaces.de')

      window.location.href = isMainDomain
        ? `https://${APP_DOMAIN}${redirectTo}`
        : redirectTo
    })
  }

  return (
    <>
      {/* Firma-Badge oben + "Andere Firma" Link */}
      <div className="flex items-center justify-between gap-2 mb-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-wellbeing-green/10 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-wellbeing-green" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Anmeldung bei</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{orgName}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onZurueck}
          className="text-[11px] text-gray-400 hover:text-[#445c49] transition-colors whitespace-nowrap"
        >
          Andere Firma
        </button>
      </div>

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
              autoFocus
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
              type={showPasswort ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={passwort}
              onChange={(e) => setPasswort(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-11 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:bg-white focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPasswort((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
              aria-label={showPasswort ? 'Passwort verbergen' : 'Passwort anzeigen'}
            >
              {showPasswort ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="mt-2 text-right">
            <button
              type="button"
              onClick={() => setShowReset(true)}
              className="text-xs text-gray-400 hover:text-[#445c49] transition-colors"
            >
              Passwort vergessen?
            </button>
          </div>
        </div>

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

        <button
          type="submit"
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#445c49] hover:bg-wellbeing-green active:bg-wellbeing-green-dark disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md mt-1"
        >
          {isPending ? (
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

      {showReset && <PasswortResetModal onClose={() => setShowReset(false)} />}
    </>
  )
}

// ── Wrapper: regelt Stage 1 vs. Stage 2 ───────────────────────

function LoginInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const initialSlug = (searchParams.get('firma') ?? '').trim().toLowerCase()

  const [stage,       setStage]       = useState<'firma' | 'login' | 'pruefe'>(
    initialSlug ? 'pruefe' : 'firma'
  )
  const [slug,        setSlug]        = useState(initialSlug)
  const [orgName,     setOrgName]     = useState<string | null>(null)
  const [slugFehler,  setSlugFehler]  = useState<string | null>(null)

  // Wenn die URL bereits einen Slug enthält, prüfen wir ihn beim Mount.
  useEffect(() => {
    if (stage !== 'pruefe' || !initialSlug) return
    let abgebrochen = false
    void (async () => {
      const result = await pruefeFirmaSlug(initialSlug)
      if (abgebrochen) return
      if (!result.exists || !result.orgName) {
        setSlugFehler(result.fehler ?? 'Diese Firma existiert nicht.')
        setStage('firma')
        return
      }
      setOrgName(result.orgName)
      setStage('login')
    })()
    return () => { abgebrochen = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSlugErfolg(neuerSlug: string, name: string) {
    setSlug(neuerSlug)
    setOrgName(name)
    setSlugFehler(null)

    // URL aktualisieren — bookmarkbar pro Firma
    const url = new URL(window.location.href)
    url.searchParams.set('firma', neuerSlug)
    router.replace(url.pathname + url.search)

    setStage('login')
  }

  function handleZurueck() {
    setStage('firma')
    setOrgName(null)
    const url = new URL(window.location.href)
    url.searchParams.delete('firma')
    router.replace(url.pathname + (url.search || ''))
  }

  if (stage === 'pruefe') {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
      </div>
    )
  }

  if (stage === 'firma') {
    return (
      <FirmaWaehlen
        initialSlug={slug}
        initialError={slugFehler}
        onErfolg={handleSlugErfolg}
      />
    )
  }

  return (
    <AnmeldenForm
      slug={slug}
      orgName={orgName ?? slug}
      onZurueck={handleZurueck}
    />
  )
}

// ── Seite ─────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#F8F9FA' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, #CBD5E1 1px, transparent 0)',
          backgroundSize: '28px 28px',
          opacity: 0.45,
        }}
      />

      <div className="absolute top-5 left-5">
        <Link
          href={MAIN_WEBSITE}
          className="inline-flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Zurück zur Website
        </Link>
      </div>

      <div className="relative w-full max-w-[380px]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-[68px] h-[68px] bg-white rounded-2xl shadow-sm border border-gray-200 mb-5">
            <Image
              src="/logo-klein.png"
              alt="Wellbeing Spaces"
              width={48}
              height={48}
              className="w-12 h-12 object-contain"
            />
          </div>
          <h1 className="font-syne text-[22px] font-bold text-gray-900 leading-none tracking-tight">
            Wellbeing Spaces
          </h1>
          <p className="mt-2 text-sm text-gray-400">Melde dich bei deiner Firma an</p>
        </div>

        <div className="bg-white border border-gray-200/80 rounded-2xl shadow-md px-8 py-8">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
              </div>
            }
          >
            <LoginInner />
          </Suspense>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2026 Wellbeing Spaces
        </p>
      </div>
    </div>
  )
}
