import AnimateOnScroll from './AnimateOnScroll'
import Link from 'next/link'
import { Check } from 'lucide-react'

const plans = [
  {
    name: 'Free',
    tag: 'Für den Einstieg',
    price: '0',
    period: null,
    badge: null,
    features: [
      '2 Projekte',
      '1 Benutzer',
      'Alle Kernfunktionen',
      'Produktlisten & Freigabe',
      'Automatische Preiskalkulation',
    ],
    cta: 'Kostenlos starten',
    highlight: false,
    animType: 'fade-up' as const,
  },
  {
    name: 'Pro',
    tag: 'Für aktive Designer',
    price: '29',
    period: '/Monat',
    badge: 'Beliebteste Wahl',
    features: [
      'Unbegrenzte Projekte',
      '5 Benutzer',
      'CSV Export',
      'Priority Support',
      'Alle Free-Features',
    ],
    cta: 'Pro starten',
    highlight: true,
    animType: 'scale-in' as const,
  },
  {
    name: 'Team',
    tag: 'Für Studios',
    price: '79',
    period: '/Monat',
    badge: null,
    features: [
      'Alles unbegrenzt',
      'API-Zugang',
      'Custom Domain',
      'Onboarding-Support',
      'Alle Pro-Features',
    ],
    cta: 'Team starten',
    highlight: false,
    animType: 'fade-up' as const,
  },
]

export default function Pricing() {
  return (
    <section id="preise" className="bg-white py-28 relative overflow-hidden">
      {/* Background accent */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-wellbeing-cream/80 blur-[80px] rounded-full pointer-events-none"
        aria-hidden
      />

      <div className="relative z-10 max-w-5xl mx-auto px-5">
        <AnimateOnScroll type="blur-in">
          <div className="text-center mb-16">
            <p className="text-[11px] font-bold text-[#445c49] uppercase tracking-[0.2em] mb-3">
              Preise
            </p>
            <h2 className="font-syne font-bold text-[36px] md:text-[52px] text-[#445c49] mb-3 leading-[1.1]">
              Ehrliche Preise.<br className="hidden md:block" /> Kein Abo-Chaos.
            </h2>
            <p className="text-gray-500 text-[16px]">
              Alle Preise zzgl. MwSt. · Monatlich kündbar · Keine Jahresbindung.
            </p>
          </div>
        </AnimateOnScroll>

        <div className="grid md:grid-cols-3 gap-5 items-start">
          {plans.map((plan, i) => (
            <AnimateOnScroll key={plan.name} delay={i * 110} type={plan.animType}>
              <div
                className={`relative rounded-2xl p-8 flex flex-col h-full transition-all duration-300 ${
                  plan.highlight
                    ? 'bg-white border-2 border-[#445c49] shadow-2xl shadow-wellbeing-cream/80 hover:-translate-y-2'
                    : 'bg-white border border-gray-200 shadow-sm hover:border-gray-300 hover:shadow-md hover:-translate-y-1'
                }`}
              >
                {/* Pro shimmer top bar */}
                {plan.highlight && (
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-400 via-wellbeing-green to-violet-400 rounded-t-2xl" />
                )}

                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#445c49] text-white text-[11px] font-bold rounded-full whitespace-nowrap uppercase tracking-wide shadow-md shadow-wellbeing-green-light">
                    {plan.badge}
                  </div>
                )}

                <div className="mb-7">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
                    {plan.tag}
                  </p>
                  <h3 className="font-syne font-bold text-[22px] text-[#445c49] mb-4">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className={`font-syne font-bold text-[48px] leading-none ${plan.highlight ? 'text-[#445c49]' : 'text-[#445c49]'}`}>
                      {plan.price}€
                    </span>
                    {plan.period && (
                      <span className="text-gray-400 text-[14px]">{plan.period}</span>
                    )}
                  </div>
                </div>

                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[14px] text-gray-600">
                      <Check
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          plan.highlight ? 'text-[#445c49]' : 'text-emerald-500'
                        }`}
                      />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/login"
                  className={`w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-[14px] font-semibold transition-all duration-200 ${
                    plan.highlight
                      ? 'bg-[#445c49] hover:bg-[#445c49] text-white hover:shadow-lg hover:shadow-wellbeing-green-light'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  )
}
