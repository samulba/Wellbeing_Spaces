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

const cols = [
  {
    heading: 'Produkt',
    links: [
      { label: 'Features',     href: '/features' },
      { label: 'Preise',       href: '/preise'   },
      { label: 'FAQ',          href: '/#faq'     },
      { label: 'Anmelden',     href: '/login'    },
      { label: 'Registrieren', href: '/login'    },
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
    <footer className="bg-[#0F1117] relative overflow-hidden">

      {/* Top gradient line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Subtle glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[250px] bg-indigo-950/60 blur-[120px] rounded-full pointer-events-none" aria-hidden />

      <div className="relative z-10 w-full px-8 py-16">

        {/* Main grid: brand left, link cols right */}
        <div className="flex flex-col md:flex-row md:justify-between gap-12 md:gap-6 mb-14">

          {/* Brand */}
          <div className="max-w-[260px]">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group">
              <DepthStackIcon />
              <span className="font-syne font-bold text-[17px] text-white group-hover:text-indigo-300 transition-colors">
                WBC Studio
              </span>
            </Link>
            <p className="text-[13px] text-white/30 leading-relaxed">
              Projektmanagement für Interior Designer –
              Produktlisten, Preiskalkulation und Kundenfreigabe in einem Tool.
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
              © 2026 WBC Studio · EU-Hosting · DSGVO-konform
            </p>
          </div>
          <p className="text-[11px] text-white/10">
            Built with Next.js · Supabase · Vercel
          </p>
        </div>

      </div>
    </footer>
  )
}
