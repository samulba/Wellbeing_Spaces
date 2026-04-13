import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Anmelden | Wellbeing Spaces',
  description: 'Melde dich bei Wellbeing Spaces an.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
