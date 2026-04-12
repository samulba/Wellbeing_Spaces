import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/landing/Nav'
import Footer from '@/components/landing/Footer'
import AnimateOnScroll from '@/components/landing/AnimateOnScroll'
import { Check, Minus, HelpCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Preise – Wellbeing Spaces | Kostenlose Interior Design Software',
  description:
    'Wellbeing Spaces Preise im Überblick: Kostenlos starten, monatlich kündbar, kein Jahresabo. Die günstige Alternative zu Houzz Pro ($199/mo) und Mydoma ($64/mo) für Interior Designer.',
  keywords:
    'Interior Design Software Preis, Projektmanagement Software kostenlos, Houzz Pro Alternative günstiger, Interior Design Tool Kosten, Wellbeing Spaces Preis',
  alternates: { canonical: 'https://wbc-studio.vercel.app/preise' },
}

const plans = [
  {
    name: 'Free',
    tag: 'Für den Einstieg',
    price: '0',
    period: null,
    badge: null,
    desc: 'Alles Wichtige zum Kennenlernen – dauerhaft kostenlos, keine Kreditkarte.',
    highlight: false,
    cta: 'Kostenlos starten',
    ctaHref: '/login',
  },
  {
    name: 'Pro',
    tag: 'Für aktive Designer',
    price: '29',
    period: '/Monat',
    badge: 'Beliebteste Wahl',
    desc: 'Für Designer die täglich arbeiten und ihre Projekte professionell verwalten.',
    highlight: true,
    cta: 'Pro starten',
    ctaHref: '/login',
  },
  {
    name: 'Team',
    tag: 'Für Studios',
    price: '79',
    period: '/Monat',
    badge: null,
    desc: 'Für Design Studios mit mehreren Designern und komplexen Projekten.',
    highlight: false,
    cta: 'Team starten',
    ctaHref: '/login',
  },
]

type CellValue = boolean | string | null
const featureRows: { label: string; tooltip?: string; free: CellValue; pro: CellValue; team: CellValue }[] = [
  // Projekte
  { label: 'Projekte',           free: '2',           pro: 'Unbegrenzt',   team: 'Unbegrenzt'   },
  { label: 'Räume pro Projekt',  free: 'Unbegrenzt',  pro: 'Unbegrenzt',   team: 'Unbegrenzt'   },
  { label: 'Produkte pro Raum',  free: 'Unbegrenzt',  pro: 'Unbegrenzt',   team: 'Unbegrenzt'   },
  { label: 'Benutzer',           free: '1',           pro: '5',            team: 'Unbegrenzt'   },
  // Kernfunktionen
  { label: 'Produktlisten & Räume',      free: true,  pro: true,  team: true },
  { label: 'Auto-Preiskalkulation',      free: true,  pro: true,  team: true },
  { label: 'Freigabelink für Kunden',    free: true,  pro: true,  team: true },
  { label: 'Partnerverwaltung',          free: true,  pro: true,  team: true },
  { label: 'Interne Preisfelder',        free: true,  pro: true,  team: true },
  // Pro Features
  { label: 'CSV Export',                 free: false, pro: true,  team: true },
  { label: 'Priority Support',           free: false, pro: true,  team: true },
  { label: 'Benutzerdefinierte Kategorien', free: false, pro: true, team: true },
  // Team Features
  { label: 'API-Zugang',                 free: false, pro: false, team: true },
  { label: 'Custom Domain',              free: false, pro: false, team: true },
  { label: 'Onboarding-Support',         free: false, pro: false, team: true },
  { label: 'Dedizierter Account Manager',free: false, pro: false, team: true },
  // Immer inklusive
  { label: 'DSGVO-konform (Frankfurt)',  free: true,  pro: true,  team: true },
  { label: 'Kein Kunden-Login nötig',   free: true,  pro: true,  team: true },
  { label: 'Kein Jahresabo',            free: true,  pro: true,  team: true },
]

function Cell({ value, highlight }: { value: CellValue; highlight?: boolean }) {
  if (value === true) return <Check className={`w-4 h-4 mx-auto ${highlight ? 'text-wellbeing-green-light' : 'text-emerald-500'}`} strokeWidth={2.5} />
  if (value === false) return <Minus className="w-4 h-4 mx-auto text-gray-200" strokeWidth={2} />
  return <span className={`text-[13px] font-semibold ${highlight ? 'text-wellbeing-green-light' : 'text-gray-700'}`}>{value}</span>
}

