import AnimateOnScroll from './AnimateOnScroll'

const faqs = [
  {
    q: 'Müssen Klient:innen sich registrieren?',
    a: 'Nein. Klient:innen erhalten einen Link und können direkt im Browser Produkte freigeben oder ablehnen – ohne Account, App-Download oder Passwort.',
  },
  {
    q: 'Wie sicher sind die Daten?',
    a: 'Alle Daten werden DSGVO-konform auf EU-Servern in Frankfurt gespeichert. Eingesetzt wird Supabase mit Row-Level Security – jede Organisation sieht nur ihre eigenen Daten.',
  },
  {
    q: 'Wie funktioniert die Preiskalkulation?',
    a: 'Einkaufspreis und Marge in Prozent eingeben – Wellbeing Spaces berechnet automatisch den Verkaufspreis netto und brutto (inkl. MwSt.) sowie Provisionen für Partner.',
  },
  {
    q: 'Gibt es eine mobile App?',
    a: 'Wellbeing Spaces ist eine vollständig responsive Web-App, die auf allen Geräten im Browser funktioniert.',
  },
]

export default function FAQ() {
  return (
    <section id="faq" className="bg-[#F8F9FA] py-28">
      <div className="max-w-2xl mx-auto px-5">
        <AnimateOnScroll type="blur-in">
          <div className="text-center mb-14">
            <p className="text-[11px] font-bold text-[#445c49] uppercase tracking-[0.2em] mb-3">
              FAQ
            </p>
            <h2 className="font-syne font-bold text-[36px] md:text-[48px] text-[#445c49] leading-[1.1]">
              Häufige Fragen
            </h2>
          </div>
        </AnimateOnScroll>

        <div className="space-y-2 sm:space-y-3">
          {faqs.map((faq, i) => (
            <AnimateOnScroll key={i} delay={i * 50}>
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
  )
}
