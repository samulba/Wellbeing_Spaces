import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/landing/Nav'
import Footer from '@/components/landing/Footer'

export const metadata: Metadata = {
  title: 'Datenschutzerklärung – Wellbeing Spaces',
  description: 'Datenschutzerklärung von Wellbeing Spaces gemäß DSGVO. Informationen zu Datenerhebung, Verarbeitung und Ihren Rechten.',
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

        <Section title="1. Verantwortlicher">
          <p>
            Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:
          </p>
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 text-[14px] font-mono">
            <p>Wellbeing Concepts</p>
            <p>[Straße und Hausnummer]</p>
            <p>[PLZ und Ort]</p>
            <p>Deutschland</p>
            <p className="mt-2">E-Mail: [kontakt@wellbeing-concepts.de]</p>
          </div>
        </Section>

        <Section title="2. Erhebung und Verarbeitung personenbezogener Daten">
          <p>
            Wir erheben und verarbeiten personenbezogene Daten nur, soweit dies zur Bereitstellung
            unserer Dienste erforderlich ist. Im Einzelnen verarbeiten wir folgende Datenkategorien:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>E-Mail-Adresse und Passwort (für die Anmeldung via Supabase Auth)</li>
            <li>Von Ihnen eingegebene Projektdaten (Kunden, Räume, Produkte, Partner)</li>
            <li>Technische Verbindungsdaten (IP-Adresse, Zeitstempel) durch Hosting-Anbieter</li>
          </ul>
        </Section>

        <Section title="3. Rechtsgrundlage der Verarbeitung">
          <p>
            Die Verarbeitung Ihrer personenbezogenen Daten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO
            (Vertragserfüllung), da die Verarbeitung zur Erbringung unserer Dienste erforderlich ist.
            Für die Kommunikation per E-Mail gilt Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse).
          </p>
        </Section>

        <Section title="4. Hosting und technische Infrastruktur">
          <p><strong>Vercel Inc.</strong> – Hosting unserer Webanwendung</p>
          <p className="text-[13px] text-gray-400">
            Vercel, Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA.<br />
            Unsere Anwendung wird in der Region Frankfurt (fra1) gehostet.
            Vercel ist unter dem EU-US Data Privacy Framework zertifiziert.
          </p>
          <p className="mt-4"><strong>Supabase Inc.</strong> – Datenbank und Authentifizierung</p>
          <p className="text-[13px] text-gray-400">
            Supabase, Inc., 970 Toa Payoh North #07-04, Singapore 318992.<br />
            Unsere Datenbank wird ausschließlich auf EU-Servern in Frankfurt (eu-central-1) betrieben.
            Mit Supabase besteht ein Auftragsverarbeitungsvertrag (AVV) gemäß Art. 28 DSGVO.
          </p>
        </Section>

        <Section title="5. Datenweitergabe an Dritte">
          <p>
            Wir geben Ihre personenbezogenen Daten nicht an Dritte weiter, es sei denn, dies ist
            zur Vertragserfüllung erforderlich (z. B. Hosting-Dienstleister gemäß Abschnitt 4)
            oder Sie haben ausdrücklich eingewilligt.
          </p>
        </Section>

        <Section title="6. Cookies und lokale Speicherung">
          <p>
            Wellbeing Spaces verwendet funktionale Cookies ausschließlich für die Authentifizierung
            (Session-Cookies von Supabase Auth). Es werden keine Tracking-Cookies,
            keine Werbe-Cookies und keine Third-Party-Analytics-Dienste eingesetzt.
          </p>
        </Section>

        <Section title="7. Speicherdauer">
          <p>
            Personenbezogene Daten werden nur so lange gespeichert, wie es für die Zwecke,
            für die sie erhoben wurden, erforderlich ist, oder solange gesetzliche
            Aufbewahrungspflichten bestehen. Nach Löschung Ihres Kontos werden Ihre Daten
            innerhalb von 30 Tagen vollständig gelöscht.
          </p>
        </Section>

        <Section title="8. Ihre Rechte">
          <p>Sie haben nach DSGVO folgende Rechte gegenüber uns bezüglich Ihrer personenbezogenen Daten:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
            <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
            <li>Recht auf Löschung (Art. 17 DSGVO)</li>
            <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
            <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
            <li>Widerspruchsrecht (Art. 21 DSGVO)</li>
            <li>Recht auf Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO)</li>
          </ul>
          <p>
            Zur Ausübung Ihrer Rechte wenden Sie sich bitte an: <strong>[kontakt@wellbeing-concepts.de]</strong>
          </p>
        </Section>

        <Section title="9. Datensicherheit">
          <p>
            Wir verwenden Row-Level Security (RLS) in unserer Datenbank, sodass jeder Nutzer
            ausschließlich auf seine eigenen Daten zugreifen kann. Die Übertragung erfolgt
            verschlüsselt via HTTPS/TLS. Interne Preisfelder (Einkaufspreis, Marge)
            werden niemals an Kunden-Ansichten übergeben.
          </p>
        </Section>

        <Section title="10. Änderungen dieser Datenschutzerklärung">
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
