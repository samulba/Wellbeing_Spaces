import AnimateOnScroll from './AnimateOnScroll'
import { AlertTriangle, Mail, Calculator } from 'lucide-react'

export default function ProblemSolution() {
  return (
    <section className="bg-[#445c49] py-28 relative overflow-hidden">
      {/* Background texture */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #818CF8 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
        aria-hidden
      />
      <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-rose-900/10 blur-[120px] rounded-full pointer-events-none" aria-hidden />
      <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-amber-900/10 blur-[100px] rounded-full pointer-events-none" aria-hidden />

      <div className="relative z-10 max-w-5xl mx-auto px-5">

        {/* Header */}
        <AnimateOnScroll type="blur-in">
          <div className="text-center mb-16">
            <p className="text-[11px] font-bold text-rose-400 uppercase tracking-[0.2em] mb-3">
              Der Alltag ohne Wellbeing Spaces
            </p>
            <h2 className="font-syne font-bold text-[36px] md:text-[52px] text-white mb-4 leading-[1.1]">
              Kennst du das?
            </h2>
            <p className="text-white/35 text-[16px] max-w-md mx-auto">
              Jeder Interior Designer kennt diese drei Schmerzpunkte.
            </p>
          </div>
        </AnimateOnScroll>

        {/* Bento grid: 1 big + 2 stacked */}
        <div className="grid md:grid-cols-2 gap-4 mb-12">

          {/* Big card — left */}
          <AnimateOnScroll type="fade-right">
            <div className="h-full rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-8 flex flex-col justify-between hover:border-amber-500/35 hover:bg-amber-500/[0.08] transition-all duration-300 group">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-[10px] font-bold text-amber-400/60 uppercase tracking-widest">Problem 01</span>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  </div>
                </div>

                <h3 className="font-syne font-bold text-white text-[26px] md:text-[30px] leading-[1.15] mb-4">
                  Produktlisten in Excel die beim Kunden Fragezeichen hinterlassen
                </h3>
                <p className="text-white/35 text-[14px] leading-relaxed">
                  Unübersichtliche Tabellen, fehlende Bilder, keine Struktur –
                  der Kunde versteht nicht was er freigeben soll.
                  Du erklärst per Telefon was in der Excel-Liste steht.
                </p>
              </div>

              <div className="mt-8 border-t border-amber-500/10 pt-5 flex items-center gap-3">
                <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/15">
                  <span className="font-syne font-bold text-amber-400 text-[18px]">~8 Std.</span>
                </div>
                <span className="text-[12px] text-white/25">pro Monat für Listenpflege verschwendet</span>
              </div>
            </div>
          </AnimateOnScroll>

          {/* Right column — 2 stacked */}
          <div className="flex flex-col gap-4">
            <AnimateOnScroll type="fade-left" delay={100}>
              <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-7 hover:border-red-500/35 hover:bg-red-500/[0.08] transition-all duration-300 group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-red-400/60 uppercase tracking-widest">Problem 02</span>
                  <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                    <Mail className="w-4 h-4 text-red-400" />
                  </div>
                </div>
                <h3 className="font-syne font-bold text-white text-[20px] leading-[1.2] mb-3">
                  Endlose E-Mail-Ketten bis zur Freigabe eines Sofas
                </h3>
                <p className="text-white/30 text-[13px] leading-relaxed mb-5">
                  Senden, warten, nachfragen, korrigieren, erneut senden.
                  Für ein einziges Produkt.
                </p>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/15">
                    <span className="font-syne font-bold text-red-400 text-[16px]">5–7</span>
                  </div>
                  <span className="text-[12px] text-white/20">E-Mails pro Produktfreigabe</span>
                </div>
              </div>
            </AnimateOnScroll>

            <AnimateOnScroll type="fade-left" delay={200}>
              <div className="rounded-2xl border border-orange-500/20 bg-orange-500/[0.05] p-7 hover:border-orange-500/35 hover:bg-orange-500/[0.08] transition-all duration-300 group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-orange-400/60 uppercase tracking-widest">Problem 03</span>
                  <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                    <Calculator className="w-4 h-4 text-orange-400" />
                  </div>
                </div>
                <h3 className="font-syne font-bold text-white text-[20px] leading-[1.2] mb-3">
                  Manuelle Preiskalkulation die Fehler produziert
                </h3>
                <p className="text-white/30 text-[13px] leading-relaxed mb-5">
                  Taschenrechner, Notizzettel, Formel in Spalte G –
                  und am Ende stimmt die Marge trotzdem nicht.
                </p>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/15">
                    <span className="font-syne font-bold text-orange-400 text-[16px]">30 Min.</span>
                  </div>
                  <span className="text-[12px] text-white/20">Zeitverlust pro Angebot</span>
                </div>
              </div>
            </AnimateOnScroll>
          </div>
        </div>

        {/* Resolution */}
        <AnimateOnScroll delay={350} type="scale-in">
          <div className="relative flex flex-col items-center gap-4">
            {/* Arrow down */}
            <div className="flex flex-col items-center gap-1">
              <div className="w-px h-8 bg-gradient-to-b from-white/10 to-white/30" />
              <svg width="16" height="10" viewBox="0 0 16 10" fill="none" className="text-white/30">
                <path d="M8 10L0 0h16L8 10z" fill="currentColor" />
              </svg>
            </div>

            <div className="rounded-2xl border border-wellbeing-green/30 bg-wellbeing-green/10 px-8 py-5 text-center">
              <p className="font-syne font-bold text-[22px] md:text-[28px] text-white">
                Mit Wellbeing Spaces war das gestern.
              </p>
              <p className="text-white/35 text-[14px] mt-1">
                Alle drei Probleme. Auf einmal. Gelöst.
              </p>
            </div>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  )
}
