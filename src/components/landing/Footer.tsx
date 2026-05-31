import Link from 'next/link'
import Image from 'next/image'

const cols = [
  {
    heading: 'Plattform',
    links: [
      { label: 'Funktionen', href: '/#features' },
      { label: 'Ablauf',     href: '/#wie-es-funktioniert' },
      { label: 'FAQ',        href: '/#faq' },
      { label: 'Anmelden',   href: '/login' },
    ],
  },
  {
    heading: 'Rechtliches',
    links: [
      { label: 'Impressum',            href: '/impressum'   },
      { label: 'Datenschutzerklärung', href: '/datenschutz' },
      { label: 'AGB',                  href: '/agb'         },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="bg-[#445c49] relative overflow-hidden">

      {/* Top gradient line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[300px] bg-wellbeing-green-dark/70 blur-[130px] rounded-full pointer-events-none" aria-hidden />

      {/* Giant watermark */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 font-syne font-bold leading-none select-none pointer-events-none whitespace-nowrap text-white/[0.025]"
        style={{ fontSize: 'clamp(36px, 10vw, 200px)' }}
        aria-hidden
      >
        WELLBEING SPACES
      </div>

      <div className="relative z-10 w-full px-8 pt-16 pb-12">

        {/* Main grid: brand left, link cols right */}
        <div className="flex flex-col md:flex-row md:justify-between gap-12 md:gap-6 mb-16">

          {/* Brand */}
          <div>
            <Link href="/" className="inline-flex items-center gap-3 mb-5 group">
              <Image src="/logo-gross.png" alt="Wellbeing Spaces" width={40} height={40} className="w-10 h-10 object-contain brightness-0 invert opacity-80" />
              <span className="font-syne font-bold text-[28px] text-white group-hover:text-wellbeing-green-light transition-colors leading-none">
                Wellbeing Spaces
              </span>
            </Link>
            <p className="text-[13px] text-white/25 max-w-[240px] leading-relaxed">
              Interior-Projektmanagement.<br />Produkte · Kalkulation · Freigaben.
            </p>
          </div>

          {/* Nav columns */}
          <div className="flex gap-16 shrink-0">
            {cols.map((col) => (
              <div key={col.heading}>
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.16em] mb-4">
                  {col.heading}
                </p>
                <ul className="space-y-3">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-[13px] text-white/35 hover:text-white/80 transition-colors duration-150"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <p className="text-[11px] text-white/20">
              © 2026 Wellbeing Spaces · EU-Hosting · DSGVO-konform
            </p>
          </div>
          <p className="text-[11px] text-white/15">
            Entwickelt von{' '}
            <a
              href="https://www.vicinusmedia.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/25 hover:text-white/50 transition-colors underline underline-offset-2"
            >
              VicinusMedia
            </a>
          </p>
        </div>

      </div>
    </footer>
  )
}
