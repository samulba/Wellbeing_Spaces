'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Lock } from 'lucide-react'
import { pinPruefen } from '@/app/actions/projekte'
import type { Branding } from '@/lib/supabase/types'

// Muss zum Server-Limit (projekte.ts PIN_MAX_VERSUCHE) passen.
const MAX_VERSUCHE = 5
const MIN_LAENGE = 4
const MAX_LAENGE = 6

/**
 * Echter Datentresor: Dieser Screen wird vom SERVER gerendert, solange die PIN
 * nicht bestätigt ist — OHNE Produktdaten. Nach korrekter PIN setzt `pinPruefen`
 * ein signiertes httpOnly-Cookie; `router.refresh()` lädt die Seite serverseitig
 * neu, die dann die Produkte ausliefert.
 */
export default function FreigabePinGate({
  token,
  projektName,
  branding,
}: {
  token: string
  projektName: string
  branding: Branding | null
}) {
  const router = useRouter()
  const prim = branding?.primary_color ?? '#445c49'
  const bg = branding?.background_color ?? '#f6ede2'
  const name = branding?.firmenname ?? 'Wellbeing Spaces'
  const logoUrl = branding?.logo_url ?? null

  const [pin, setPin] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)
  const [shake, setShake] = useState(false)
  const [versuche, setVersuche] = useState(0)
  const [erfolg, setErfolg] = useState(false)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const gesperrt = versuche >= MAX_VERSUCHE
  const anzahlBoxen = Math.min(MAX_LAENGE, Math.max(MIN_LAENGE, pin.length))

  useEffect(() => { inputRef.current?.focus() }, [])

  function pruefe() {
    if (gesperrt || isPending || erfolg) return
    if (!/^\d{4,6}$/.test(pin)) {
      setFehler('Bitte 4–6 Ziffern eingeben.')
      setShake(true); setTimeout(() => setShake(false), 400)
      return
    }
    startTransition(async () => {
      const ok = await pinPruefen(token, pin)
      if (ok) {
        // Cookie ist serverseitig gesetzt → Seite neu laden (zeigt dann die Produkte).
        setErfolg(true)
        router.refresh()
      } else {
        const neueVersuche = versuche + 1
        setVersuche(neueVersuche)
        setPin('')
        setShake(true); setTimeout(() => setShake(false), 400)
        setTimeout(() => inputRef.current?.focus(), 50)
        if (neueVersuche >= MAX_VERSUCHE) {
          setFehler('Zu viele Fehlversuche. Bitte in ~15 Minuten erneut versuchen oder den Ansprechpartner kontaktieren.')
        } else {
          setFehler(`Falscher PIN. Noch ${MAX_VERSUCHE - neueVersuche} Versuch${MAX_VERSUCHE - neueVersuche !== 1 ? 'e' : ''}.`)
        }
      }
    })
  }

  function handleChange(neu: string) {
    const digits = neu.replace(/\D/g, '').slice(0, MAX_LAENGE)
    setPin(digits)
    setFehler(null)
    if (digits.length === MAX_LAENGE) {
      setTimeout(() => pruefe(), 120)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden"
      style={{ backgroundColor: bg }}
    >
      <div className="absolute top-0 left-0 right-0 h-1 pointer-events-none" style={{ backgroundColor: prim }} />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.18]"
        style={{
          backgroundImage: `radial-gradient(${prim} 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
        }}
      />

      <div className="relative flex items-center gap-2.5 mb-10">
        {logoUrl ? (
          <Image src={logoUrl} alt={name} width={32} height={32} className="rounded object-contain" />
        ) : (
          <svg width="26" height="26" viewBox="0 0 18 18" fill="none">
            <rect x="0" y="0" width="10" height="10" rx="2" fill={prim} opacity="0.30" />
            <rect x="4" y="4" width="10" height="10" rx="2" fill={prim} opacity="0.55" />
            <rect x="8" y="8" width="10" height="10" rx="2" fill={prim} />
          </svg>
        )}
        <span className="font-syne text-base font-bold tracking-tight" style={{ color: prim }}>{name}</span>
      </div>

      <div className={`relative w-full max-w-sm ${shake ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}>
        <div className="bg-white rounded-3xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.15)] px-8 py-10 border border-black/5">
          <div className="relative mx-auto mb-6" style={{ width: 64, height: 64 }}>
            <div className="absolute inset-0 rounded-2xl blur-xl opacity-40" style={{ backgroundColor: prim }} />
            <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: prim + '15' }}>
              <Lock className="w-7 h-7" style={{ color: prim }} />
            </div>
          </div>

          <h1 className="text-xl font-semibold text-gray-900 text-center mb-2 tracking-tight">Zugang geschützt</h1>
          <p className="text-sm text-gray-500 text-center mb-8 leading-relaxed">
            Die Freigabeliste zu<br />
            <span className="font-semibold text-gray-800">{projektName}</span><br />
            ist mit einem PIN geschützt.
          </p>

          <div className="relative mb-5">
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: anzahlBoxen }).map((_, i) => {
                const zeichen = pin[i]
                const aktiv = pin.length === i && !gesperrt
                const istNeuGewachsen = i >= MIN_LAENGE
                return (
                  <div
                    key={i}
                    className={`w-11 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold font-mono transition-all ${
                      istNeuGewachsen ? 'animate-[fadeInScale_0.2s_ease-out]' : ''
                    } ${
                      fehler
                        ? 'border-red-300 bg-red-50/40 text-red-700'
                        : zeichen
                          ? 'bg-gray-900 border-gray-900 text-white'
                          : aktiv
                            ? 'bg-white'
                            : 'border-gray-200 bg-gray-50'
                    }`}
                    style={aktiv && !fehler ? { borderColor: prim } : undefined}
                  >
                    {zeichen ? '•' : ''}
                  </div>
                )
              })}
            </div>
            <input
              ref={inputRef}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={MAX_LAENGE}
              autoComplete="one-time-code"
              value={pin}
              disabled={gesperrt || isPending || erfolg}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') pruefe() }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-text disabled:cursor-not-allowed"
              aria-label="PIN eingeben"
            />
          </div>

          <p className="text-[11px] text-gray-400 text-center mb-6">
            PIN hat 4 – 6 Ziffern. Eingabe wird automatisch geprüft.
          </p>

          <button
            onClick={pruefe}
            disabled={gesperrt || isPending || erfolg || pin.length < 4}
            className="w-full py-3 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:brightness-95"
            style={{ backgroundColor: prim }}
          >
            {erfolg ? 'Wird geöffnet…' : isPending ? 'Wird geprüft…' : 'Bestätigen'}
          </button>

          {fehler && (
            <p className={`text-xs text-center leading-relaxed mt-4 ${gesperrt ? 'text-red-700 font-medium' : 'text-red-600'}`}>
              {fehler}
            </p>
          )}
        </div>

        <p className="text-xs text-center text-gray-400 mt-6">
          Den PIN erhältst du von deinem Innenarchitekten.
        </p>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.7); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