const faqs = [
  {
    q: 'Ist der Free-Plan wirklich dauerhaft kostenlos?',
    a: 'Ja. Der Free-Plan ist dauerhaft kostenlos ohne Ablaufdatum und ohne Kreditkarte. Du kannst jederzeit upgraden wenn du mehr Projekte brauchst.',
  },
  {
    q: 'Kann ich monatlich kündigen?',
    a: 'Ja, alle bezahlten Pläne sind monatlich kündbar. Kein Jahresvertrag, keine versteckten Gebühren. Kündigung per Klick in den Einstellungen.',
  },
  {
    q: 'Was passiert wenn ich über das Projektlimit gehe?',
    a: 'Du wirst rechtzeitig informiert und kannst dein Projekt-Limit durch ein Upgrade erhöhen. Bestehende Projekte bleiben immer erhalten.',
  },
  {
    q: 'Gibt es Rabatte für Jahrespläne?',
    a: 'Derzeit bieten wir ausschließlich Monatspläne an. Jahrespläne mit Rabatt sind für Q3 2026 geplant.',
  },
  {
    q: 'Wie unterscheidet sich Wellbeing Spaces von Houzz Pro?',
    a: 'Houzz Pro kostet $199/Monat und ist primär ein Marketing-Tool mit 3D-Renderer und Lead-Generierung. Wellbeing Spaces fokussiert sich auf das was Interior Designer wirklich täglich brauchen: Produktlisten, Preiskalkulation und Kundenfreigabe – ab 0€.',
  },
]

