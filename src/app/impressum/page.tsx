import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/landing/Nav'
import Footer from '@/components/landing/Footer'

export const metadata: Metadata = {
  title: 'Impressum',
  description: 'Impressum von Wellbeing Spaces gemäß § 5 TMG.',
  alternates: {
    canonical: 'https://wellbeing-spaces.de/impressum',
  },
  robots: { index: true, follow: true },
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
              <p className="font-semibold text-gray-800">Samuel Liba</p>
              <p className="text-gray-500">Unternehmensberatung</p>
              <p>Geranienweg 7</p>
              <p>85586 Poing</p>
              <p>Deutschland</p>
            </div>
          </section>

          <section>
            <h2 className="font-syne font-bold text-[18px] text-[#445c49] mb-4 pb-3 border-b border-gray-100">
              Kontakt
            </h2>
            <p>Telefon: <a href="tel:+4917631335327" className="text-[#445c49] hover:underline">0176 31335327</a></p>
            <p className="mt-1">E-Mail: <a href="mailto:info@vicinusmedia.com" className="text-[#445c49] hover:underline">info@vicinusmedia.com</a></p>
          </section>

          <section>
            <h2 className="font-syne font-bold text-[18px] text-[#445c49] mb-4 pb-3 border-b border-gray-100">
              Umsatzsteuer-Identifikationsnummer
            </h2>
            <p>
              Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
              DE450215192
            </p>
          </section>

          <section>
            <h2 className="font-syne font-bold text-[18px] text-[#445c49] mb-4 pb-3 border-b border-gray-100">
              Redaktionell verantwortlich
            </h2>
            <p>Samuel Liba</p>
          </section>

          <section>
            <h2 className="font-syne font-bold text-[18px] text-[#445c49] mb-4 pb-3 border-b border-gray-100">
              EU-Streitschlichtung
            </h2>
            <p className="text-[14px]">
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
              <a
                href="https://ec.europa.eu/consumers/odr/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#445c49] hover:underline"
              >
                https://ec.europa.eu/consumers/odr/
              </a>
              .<br />
              Unsere E-Mail-Adresse finden Sie oben im Impressum.
            </p>
          </section>

          <section>
            <h2 className="font-syne font-bold text-[18px] text-[#445c49] mb-4 pb-3 border-b border-gray-100">
              Verbraucherstreitbeilegung / Universalschlichtungsstelle
            </h2>
            <p className="text-[14px]">
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle teilzunehmen.
            </p>
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
              Entwicklung & Design
            </h2>
            <p className="text-[14px] text-gray-500 mb-5">
              Diese Software wurde konzipiert und entwickelt in Zusammenarbeit mit:
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Left card – VicinusMedia info */}
              <div className="relative rounded-2xl overflow-hidden border border-[#445c49]/15 hover:border-[#445c49]/35 hover:shadow-lg hover:shadow-[#445c49]/8 hover:-translate-y-0.5 transition-all duration-300 group">
                {/* Accent left border */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#445c49] rounded-l-2xl" />
                {/* Gradient background */}
                <div className="pl-5 pr-6 py-6 bg-gradient-to-br from-slate-50 to-[#445c49]/5">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-[#445c49]/10 flex items-center justify-center shrink-0">
                      <span className="text-[18px]">🚀</span>
                    </div>
                    <p className="font-syne font-bold text-[17px] text-gray-900">VicinusMedia</p>
                  </div>
                  <p className="text-[13px] text-gray-500 mb-4 leading-snug">
                    Webdesign & Webapps München
                  </p>
                  <a
                    href="https://www.vicinusmedia.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#445c49] hover:bg-[#2d3e31] text-white text-[13px] font-semibold rounded-xl transition-all duration-200 hover:shadow-md"
                  >
                    <span>🌐</span>
                    www.vicinusmedia.com →
                  </a>
                </div>
              </div>

              {/* Right card – CTA */}
              <a
                href="https://www.vicinusmedia.com"
                target="_blank"
                rel="noopener noreferrer"
                className="relative rounded-2xl overflow-hidden border border-dashed border-[#445c49]/20 hover:border-[#445c49]/40 hover:shadow-lg hover:shadow-[#445c49]/8 hover:-translate-y-0.5 transition-all duration-300 block group"
              >
                <div className="p-6 bg-gradient-to-br from-[#445c49]/3 to-[#445c49]/8 h-full flex flex-col justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-[#445c49] uppercase tracking-[0.15em] mb-2">
                      Interesse?
                    </p>
                    <p className="font-syne font-bold text-[16px] text-gray-800 leading-snug mb-3">
                      Eigene Web-App oder Website?
                    </p>
                    <p className="text-[13px] text-gray-500 leading-relaxed">
                      VicinusMedia entwickelt maßgeschneiderte digitale Lösungen für Unternehmen in München und bundesweit.
                    </p>
                  </div>
                  <div className="mt-5 flex items-center gap-1.5 text-[13px] font-semibold text-[#445c49] group-hover:gap-2.5 transition-all duration-200">
                    Jetzt anfragen
                    <span>→</span>
                  </div>
                </div>
              </a>
            </div>
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
