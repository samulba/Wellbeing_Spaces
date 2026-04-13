'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'ws_cookie_accepted'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) setVisible(true)
    } catch {
      // localStorage not available
    }
  }, [])

  function accept() {
    try {
      const expires = Date.now() + 365 * 24 * 60 * 60 * 1000
      localStorage.setItem(STORAGE_KEY, String(expires))
    } catch {
      // ignore
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 sm:px-6 sm:pb-6 pointer-events-none">
      <div className="max-w-2xl mx-auto pointer-events-auto">
        <div className="bg-[#2d3e31] border border-[#445c49]/50 rounded-2xl shadow-2xl shadow-black/30 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Cookie icon */}
          <div className="w-8 h-8 rounded-xl bg-[#445c49]/40 flex items-center justify-center shrink-0">
            <span className="text-[16px]">🍪</span>
          </div>

          {/* Text */}
          <p className="text-[13px] text-white/60 leading-relaxed flex-1">
            Diese Website verwendet nur technisch notwendige Cookies für die Anmeldung.
            Keine Marketing- oder Tracking-Cookies.
          </p>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <Link
              href="/datenschutz"
              className="px-3.5 py-2 text-[12px] font-medium text-white/40 hover:text-white/70 transition-colors rounded-lg"
            >
              Datenschutz
            </Link>
            <button
              onClick={accept}
              className="px-5 py-2 bg-[#445c49] hover:bg-[#94c1a4] hover:text-[#2d3e31] text-white text-[13px] font-semibold rounded-xl transition-all duration-200"
            >
              Verstanden
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
