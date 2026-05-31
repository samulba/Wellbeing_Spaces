import type { Metadata } from "next";
import { Montserrat, Syne } from 'next/font/google'
import "./globals.css";

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['700'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://wellbeing-spaces.de'),
  title: {
    default: 'Wellbeing Spaces',
    template: '%s | Wellbeing Spaces',
  },
  description: 'Plattform für Interior-Projekte: Produktlisten, automatische Kalkulation und Freigaben strukturiert an einem Ort. DSGVO-konform, Hosting in der EU.',
  authors: [{ name: 'Wellbeing Spaces' }],
  creator: 'VicinusMedia',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    siteName: 'Wellbeing Spaces',
    locale: 'de_DE',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Wellbeing Spaces',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-image.png'],
  },
  alternates: {
    languages: {
      'de': 'https://wellbeing-spaces.de',
      'x-default': 'https://wellbeing-spaces.de',
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className={`${montserrat.variable} ${syne.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
