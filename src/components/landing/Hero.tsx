'use client'

import Link from 'next/link'

// ── Animierter Hintergrund ────────────────────────────────────
function AnimatedBG() {
  const orbs = [
    { w: 480, h: 480, top: '-12%', right: '-8%',  color: 'bg-indigo-200', blur: 'blur-[80px]', opacity: 'opacity-30', delay: '0s',  dur: '12s' },
    { w: 320, h: 320, top: '50%',  right: '10%',  color: 'bg-violet-200', blur: 'blur-[60px]', opacity: 'opacity-20', delay: '-4s', dur: '16s' },
    { w: 240, h: 240, top: '20%',  right: '40%',  color: 'bg-blue-100',   blur: 'blur-[50px]', opacity: 'opacity-15', delay: '-8s', dur: '10s' },
  ]

  const squares = [
    { size: 110, top: '12%', right: '6%',  rotate:  15, delay: '0s',  dur: '9s',  anim: 'floatA', op: 0.07 },
    { size:  65, top: '28%', right: '22%', rotate:  -8, delay: '-3s', dur: '11s', anim: 'floatB', op: 0.05 },
    { size: 170, top: '62%', right: '3%',  rotate:   5, delay: '-6s', dur: '13s', anim: 'floatC', op: 0.04 },
    { size:  45, top: '72%', right: '24%', rotate:  28, delay: '-2s', dur: '7s',  anim: 'floatA', op: 0.08 },
    { size: 200, top: '80%', right: '12%', rotate: -14, delay: '-8s', dur: '15s', anim: 'floatB', op: 0.03 },
    { size:  80, top: '42%', right: '35%', rotate:  20, delay: '-5s', dur: '8s',  anim: 'floatC', op: 0.04 },
  ]

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
      {/* Gradient Orbs */}
      {orbs.map((o, i) => (
        <div
          key={i}
          className={`absolute rounded-full ${o.color} ${o.blur} ${o.opacity}`}
          style={{
            width: o.w, height: o.h,
            top: o.top, right: o.right,
            animation: `pulseOrb ${o.dur} ease-in-out infinite`,
            animationDelay: o.delay,
          }}
        />
      ))}

      {/* Floating depth-stack squares */}
      {squares.map((sq, i) => (
        <div
          key={i}
          className="absolute border-2 border-indigo-400 rounded-2xl"
          style={{
            width: sq.size, height: sq.size,
            top: sq.top, right: sq.right,
            opacity: sq.op,
            transform: `rotate(${sq.rotate}deg)`,
            animation: `${sq.anim} ${sq.dur} ease-in-out infinite`,
            animationDelay: sq.delay,
          }}
        />
      ))}

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: 'radial-gradient(circle, #6366F1 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />
    </div>
  )
}

// ── Komponente ────────────────────────────────────────────────
export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white pt-16">
      <AnimatedBG />

      <div className="relative z-10 max-w-4xl mx-auto px-5 text-center">

        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 text-[13px] font-semibold mb-8 animate-fade-up"
          style={{ animationDelay: '0ms' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          Die einfachere Alternative zu Houzz Pro
        </div>

        {/* Headline */}
        <h1
          className="font-syne font-bold text-[#0F1117] leading-[1.06] tracking-tight mb-6 animate-fade-up text-[40px] sm:text-[56px] md:text-[68px] lg:text-[76px]"
          style={{ animationDelay: '120ms' }}
        >
          Deine Projekte. Deine Preise.<br />
          <span className="gradient-text">
            Deine Kunden
          </span>{' '}
          begeistert.
        </h1>

        {/* Subheadline */}
        <p
          className="text-[17px] md:text-[20px] text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up"
          style={{ animationDelay: '220ms' }}
        >
          Produktlisten erstellen, Preise automatisch kalkulieren und Kunden mit einem Link
          zur Freigabe einladen – kein Login nötig. Für Interior Designer die mehr wollen als Excel.
        </p>

        {/* CTAs */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8 animate-fade-up"
          style={{ animationDelay: '320ms' }}
        >
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[15px] font-semibold rounded-xl transition-all duration-200 hover:shadow-xl hover:shadow-indigo-200/60 hover:-translate-y-1 w-full sm:w-auto justify-center"
          >
            Kostenlos starten →
          </Link>
          <a
            href="#features"
            onClick={(e) => { e.preventDefault(); document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' }) }}
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/80 backdrop-blur-sm border border-gray-200 hover:border-gray-300 text-gray-700 text-[15px] font-semibold rounded-xl transition-all duration-200 hover:shadow-sm hover:bg-white w-full sm:w-auto justify-center cursor-pointer"
          >
            Wie es funktioniert
          </a>
        </div>

        {/* Trust row */}
        <div
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 animate-fade-up"
          style={{ animationDelay: '420ms' }}
        >
          {['Kostenlos starten', 'Kein Login für Kunden', 'DSGVO-konform'].map((t) => (
            <span key={t} className="flex items-center gap-1.5 text-[13px] text-gray-400">
              <span className="text-emerald-500 font-bold">✓</span>
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
