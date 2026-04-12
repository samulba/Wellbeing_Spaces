'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Check, Clock, AlertCircle, Zap } from 'lucide-react'

// ── Animated Background ──────────────────────────────────────────
function AnimatedBG() {
  const orbs = [
    { w: 520, h: 520, top: '-10%', right: '-6%',  color: 'bg-wellbeing-green-light', blur: 'blur-[90px]',  delay: '0s',  dur: '12s', op: 0.38 },
    { w: 360, h: 360, top: '45%',  right: '8%',   color: 'bg-violet-200', blur: 'blur-[70px]',  delay: '-4s', dur: '16s', op: 0.24 },
    { w: 260, h: 260, top: '15%',  left:  '15%',  color: 'bg-blue-100',   blur: 'blur-[60px]',  delay: '-8s', dur: '10s', op: 0.18 },
    { w: 200, h: 200, top: '65%',  left:  '5%',   color: 'bg-wellbeing-cream', blur: 'blur-[50px]',  delay: '-6s', dur: '14s', op: 0.14 },
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
            ...('right' in o && o.right ? { right: o.right } : { left: (o as { left: string }).left }),
            opacity: o.op,
            animation: `pulseOrb ${o.dur} ease-in-out infinite`,
            animationDelay: o.delay,
          }}
        />
      ))}
      {squares.map((sq, i) => (
        <div
          key={i}
          className="absolute border-2 border-wellbeing-green-light rounded-2xl"
          style={{
            width: sq.size, height: sq.size,
            top: sq.top,
            ...('right' in sq && sq.right !== undefined ? { right: sq.right } : { left: (sq as { left: string }).left }),
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
          backgroundImage: 'radial-gradient(circle, #445c49 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />
    </div>
  )
}

// ── Dashboard Mockup (Designer-Ansicht) ──────────────────────────
function DashboardMockup() {
  const [approved, setApproved] = useState(false)

  useEffect(() => {
    let t1: ReturnType<typeof setTimeout>
    const CYCLE = 7000
    function cycle() {
      setApproved(false)
      t1 = setTimeout(() => setApproved(true), 2400)
    }
    cycle()
    const interval = setInterval(cycle, CYCLE)
    return () => { clearTimeout(t1); clearInterval(interval) }
  }, [])

  return (
    <div className="relative w-full max-w-[460px] mx-auto lg:mx-0 select-none">

      {/* Floating chip – auto calculation (top right) */}
      <div
        className="absolute -top-5 -right-3 z-20 flex items-center gap-2 bg-[#445c49] rounded-xl shadow-xl shadow-wellbeing-green-light/60 px-3.5 py-2.5"
        style={{ animation: 'floatA 18s ease-in-out infinite', animationDelay: '-4s' }}
      >
        <Zap className="w-3.5 h-3.5 text-wellbeing-green-light shrink-0" />
        <div>
          <p className="text-[9px] text-wellbeing-green-light/70 leading-none mb-0.5 font-medium">Auto-Kalkulation</p>
          <p className="text-[12px] font-bold text-white whitespace-nowrap leading-none">
            EP 1.200€ · 40% → 2.856€
          </p>
        </div>
      </div>

      {/* Floating chip – freigabe notification (bottom left, appears when approved) */}
      <div
        className="absolute -bottom-5 -left-3 z-20 flex items-center gap-2.5 bg-white rounded-xl border border-emerald-100 shadow-xl px-3.5 py-2.5 transition-all duration-500 ease-out"
        style={{
          opacity: approved ? 1 : 0,
          transform: approved ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.94)',
          pointerEvents: 'none',
        }}
      >
        <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
          <Check className="w-4 h-4 text-white" strokeWidth={3} />
        </div>
        <div>
          <p className="text-[11px] font-bold text-gray-800 leading-none mb-0.5">Freigabe erhalten</p>
          <p className="text-[10px] text-gray-400 leading-none whitespace-nowrap">Hängeleuchte Flos Aim</p>
        </div>
      </div>

      {/* Main app frame */}
      <div className="rounded-2xl overflow-hidden shadow-2xl shadow-wellbeing-cream/60 border border-gray-200 bg-white">

        {/* URL bar */}
        <div className="bg-gray-50 border-b border-gray-100 px-4 py-2.5 flex items-center gap-2.5">
          <div className="flex gap-1.5 shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-red-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
          </div>
          <div className="flex-1 bg-white border border-gray-100 rounded-md px-2.5 py-1 text-[10px] text-gray-400 font-mono truncate">
            wbc-studio.app/dashboard/projekte/villa-mueller
          </div>
        </div>

        {/* App nav */}
        <div className="border-b border-gray-100 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[#445c49] flex items-center justify-center">
              <span className="text-white font-bold text-[9px]">W</span>
            </div>
            <span className="font-syne font-bold text-[12px] text-gray-800">Wellbeing Spaces</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-600 font-semibold rounded-full border border-emerald-100">
            Aktiv
          </span>
        </div>

        {/* Project header */}
        <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
          <div>
            <p className="text-[12px] font-bold text-gray-800">Villa Müller · Wohnzimmer</p>
            <p className="text-[10px] text-gray-400 mt-0.5">3 Produkte · Budget 45.000 €</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-gray-400 mb-0.5">Gesamt brutto</p>
            <p className="font-syne font-bold text-[13px] text-[#445c49]">4.726,00 €</p>
          </div>
        </div>

        {/* Product rows */}
        <div className="divide-y divide-gray-50/80">

          {/* Row 1 – Freigegeben */}
          <div className="flex items-center gap-2.5 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold text-[#445c49] uppercase tracking-wide mb-0.5">Polstermöbel</p>
              <p className="text-[12px] font-semibold text-gray-800 truncate">Sofa Venedig 3-Sitzer</p>
            </div>
            <p className="text-[12px] font-bold text-gray-900 tabular-nums shrink-0">2.856 €</p>
            <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg shrink-0">
              <Check className="w-2.5 h-2.5 text-emerald-500" strokeWidth={3} />
              <span className="text-[10px] font-semibold text-emerald-600">OK</span>
            </div>
          </div>

          {/* Row 2 – Ausstehend → Freigegeben (animated) */}
          <div
            className="flex items-center gap-2.5 px-4 py-3 transition-colors duration-500"
            style={{ background: approved ? 'rgb(240 253 244 / 0.5)' : 'rgb(255 251 235 / 0.4)' }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold text-amber-400 uppercase tracking-wide mb-0.5">Leuchten</p>
              <p className="text-[12px] font-semibold text-gray-800 truncate">Hängeleuchte Flos Aim</p>
            </div>
            <p className="text-[12px] font-bold text-gray-900 tabular-nums shrink-0">1.190 €</p>
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-lg shrink-0 border transition-all duration-500"
              style={{
                background: approved ? 'rgb(240 253 244)' : 'rgb(255 251 235)',
                borderColor: approved ? 'rgb(167 243 208)' : 'rgb(253 230 138)',
              }}
            >
              {approved ? (
                <>
                  <Check className="w-2.5 h-2.5 text-emerald-500" strokeWidth={3} />
                  <span className="text-[10px] font-semibold text-emerald-600">OK</span>
                </>
              ) : (
                <>
                  <Clock className="w-2.5 h-2.5 text-amber-500" />
                  <span className="text-[10px] font-semibold text-amber-600">Warten</span>
                </>
              )}
            </div>
          </div>

          {/* Row 3 – Alternative */}
          <div className="flex items-center gap-2.5 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold text-violet-400 uppercase tracking-wide mb-0.5">Textilien</p>
              <p className="text-[12px] font-semibold text-gray-800 truncate">Vorhang Dedar Mumbai</p>
            </div>
            <p className="text-[12px] font-bold text-gray-900 tabular-nums shrink-0">680 €</p>
            <div className="flex items-center gap-1 bg-rose-50 border border-rose-100 px-2 py-1 rounded-lg shrink-0">
              <AlertCircle className="w-2.5 h-2.5 text-rose-400" />
              <span className="text-[10px] font-semibold text-rose-500">Alt.</span>
            </div>
          </div>
        </div>

        {/* Pricing breakdown footer */}
        <div className="px-4 py-3 border-t border-gray-100 bg-wellbeing-cream/40">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="text-gray-400">EP gesamt</span>
            <span className="font-medium text-gray-600">2.832,00 €</span>
          </div>
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="text-gray-400">Marge ∅ 40%</span>
            <span className="font-medium text-emerald-600">+ 1.894,00 €</span>
          </div>
          <div className="flex items-center justify-between text-[12px] font-bold border-t border-gray-100 pt-1.5 mt-1.5">
            <span className="text-gray-700">VP brutto gesamt</span>
            <span className="text-[#445c49]">4.726,00 €</span>
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
        <div className="flex flex-col lg:flex-row items-center gap-14 lg:gap-16 py-16 lg:min-h-[calc(100vh-64px)]">

          {/* ── Left: Text ───────────────────────────── */}
          <div className="flex-1 text-center lg:text-left">

            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-wellbeing-cream border border-wellbeing-cream text-wellbeing-green text-[13px] font-semibold mb-7 animate-fade-up"
              style={{ animationDelay: '0ms' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-wellbeing-green animate-pulse" />
              Für Interior Designer & Design Studios
            </div>

            <h1
              className="font-syne font-bold text-[#445c49] leading-[1.06] tracking-tight mb-6 animate-fade-up"
              style={{ animationDelay: '100ms', fontSize: 'clamp(38px, 5.5vw, 72px)' }}
            >
              Deine Projekte.<br />
              Deine Preise.<br />
              <span className="gradient-text">Deine Kunden</span>{' '}
              begeistert.
            </h1>

            <p
              className="text-[16px] md:text-[18px] text-gray-500 max-w-xl mb-10 leading-relaxed animate-fade-up lg:mx-0 mx-auto"
              style={{ animationDelay: '200ms' }}
            >
              Produktlisten erstellen, Preise automatisch kalkulieren und
              Kunden mit einem Link zur Freigabe einladen.
              Für Interior Designer die mehr wollen als Excel.
            </p>

            <div
              className="flex flex-col sm:flex-row items-center lg:justify-start justify-center gap-3 mb-8 animate-fade-up"
              style={{ animationDelay: '300ms' }}
            >
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#445c49] hover:bg-[#445c49] text-white text-[15px] font-semibold rounded-xl transition-all duration-200 hover:shadow-xl hover:shadow-wellbeing-green-light/60 hover:-translate-y-1 w-full sm:w-auto justify-center"
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

            <div
              className="flex flex-wrap items-center lg:justify-start justify-center gap-x-6 gap-y-2 animate-fade-up"
              style={{ animationDelay: '400ms' }}
            >
              {['Kostenlos starten', 'Keine Kreditkarte', 'DSGVO-konform'].map((t) => (
                <span key={t} className="flex items-center gap-1.5 text-[13px] text-gray-400">
                  <span className="text-emerald-500 font-bold">✓</span>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* ── Right: Dashboard Mockup ──────────────── */}
          <div
            className="flex-shrink-0 w-full lg:w-auto animate-fade-up"
            style={{ animationDelay: '180ms' }}
          >
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  )
}
