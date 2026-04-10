import AnimateOnScroll from './AnimateOnScroll'
import { Zap, Globe, Link2, Clock, Euro, UserX } from 'lucide-react'

const advantages = [
  {
    icon: Euro,
    big: '0€',
    label: 'zum Starten',
    desc: 'Keine Kreditkarte. Kein Jahresabo. Sofort loslegen.',
    highlight: true,
  },
  {
    icon: UserX,
    big: '0',
    label: 'Logins für Kunden',
    desc: 'Deine Kunden brauchen keinen Account – einfach Link öffnen, Produkte freigeben.',
    highlight: false,
  },
  {
    icon: Globe,
    big: 'EU',
    label: 'Server Frankfurt',
    desc: '100% DSGVO-konform. Alle Daten auf deutschen Servern – kein amerikanischer Cloud-Anbieter.',
    highlight: false,
  },
  {
    icon: Zap,
    big: 'Auto',
    label: 'Preiskalkulation',
    desc: 'EP eingeben, Marge setzen – VP netto & brutto werden sofort berechnet. Kein Taschenrechner.',
    highlight: false,
  },
  {
    icon: Link2,
    big: '1',
    label: 'Klick zur Freigabe',
    desc: 'Link teilen, fertig. Kein E-Mail-Ping-Pong, kein Login-Request, keine Verwirrung.',
    highlight: false,
  },
  {
    icon: Clock,
    big: '< 5',
    label: 'Min Setup',
    desc: 'Von der Anmeldung bis zum ersten Projekt. Wir versprechen: keine Lernkurve.',
    highlight: false,
  },
]

export default function WhyWBC() {
  return (
    <section id="warum-wbc" className="bg-[#0F1117] py-28 relative overflow-hidden">

      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-indigo-600/10 blur-[130px] rounded-full pointer-events-none" aria-hidden />
      <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-violet-800/10 blur-[100px] rounded-full pointer-events-none" aria-hidden />

      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #818CF8 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
        aria-hidden
      />

      <div className="relative z-10 max-w-5xl mx-auto px-5">

        {/* Header */}
        <AnimateOnScroll type="blur-in">
          <div className="text-center mb-16">
            <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-[0.2em] mb-3">
              Warum WBC Studio
            </p>
            <h2 className="font-syne font-bold text-[36px] md:text-[52px] text-white mb-4 leading-[1.1]">
              Alles was zählt –<br className="hidden md:block" /> nichts was ablenkt.
            </h2>
            <p className="text-white/40 text-[16px] max-w-lg mx-auto">
              Kein 3D-Renderer den du nie nutzt. Kein Marketing-Paket das du nicht brauchst.
              Kein $199/Monat für Features die du ignorierst.
            </p>
          </div>
        </AnimateOnScroll>

        {/* Advantage cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-14">
          {advantages.map((adv, i) => (
            <AnimateOnScroll key={adv.label} delay={i * 80} type="fade-up">
              <div
                className={`group relative rounded-2xl p-6 border transition-all duration-300 hover:-translate-y-1.5 h-full flex flex-col ${
                  adv.highlight
                    ? 'bg-[#6366F1]/20 border-[#6366F1]/40 hover:border-[#6366F1]/70 hover:bg-[#6366F1]/25'
                    : 'bg-white/[0.03] border-white/[0.08] hover:border-white/20 hover:bg-white/[0.06]'
                }`}
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                  adv.highlight ? 'bg-indigo-400/20' : 'bg-white/[0.06]'
                }`}>
                  <adv.icon className={`w-5 h-5 ${adv.highlight ? 'text-indigo-300' : 'text-white/40'}`} />
                </div>

                {/* Big value */}
                <div className="mb-1">
                  <span className={`font-syne font-bold leading-none ${
                    adv.highlight ? 'text-white text-[40px]' : 'text-white/80 text-[36px]'
                  }`}>
                    {adv.big}
                  </span>
                  {' '}
                  <span className={`text-[13px] font-semibold ${adv.highlight ? 'text-indigo-300' : 'text-white/40'}`}>
                    {adv.label}
                  </span>
                </div>

                {/* Description */}
                <p className="text-[13px] text-white/35 leading-relaxed mt-2 flex-1">
                  {adv.desc}
                </p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>

        {/* Price comparison strip */}
        <AnimateOnScroll delay={500} type="fade-up">
          <div className="flex flex-wrap justify-center items-center gap-3 md:gap-5 border-t border-white/[0.06] pt-10">
            <span className="text-white/25 text-[13px]">vs. Mitbewerber:</span>

            {[
              { name: 'Houzz Pro', price: '$199/mo', color: 'text-red-400' },
              { name: 'Mydoma',    price: '$64/mo',  color: 'text-amber-400' },
            ].map((c) => (
              <div key={c.name} className="flex items-center gap-2 px-4 py-2 bg-white/[0.04] border border-white/[0.07] rounded-xl">
                <span className="text-[12px] text-white/30 line-through decoration-white/20">{c.name}</span>
                <span className={`text-[11px] font-bold ${c.color}`}>{c.price}</span>
              </div>
            ))}

            <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl">
              <span className="text-[13px] font-bold text-emerald-400">WBC Studio</span>
              <span className="text-[11px] font-semibold text-emerald-500/80">kostenlos starten</span>
            </div>
          </div>
        </AnimateOnScroll>

        {/* Bottom chips */}
        <AnimateOnScroll delay={600} type="scale-in">
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {[
              '✓ Kein Overkill',
              '✓ Kein 3D-Renderer',
              '✓ Keine Buchhaltung',
              '✓ Kein Jahresabo',
              '✓ Keine Komplexität',
            ].map((chip) => (
              <span
                key={chip}
                className="px-4 py-1.5 rounded-full border border-white/[0.08] text-[12px] text-white/35 bg-white/[0.03]"
              >
                {chip}
              </span>
            ))}
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  )
}
