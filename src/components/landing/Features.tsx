'use client'

import { useRef } from 'react'
import { FolderOpen, Package, Calculator, Link2, Handshake, Users } from 'lucide-react'
import { m, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import Reveal from './Reveal'
import { useIsMobile } from '@/hooks/useIsMobile'

const features = [
  {
    icon: FolderOpen,
    title: 'Projektstruktur',
    desc: 'Kunde, Räume und Budget – alles sauber strukturiert an einem Ort. Kein Copy-Paste zwischen Dokumenten.',
    color: 'bg-wellbeing-cream text-[#445c49]',
    glow: 'shadow-wellbeing-cream',
  },
  {
    icon: Package,
    title: 'Produktlisten',
    desc: 'Produkte mit Links, Bildern und Kategorien übersichtlich erfassen und nach Räumen sortieren.',
    color: 'bg-violet-50 text-violet-500',
    glow: 'shadow-violet-100',
  },
  {
    icon: Calculator,
    title: 'Auto-Kalkulation',
    desc: 'Einkaufspreis rein, Marge setzen – Verkaufspreis netto und brutto werden automatisch berechnet.',
    color: 'bg-emerald-50 text-emerald-600',
    glow: 'shadow-emerald-100',
  },
  {
    icon: Link2,
    title: 'Freigabe per Link',
    desc: 'Kunde klickt den Link, gibt frei oder lehnt ab – kein Account, keine App, keine Erklärung nötig.',
    color: 'bg-sky-50 text-sky-500',
    glow: 'shadow-sky-100',
  },
  {
    icon: Handshake,
    title: 'Partnerverwaltung',
    desc: 'Konditionen, Provisionen und Lieferanteninfos immer griffbereit. Keine verlorenen E-Mails.',
    color: 'bg-amber-50 text-amber-500',
    glow: 'shadow-amber-100',
  },
  {
    icon: Users,
    title: 'Team & Rollen',
    desc: 'Mehrere Designer, ein Tool. Zusammen an Projekten arbeiten ohne Datei-Wirrwarr.',
    color: 'bg-rose-50 text-rose-500',
    glow: 'shadow-rose-100',
  },
]

function FeatureCard({ f }: { f: (typeof features)[number] }) {
  return (
    <div className={`w-[340px] md:w-[380px] shrink-0 bg-white rounded-2xl border border-gray-200 p-7 shadow-xl ${f.glow}`}>
      <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-5`}>
        <f.icon className="w-5 h-5" />
      </div>
      <h3 className="font-syne font-bold text-[17px] text-[#445c49] mb-2">{f.title}</h3>
      <p className="text-[14px] text-gray-500 leading-relaxed">{f.desc}</p>
    </div>
  )
}

function FeatureGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {features.map((f, i) => (
        <Reveal key={f.title} delay={i * 0.08} variant="fade-up">
          <div className={`bg-white rounded-2xl border border-gray-200 p-7 hover:border-transparent hover:shadow-xl hover:${f.glow} hover:-translate-y-1.5 transition-all duration-300`}>
            <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-5`}>
              <f.icon className="w-5 h-5" />
            </div>
            <h3 className="font-syne font-bold text-[17px] text-[#445c49] mb-2">{f.title}</h3>
            <p className="text-[14px] text-gray-500 leading-relaxed">{f.desc}</p>
          </div>
        </Reveal>
      ))}
    </div>
  )
}

export default function Features() {
  const isMobile = useIsMobile()
  const prefersReduced = useReducedMotion()
  const outerRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ['start start', 'end end'],
  })

  // Horizontaler Sweep: 6 Cards, ca. 3 sichtbar pro Viewport → translate bis -55%
  const x = useTransform(scrollYProgress, [0, 1], ['2%', '-58%'])

  const useGrid = isMobile || prefersReduced

  return (
    <section id="features" className="bg-[#F8F9FA] relative">
      <div
        className="absolute inset-0 opacity-[0.018] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #445c49 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
        aria-hidden
      />

      {useGrid ? (
        <div className="relative z-10 max-w-[1300px] mx-auto px-6 py-24">
          <Reveal variant="blur-in">
            <div className="text-center mb-12">
              <p className="text-[11px] font-bold text-[#445c49] uppercase tracking-[0.2em] mb-3">Features</p>
              <h2 className="font-syne font-bold text-[32px] md:text-[52px] text-[#445c49] mb-4 leading-[1.1]">
                Alles was du brauchst –<br className="hidden md:block" /> nichts was du nicht brauchst
              </h2>
              <p className="text-[15px] md:text-[17px] text-gray-500 max-w-lg mx-auto leading-relaxed">
                Kein Overkill. Kein 3D-Renderer. Keine Buchhaltung. Nur das was dich täglich weiterbringt.
              </p>
            </div>
          </Reveal>
          <FeatureGrid />
        </div>
      ) : (
        <div ref={outerRef} className="relative z-10" style={{ height: '350vh' }}>
          <div className="sticky top-0 h-screen w-full flex flex-col justify-center overflow-hidden">
            <div className="max-w-[1300px] mx-auto px-8 w-full">
              <div className="text-center mb-10">
                <p className="text-[11px] font-bold text-[#445c49] uppercase tracking-[0.2em] mb-3">Features</p>
                <h2 className="font-syne font-bold text-[40px] md:text-[56px] text-[#445c49] mb-3 leading-[1.05]">
                  Alles was du brauchst –<br className="hidden md:block" /> nichts was du nicht brauchst
                </h2>
                <p className="text-[16px] md:text-[18px] text-gray-500 max-w-lg mx-auto leading-relaxed">
                  Scroll, um die Features vorbeiziehen zu lassen.
                </p>
              </div>
            </div>

            <div className="w-full overflow-hidden">
              <m.div style={{ x }} className="flex gap-6 pl-[8vw]">
                {features.map((f) => (
                  <FeatureCard key={f.title} f={f} />
                ))}
              </m.div>
            </div>

            <div className="max-w-[1300px] mx-auto px-8 w-full mt-8 flex justify-center">
              <div className="flex items-center gap-2 text-[12px] text-gray-400">
                <span className="w-6 h-px bg-gray-300" />
                Scroll
                <span className="w-6 h-px bg-gray-300" />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
