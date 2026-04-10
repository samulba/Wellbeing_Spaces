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

const produktLinks = [
  { label: 'Features',    href: '/features'   },
  { label: 'Preise',      href: '/preise'     },
  { label: 'FAQ',         href: '/#faq'       },
  { label: 'Anmelden',    href: '/login'      },
  { label: 'Registrieren',href: '/login'      },
]

const legalLinks = [
  { label: 'Impressum',            href: '/impressum'   },
  { label: 'Datenschutzerklärung', href: '/datenschutz' },
  { label: 'AGB',                  href: '/agb'         },
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

      {/* Bg glows */}
      <div className="absolute top-0 left-1/3 w-[700px] h-[350px] bg-indigo-900/20 blur-[130px] rounded-full pointer-events-none" aria-hidden />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[200px] bg-violet-900/10 blur-[100px] rounded-full pointer-events-none" aria-hidden />

      <div className="relative z-10 w-full px-8">

        {/* ── CTA Pre-Footer ──────────────────────────────── */}
        <div className="py-20 border-b border-white/[0.06] flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-[0.2em] mb-3">
              Kostenlos starten
            </p>
            <h2 className="font-syne font-bold text-white text-[28px] md:text-[40px] leading-[1.1]">
              Schluss mit Excel-Chaos.<br />
              <span className="text-white/40">Willkommen im Studio.</span>
            </h2>
          </div>
          <div className="shrink-0 flex flex-col items-center md:items-end gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[15px] font-semibold rounded-xl transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/25 hover:-translate-y-0.5 whitespace-nowrap"
            >
              Jetzt kostenlos starten →
            </Link>
            <p className="text-[12px] text-white/20">Keine Kreditkarte · Kein Jahresabo</p>
          </div>
        </div>

        {/* ── Main link grid ───────────────────────────────── */}
        <div className="py-14 flex flex-col md:flex-row md:justify-between gap-12">

          {/* Brand – left */}
          <div className="shrink-0">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-5 group">
              <DepthStackIcon />
              <span className="font-syne font-bold text-[17px] text-white group-hover:text-indigo-300 transition-colors">
                WBC Studio
              </span>
            </Link>
            <p className="text-[13px] text-white/30 leading-relaxed max-w-[240px] mb-7">
              Projektmanagement für Interior Designer. Produktlisten, Preiskalkulation und Kundenfreigabe – alles in einem.
            </p>
            <ul className="space-y-2.5">
              {trust.map((t) => (
                <li key={t} className="flex items-center gap-2 text-[12px] text-white/20">
                  <span className="w-1 h-1 rounded-full bg-indigo-500 shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Produkt – right */}
          <div className="shrink-0">
            <h4 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.16em] mb-5">
              Produkt
            </h4>
            <ul className="space-y-3.5">
              {produktLinks.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-[13px] text-white/35 hover:text-white transition-colors duration-150"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Bottom bar ────────────────────────────────────── */}
        <div className="border-t border-white/[0.06] py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-white/15">
            © 2026 WBC Studio – Made for Interior Designers
          </p>
          <div className="flex items-center gap-5">
            {legalLinks.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="text-[11px] text-white/20 hover:text-white/50 transition-colors duration-150"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </footer>
  )
}
