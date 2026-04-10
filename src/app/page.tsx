import type { Metadata } from 'next'
import Nav          from '@/components/landing/Nav'
import Hero         from '@/components/landing/Hero'
import CompetitorBadge  from '@/components/landing/CompetitorBadge'
import ProblemSolution  from '@/components/landing/ProblemSolution'
import Features     from '@/components/landing/Features'
import HowItWorks   from '@/components/landing/HowItWorks'
import WhyWBC       from '@/components/landing/WhyWBC'
import Testimonials         from '@/components/landing/Testimonials'
import PricingCalculator   from '@/components/landing/PricingCalculator'
import Pricing             from '@/components/landing/Pricing'
import FAQ          from '@/components/landing/FAQ'
import FinalCTA     from '@/components/landing/FinalCTA'
import Footer       from '@/components/landing/Footer'

export const metadata: Metadata = {
  title: 'WBC Studio – Projektmanagement Software für Interior Designer',
  description:
    'WBC Studio ist die einfache Alternative zu Houzz Pro und Mydoma. Produktlisten, Preiskalkulation und Kundenfreigabe per Link – speziell für Interior Designer und kleine Design Studios.',
  keywords:
    'interior design project management software, Houzz Pro Alternative, Produktliste Software Interior Designer, Kundenfreigabe Interior Design, interior design software Deutschland, Raumplanung Projektmanagement Tool',
  alternates: {
    canonical: 'https://wbc-studio.vercel.app',
  },
  openGraph: {
    title: 'WBC Studio – Projektmanagement Software für Interior Designer',
    description:
      'WBC Studio ist die einfache Alternative zu Houzz Pro und Mydoma. Produktlisten, Preiskalkulation und Kundenfreigabe per Link – speziell für Interior Designer und kleine Design Studios.',
    type: 'website',
    siteName: 'WBC Studio',
  },
}

export default function LandingPage() {
  return (
    <div className="bg-white">
      <Nav />
      <Hero />
      <CompetitorBadge />
      <ProblemSolution />
      <Features />
      <HowItWorks />
      <WhyWBC />
      <Testimonials />
      <PricingCalculator />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  )
}
