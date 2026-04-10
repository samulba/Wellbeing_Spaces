import type { Metadata } from 'next'
import Link from 'next/link'
import Nav from '@/components/landing/Nav'
import Footer from '@/components/landing/Footer'
import AnimateOnScroll from '@/components/landing/AnimateOnScroll'
import {
  FolderOpen, Package, Calculator, Link2, Handshake, Users,
  Check, ArrowRight, Shield, Zap, Clock
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Features – WBC Studio | Interior Design Projektmanagement Software',
  description:
    'Alle Features von WBC Studio im Überblick: Produktlisten, automatische Preiskalkulation, Kundenfreigabe per Link, Partnerverwaltung und mehr – speziell für Interior Designer.',
  keywords:
    'Interior Design Software Features, Produktliste Interior Design, Preiskalkulation Interior Designer, Kundenfreigabe Software, Interior Design Projektmanagement Features',
  alternates: { canonical: 'https://wbc-studio.vercel.app/features' },
}

const mainFeatures = [
  {
    icon: FolderOpen,
    color: 'bg-indigo-50 text-[#6366F1]',
    glow: 'group-hover:shadow-indigo-100',
    tag: 'Kern-Feature',
    title: 'Kunden & Projektstruktur',
    lead: 'Alle Projekte – strukturiert, übersichtlich, an einem Ort.',
    points: [
      'Kunden mit Kontaktdaten und Adresse anlegen',
      'Beliebig viele Projekte pro Kunde',
      'Räume innerhalb eines Projekts verwalten',
      'Gesamtbudget pro Projekt setzen und verfolgen',
      'Projektstatus: In Planung → Aktiv → Abgeschlossen',
    ],
  },
  {
    icon: Package,
    color: 'bg-violet-50 text-violet-500',
    glow: 'group-hover:shadow-violet-100',
    tag: 'Kern-Feature',
    title: 'Produktlisten pro Raum',
    lead: 'Produkte erfassen, kategorisieren und präsentieren – ohne Excel.',
    points: [
      'Produkte mit Link, Hersteller und Kategorie anlegen',
      'Menge, Maße und interne Notizen hinterlegen',
      'Automatische Sortierung nach Räumen',
      'Kategorien: Leuchten, Möbel, Textilien und mehr',
      'Interne Notizen die der Kunde nie sieht',
    ],
  },
  {
    icon: Calculator,
    color: 'bg-emerald-50 text-emerald-600',
    glow: 'group-hover:shadow-emerald-100',
    tag: 'Kern-Feature',
    title: 'Automatische Preiskalkulation',
    lead: 'Einkaufspreis rein, Marge setzen – alles andere berechnet sich selbst.',
    points: [
      'Einkaufspreis (EP netto) eingeben',
      'Marge in % setzen → VP netto wird berechnet',
      'VP brutto automatisch mit 19% MwSt.',
      'Provision in % → Provision in € automatisch',
      'Alle Gesamtpreise = Einzelpreis × Menge',
    ],
  },
  {
    icon: Link2,
    color: 'bg-sky-50 text-sky-500',
    glow: 'group-hover:shadow-sky-100',
    tag: 'Kern-Feature',
    title: 'Kundenfreigabe per Link',
    lead: 'Kein Account, keine App, keine Erklärung – einfach Link senden.',
    points: [
      'Freigabelink per Klick generieren',
      'Kunde sieht: Produktname, Kategorie, VP netto/brutto',
      'Kunde kann: Freigeben, Ablehnen oder Alternative wünschen',
      'Kommentarfeld für Kundenfeedback',
      'Interne Preise (EP, Marge) sind niemals sichtbar',
    ],
  },
  {
    icon: Handshake,
    color: 'bg-amber-50 text-amber-500',
    glow: 'group-hover:shadow-amber-100',
    tag: 'Feature',
    title: 'Partnerverwaltung',
    lead: 'Lieferanten und Handwerker mit allen Konditionen an einem Ort.',
    points: [
      'Partner mit Kontaktdaten und Website anlegen',
      'Provisionsmodell: Prozent oder Festbetrag',
      'Einkaufskonditionen hinterlegen',
      'Standort und Spezialisierung vermerken',
      'Jedem Produkt einen Partner zuweisen',
    ],
  },
  {
    icon: Users,
    color: 'bg-rose-50 text-rose-500',
    glow: 'group-hover:shadow-rose-100',
    tag: 'Feature',
    title: 'Team & Mehrbenutzer',
    lead: 'Mehrere Designer – ein gemeinsames Tool ohne Datei-Chaos.',
    points: [
      'Teammitglieder per E-Mail einladen',
      'Gemeinsamer Zugriff auf alle Projekte',
      'Eigene Einstellungen pro Benutzer',
      'Kategorien zentral verwalten',
      'Aktivitätsübersicht im Dashboard',
    ],
  },
]

const trustPoints = [
  { icon: Shield, text: 'DSGVO-konform', sub: 'EU-Server Frankfurt' },
  { icon: Zap,    text: 'Keine Einrichtung', sub: 'Sofort startklar' },
  { icon: Clock,  text: 'Immer aktuell', sub: 'Automatische Updates' },
]

