import type { Metadata } from 'next'
import Nav from '@/components/landing/Nav'
import Footer from '@/components/landing/Footer'
import AnimateOnScroll from '@/components/landing/AnimateOnScroll'
import CookieBanner from '@/components/landing/CookieBanner'

export const metadata: Metadata = {
  title: 'FAQ | Häufige Fragen',
  description:
    'Antworten auf häufige Fragen zu Wellbeing Spaces. Wie funktioniert die Kundenfreigabe? Ist die Software DSGVO-konform? Und mehr.',
  alternates: {
    canonical: 'https://wellbeing-spaces.de/faq',
    languages: {
      'de': 'https://wellbeing-spaces.de/faq',
      'x-default': 'https://wellbeing-spaces.de/faq',
    },
  },
  openGraph: {
    title: 'FAQ | Wellbeing Spaces – Häufige Fragen',
    description: 'Antworten auf häufige Fragen zu Wellbeing Spaces. Kundenfreigabe, DSGVO, Preise und mehr.',
    url: 'https://wellbeing-spaces.de/faq',
  },
}

const faqs = [
  {
    category: 'Allgemein',
    items: [
      {
        q: 'Was ist Wellbeing Spaces?',
        a: 'Wellbeing Spaces ist eine Projektmanagement-Software speziell für Interior Designer und Design Studios. Du verwaltest Kunden, Projekte, Räume und Produkte an einem Ort – und kannst Kunden per Link zur Freigabe einladen.',
      },
      {
        q: 'Für wen ist Wellbeing Spaces geeignet?',
        a: 'Für selbstständige Interior Designer, kleine Design Studios und Innenarchitekten, die ihre Projekte strukturiert verwalten und Kunden professionell einbinden möchten – ohne komplizierte Software.',
      },
      {
        q: 'Gibt es eine mobile App?',
        a: 'Wellbeing Spaces ist eine vollständig responsive Web-App, die auf allen Geräten (Smartphone, Tablet, Desktop) funktioniert. Eine native App für iOS und Android ist für 2026 geplant.',
      },
    ],
  },
  {
    category: 'Kundenfreigabe',
    items: [
      {
        q: 'Muss mein Kunde sich registrieren?',
        a: 'Nein. Dein Kunde erhält einen Link und kann direkt im Browser Produkte freigeben oder ablehnen – ohne Account, App-Download oder Passwort.',
      },
      {
        q: 'Sieht mein Kunde die Einkaufspreise?',
        a: 'Nein. Interne Felder wie Einkaufspreis, Marge und Provision sind für Kunden vollständig ausgeblendet. Der Kunde sieht nur den Verkaufspreis netto und brutto.',
      },
      {
        q: 'Kann ich den Freigabelink mit einem PIN schützen?',
        a: 'Ja. Du kannst Freigabelinks optional mit einem PIN absichern, den du deinem Kunden separat mitteilst.',
      },
    ],
  },
  {
    category: 'Preise & Beta',
    items: [
      {
        q: 'Ist Wellbeing Spaces kostenlos?',
        a: 'Aktuell befindet sich Wellbeing Spaces in der geschlossenen Beta-Phase und ist für Beta-Tester kostenlos. Fordere eine Demo an, um Zugang zu erhalten.',
      },
      {
        q: 'Kann ich von Houzz Pro wechseln?',
        a: 'Ja. Ein CSV-Import ist in Planung. Aktuell überträgst du Produkte manuell – das dauert für ein typisches Projekt unter 30 Minuten.',
      },
      {
        q: 'Kann ich monatlich kündigen?',
        a: 'Ja, alle bezahlten Pläne sind monatlich kündbar. Kein Jahresvertrag, keine versteckten Gebühren. Kündigung per Klick in den Einstellungen.',
      },
    ],
  },
  {
    category: 'Datenschutz & Sicherheit',
    items: [
      {
        q: 'Wie sicher sind meine Daten?',
        a: 'Alle Daten werden DSGVO-konform auf EU-Servern in Frankfurt gespeichert. Wir nutzen Supabase mit Row-Level Security – jeder User sieht nur seine eigenen Daten.',
      },
      {
        q: 'Werden Cookies verwendet?',
        a: 'Ausschließlich technisch notwendige Cookies für die Anmeldung. Keine Tracking-Cookies, keine Werbe-Cookies, kein Google Analytics.',
      },
      {
        q: 'Wie funktioniert die Preiskalkulation?',
        a: 'Du gibst Einkaufspreis und Marge in Prozent ein. Wellbeing Spaces berechnet automatisch den Verkaufspreis netto und brutto (19% MwSt.) sowie Provisionen für Partner.',
      },
    ],
  },
]

export default function FAQPage() {
  return (
    <div className="bg-white min-h-screen">
      <Nav />

      <main className="max-w-3xl mx-auto px-5 pt-36 pb-24">
        <AnimateOnScroll type="blur-in">
          <p className="text-[11px] font-bold text-[#445c49] uppercase tracking-[0.2em] mb-3">
            FAQ
          </p>
          <h1 className="font-syne font-bold text-[36px] md:text-[52px] text-[#445c49] mb-4 leading-[1.1]">
            Häufige Fragen
          </h1>
          <p className="text-[16px] text-gray-500 mb-14 leading-relaxed">
            Du hast Fragen zu Wellbeing Spaces? Hier findest du Antworten auf die häufigsten Fragen.
            Nicht dabei?{' '}
            <a href="mailto:info@vicinusmedia.com" className="text-[#445c49] hover:underline">
              Schreib uns.
            </a>
          </p>
        </AnimateOnScroll>

        <div className="space-y-12">
          {faqs.map((section, si) => (
            <AnimateOnScroll key={section.category} delay={si * 80} type="fade-up">
              <div>
                <h2 className="font-syne font-bold text-[13px] text-[#445c49] uppercase tracking-[0.15em] mb-4 pb-3 border-b border-gray-100">
                  {section.category}
                </h2>
                <div className="space-y-2">
                  {section.items.map((faq, i) => (
                    <details
                      key={i}
                      className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors"
                    >
                      <summary className="flex items-center justify-between px-6 py-4 cursor-pointer list-none text-[15px] font-medium text-gray-900 group-open:text-[#445c49] transition-colors select-none">
                        <span>{faq.q}</span>
                        <span className="ml-4 shrink-0 w-5 h-5 rounded-full bg-gray-100 group-open:bg-[#445c49]/10 flex items-center justify-center transition-colors">
                          <span className="text-gray-500 group-open:hidden text-[14px] leading-none font-semibold">+</span>
                          <span className="text-[#445c49] hidden group-open:block text-[14px] leading-none font-semibold">−</span>
                        </span>
                      </summary>
                      <div className="px-6 pb-5 border-t border-gray-100">
                        <p className="text-[14px] text-gray-500 leading-relaxed pt-4">{faq.a}</p>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </AnimateOnScroll>
          ))}
        </div>

        <AnimateOnScroll delay={400} type="scale-in">
          <div className="mt-16 p-8 bg-[#445c49] rounded-2xl text-center">
            <p className="font-syne font-bold text-[22px] text-white mb-3">Noch Fragen?</p>
            <p className="text-white/55 text-[14px] mb-6">
              Wir helfen dir gerne persönlich weiter. Einfach Demo anfragen.
            </p>
            <a
              href="/#preise"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#445c49] text-[14px] font-bold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              Demo anfragen →
            </a>
          </div>
        </AnimateOnScroll>
      </main>

      <Footer />
      <CookieBanner />
    </div>
  )
}
