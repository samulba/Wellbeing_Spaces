import AnimateOnScroll from './AnimateOnScroll'
import { FolderPlus, Package, Share2 } from 'lucide-react'

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

export default function HowItWorks() {
  return (
    <section id="wie-es-funktioniert" className="bg-white py-28 overflow-hidden">
      <div className="max-w-5xl mx-auto px-5">
        <AnimateOnScroll type="blur-in">
          <div className="text-center mb-20">
            <p className="text-[11px] font-bold text-[#445c49] uppercase tracking-[0.2em] mb-3">
              So funktionierts
            </p>
            <h2 className="font-syne font-bold text-[36px] md:text-[52px] text-[#445c49] leading-[1.1]">
              In 3 Schritten zum<br className="hidden md:block" /> professionellen Projekt
            </h2>
          </div>
        </AnimateOnScroll>

        <div className="relative grid md:grid-cols-3 gap-12 md:gap-6">
          {/* Connector line */}
          <div
            className="hidden md:block absolute top-8 left-[calc(16.67%+36px)] right-[calc(16.67%+36px)] h-px bg-gradient-to-r from-wellbeing-cream via-wellbeing-green-light to-wellbeing-cream"
            aria-hidden
          />

          {steps.map((step, i) => (
            <AnimateOnScroll key={step.num} delay={i * 150} type="fade-up">
              <div className="flex flex-col items-center text-center group">
                {/* Step icon tile */}
                <div className="relative w-16 h-16 rounded-2xl bg-[#445c49] flex items-center justify-center mb-6 z-10 shadow-lg shadow-wellbeing-green-light/70 group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-wellbeing-green-light/60 transition-all duration-300">
                  <step.icon className="w-6 h-6 text-white" strokeWidth={1.8} />
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center">
                    <span className="font-syne font-bold text-[9px] text-[#445c49]">{step.num}</span>
                  </span>
                </div>

                <h3 className="font-syne font-bold text-[20px] text-[#445c49] mb-3">{step.title}</h3>
                <p className="text-[14px] text-gray-500 leading-relaxed max-w-[220px]">{step.desc}</p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>

        {/* Bottom callout */}
        <AnimateOnScroll delay={500} type="scale-in">
          <div className="mt-16 flex justify-center">
            <div className="inline-flex items-center gap-3 px-6 py-3.5 bg-wellbeing-cream border border-wellbeing-cream rounded-2xl">
              <span className="text-[13px] font-semibold text-[#445c49]">Durchschnittliche Setup-Zeit:</span>
              <span className="font-syne font-bold text-[#445c49] text-[15px]">unter 5 Minuten</span>
            </div>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  )
}