export default function PreisePage() {
  return (
    <div className="bg-white min-h-screen">
      <Nav />

      {/* Hero */}
      <section className="pt-36 pb-20 bg-white relative overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-wellbeing-cream/80 blur-[100px] rounded-full pointer-events-none"
          aria-hidden
        />
        <div className="relative z-10 max-w-4xl mx-auto px-5 text-center">
          <AnimateOnScroll type="blur-in">
            <p className="text-[11px] font-bold text-[#445c49] uppercase tracking-[0.2em] mb-4">
              Preise
            </p>
            <h1 className="font-syne font-bold text-[#445c49] text-[40px] md:text-[60px] leading-[1.06] mb-5">
              Ehrliche Preise.<br className="hidden md:block" /> Kein Abo-Chaos.
            </h1>
            <p className="text-[17px] text-gray-500 max-w-xl mx-auto leading-relaxed mb-6">
              Starte kostenlos. Upgrade wenn du mehr brauchst. Kündige wann immer du willst.
            </p>
            {/* Competitor comparison */}
            <div className="inline-flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3">
              <span className="text-[12px] text-gray-400">Zum Vergleich:</span>
              <span className="text-[12px] text-gray-400 line-through">Houzz Pro $199/mo</span>
              <span className="text-gray-200">·</span>
              <span className="text-[12px] text-gray-400 line-through">Mydoma $64/mo</span>
              <span className="text-gray-200">→</span>
              <span className="text-[12px] font-bold text-emerald-600">Wellbeing Spaces 0€</span>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* Plan cards */}
      <section className="pb-20 bg-white">
        <div className="max-w-5xl mx-auto px-5">
          <div className="grid md:grid-cols-3 gap-5 items-start">
            {plans.map((plan, i) => (
              <AnimateOnScroll key={plan.name} delay={i * 100} type={i === 1 ? 'scale-in' : 'fade-up'}>
                {plan.highlight ? (
                  /* Pro card: gradient-border wrapper, kein sichtbarer Rand-Strich */
                  <div className="relative p-[2px] rounded-2xl bg-gradient-to-b from-wellbeing-green-light via-wellbeing-green to-wellbeing-green/20 shadow-2xl shadow-wellbeing-cream/80">
                    {plan.badge && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#445c49] text-white text-[11px] font-bold rounded-full whitespace-nowrap uppercase tracking-wide shadow-md shadow-wellbeing-green-light z-10">
                        {plan.badge}
                      </div>
                    )}
                    <div className="relative rounded-[14px] bg-white p-8 flex flex-col h-full hover:-translate-y-2 transition-all duration-300">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">{plan.tag}</p>
                      <h2 className="font-syne font-bold text-[22px] text-[#445c49] mb-3">{plan.name}</h2>
                      <div className="flex items-baseline gap-1 mb-4">
                        <span className="font-syne font-bold text-[48px] leading-none text-[#445c49]">{plan.price}€</span>
                        {plan.period && <span className="text-gray-400 text-[14px]">{plan.period}</span>}
                      </div>
                      <p className="text-[13px] text-gray-400 leading-relaxed mb-7 flex-none">{plan.desc}</p>
                      <Link
                        href={plan.ctaHref}
                        className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-[14px] font-semibold transition-all duration-200 mt-auto bg-[#445c49] hover:bg-[#445c49] text-white hover:shadow-lg hover:shadow-wellbeing-green-light"
                      >
                        {plan.cta}
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-2xl bg-white border border-gray-200 p-8 flex flex-col h-full shadow-sm hover:border-gray-300 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1">{plan.tag}</p>
                    <h2 className="font-syne font-bold text-[22px] text-[#445c49] mb-3">{plan.name}</h2>
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="font-syne font-bold text-[48px] leading-none text-[#445c49]">{plan.price}€</span>
                      {plan.period && <span className="text-gray-400 text-[14px]">{plan.period}</span>}
                    </div>
                    <p className="text-[13px] text-gray-400 leading-relaxed mb-7 flex-none">{plan.desc}</p>
                    <Link
                      href={plan.ctaHref}
                      className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-[14px] font-semibold transition-all duration-200 mt-auto bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200"
                    >
                      {plan.cta}
                    </Link>
                  </div>
                )}
              </AnimateOnScroll>
            ))}
          </div>

          <AnimateOnScroll delay={350} type="fade-up">
            <p className="text-center text-[13px] text-gray-400 mt-6">
              Alle Preise zzgl. MwSt. · Monatlich kündbar · Keine Jahresbindung · Keine versteckten Gebühren
            </p>
          </AnimateOnScroll>
        </div>
      </section>

      {/* Feature comparison table */}
      <section className="py-20 bg-[#F8F9FA]">
        <div className="max-w-5xl mx-auto px-5">
          <AnimateOnScroll type="blur-in">
            <h2 className="font-syne font-bold text-[28px] md:text-[36px] text-[#445c49] text-center mb-12">
              Was ist in jedem Plan enthalten?
            </h2>
          </AnimateOnScroll>

          <AnimateOnScroll type="scale-in" delay={100}>
            <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm">
              {/* Header */}
              <div className="grid grid-cols-4 border-b border-gray-100">
                <div className="px-5 py-4" />
                {plans.map((plan) => (
                  <div
                    key={plan.name}
                    className={`px-4 py-4 text-center ${plan.highlight ? 'bg-[#445c49]' : ''}`}
                  >
                    <p className={`font-syne font-bold text-[14px] ${plan.highlight ? 'text-white' : 'text-gray-800'}`}>
                      {plan.name}
                    </p>
                    <p className={`text-[12px] mt-0.5 ${plan.highlight ? 'text-wellbeing-green-light' : 'text-gray-400'}`}>
                      {plan.price}€{plan.period ?? ''}
                    </p>
                  </div>
                ))}
              </div>

              {/* Rows */}
              {featureRows.map((row, i) => (
                <div
                  key={row.label}
                  className={`grid grid-cols-4 border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}
                >
                  <div className="px-5 py-3.5 flex items-center gap-1.5">
                    <span className="text-[13px] text-gray-600">{row.label}</span>
                    {row.tooltip && (
                      <HelpCircle className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    )}
                  </div>
                  <div className="px-4 py-3.5 flex items-center justify-center">
                    <Cell value={row.free} />
                  </div>
                  <div className="px-4 py-3.5 flex items-center justify-center bg-wellbeing-cream/20">
                    <Cell value={row.pro} highlight />
                  </div>
                  <div className="px-4 py-3.5 flex items-center justify-center">
                    <Cell value={row.team} />
                  </div>
                </div>
              ))}

              {/* CTA row */}
              <div className="grid grid-cols-4 border-t border-gray-100">
                <div className="px-5 py-4" />
                {plans.map((plan) => (
                  <div key={plan.name} className={`px-4 py-4 flex justify-center ${plan.highlight ? 'bg-wellbeing-cream/30' : ''}`}>
                    <Link
                      href={plan.ctaHref}
                      className={`text-[12px] font-semibold transition-colors ${
                        plan.highlight
                          ? 'text-[#445c49] hover:text-wellbeing-green-dark'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      {plan.cta} →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white">
        <div className="max-w-2xl mx-auto px-5">
          <AnimateOnScroll type="blur-in">
            <h2 className="font-syne font-bold text-[28px] md:text-[36px] text-[#445c49] text-center mb-12">
              Häufige Fragen zu den Preisen
            </h2>
          </AnimateOnScroll>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <AnimateOnScroll key={i} delay={i * 50} type="fade-up">
                <details className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors">
                  <summary className="flex items-center justify-between px-6 py-4 cursor-pointer list-none text-[15px] font-medium text-gray-900 group-open:text-[#445c49] transition-colors select-none">
                    <span>{faq.q}</span>
                    <span className="ml-4 shrink-0 w-5 h-5 rounded-full bg-gray-100 group-open:bg-wellbeing-cream flex items-center justify-center transition-colors">
                      <span className="text-gray-500 group-open:hidden text-[14px] leading-none font-semibold">+</span>
                      <span className="text-[#445c49] hidden group-open:block text-[14px] leading-none font-semibold">−</span>
                    </span>
                  </summary>
                  <div className="px-6 pb-5 border-t border-gray-100">
                    <p className="text-[14px] text-gray-500 leading-relaxed pt-4">{faq.a}</p>
                  </div>
                </details>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-[#445c49]">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <AnimateOnScroll type="blur-in">
            <h2 className="font-syne font-bold text-[32px] md:text-[48px] text-white mb-4 leading-[1.1]">
              Starte heute – kostenlos.
            </h2>
            <p className="text-white/50 text-[16px] mb-8">
              Kein Risiko. Keine Kreditkarte. Upgrade jederzeit möglich.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#445c49] hover:bg-[#445c49] text-white text-[15px] font-bold rounded-xl transition-all duration-200 hover:shadow-2xl hover:shadow-wellbeing-green/30 hover:-translate-y-1"
            >
              Jetzt kostenlos starten →
            </Link>
          </AnimateOnScroll>
        </div>
      </section>

      <Footer />
    </div>
  )
}
