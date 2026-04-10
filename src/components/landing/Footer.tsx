import Link from 'next/link'

function DepthStackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="0" y="0" width="10" height="10" rx="2" fill="#6366F1" opacity="0.25" />
      <rect x="4" y="4" width="10" height="10" rx="2" fill="#6366F1" opacity="0.55" />
      <rect x="8" y="8" width="10" height="10" rx="2" fill="#6366F1" />
    </svg>
  )
}

const navLinks = [
  { label: 'Features',   href: '/features'   },
  { label: 'Preise',     href: '/preise'     },
  { label: 'FAQ',        href: '/#faq'       },
]

const legalLinks = [
  { label: 'Impressum',          href: '/impressum'   },
  { label: 'Datenschutzerklärung', href: '/datenschutz' },
]

const trust = [
  'EU-Server Frankfurt',
  'DSGVO-konform',
  'Monatlich kündbar',
]

export default function Footer() {
  return (
    <footer className="bg-[#0F1117] relative overflow-hidden">

      {/* Top border gradient */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Bg glow */}
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[250px] bg-indigo-900/15 blur-[90px] rounded-full pointer-events-none" aria-hidden />
      <div className="absolute top-0 right-0 w-[300px] h-[200px] bg-violet-900/10 blur-[80px] rounded-full pointer-events-none" aria-hidden />

      <div className="relative z-10 w-full px-8 pt-16 pb-8">

        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-14 md:gap-10 mb-16">

          {/* ── Brand column ──────────────────── */}
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5 mb-5 group">
              <DepthStackIcon />
              <span className="font-syne font-bold text-[17px] text-white group-hover:text-indigo-300 transition-colors">
                WBC Studio
              </span>
            </Link>

            <p className="text-[14px] text-white/35 leading-relaxed mb-6 max-w-[280px]">
              Einfaches Projektmanagement für Interior Designer und Design Studios.
              Produktlisten, Preiskalkulation und Kundenfreigabe – alles in einem Tool, ab 0€.
            </p>

            {/* Trust list */}
            <ul className="space-y-2 mb-8">
              {trust.map((t) => (
                <li key={t} className="flex items-center gap-2 text-[12px] text-white/25">
                  <span className="w-1 h-1 rounded-full bg-indigo-500 shrink-0" />
                  {t}
                </li>
              ))}
            </ul>

            {/* Footer CTA */}
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[13px] font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5"
            >
              Kostenlos starten →
            </Link>
          </div>

          {/* ── Produkt links ──────────────────── */}
          <div>
            <h4 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.16em] mb-5">
              Produkt
            </h4>
            <ul className="space-y-3.5">
              {navLinks.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-[14px] text-white/40 hover:text-white transition-colors duration-150"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
              <li className="pt-2 border-t border-white/[0.05]">
                <Link
                  href="/login"
                  className="text-[14px] text-white/40 hover:text-white transition-colors duration-150"
                >
                  Anmelden
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-[14px] text-white/40 hover:text-white transition-colors duration-150"
                >
                  Registrieren
                </Link>
              </li>
            </ul>
          </div>

          {/* ── Rechtliches ──────────────────── */}
          <div>
            <h4 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.16em] mb-5">
              Rechtliches
            </h4>
            <ul className="space-y-3.5">
              {legalLinks.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-[14px] text-white/40 hover:text-white transition-colors duration-150"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Made with badge */}
            <div className="mt-10 inline-flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] border border-white/[0.07] rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-[11px] text-white/25 whitespace-nowrap">Hosted in Frankfurt · EU</span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.06] pt-7 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-white/20">
            © 2026 WBC Studio – Made for Interior Designers
          </p>
          <p className="text-[12px] text-white/15">
            Built with Next.js · Supabase · Vercel
          </p>
        </div>
      </div>
    </footer>
  )
}
