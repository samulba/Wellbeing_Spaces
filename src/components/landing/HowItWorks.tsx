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
    desc: 'Kunde und Räume anlegen, Budget setzen – die Grundlage fürs Projekt steht.',
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
    desc: 'Link an Kunden schicken, Feedback sofort im Tool sehen.',
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
              <span className="text-[13px] font-semibold text-[#445c49]">In drei Schritten:</span>
              <span className="font-syne font-bold text-[#445c49] text-[15px]">vom Projekt zur Freigabe</span>
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
          <div className="w-full max-w-[1100px] mx-auto px-8">

            {/* Heading */}
            <div className="text-center mb-10">
              <p className="text-[11px] font-bold text-[#445c49] uppercase tracking-[0.2em] mb-3">
                So funktionierts
              </p>
              <h2 className="font-syne font-bold text-[36px] md:text-[52px] text-[#445c49] leading-[1.05]">
                In 3 Schritten zum<br className="hidden md:block" /> professionellen Projekt
              </h2>
            </div>

            {/* Progress Chips - horizontal, zentriert */}
            <div className="flex items-center justify-center gap-3 md:gap-5 mb-4 relative">
              {/* Horizontale Progress-Linie */}
              <div className="absolute left-[12%] right-[12%] top-1/2 -translate-y-1/2 h-[2px] bg-wellbeing-cream rounded-full" aria-hidden />
              <m.div
                style={{ scaleX: lineScale, transformOrigin: '0% 50%' }}
                className="absolute left-[12%] right-[12%] top-1/2 -translate-y-1/2 h-[2px] bg-[#445c49] rounded-full"
                aria-hidden
              />
              {steps.map((s, i) => {
                const isActive = i === active
                const isDone   = i < active
                return (
                  <m.button
                    key={s.num}
                    type="button"
                    animate={{
                      scale: isActive ? 1 : 0.9,
                    }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className={`relative z-10 inline-flex items-center gap-2.5 px-4 py-2 rounded-full border-2 transition-colors ${
                      isActive
                        ? 'bg-[#445c49] border-[#445c49] shadow-lg shadow-wellbeing-green-light/40'
                        : isDone
                          ? 'bg-white border-[#445c49]'
                          : 'bg-white border-gray-200'
                    }`}
                  >
                    <span className={`font-syne font-bold text-[12px] ${
                      isActive ? 'text-white' : isDone ? 'text-[#445c49]' : 'text-gray-400'
                    }`}>
                      {s.num}
                    </span>
                    <span className={`text-[12px] font-semibold ${
                      isActive ? 'text-white' : isDone ? 'text-[#445c49]' : 'text-gray-400'
                    } hidden sm:inline`}>
                      {s.title}
                    </span>
                  </m.button>
                )
              })}
            </div>

            {/* Central Stage — mittig, mit großer Ghost-Nummer als Backdrop */}
            <div className="relative min-h-[360px] flex items-center justify-center mt-6">

              {/* Ghost-Nummer im Hintergrund */}
              <AnimatePresence mode="wait">
                <m.div
                  key={`ghost-${active}`}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  aria-hidden
                  className="pointer-events-none absolute inset-0 flex items-center justify-center select-none"
                >
                  <span
                    className="font-syne font-bold leading-none tracking-tight"
                    style={{
                      fontSize: 'clamp(180px, 28vw, 360px)',
                      background: 'linear-gradient(135deg, #e8f0ea 0%, #f6ede2 55%, #e8f0ea 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {steps[active].num}
                  </span>
                </m.div>
              </AnimatePresence>

              {/* Foreground Content */}
              <AnimatePresence mode="wait">
                <m.div
                  key={`fg-${active}`}
                  initial={{ opacity: 0, y: 20, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -14, filter: 'blur(4px)' }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="relative z-10 flex flex-col items-center text-center max-w-[620px] mx-auto"
                >
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-[#445c49] flex items-center justify-center shadow-xl shadow-wellbeing-green-light/60 mb-5">
                    <ActiveIcon className="w-8 h-8 md:w-10 md:h-10 text-white" strokeWidth={1.6} />
                  </div>
                  <p className="text-[11px] font-bold text-[#445c49] uppercase tracking-[0.25em] mb-3">
                    Schritt {steps[active].num}
                  </p>
                  <h3 className="font-syne font-bold text-[34px] md:text-[46px] text-[#445c49] leading-[1.05] tracking-tight mb-4">
                    {steps[active].title}
                  </h3>
                  <p className="text-[16px] md:text-[18px] text-gray-500 leading-relaxed">
                    {steps[active].desc}
                  </p>
                </m.div>
              </AnimatePresence>
            </div>

            <div className="mt-10 flex justify-center">
              <div className="inline-flex items-center gap-3 px-6 py-3.5 bg-wellbeing-cream border border-wellbeing-cream rounded-2xl">
                <span className="text-[13px] font-semibold text-[#445c49]">In drei Schritten:</span>
                <span className="font-syne font-bold text-[#445c49] text-[15px]">vom Projekt zur Freigabe</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}
