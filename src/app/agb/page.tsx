import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/landing/Nav'
import Footer from '@/components/landing/Footer'

export const metadata: Metadata = {
  title: 'AGB',
  description: 'Allgemeine Geschäftsbedingungen von Wellbeing Spaces.',
  alternates: {
    canonical: 'https://wellbeing-spaces.de/agb',
  },
}

const sections = [
  {
    title: '§ 1 Geltungsbereich',
    content: [
      'Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Verträge zwischen Wellbeing Concepts (nachfolgend „Anbieter") und den Nutzern der Software Wellbeing Spaces (nachfolgend „Nutzer").',
      'Wellbeing Spaces ist eine webbasierte Software-as-a-Service (SaaS)-Lösung für das Projektmanagement von Interior Designern und Design Studios. Der Dienst wird ausschließlich an Unternehmer im Sinne des § 14 BGB erbracht.',
    ],
  },
  {
    title: '§ 2 Vertragsschluss',
    content: [
      'Die Registrierung auf der Plattform stellt ein Angebot zum Abschluss eines Nutzungsvertrages dar. Der Vertrag kommt durch die Bestätigung der Registrierung per E-Mail durch den Anbieter zustande.',
      'Der Nutzer ist verpflichtet, bei der Registrierung wahrheitsgemäße und vollständige Angaben zu machen und diese aktuell zu halten.',
    ],
  },
  {
    title: '§ 3 Leistungsumfang',
    content: [
      'Der Anbieter stellt dem Nutzer Wellbeing Spaces in der jeweils gebuchten Planversion zur Verfügung. Der Leistungsumfang richtet sich nach der zum Zeitpunkt des Vertragsschlusses aktuellen Leistungsbeschreibung auf der Website.',
      'Der Anbieter ist berechtigt, den Funktionsumfang der Software weiterzuentwickeln, zu ändern oder zu erweitern, solange die vertraglich vereinbarten Kernfunktionen erhalten bleiben.',
      'Der Anbieter strebt eine Verfügbarkeit von 99 % im Jahresmittel an. Hiervon ausgenommen sind Wartungsarbeiten, die nach Möglichkeit außerhalb der Hauptnutzungszeiten durchgeführt werden.',
    ],
  },
  {
    title: '§ 4 Kostenloser Plan und kostenpflichtige Pläne',
    content: [
      'Wellbeing Spaces ist in einem dauerhaft kostenlosen Plan (Free) sowie kostenpflichtigen Plänen (Pro, Team) erhältlich. Der Funktionsumfang der jeweiligen Pläne ist auf der Preisseite beschrieben.',
      'Kostenpflichtige Pläne werden monatlich im Voraus in Rechnung gestellt. Die Abrechnung erfolgt zum jeweiligen Verlängerungsdatum.',
      'Alle Preise verstehen sich zzgl. der gesetzlichen Mehrwertsteuer.',
    ],
  },
  {
    title: '§ 5 Kündigung und Vertragslaufzeit',
    content: [
      'Kostenpflichtige Pläne können jederzeit zum Ende des laufenden Abrechnungszeitraums gekündigt werden. Eine Kündigung ist über die Kontoeinstellungen möglich.',
      'Nach einer Kündigung läuft der bezahlte Plan bis zum Ende des bereits bezahlten Zeitraums weiter. Danach wird das Konto automatisch auf den kostenlosen Free-Plan zurückgestuft.',
      'Der Anbieter behält sich das Recht vor, den Dienst mit einer Frist von 30 Tagen einzustellen. In diesem Fall werden bereits gezahlte, nicht verbrauchte Entgelte anteilig erstattet.',
      'Der kostenlose Free-Plan kann jederzeit und ohne Angabe von Gründen beendet werden.',
    ],
  },
  {
    title: '§ 6 Nutzungsrechte',
    content: [
      'Der Anbieter räumt dem Nutzer für die Laufzeit des Vertrages ein einfaches, nicht übertragbares Recht zur Nutzung von Wellbeing Spaces ein.',
      'Der Nutzer ist nicht berechtigt, die Software zu vervielfältigen, zu verbreiten, zu verkaufen, weiterzulizenzieren oder in anderer Weise Dritten zur Verfügung zu stellen.',
      'Reverse Engineering, Dekompilierung oder Disassemblierung der Software ist nicht gestattet, soweit dies nicht durch zwingendes Recht gestattet ist.',
    ],
  },
  {
    title: '§ 7 Pflichten des Nutzers',
    content: [
      'Der Nutzer ist für alle Aktivitäten verantwortlich, die über seinen Account durchgeführt werden. Zugangsdaten sind vertraulich zu behandeln und vor dem Zugriff durch Dritte zu schützen.',
      'Der Nutzer verpflichtet sich, keine Inhalte einzustellen, die gegen geltendes Recht verstoßen oder Rechte Dritter verletzen.',
      'Der Nutzer ist verpflichtet, die Plattform nicht zu missbrauchen, insbesondere keine automatisierten Abfragen durchzuführen, die die Infrastruktur des Anbieters belasten.',
    ],
  },
  {
    title: '§ 8 Datenschutz',
    content: [
      'Die Erhebung, Verarbeitung und Nutzung personenbezogener Daten erfolgt ausschließlich nach Maßgabe der Datenschutzerklärung des Anbieters sowie den geltenden Datenschutzgesetzen, insbesondere der DSGVO.',
      'Alle Daten werden auf EU-Servern (Frankfurt, Deutschland) gespeichert und verarbeitet.',
    ],
  },
  {
    title: '§ 9 Haftung',
    content: [
      'Der Anbieter haftet unbeschränkt für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit sowie für Schäden, die auf Vorsatz oder grober Fahrlässigkeit beruhen.',
      'Für leichte Fahrlässigkeit haftet der Anbieter nur bei der Verletzung wesentlicher Vertragspflichten (Kardinalpflichten). In diesem Fall ist die Haftung auf den typischerweise vorhersehbaren Schaden begrenzt.',
      'Eine weitergehende Haftung des Anbieters ist ausgeschlossen. Insbesondere haftet der Anbieter nicht für den Verlust von Daten, wenn der Nutzer keine regelmäßigen Datensicherungen durchführt.',
    ],
  },
  {
    title: '§ 10 Änderungen der AGB',
    content: [
      'Der Anbieter behält sich vor, diese AGB mit einer Ankündigungsfrist von mindestens 30 Tagen zu ändern. Die Änderungen werden dem Nutzer per E-Mail mitgeteilt.',
      'Widerspricht der Nutzer den geänderten AGB nicht innerhalb von 30 Tagen nach Zugang der Mitteilung, gelten die geänderten AGB als angenommen.',
      'Auf das Widerspruchsrecht und die Folgen des Schweigens wird der Nutzer in der Mitteilung gesondert hingewiesen.',
    ],
  },
  {
    title: '§ 11 Schlussbestimmungen',
    content: [
      'Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.',
      'Sofern der Nutzer Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen ist, ist ausschließlicher Gerichtsstand der Sitz des Anbieters.',
      'Sollten einzelne Bestimmungen dieser AGB unwirksam oder undurchführbar sein, bleibt die Wirksamkeit der übrigen Bestimmungen davon unberührt.',
    ],
  },
]

export default function AgbPage() {
  return (
    <div className="bg-white min-h-screen">
      <Nav />

      <main className="max-w-3xl mx-auto px-5 pt-36 pb-24">
        <h1 className="font-syne font-bold text-[36px] md:text-[48px] text-[#445c49] mb-3 leading-tight">
          Allgemeine Geschäftsbedingungen
        </h1>
        <p className="text-gray-400 text-[14px] mb-12">
          Stand: April 2026 · Wellbeing Concepts
        </p>

        <div className="space-y-10">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="font-syne font-bold text-[18px] text-[#445c49] mb-4 pb-3 border-b border-gray-100">
                {s.title}
              </h2>
              <div className="space-y-3">
                {s.content.map((p, i) => (
                  <p key={i} className="text-[14px] text-gray-600 leading-relaxed">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 flex flex-wrap items-center gap-4 text-[13px] text-gray-400">
          <Link href="/impressum"   className="hover:text-gray-700 transition-colors">Impressum</Link>
          <span>·</span>
          <Link href="/datenschutz" className="hover:text-gray-700 transition-colors">Datenschutzerklärung</Link>
          <span>·</span>
          <Link href="/"            className="hover:text-gray-700 transition-colors">Zurück zur Startseite</Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}
