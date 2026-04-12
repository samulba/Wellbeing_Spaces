'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

function DepthStackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="0" y="0" width="10" height="10" rx="2" fill="#445c49" opacity="0.25" />
      <rect x="4" y="4" width="10" height="10" rx="2" fill="#445c49" opacity="0.55" />
      <rect x="8" y="8" width="10" height="10" rx="2" fill="#445c49" />
    </svg>
  )
}

const navLinks = [
  { label: 'Features',  href: '/features'  },
  { label: 'Vorteile',  href: '/#warum-wbc' },
  { label: 'Preise',    href: '/preise'    },
  { label: 'FAQ',       href: '/#faq'      },
]

function smoothScroll(href: string) {
  if (href.startsWith('/#')) {
    const id = href.slice(2)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }
}

export default function Nav() {
  const [scrolled,   setScrolled]   = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm shadow-gray-100/60'
            : 'bg-white/85 backdrop-blur-xl'
        }`}
      >
        <div className="w-full px-8 h-[68px] flex items-center justify-between gap-8">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <DepthStackIcon />
            <span className="font-syne text-[17px] font-bold text-[#445c49] tracking-tight leading-none group-hover:text-[#445c49] transition-colors duration-200">
              Wellbeing Spaces
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={(e) => {
                  if (l.href.startsWith('/#') && window.location.pathname === '/') {
                    e.preventDefault()
                    smoothScroll(l.href)
                  }
                }}
                className="px-4 py-2 text-[14px] font-medium text-gray-500 hover:text-[#445c49] hover:bg-gray-50 rounded-lg transition-all duration-150 cursor-pointer"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Right: Anmelden + CTA */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <Link
              href="/login"
              className="px-4 py-2 text-[14px] font-medium text-gray-500 hover:text-[#445c49] hover:bg-gray-50 rounded-lg transition-all duration-150"
            >
              Anmelden
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#445c49] hover:bg-[#445c49] text-white text-[14px] font-semibold rounded-lg transition-all duration-150 hover:shadow-lg hover:shadow-wellbeing-green-light/60"
            >
              Kostenlos starten
              <span className="text-wellbeing-green-light">→</span>
            </Link>
          </div>

          {/* Hamburger */}
          <button
            className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menü"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div
        className={`fixed inset-0 z-40 bg-white flex flex-col px-6 pt-24 pb-8 transition-transform duration-300 md:hidden ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <nav className="flex flex-col gap-1 mb-6">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => {
                if (l.href.startsWith('/#') && window.location.pathname === '/') {
                  e.preventDefault()
                  setMobileOpen(false)
                  setTimeout(() => smoothScroll(l.href), 300)
                } else {
                  setMobileOpen(false)
                }
              }}
              className="text-[16px] font-medium text-gray-800 py-3.5 px-2 border-b border-gray-50 hover:text-[#445c49] transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex flex-col gap-3 mt-auto">
          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
            className="w-full flex items-center justify-center py-3 border border-gray-200 text-gray-700 text-[15px] font-semibold rounded-xl transition-colors hover:bg-gray-50"
          >
            Anmelden
          </Link>
          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
            className="w-full flex items-center justify-center gap-1.5 py-3.5 bg-[#445c49] hover:bg-[#445c49] text-white text-[15px] font-semibold rounded-xl transition-colors"
          >
            Kostenlos starten →
          </Link>
        </div>
      </div>
    </>
  )
}
