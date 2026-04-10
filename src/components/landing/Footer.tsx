import Link from 'next/link'

function DepthStackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="0" y="0" width="10" height="10" rx="2" fill="#6366F1" opacity="0.30" />
      <rect x="4" y="4" width="10" height="10" rx="2" fill="#6366F1" opacity="0.55" />
      <rect x="8" y="8" width="10" height="10" rx="2" fill="#6366F1" />
    </svg>
  )
}

const links: Record<string, { label: string; href: string }[]> = {
  Produkt: [
    { label: 'Features',  href: '/features' },
    { label: 'Preise',    href: '/#preise'  },
    { label: 'FAQ',       href: '/#faq'     },
  ],
  Konto: [
    { label: 'Kostenlos starten', href: '/login' },
    { label: 'Anmelden',          href: '/login' },
  ],
  Rechtliches: [
    { label: 'Impressum',         href: '/impressum'   },
    { label: 'Datenschutzerklärung', href: '/datenschutz' },
  ],
}

export default function Footer() {
  return (
    <footer className="bg-[#0F1117] text-white">
      <div className="w-full px-8 pt-16 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-3">
              <DepthStackIcon />
              <span className="font-syne font-bold text-[15px] tracking-tight">WBC Studio</span>
            </div>
            <p className="text-[13px] text-white/35 leading-relaxed max-w-[180px]">
              Einfaches Projektmanagement für Interior Designer
            </p>
          </div>

          {Object.entries(links).map(([section, items]) => (
            <div key={section}>
              <h4 className="text-[10px] font-bold text-white/25 uppercase tracking-[0.14em] mb-4">
                {section}
              </h4>
              <ul className="space-y-2.5">
                {items.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-[13px] text-white/45 hover:text-white transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/[0.07] pt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-white/20">
            &copy; 2026 WBC Studio – Unabhängiges SaaS-Produkt
          </p>
          <p className="text-[12px] text-white/20">
            Hosted in Frankfurt · DSGVO-konform
          </p>
        </div>
      </div>
    </footer>
  )
}
