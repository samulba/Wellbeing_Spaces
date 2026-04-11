'use client'

import { useEffect, useState } from 'react'

function DepthStackIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="10" height="10" rx="2" fill="#6366F1" opacity="0.30" />
      <rect x="4" y="4" width="10" height="10" rx="2" fill="#6366F1" opacity="0.55" />
      <rect x="8" y="8" width="10" height="10" rx="2" fill="#6366F1" />
    </svg>
  )
}

export default function MobileGuard({ children }: { children: React.ReactNode }) {
  const [tooSmall, setTooSmall] = useState(false)
  const [mounted,  setMounted]  = useState(false)

  useEffect(() => {
    function check() {
      setTooSmall(window.innerWidth < 1024)
    }
    check()
    setMounted(true)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (!mounted) return <>{children}</>

  if (tooSmall) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#0F1117] flex flex-col items-center justify-center p-8 text-center">
        <div className="flex items-center gap-3 mb-8">
          <DepthStackIcon />
          <span className="font-syne text-2xl font-bold text-white tracking-tight">WBC Studio</span>
        </div>

        <div className="max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </div>

          <h1 className="text-xl font-semibold text-white mb-3">
            Desktop empfohlen
          </h1>
          <p className="text-sm text-white/50 leading-relaxed">
            WBC Studio ist für Desktop optimiert. Bitte öffne die App auf einem Computer oder Laptop mit mindestens 1024&nbsp;px Breite.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
