import Link from 'next/link'
import Nav from '@/components/landing/Nav'
import Footer from '@/components/landing/Footer'

export default function NotFound() {
  return (
    <div className="bg-[#445c49] min-h-screen flex flex-col">
      <Nav />

      <main className="flex-1 flex items-center justify-center px-5 relative overflow-hidden">

        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-wellbeing-green-dark/25 blur-[120px] rounded-full pointer-events-none" aria-hidden />

        {/* Giant 404 watermark */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-syne font-bold text-white/[0.03] select-none pointer-events-none leading-none"
          style={{ fontSize: 'clamp(140px, 28vw, 380px)' }}
          aria-hidden
        >
          404
        </div>

        <div className="relative z-10 text-center">
          <p className="text-[11px] font-bold text-wellbeing-green-light uppercase tracking-[0.2em] mb-5">
            Seite nicht gefunden
          </p>
          <h1 className="font-syne font-bold text-white text-[40px] md:text-[64px] leading-[1.05] mb-5">
            Hier gibt&apos;s nichts<br className="hidden md:block" /> zu sehen.
          </h1>
          <p className="text-white/35 text-[16px] mb-10 max-w-sm mx-auto leading-relaxed">
            Die Seite existiert nicht oder wurde verschoben.
            Zurück zur Startseite?
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#445c49] hover:bg-[#445c49] text-white text-[15px] font-semibold rounded-xl transition-all duration-200 hover:shadow-xl hover:shadow-wellbeing-green/25 hover:-translate-y-0.5"
            >
              Zur Startseite →
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-7 py-3.5 border border-white/10 hover:border-white/20 text-white/50 hover:text-white/80 text-[15px] font-semibold rounded-xl transition-all duration-200"
            >
              Zum Dashboard
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
