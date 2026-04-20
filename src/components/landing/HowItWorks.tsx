'use client'

import { useRef, useState } from 'react'
import { FolderPlus, Package, Share2 } from 'lucide-react'
import { AnimatePresence, m, useMotionValueEvent, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import Reveal from './Reveal'
import { useIsMobile } from '@/hooks/useIsMobile'

const steps = [
  {
    icon: FolderPlus,
    num: '01',
    title: 'Projekt anlegen',
    desc: 'Kunde und Räume anlegen, Budget setzen – in unter 2 Minuten startklar.',
  },
  {
    icon: Package,
    num: '02',
    title: 'Produkte erfassen',
    desc: 'Links einfügen, Preise automatisch berechnen lassen, Kategorien vergeben.',
  },
  {
    icon: Share2,
    num: '03',
    title: 'Freigabe senden',
    desc: 'Link an Kunden schicken, Feedback sofort im Tool sehen – ohne E-Mail-Chaos.',
  },
]

function MobileSteps() {
  return (
    <section id="wie-es-funktioniert" className="bg-white py-24 overflow-hidden">
      <div className="max-w-[1300px] mx-auto px-6">
        <Reveal variant="blur-in">
          <div className="text-center mb-14">
            <p className="text-[11px] font-bold text-[#445c49] uppercase tracking-[0.2em] mb-3">
              So funktionierts
            </p>
            <h2 className="font-syne font-bold text-[32px] text-[#445c49] leading-[1.1]">
              In 3 Schritten zum<br /> professionellen Projekt
            </h2>
          </div>
        </Reveal>

        <div className="flex flex-col gap-5">
          {steps.map((step, i) => (
            <Reveal key={step.num} delay={i * 0.1} variant="fade-up">
              <div className="flex items-start gap-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="relative w-14 h-14 rounded-2xl bg-[#445c49] flex items-center justify-center shadow-lg shadow-wellbeing-green-light/70 shrink-0">
                  <step.icon className="w-5 h-5 text-white" strokeWidth={1.8} />
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center">
                    <span className="font-syne font-bold text-[9px] text-[#445c49]">{step.num}</span>
                  </span>
                </div>
                <div>
                  <h3 className="font-syne font-bold text-[18px] text-[#445c49] mb-1.5">{step.title}</h3>
                  <p className="text-[13px] text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.3} variant="scale-in">
          <div className="mt-12 flex justify-center">
            <div className="inline-flex items-center gap-3 px-5 py-3 bg-wellbeing-cream border border-wellbeing-cream rounded-2xl">
              <span className="text-[13px] font-semibold text-[#445c49]">Durchschnittliche Setup-Zeit:</span>
              <span className="font-syne font-bold text-[#445c49] text-[15px]">unter 5 Min.</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default function HowItWorks() {
  const isMobile = useIsMobile()
  const prefersReduced = useReducedMotion()
  const outerRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ['start start', 'end end'],
  })

  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1])

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    // 3 Ranges: 0-0.33, 0.33-0.66, 0.66-1
    const idx = p < 0.34 ? 0 : p < 0.67 ? 1 : 2
    setActive(idx)
  })

  if (isMobile || prefersReduced) return <MobileSteps />

  const ActiveIcon = steps[active].icon

  return (
    <section id="wie-es-funktioniert" className="bg-white relative">
      <div ref={outerRef} className="relative" style={{ height: '320vh' }}>
        <div className="sticky top-0 h-screen w-full flex items-center overflow-hidden">
          <div className="w-full max-w-[1300px] mx-auto px-8">

            {/* Heading */}
            <div className="text-center mb-12">
              <p className="text-[11px] font-bold text-[#445c49] uppercase tracking-[0.2em] mb-3">
                So funktionierts
              </p>
              <h2 className="font-syne font-bold text-[40px] md:text-[56px] text-[#445c49] leading-[1.05]">
                In 3 Schritten zum<br className="hidden md:block" /> professionellen Projekt
              </h2>
            </div>

            <div className="grid grid-cols-[auto_1fr] gap-12 items-center">

              {/* Left: vertical progress + step markers */}
              <div className="relative flex flex-col gap-16 pl-2">
                <div className="absolute left-[27px] top-3 bottom-3 w-[2px] bg-wellbeing-cream" aria-hidden />
                <m.div
                  style={{ scaleY: lineScale, transformOrigin: '0% 0%' }}
                  className="absolute left-[27px] top-3 bottom-3 w-[2px] bg-[#445c49]"
                  aria-hidden
                />
                {steps.map((s, i) => {
                  const isActive = i === active
                  const isDone   = i < active
                  return (
                    <div key={s.num} className="relative flex items-center gap-4 z-10">
                      <m.div
                        animate={{
                          scale: isActive ? 1 : 0.82,
                          backgroundColor: isActive || isDone ? '#445c49' : '#ffffff',
                        }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 shadow-lg ${
                          isActive || isDone ? 'border-[#445c49]' : 'border-gray-200'
                        }`}
                      >
                        <span className={`font-syne font-bold text-[14px] ${isActive || isDone ? 'text-white' : 'text-gray-400'}`}>
                          {s.num}
                        </span>
                      </m.div>
                      <span className={`text-[14px] font-semibold transition-colors ${isActive ? 'text-[#445c49]' : 'text-gray-400'}`}>
                        {s.title}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Right: active step stage */}
              <div className="relative min-h-[360px] flex items-center">
                <AnimatePresence mode="wait">
                  <m.div
                    key={active}
                    initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -16, filter: 'blur(4px)' }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-start gap-8"
                  >
                    <div className="w-24 h-24 rounded-3xl bg-[#445c49] flex items-center justify-center shadow-xl shadow-wellbeing-green-light/60 shrink-0">
                      <ActiveIcon className="w-10 h-10 text-white" strokeWidth={1.6} />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-[#445c49] uppercase tracking-[0.2em] mb-2">
                        Schritt {steps[active].num}
                      </p>
                      <h3 className="font-syne font-bold text-[32px] md:text-[40px] text-[#445c49] leading-tight mb-4">
                        {steps[active].title}
                      </h3>
                      <p className="text-[16px] md:text-[18px] text-gray-500 leading-relaxed max-w-[520px]">
                        {steps[active].desc}
                      </p>
                    </div>
                  </m.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="mt-14 flex justify-center">
              <div className="inline-flex items-center gap-3 px-6 py-3.5 bg-wellbeing-cream border border-wellbeing-cream rounded-2xl">
                <span className="text-[13px] font-semibold text-[#445c49]">Durchschnittliche Setup-Zeit:</span>
                <span className="font-syne font-bold text-[#445c49] text-[15px]">unter 5 Minuten</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}
