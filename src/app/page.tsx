import type { Metadata } from 'next'
import Nav               from '@/components/landing/Nav'
import Hero              from '@/components/landing/Hero'
import CompetitorBadge   from '@/components/landing/CompetitorBadge'
import ProblemSolution   from '@/components/landing/ProblemSolution'
import Features          from '@/components/landing/Features'
import HowItWorks        from '@/components/landing/HowItWorks'
import WhyWBC            from '@/components/landing/WhyWBC'
import PricingCalculator from '@/components/landing/PricingCalculator'
import Pricing           from '@/components/landing/Pricing'
import FAQ               from '@/components/landing/FAQ'
import FinalCTA          from '@/components/landing/FinalCTA'
import Footer            from '@/components/landing/Footer'
import CookieBanner      from '@/components/landing/CookieBanner'

export const metadata: Metadata = {
  title: 'Wellbeing Spaces | Interior Design Projektmanagement Software',
  description:
    'Die All-in-One Software für Interior Designer. Projekte verwalten, Produktlisten erstellen, Preise kalkulieren und Kunden mit einem Link zur Freigabe einladen. DSGVO-konform.',
  keywords:
    'Interior Design Software, Projektmanagement Interior Designer, Raumausstattung Software, Design Studio Software, Produktlisten erstellen, Preiskalkulation Interior Design, Kundenfreigabe Tool, DSGVO Interior Design',
  alternates: {
    canonical: 'https://wellbeing-spaces.de/',
    languages: {
      'de': 'https://wellbeing-spaces.de/',
      'x-default': 'https://wellbeing-spaces.de/',
    },
  },
  openGraph: {
    title: 'Wellbeing Spaces | Interior Design Projektmanagement',
    description:
      'Die All-in-One Software für Interior Designer. Projekte, Preise, Freigaben – alles an einem Ort.',
    url: 'https://wellbeing-spaces.de/',
  },
  twitter: {
    title: 'Wellbeing Spaces | Interior Design Software',
    description: 'Projektmanagement für Interior Designer. DSGVO-konform.',
  },
}

const jsonLdSoftware = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Wellbeing Spaces',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description: 'Projektmanagement Software für Interior Designer und Design Studios',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'EUR',
    description: 'Aktuell kostenfrei in der Beta-Phase',
  },
  publisher: {
    '@type': 'Organization',
    name: 'Samuel Liba – Unternehmensberatung',
    url: 'https://wellbeing-spaces.de',
  },
  featureList: [
    'Projektverwaltung',
    'Produktlisten erstellen',
    'Automatische Preiskalkulation',
    'Kundenfreigabe per Link',
    'Team & Rollen',
    'Partnerverwaltung',
  ],
}

const jsonLdOrg = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Wellbeing Spaces',
  url: 'https://wellbeing-spaces.de',
  logo: 'https://wellbeing-spaces.de/logo.png',
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'info@vicinusmedia.com',
    contactType: 'customer service',
  },
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Geranienweg 7',
    addressLocality: 'Poing',
    postalCode: '85586',
    addressCountry: 'DE',
  },
}

export default function LandingPage() {
  return (
    <div className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftware) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }}
      />
      <Nav />
      <Hero />
      <CompetitorBadge />
      <ProblemSolution />
      <Features />
      <HowItWorks />
      <WhyWBC />
      <PricingCalculator />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
      <CookieBanner />
    </div>
  )
}
