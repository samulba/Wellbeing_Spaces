'use client'

import AnimateOnScroll from './AnimateOnScroll'
import Link from 'next/link'

export default function FinalCTA() {
  return (
    <section className="bg-[#445c49] py-32 relative overflow-hidden">
      {/* Glow orb center */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-wellbeing-green/20 blur-[120px] rounded-full pointer-events-none"
        aria-hidden
      />

      {/* Floating border squares — decorative */}
      {[
        { size: 120, top: '10%',  right: '5%',  rotate: 15,  op: 0.07 },
        { size:  70, top: '70%',  right: '15%', rotate: -10, op: 0.05 },
        { size: 180, top: '60%',  left:  '3%',  rotate: 8,   op: 0.04 },
        { size:  50, top: '20%',  left:  '18%', rotate: -25, op: 0.06 },
      ].map((sq, i) => (
        <div
          key={i}
          className="absolute border border-wellbeing-green-light rounded-2xl pointer-events-none"
          style={{
            width: sq.size, height: sq.size,
            top: sq.top,
            ...(sq.right !== undefined ? { right: sq.right } : { left: sq.left }),
            opacity: sq.op,
            transform: `rotate(${sq.rotate}deg)`,
          }}
          aria-hidden
        />
      ))}

      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #818CF8 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
        aria-hidden
      />

      <div className="relative z-10 max-w-3xl mx-auto px-5 text-center">
        <AnimateOnScroll type="blur-in">
          <p className="text-[11px] font-bold text-wellbeing-green-light uppercase tracking-[0.2em] mb-5">
            Jetzt loslegen
          </p>
          <h2 className="font-syne font-bold text-[36px] md:text-[60px] text-white mb-5 leading-[1.06]">
            Bereit, Projekte<br className="hidden md:block" /> professionell zu managen?
          </h2>
        </AnimateOnScroll>

        <AnimateOnScroll delay={150} type="fade-up">
          <p className="text-white/50 text-[18px] mb-10 leading-relaxed">
            Starte kostenlos – keine Kreditkarte, keine Jahresbindung.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#445c49] hover:bg-[#445c49] text-white text-[15px] font-bold rounded-xl transition-all duration-200 hover:shadow-2xl hover:shadow-wellbeing-green/30 hover:-translate-y-1 w-full sm:w-auto justify-center"
            >
              Jetzt kostenlos starten →
            </Link>
            <a
              href="#preise"
              onClick={(e) => { e.preventDefault(); document.querySelector('#preise')?.scrollIntoView({ behavior: 'smooth' }) }}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 text-white/70 text-[15px] font-semibold rounded-xl transition-all duration-200 w-full sm:w-auto justify-center cursor-pointer"
            >
              Preise ansehen
            </a>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-10">
            {['Kostenlos starten', 'Kein Login für Kunden', 'DSGVO-konform · EU-Server'].map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-[12px] text-white/30">
                <span className="text-emerald-400 font-bold">✓</span>
                {t}
              </span>
            ))}
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  )
}
