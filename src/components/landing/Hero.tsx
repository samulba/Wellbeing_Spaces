'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'

// ── Animated Background ──────────────────────────────────────────
function AnimatedBG() {
  const orbs = [
    { w: 520, h: 520, top: '-10%', right: '-6%',  color: 'bg-indigo-200', blur: 'blur-[90px]',  delay: '0s',  dur: '12s', op: 0.38 },
    { w: 360, h: 360, top: '45%',  right: '8%',   color: 'bg-violet-200', blur: 'blur-[70px]',  delay: '-4s', dur: '16s', op: 0.24 },
    { w: 260, h: 260, top: '15%',  left:  '15%',  color: 'bg-blue-100',   blur: 'blur-[60px]',  delay: '-8s', dur: '10s', op: 0.18 },
    { w: 200, h: 200, top: '65%',  left:  '5%',   color: 'bg-indigo-100', blur: 'blur-[50px]',  delay: '-6s', dur: '14s', op: 0.14 },
  ]

  const squares = [
    { size: 120, top: '8%',  right: '4%',  rotate:  15, delay: '0s',  dur: '9s',  anim: 'floatA', op: 0.08 },
    { size:  70, top: '25%', right: '20%', rotate:  -8, delay: '-3s', dur: '11s', anim: 'floatB', op: 0.06 },
    { size: 190, top: '62%', right: '1%',  rotate:   5, delay: '-6s', dur: '13s', anim: 'floatC', op: 0.04 },
    { size:  50, top: '75%', right: '23%', rotate:  28, delay: '-2s', dur: '7s',  anim: 'floatA', op: 0.09 },
    { size:  90, top: '42%', left:  '3%',  rotate: -14, delay: '-8s', dur: '15s', anim: 'floatB', op: 0.05 },
    { size:  55, top: '20%', left:  '8%',  rotate:  20, delay: '-5s', dur: '8s',  anim: 'floatC', op: 0.07 },
  ]

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
      {orbs.map((o, i) => (
        <div
          key={i}
          className={`absolute rounded-full ${o.color} ${o.blur}`}
          style={{
            width: o.w, height: o.h,
            top: o.top,
            ...(('right' in o && o.right) ? { right: o.right } : { left: (o as { left: string }).left }),
            opacity: o.op,
            animation: `pulseOrb ${o.dur} ease-in-out infinite`,
            animationDelay: o.delay,
          }}
        />
      ))}

      {squares.map((sq, i) => (
        <div
          key={i}
          className="absolute border-2 border-indigo-400 rounded-2xl"
          style={{
            width: sq.size, height: sq.size,
            top: sq.top,
            ...(('right' in sq && sq.right !== undefined) ? { right: sq.right } : { left: (sq as { left: string }).left }),
            opacity: sq.op,
            transform: `rotate(${sq.rotate}deg)`,
            animation: `${sq.anim} ${sq.dur} ease-in-out infinite`,
            animationDelay: sq.delay,
          }}
        />
      ))}

      <div
        className="absolute inset-0 opacity-[0.022]"
        style={{
          backgroundImage: 'radial-gradient(circle, #6366F1 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />
    </div>
  )
}

// ── Live Freigabe Mockup ─────────────────────────────────────────
function FreigabeMockup() {
  const [approved, setApproved] = useState(false)

  useEffect(() => {
    let t1: ReturnType<typeof setTimeout>
    const CYCLE = 6000

    function cycle() {
      setApproved(false)
      t1 = setTimeout(() => setApproved(true), 2600)
    }

    cycle()
    const interval = setInterval(cycle, CYCLE)
    return () => { clearTimeout(t1); clearInterval(interval) }
  }, [])

  return (
    <div className="relative w-full max-w-[400px] mx-auto lg:mx-0 select-none">
      {/* Floating chip – top left */}
      <div
        className="absolute -top-5 -left-6 z-20 flex items-center gap-2 bg-white rounded-xl border border-gray-100 shadow-xl px-3 py-2"
        style={{ animation: 'floatB 8s ease-in-out infinite' }}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="text-[12px] font-semibold text-gray-700 whitespace-nowrap">23 aktive Projekte</span>
      </div>

      {/* Floating chip – bottom right */}
      <div
        className="absolute -bottom-5 -right-5 z-20 flex items-center gap-2 bg-[#6366F1] rounded-xl shadow-xl px-3 py-2"
        style={{ animation: 'floatA 7s ease-in-out infinite', animationDelay: '-3s' }}
      >
        <Check className="w-3.5 h-3.5 text-white shrink-0" strokeWidth={3} />
        <span className="text-[12px] font-semibold text-white whitespace-nowrap">Kein Login nötig</span>
      </div>

      {/* Browser / app frame */}
      <div className="rounded-2xl overflow-hidden shadow-2xl shadow-indigo-100/60 border border-gray-200 bg-white">

        {/* URL bar */}
        <div className="bg-gray-50 border-b border-gray-100 px-4 py-2.5 flex items-center gap-2.5">
          <div className="flex gap-1.5 shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-red-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
          </div>
          <div className="flex-1 bg-white border border-gray-100 rounded-md px-2.5 py-1 text-[10px] text-gray-400 font-mono truncate">
            wbc-studio.app/freigabe/e8f2c…
          </div>
        </div>

        {/* App nav */}
        <div className="border-b border-gray-100 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[#6366F1] flex items-center justify-center">
              <span className="text-white font-bold text-[9px]">W</span>
            </div>
            <span className="font-syne font-bold text-[12px] text-gray-800">WBC Studio</span>
          </div>
          <span className="text-[10px] text-gray-400">Freigabe-Ansicht</span>
        </div>

        {/* Breadcrumb */}
        <div className="px-4 py-2 bg-gray-50/60 border-b border-gray-50 flex items-center gap-1.5 text-[10px] text-gray-400">
          <span>Villa Müller</span>
          <span>›</span>
          <span>Wohnzimmer</span>
          <span>›</span>
          <span className="text-gray-600 font-medium">Produktliste</span>
        </div>

        {/* Product card */}
        <div className="p-4">
          <div className="border border-gray-100 rounded-xl p-3.5 bg-gray-50/60 mb-3">
            <div className="flex items-start justify-between mb-2.5">
              <div>
                <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Polstermöbel
                </span>
                <h3 className="font-semibold text-[13px] text-gray-900 mt-1.5 leading-tight">
                  Sofa &bdquo;Venedig&ldquo; 3-Sitzer
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Walter Knoll · Hallingdal 65</p>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-[9px] text-gray-400">Menge</p>
                <p className="font-bold text-[14px] text-gray-800">1×</p>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-2.5 grid grid-cols-2 gap-y-1">
              <span className="text-[11px] text-gray-400">VP netto</span>
              <span className="text-[11px] font-semibold text-gray-700 text-right">2.400,00 €</span>
              <span className="text-[11px] text-gray-400">VP brutto (19%)</span>
              <span className="text-[11px] font-bold text-gray-900 text-right">2.856,00 €</span>
            </div>
          </div>

          {/* Action area – transitions between buttons ↔ success */}
          <div className="relative" style={{ minHeight: '44px' }}>
            {/* Buttons (idle) */}
            <div
              className="flex gap-2 transition-all duration-500 ease-out"
              style={{
                opacity: approved ? 0 : 1,
                transform: approved ? 'translateY(-6px) scale(0.97)' : 'translateY(0) scale(1)',
                pointerEvents: approved ? 'none' : 'auto',
              }}
            >
              <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500 text-white text-[12px] font-semibold rounded-xl hover:bg-emerald-600 transition-colors">
                <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                Freigeben
              </button>
              <button className="flex-1 py-2.5 bg-gray-100 text-gray-500 text-[12px] font-medium rounded-xl hover:bg-gray-200 transition-colors">
                Ablehnen
              </button>
            </div>

            {/* Success state */}
            <div
              className="absolute inset-0 flex items-center justify-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl transition-all duration-500 ease-out"
              style={{
                opacity: approved ? 1 : 0,
                transform: approved ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.97)',
                pointerEvents: approved ? 'auto' : 'none',
              }}
            >
              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
              </div>
              <div>
                <p className="text-[12px] font-bold text-emerald-700">Freigegeben!</p>
                <p className="text-[10px] text-emerald-500">Sofa Venedig · 2.856,00 €</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Hero ──────────────────────────────────────────────────────────
export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-white pt-16">
      <AnimatedBG />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-5">
        <div className="flex flex-col lg:flex-row items-center gap-14 lg:gap-20 py-16 lg:min-h-[calc(100vh-64px)]">

          {/* ── Left: Text ───────────────────────────── */}
          <div className="flex-1 text-center lg:text-left">

            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[13px] font-semibold mb-7 animate-fade-up"
              style={{ animationDelay: '0ms' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Die einfachere Alternative zu Houzz Pro
            </div>

            {/* Headline */}
            <h1
              className="font-syne font-bold text-[#0F1117] leading-[1.06] tracking-tight mb-6 animate-fade-up"
              style={{
                animationDelay: '100ms',
                fontSize: 'clamp(38px, 5.5vw, 72px)',
              }}
            >
              Deine Projekte.<br />
              Deine Preise.<br />
              <span className="gradient-text">Deine Kunden</span>{' '}
              begeistert.
            </h1>

            {/* Subheadline */}
            <p
              className="text-[16px] md:text-[18px] text-gray-500 max-w-xl mb-10 leading-relaxed animate-fade-up lg:mx-0 mx-auto"
              style={{ animationDelay: '200ms' }}
            >
              Produktlisten erstellen, Preise automatisch kalkulieren und
              Kunden mit einem Link zur Freigabe einladen – kein Login nötig.
              Für Interior Designer die mehr wollen als Excel.
            </p>

            {/* CTAs */}
            <div
              className="flex flex-col sm:flex-row items-center lg:justify-start justify-center gap-3 mb-8 animate-fade-up"
              style={{ animationDelay: '300ms' }}
            >
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[15px] font-semibold rounded-xl transition-all duration-200 hover:shadow-xl hover:shadow-indigo-200/60 hover:-translate-y-1 w-full sm:w-auto justify-center"
              >
                Kostenlos starten →
              </Link>
              <a
                href="#features"
                onClick={(e) => {
                  e.preventDefault()
                  document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/80 backdrop-blur-sm border border-gray-200 hover:border-gray-300 text-gray-700 text-[15px] font-semibold rounded-xl transition-all duration-200 hover:shadow-sm hover:bg-white w-full sm:w-auto justify-center cursor-pointer"
              >
                Wie es funktioniert
              </a>
            </div>

            {/* Trust row */}
            <div
              className="flex flex-wrap items-center lg:justify-start justify-center gap-x-6 gap-y-2 animate-fade-up"
              style={{ animationDelay: '400ms' }}
            >
              {['Kostenlos starten', 'Kein Login für Kunden', 'DSGVO-konform'].map((t) => (
                <span key={t} className="flex items-center gap-1.5 text-[13px] text-gray-400">
                  <span className="text-emerald-500 font-bold">✓</span>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* ── Right: Live Mockup ───────────────────── */}
          <div
            className="flex-shrink-0 w-full lg:w-auto animate-fade-up"
            style={{ animationDelay: '180ms' }}
          >
            <FreigabeMockup />
          </div>
        </div>
      </div>
    </section>
  )
}