export default function FeaturesPage() {
  return (
    <div className="bg-white min-h-screen">
      <Nav />

      {/* Hero */}
      <section className="pt-36 pb-24 bg-white relative overflow-hidden">
        <div
          className="absolute top-0 right-0 w-[500px] h-[400px] bg-indigo-50/80 blur-[100px] rounded-full pointer-events-none"
          aria-hidden
        />
        <div className="relative z-10 max-w-5xl mx-auto px-5 text-center">
          <AnimateOnScroll type="blur-in">
            <p className="text-[11px] font-bold text-[#6366F1] uppercase tracking-[0.2em] mb-4">
              Features
            </p>
            <h1 className="font-syne font-bold text-[#0F1117] text-[40px] md:text-[60px] leading-[1.06] mb-5">
              Alles was du täglich<br className="hidden md:block" /> brauchst – nichts mehr.
            </h1>
            <p className="text-[17px] md:text-[20px] text-gray-500 max-w-2xl mx-auto leading-relaxed mb-10">
              WBC Studio ist kein Overkill-Tool. Kein 3D-Renderer, keine Buchhaltung,
              kein Marketing-Paket. Nur die Features die dich als Interior Designer wirklich weiterbringen.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[15px] font-semibold rounded-xl transition-all duration-200 hover:shadow-xl hover:shadow-indigo-200/60 hover:-translate-y-1"
              >
                Kostenlos testen <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/#preise"
                className="inline-flex items-center gap-2 px-7 py-3.5 border border-gray-200 hover:border-gray-300 text-gray-700 text-[15px] font-semibold rounded-xl transition-all duration-200 hover:bg-gray-50"
              >
                Preise ansehen
              </Link>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* Trust strip */}
      <div className="border-y border-gray-100 bg-gray-50/60 py-4">
        <div className="max-w-5xl mx-auto px-5 flex flex-wrap items-center justify-center gap-8">
          {trustPoints.map((t) => (
            <div key={t.text} className="flex items-center gap-2.5">
              <t.icon className="w-4 h-4 text-[#6366F1]" />
              <span className="text-[13px] font-semibold text-gray-700">{t.text}</span>
              <span className="text-[12px] text-gray-400">· {t.sub}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Feature cards */}
      <section className="py-28 bg-white">
        <div className="max-w-5xl mx-auto px-5">
          <div className="space-y-6">
            {mainFeatures.map((f, i) => (
              <AnimateOnScroll key={f.title} delay={i * 60} type={i % 2 === 0 ? 'fade-right' : 'fade-left'}>
                <div
                  className={`group rounded-2xl border border-gray-200 p-8 hover:border-transparent hover:shadow-2xl ${f.glow} transition-all duration-300 md:grid md:grid-cols-[1fr_1fr] md:gap-10 items-start`}
                >
                  {/* Left: title + lead */}
                  <div>
                    <div className="flex items-center gap-3 mb-5">
                      <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center shrink-0`}>
                        <f.icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                        {f.tag}
                      </span>
                    </div>
                    <h2 className="font-syne font-bold text-[24px] text-[#0F1117] mb-3 leading-tight">
                      {f.title}
                    </h2>
                    <p className="text-[15px] text-gray-500 leading-relaxed">
                      {f.lead}
                    </p>
                  </div>

                  {/* Right: bullet points */}
                  <ul className="mt-6 md:mt-0 space-y-2.5">
                    {f.points.map((p) => (
                      <li key={p} className="flex items-start gap-2.5 text-[14px] text-gray-600">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Security/Privacy section */}
      <section className="py-20 bg-[#F8F9FA]">
        <div className="max-w-5xl mx-auto px-5 text-center">
          <AnimateOnScroll type="blur-in">
            <h2 className="font-syne font-bold text-[30px] md:text-[40px] text-[#0F1117] mb-4">
              Sicherheit & Datenschutz inklusive
            </h2>
            <p className="text-[15px] text-gray-500 max-w-xl mx-auto mb-8 leading-relaxed">
              Alle Daten werden DSGVO-konform auf EU-Servern in Frankfurt verarbeitet.
              Keine amerikanischen Cloud-Anbieter, keine Third-Party-Tracker.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {[
                '✓ Supabase Frankfurt (EU)',
                '✓ Row-Level Security',
                '✓ Interne Preise nie sichtbar',
                '✓ DSGVO-konform',
                '✓ Kein Google Analytics',
              ].map((chip) => (
                <span
                  key={chip}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[13px] font-medium text-gray-600"
                >
                  {chip}
                </span>
              ))}
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-[#0F1117]">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <AnimateOnScroll type="blur-in">
            <h2 className="font-syne font-bold text-[32px] md:text-[48px] text-white mb-4 leading-[1.1]">
              Bereit loszulegen?
            </h2>
            <p className="text-white/50 text-[16px] mb-8">
              Kostenlos starten – keine Kreditkarte, kein Jahresabo.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[15px] font-bold rounded-xl transition-all duration-200 hover:shadow-2xl hover:shadow-indigo-500/30 hover:-translate-y-1"
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
