'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Clock, AlertCircle, Zap, ArrowDown } from 'lucide-react'
import { m, useScroll, useTransform, useReducedMotion, type MotionValue } from 'framer-motion'

// ── Animated Mesh-Gradient Background ────────────────────────────
function AnimatedBG({ y, opacity, scale }: { y: MotionValue<number>; opacity: MotionValue<number>; scale: MotionValue<number> }) {
  // Größere, wärmere Orbs in konsistenter Palette → weicher Mesh-Look
  const orbs = [
    { w: 720, h: 720, top: '-18%', right: '-14%', color: 'bg-wellbeing-green-light', blur: 'blur-[120px]', delay: '0s',   dur: '14s', op: 0.45 },
    { w: 520, h: 520, top: '38%',  right: '-4%',  color: 'bg-wellbeing-cream',       blur: 'blur-[100px]', delay: '-4s',  dur: '18s', op: 0.40 },
    { w: 420, h: 420, top: '8%',   left:  '-6%',  color: 'bg-[#c8dbc9]',             blur: 'blur-[90px]',  delay: '-8s',  dur: '12s', op: 0.30 },
    { w: 320, h: 320, top: '62%',  left:  '-4%',  color: 'bg-wellbeing-cream',       blur: 'blur-[80px]',  delay: '-6s',  dur: '16s', op: 0.25 },
    { w: 260, h: 260, top: '30%',  left:  '42%',  color: 'bg-[#e8f0e2]',             blur: 'blur-[70px]',  delay: '-10s', dur: '20s', op: 0.22 },
  ]

  return (
    <m.div
      style={{ y, opacity, scale }}
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      aria-hidden
    >
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
      {/* Feines Noise-Grid für Tiefenwirkung */}
      <div
        className="absolute inset-0 opacity-[0.022]"
        style={{
          backgroundImage: 'radial-gradient(circle, #445c49 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />
      {/* Sanfter Vignette-Fade zum Rand */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, transparent 55%, rgba(255,255,255,0.4) 100%)',
        }}
      />
    </m.div>
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

      <div className="rounded-2xl overflow-hidden shadow-2xl shadow-wellbeing-cream/60 border border-gray-200 bg-white">
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

        <div className="divide-y divide-gray-50/80">
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

          <div className="flex items-center gap-2.5 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold text-[#94c1a4] uppercase tracking-wide mb-0.5">Textilien</p>
              <p className="text-[12px] font-semibold text-gray-800 truncate">Vorhang Dedar Mumbai</p>
            </div>
            <p className="text-[12px] font-bold text-gray-900 tabular-nums shrink-0">680 €</p>
            <div className="flex items-center gap-1 bg-rose-50 border border-rose-100 px-2 py-1 rounded-lg shrink-0">
              <AlertCircle className="w-2.5 h-2.5 text-rose-400" />
              <span className="text-[10px] font-semibold text-rose-500">Alt.</span>
            </div>
          </div>
        </div>

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
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
}
const item = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
}

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const prefersReduced = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })

  const bgY      = useTransform(scrollYProgress, [0, 1], [0, -180])
  const bgScale  = useTransform(scrollYProgress, [0, 1], [1, 1.25])
  const bgOpac   = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  const textY    = useTransform(scrollYProgress, [0, 1], [0, -60])
  const textOpac = useTransform(scrollYProgress, [0, 0.85], [1, 0.25])
  const textBlur = useTransform(scrollYProgress, [0, 1], ['0px', '6px'])
  const textFilter = useTransform(textBlur, (b) => `blur(${b})`)

  const mockY     = useTransform(scrollYProgress, [0, 1], [0, -40])
  const mockScale = useTransform(scrollYProgress, [0, 1], [1, 0.96])
  const mockRot   = useTransform(scrollYProgress, [0, 1], [0, -2])

  return (
    <section ref={sectionRef} className="relative min-h-screen flex items-center overflow-hidden bg-white pt-16">
      <AnimatedBG y={bgY} opacity={bgOpac} scale={bgScale} />

      <div className="relative z-10 w-full max-w-[1300px] mx-auto px-8">
        <m.div
          className="flex flex-col lg:flex-row items-center gap-14 lg:gap-16 py-16 lg:min-h-[calc(100vh-64px)]"
          variants={container}
          initial="hidden"
          animate="visible"
        >

          {/* ── Left: Text ───────────────────────────── */}
          <m.div
            className="flex-1 text-center lg:text-left"
            style={prefersReduced ? undefined : { y: textY, opacity: textOpac, filter: textFilter }}
          >
            <m.div
              variants={item}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-wellbeing-cream border border-wellbeing-cream text-wellbeing-green text-[13px] font-semibold mb-7"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-wellbeing-green animate-pulse" />
              Plattform für Interior-Projekte
            </m.div>

            <m.h1
              variants={item}
              className="font-syne font-bold text-[#2d3e31] leading-[1.02] tracking-tight mb-6"
              style={{ fontSize: 'clamp(42px, 6vw, 82px)' }}
            >
              Produkte.<br />
              Kalkulation.<br />
              <span className="relative inline-block">
                <span
                  className="relative z-10"
                  style={{
                    background: 'linear-gradient(135deg, #445c49 0%, #94c1a4 50%, #445c49 100%)',
                    backgroundSize: '200% auto',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    animation: 'shimmer 6s ease-in-out infinite',
                  }}
                >
                  Freigaben.
                </span>
                <span
                  aria-hidden
                  className="absolute left-0 right-0 bottom-[6%] h-[14%] -z-0 rounded-full"
                  style={{ background: 'rgba(148,193,164,0.28)' }}
                />
              </span>
            </m.h1>

            <m.p
              variants={item}
              className="text-[17px] md:text-[19px] text-gray-600 max-w-xl mb-10 leading-relaxed lg:mx-0 mx-auto"
            >
              Produktlisten erstellen, Verkaufspreise automatisch kalkulieren
              und Produkte per Link zur Freigabe geben — strukturiert an einem Ort.
            </m.p>

            <m.div
              variants={item}
              className="flex flex-col sm:flex-row items-center lg:justify-start justify-center gap-3 mb-10"
            >
              <a
                href="#features"
                onClick={(e) => {
                  e.preventDefault()
                  document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="group relative inline-flex items-center gap-2 px-7 py-3.5 bg-[#445c49] hover:bg-[#2d3e31] text-white text-[15px] font-semibold rounded-xl transition-all duration-200 hover:shadow-2xl hover:shadow-wellbeing-green-light/70 hover:-translate-y-1 w-full sm:w-auto justify-center cursor-pointer"
              >
                <span className="relative z-10">Wie es funktioniert</span>
                <span className="relative z-10 transition-transform duration-200 group-hover:translate-x-1">→</span>
              </a>
            </m.div>

            <m.div
              variants={item}
              className="flex flex-wrap items-center lg:justify-start justify-center gap-x-6 gap-y-2"
            >
              {['DSGVO-konform', 'Server in der EU (Frankfurt)', 'Freigabe ohne Account'].map((t) => (
                <span key={t} className="flex items-center gap-1.5 text-[13px] text-gray-400">
                  <span className="text-emerald-500 font-bold">✓</span>
                  {t}
                </span>
              ))}
            </m.div>
          </m.div>

          {/* ── Right: Dashboard Mockup ──────────────── */}
          <m.div
            variants={item}
            className="flex-shrink-0 w-full lg:w-auto pt-6 lg:pt-0 mt-2 lg:mt-0"
            style={prefersReduced ? undefined : { y: mockY, scale: mockScale, rotate: mockRot }}
          >
            <DashboardMockup />
          </m.div>
        </m.div>
      </div>

      {/* Scroll-Cue — dezent unten mittig */}
      <m.div
        aria-hidden
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 hidden md:flex flex-col items-center gap-1.5 pointer-events-none"
        style={prefersReduced ? undefined : { opacity: textOpac }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#445c49]/60">
          Scroll
        </span>
        <div className="w-[1px] h-7 bg-gradient-to-b from-[#445c49]/40 to-transparent" />
        <ArrowDown className="w-3 h-3 text-[#445c49]/50 animate-bounce" strokeWidth={2.5} />
      </m.div>
    </section>
  )
}
