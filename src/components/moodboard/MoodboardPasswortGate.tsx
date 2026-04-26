'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Lock, Loader2 } from 'lucide-react'

interface Props {
  token:       string
  raumName:    string
  projektName: string
  fehler?:     boolean
}

export default function MoodboardPasswortGate({ token, raumName, projektName, fehler }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const [pw, setPw] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pw.trim()) return
    setSubmitting(true)
    const usp = new URLSearchParams(params.toString())
    usp.set('pw', pw)
    router.push(`/moodboard/${token}?${usp.toString()}`)
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 max-w-md w-full">
      <div className="flex items-center gap-2.5 mb-4">
        <Image src="/logo-mittel.png" alt="Wellbeing Spaces" width={32} height={32} />
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
            Geschütztes Moodboard
          </p>
          <p className="text-sm font-medium text-gray-800">
            {projektName} {raumName && `· ${raumName}`}
          </p>
        </div>
      </div>

      <div className="text-center my-6">
        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-wellbeing-cream flex items-center justify-center">
          <Lock className="w-6 h-6 text-wellbeing-green-dark" />
        </div>
        <h1 className="text-lg font-semibold text-gray-900">Passwort erforderlich</h1>
        <p className="text-xs text-gray-500 mt-1.5">
          Dein Designer hat dieses Moodboard mit einem Passwort geschützt.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="password"
          autoFocus
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Passwort eingeben"
          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-wellbeing-green focus:ring-2 focus:ring-wellbeing-green/20"
        />
        {fehler && (
          <p className="text-xs text-red-600 text-center">
            Falsches Passwort. Bitte erneut versuchen.
          </p>
        )}
        <button
          type="submit"
          disabled={!pw.trim() || submitting}
          className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-wellbeing-green hover:bg-wellbeing-green-dark text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Moodboard öffnen
        </button>
      </form>
    </div>
  )
}
