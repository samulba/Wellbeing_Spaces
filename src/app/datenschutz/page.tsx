import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/landing/Nav'
import Footer from '@/components/landing/Footer'

export const metadata: Metadata = {
  title: 'Datenschutzerklärung',
  description: 'Datenschutzerklärung von Wellbeing Spaces gemäß DSGVO. Informationen zu Datenerhebung, Verarbeitung und Ihren Rechten.',
  alternates: {
    canonical: 'https://wellbeing-spaces.de/datenschutz',
  },
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="font-syne font-bold text-[20px] text-[#445c49] mb-4 pb-3 border-b border-gray-100">
        {title}
      </h2>
      <div className="space-y-3 text-[15px] text-gray-600 leading-relaxed">
        {children}
      </div>
    </section>
  )
}

export default function DatenschutzPage() {
  return (
    <div className="bg-white min-h-screen">
      <Nav />

      <main className="max-w-3xl mx-auto px-5 pt-36 pb-24">
        <h1 className="font-syne font-bold text-[36px] md:text-[48px] text-[#445c49] mb-3 leading-tight">
          Datenschutzerklärung
        </h1>
        <p className="text-gray-400 text-[14px] mb-12">Stand: April 2026</p>

        <Section title="1. Datenschutz auf einen Blick">
          <p>
            Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren
            personenbezogenen Daten passiert, wenn Sie diese Website besuchen.
          </p>
          <p>
            <strong className="text-gray-800">Wer ist verantwortlich?</strong><br />
            Samuel Liba, Unternehmensberatung, Geranienweg 7, 85586 Poing<br />
            E-Mail: <a href="mailto:info@vicinusmedia.com" className="text-[#445c49] hover:underline">info@vicinusmedia.com</a>
          </p>
          <p>
            <strong className="text-gray-800">Wie erfassen wir Ihre Daten?</strong><br />
            Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen.
            Andere Daten werden automatisch beim Besuch der Website durch unsere IT-Systeme erfasst.
          </p>
          <p>
            <strong className="text-gray-800">Welche Rechte haben Sie?</strong><br />
            Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und
            Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein
            Recht, die Berichtigung oder Löschung dieser Daten zu verlangen.
          </p>
        </Section>

        <Section title="2. Verantwortlicher">
          <p>Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:</p>
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 text-[14px] space-y-0.5">
            <p className="font-semibold text-gray-800">Samuel Liba</p>
            <p className="text-gray-500">Unternehmensberatung</p>
            <p>Geranienweg 7</p>
            <p>85586 Poing</p>
            <p className="mt-2">Telefon: <a href="tel:+4917631335327" className="text-[#445c49] hover:underline">0176 31335327</a></p>
            <p>E-Mail: <a href="mailto:info@vicinusmedia.com" className="text-[#445c49] hover:underline">info@vicinusmedia.com</a></p>
          </div>
        </Section>

        <Section title="3. Erhebung und Verarbeitung personenbezogener Daten">
          <p>
            Wir erheben und verarbeiten personenbezogene Daten nur, soweit dies zur Bereitstellung
            unserer Dienste erforderlich ist. Im Einzelnen verarbeiten wir folgende Datenkategorien:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>E-Mail-Adresse und Passwort (für die Anmeldung)</li>
            <li>Von Ihnen eingegebene Projektdaten (Kunden, Räume, Produkte, Partner)</li>
            <li>Technische Verbindungsdaten (IP-Adresse, Zeitstempel) durch Hosting-Anbieter</li>
          </ul>
        </Section>

        <Section title="4. Rechtsgrundlage der Verarbeitung">
          <p>
            Die Verarbeitung Ihrer personenbezogenen Daten erfolgt auf Grundlage von Art. 6 Abs. 1
            lit. b DSGVO (Vertragserfüllung), da die Verarbeitung zur Erbringung unserer Dienste
            erforderlich ist. Für die Kommunikation per E-Mail gilt Art. 6 Abs. 1 lit. f DSGVO
            (berechtigtes Interesse).
          </p>
        </Section>

        <Section title="5. Hosting">
          <p>
            Wir hosten die Inhalte unserer Website bei <strong className="text-gray-800">Vercel Inc.</strong>,
            340 S Lemon Ave #4133, Walnut, CA 91789, USA.
          </p>
          <p className="text-[13px] text-gray-400">
            Unsere Anwendung wird in der Region Frankfurt (fra1) gehostet.
            Vercel ist unter dem EU-US Data Privacy Framework zertifiziert.
          </p>
          <p>
            Die Datenbank wird bei <strong className="text-gray-800">Supabase Inc.</strong> gehostet.
          </p>
          <p className="text-[13px] text-gray-400">
            Unsere Datenbank wird ausschließlich auf EU-Servern in Frankfurt (eu-central-1) betrieben.
            Mit Supabase besteht ein Auftragsverarbeitungsvertrag (AVV) gemäß Art. 28 DSGVO.
          </p>
        </Section>

        <Section title="6. Datenweitergabe an Dritte">
          <p>
            Wir geben Ihre personenbezogenen Daten nicht an Dritte weiter, es sei denn, dies ist
            zur Vertragserfüllung erforderlich (z. B. Hosting-Dienstleister gemäß Abschnitt 5)
            oder Sie haben ausdrücklich eingewilligt.
          </p>
        </Section>

        <Section title="7. Cookies">
          <p>
            Unsere Website verwendet Cookies. Das sind kleine Textdateien, die Ihr Webbrowser auf
            Ihrem Endgerät speichert. Wir verwenden ausschließlich technisch notwendige Cookies für
            die Authentifizierung. Es werden keine Tracking-Cookies, keine Werbe-Cookies und keine
            Third-Party-Analytics-Dienste eingesetzt.
          </p>
        </Section>

        <Section title="8. Server-Log-Dateien">
          <p>
            Der Provider der Seiten erhebt und speichert automatisch Informationen in sogenannten
            Server-Log-Dateien, die Ihr Browser automatisch übermittelt. Dies sind unter anderem
            Browsertyp, Betriebssystem, Referrer-URL, Hostname und Uhrzeit der Serveranfrage.
          </p>
        </Section>

        <Section title="9. Kontaktformular">
          <p>
            Wenn Sie uns per Kontaktformular Anfragen zukommen lassen, werden Ihre Angaben aus dem
            Anfrageformular inklusive der von Ihnen dort angegebenen Kontaktdaten zwecks Bearbeitung
            der Anfrage bei uns gespeichert. Diese Daten geben wir nicht ohne Ihre Einwilligung weiter.
          </p>
        </Section>

        <Section title="10. Speicherdauer">
          <p>
            Soweit innerhalb dieser Datenschutzerklärung keine speziellere Speicherdauer genannt wurde,
            verbleiben Ihre personenbezogenen Daten bei uns, bis der Zweck für die Datenverarbeitung
            entfällt. Nach Löschung Ihres Kontos werden Ihre Daten innerhalb von 30 Tagen vollständig
            gelöscht, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
          </p>
        </Section>

        <Section title="11. Ihre Rechte">
          <p>Sie haben nach DSGVO folgende Rechte bezüglich Ihrer personenbezogenen Daten:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Auskunftsrecht (Art. 15 DSGVO)</li>
            <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
            <li>Recht auf Löschung (Art. 17 DSGVO)</li>
            <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
            <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
            <li>Widerspruchsrecht (Art. 21 DSGVO)</li>
            <li>Recht auf Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO)</li>
          </ul>
          <p>
            Zur Ausübung Ihrer Rechte wenden Sie sich bitte an:{' '}
            <a href="mailto:info@vicinusmedia.com" className="text-[#445c49] hover:underline">
              info@vicinusmedia.com
            </a>
          </p>
        </Section>

        <Section title="12. Beschwerderecht bei der Aufsichtsbehörde">
          <p>
            Im Falle von Verstößen gegen die DSGVO steht den Betroffenen ein Beschwerderecht bei
            einer Aufsichtsbehörde zu. Die zuständige Aufsichtsbehörde in Bayern ist das Bayerische
            Landesamt für Datenschutzaufsicht (BayLDA), Promenade 18, 91522 Ansbach.
          </p>
        </Section>

        <Section title="13. Plugins und Tools">
          <p>
            Diese Website nutzt keine Social-Media-Plugins oder Tracking-Tools von Drittanbietern.
          </p>
        </Section>

        <Section title="14. Änderungen dieser Datenschutzerklärung">
          <p>
            Wir behalten uns vor, diese Datenschutzerklärung anzupassen, um sie an geänderte
            Rechtslage oder Änderungen unserer Dienste anzupassen. Es gilt jeweils die zum
            Zeitpunkt Ihrer Nutzung aktuelle Fassung.
          </p>
        </Section>

        <div className="mt-12 pt-8 border-t border-gray-100 flex items-center gap-4 text-[13px] text-gray-400">
          <Link href="/impressum" className="hover:text-gray-700 transition-colors">Impressum</Link>
          <span>·</span>
          <Link href="/" className="hover:text-gray-700 transition-colors">Zurück zur Startseite</Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}
