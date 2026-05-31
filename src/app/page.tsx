import type { Metadata } from 'next'
import Nav               from '@/components/landing/Nav'
import Hero              from '@/components/landing/Hero'
import Features          from '@/components/landing/Features'
import HowItWorks        from '@/components/landing/HowItWorks'
import PricingCalculator from '@/components/landing/PricingCalculator'
import FAQ               from '@/components/landing/FAQ'
import Footer            from '@/components/landing/Footer'
import CookieBanner      from '@/components/landing/CookieBanner'
import MotionProvider    from '@/components/landing/MotionProvider'
import ScrollProgress    from '@/components/landing/ScrollProgress'

export const metadata: Metadata = {
  title: 'Wellbeing Spaces',
  description:
    'Plattform für Interior-Projekte: Produktlisten, automatische Kalkulation und Freigaben strukturiert an einem Ort. DSGVO-konform, Hosting in der EU.',
  alternates: {
    canonical: 'https://wellbeing-spaces.de/',
    languages: {
      'de': 'https://wellbeing-spaces.de/',
      'x-default': 'https://wellbeing-spaces.de/',
    },
  },
  openGraph: {
    title: 'Wellbeing Spaces',
    description:
      'Interior-Projekte digital organisiert: Produktlisten, Kalkulation und Freigaben an einem Ort.',
    url: 'https://wellbeing-spaces.de/',
  },
  twitter: {
    title: 'Wellbeing Spaces',
    description: 'Interior-Projekte digital organisiert. DSGVO-konform.',
  },
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }}
      />
      <MotionProvider>
        <ScrollProgress />
        <Nav />
        <Hero />
        <Features />
        <HowItWorks />
        <PricingCalculator />
        <FAQ />
        <Footer />
        <CookieBanner />
      </MotionProvider>
    </div>
  )
}
