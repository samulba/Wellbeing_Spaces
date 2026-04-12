import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/landing/Nav'
import Footer from '@/components/landing/Footer'

export const metadata: Metadata = {
  title: 'Impressum – Wellbeing Spaces',
  description: 'Impressum von Wellbeing Spaces gemäß § 5 TMG.',
}

export default function ImpressumPage() {
  return (
    <div className="bg-white min-h-screen">
      <Nav />

      <main className="max-w-3xl mx-auto px-5 pt-36 pb-24">
        <h1 className="font-syne font-bold text-[36px] md:text-[48px] text-[#445c49] mb-3 leading-tight">
          Impressum
        </h1>
        <p className="text-gray-400 text-[14px] mb-12">Angaben gemäß § 5 TMG</p>

        <div className="space-y-10 text-[15px] text-gray-600 leading-relaxed">

          <section>
            <h2 className="font-syne font-bold text-[18px] text-[#445c49] mb-4 pb-3 border-b border-gray-100">
              Betreiber
            </h2>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 text-[14px] space-y-1">
              <p className="font-semibold text-gray-800">Wellbeing Concepts</p>
              <p>[Straße und Hausnummer]</p>
              <p>[PLZ] [Ort]</p>
              <p>Deutschland</p>
            </div>
          </section>

          <section>
            <h2 className="font-syne font-bold text-[18px] text-[#445c49] mb-4 pb-3 border-b border-gray-100">
              Kontakt
            </h2>
            <p>E-Mail: <a href="mailto:kontakt@wellbeing-concepts.de" className="text-[#445c49] hover:underline">[kontakt@wellbeing-concepts.de]</a></p>
            <p className="mt-1">Telefon: [+49 xxx xxx xxxx]</p>
          </section>

          <section>
            <h2 className="font-syne font-bold text-[18px] text-[#445c49] mb-4 pb-3 border-b border-gray-100">
              Umsatzsteuer-Identifikationsnummer
            </h2>
            <p>
              Gemäß § 27a Umsatzsteuergesetz:<br />
              USt-IdNr.: [DE XXXXXXXXX]
            </p>
          </section>

          <section>
            <h2 className="font-syne font-bold text-[18px] text-[#445c49] mb-4 pb-3 border-b border-gray-100">
              Verantwortlich für den Inhalt (§ 55 Abs. 2 RStV)
            </h2>
            <p>[Vorname Nachname]<br />[Adresse wie oben]</p>
          </section>

          <section>
            <h2 className="font-syne font-bold text-[18px] text-[#445c49] mb-4 pb-3 border-b border-gray-100">
              Haftungsausschluss
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">Haftung für Inhalte</h3>
                <p className="text-[14px]">
                  Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen
                  Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind
                  wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte
                  fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine
                  rechtswidrige Tätigkeit hinweisen.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">Haftung für Links</h3>
                <p className="text-[14px]">
                  Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte
                  wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch
                  keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der
                  jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">Urheberrecht</h3>
                <p className="text-[14px]">
                  Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten
                  unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung,
                  Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes
                  bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-syne font-bold text-[18px] text-[#445c49] mb-4 pb-3 border-b border-gray-100">
              Streitschlichtung
            </h2>
            <p className="text-[14px]">
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
              {' '}<a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-[#445c49] hover:underline">
                https://ec.europa.eu/consumers/odr
              </a>.
              Unsere E-Mail-Adresse finden Sie oben im Impressum. Wir sind nicht bereit oder
              verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
              teilzunehmen.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 flex items-center gap-4 text-[13px] text-gray-400">
          <Link href="/datenschutz" className="hover:text-gray-700 transition-colors">Datenschutzerklärung</Link>
          <span>·</span>
          <Link href="/" className="hover:text-gray-700 transition-colors">Zurück zur Startseite</Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}
