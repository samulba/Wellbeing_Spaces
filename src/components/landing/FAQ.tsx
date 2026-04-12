import AnimateOnScroll from './AnimateOnScroll'

const faqs = [
  {
    q: 'Muss mein Kunde sich registrieren?',
    a: 'Nein. Dein Kunde erhält einen Link und kann direkt im Browser Produkte freigeben oder ablehnen – ohne Account, App-Download oder Passwort.',
  },
  {
    q: 'Wie sicher sind meine Daten?',
    a: 'Alle Daten werden DSGVO-konform auf EU-Servern in Frankfurt gespeichert. Wir nutzen Supabase mit Row-Level Security – jeder User sieht nur seine eigenen Daten.',
  },
  {
    q: 'Kann ich von Houzz Pro wechseln?',
    a: 'Ja. Ein CSV-Import ist in Planung. Aktuell überträgst du Produkte manuell – das dauert für ein typisches Projekt unter 30 Minuten.',
  },
  {
    q: 'Wie funktioniert die Preiskalkulation?',
    a: 'Du gibst Einkaufspreis und Marge in Prozent ein. Wellbeing Spaces berechnet automatisch den Verkaufspreis netto und brutto (19% MwSt.) sowie Provisionen für Partner.',
  },
  {
    q: 'Kann ich das Tool kostenlos testen?',
    a: 'Ja. Der Free-Plan ist dauerhaft kostenlos mit 2 Projekten und 1 Benutzer – keine Kreditkarte, kein Ablaufdatum, kein Abo-Trick.',
  },
  {
    q: 'Gibt es eine mobile App?',
    a: 'Wellbeing Spaces ist eine vollständig responsive Web-App die auf allen Geräten funktioniert. Eine native App für iOS und Android ist für 2026 geplant.',
  },
  {
    q: 'Wie viele Teammitglieder kann ich einladen?',
    a: 'Free: 1 Benutzer. Pro: bis zu 5 Benutzer. Team: unbegrenzt. Alle Mitglieder arbeiten gleichzeitig an Projekten – Echtzeit-Sync folgt im nächsten Update.',
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

        <div className="space-y-3">
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
