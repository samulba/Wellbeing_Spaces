'use client'

import { useEffect, useRef } from 'react'
import { FolderOpen, Package, Calculator, Link2, Handshake, Users } from 'lucide-react'
import AnimateOnScroll from './AnimateOnScroll'

const features = [
  {
    icon: FolderOpen,
    title: 'Projektstruktur',
    desc: 'Kunde, Räume und Budget – alles sauber strukturiert an einem Ort. Kein Copy-Paste zwischen Dokumenten.',
    color: 'bg-wellbeing-cream text-[#445c49]',
    glow: 'hover:shadow-wellbeing-cream',
  },
  {
    icon: Package,
    title: 'Produktlisten',
    desc: 'Produkte mit Links, Bildern und Kategorien übersichtlich erfassen und nach Räumen sortieren.',
    color: 'bg-violet-50 text-violet-500',
    glow: 'hover:shadow-violet-100',
  },
  {
    icon: Calculator,
    title: 'Auto-Kalkulation',
    desc: 'Einkaufspreis rein, Marge setzen – Verkaufspreis netto und brutto werden automatisch berechnet.',
    color: 'bg-emerald-50 text-emerald-600',
    glow: 'hover:shadow-emerald-100',
  },
  {
    icon: Link2,
    title: 'Freigabe per Link',
    desc: 'Kunde klickt den Link, gibt frei oder lehnt ab – kein Account, keine App, keine Erklärung nötig.',
    color: 'bg-sky-50 text-sky-500',
    glow: 'hover:shadow-sky-100',
  },
  {
    icon: Handshake,
    title: 'Partnerverwaltung',
    desc: 'Konditionen, Provisionen und Lieferanteninfos immer griffbereit. Keine verlorenen E-Mails.',
    color: 'bg-amber-50 text-amber-500',
    glow: 'hover:shadow-amber-100',
  },
  {
    icon: Users,
    title: 'Team & Rollen',
    desc: 'Mehrere Designer, ein Tool. Zusammen an Projekten arbeiten ohne Datei-Wirrwarr.',
    color: 'bg-rose-50 text-rose-500',
    glow: 'hover:shadow-rose-100',
  },
]

export default function Features() {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observers: IntersectionObserver[] = []
    cardRefs.current.forEach((el, i) => {
      if (!el) return
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => el.classList.add('visible'), i * 80)
            observer.disconnect()
          }
        },
        { threshold: 0.08 }
      )
      observer.observe(el)
      observers.push(observer)
    })
    return () => observers.forEach((o) => o.disconnect())
  }, [])

  return (
    <section id="features" className="bg-[#F8F9FA] py-28 relative overflow-hidden">
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.018] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #445c49 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
        aria-hidden
      />

      <div className="relative z-10 max-w-6xl mx-auto px-5">
        <AnimateOnScroll type="blur-in">
          <div className="text-center mb-16">
            <p className="text-[11px] font-bold text-[#445c49] uppercase tracking-[0.2em] mb-3">
              Features
            </p>
            <h2 className="font-syne font-bold text-[36px] md:text-[52px] text-[#445c49] mb-4 leading-[1.1]">
              Alles was du brauchst –<br className="hidden md:block" /> nichts was du nicht brauchst
            </h2>
            <p className="text-[17px] text-gray-500 max-w-lg mx-auto leading-relaxed">
              Kein Overkill. Kein 3D-Renderer. Keine Buchhaltung. Nur das was dich täglich weiterbringt.
            </p>
          </div>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div
              key={f.title}
              ref={(el) => { cardRefs.current[i] = el }}
              className={`fade-up bg-white rounded-2xl border border-gray-200 p-7 hover:border-transparent hover:shadow-xl ${f.glow} hover:-translate-y-1.5 transition-all duration-300 cursor-default`}
            >
              <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-5`}>
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-syne font-bold text-[17px] text-[#445c49] mb-2">{f.title}</h3>
              <p className="text-[14px] text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
