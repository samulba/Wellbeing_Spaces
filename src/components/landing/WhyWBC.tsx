import AnimateOnScroll from './AnimateOnScroll'
import { Check, X, Minus } from 'lucide-react'

// ── Daten ─────────────────────────────────────────────────────
type CellType = 'good' | 'bad' | 'neutral'
type Cell = { type: CellType; text: string }

const tools = [
  { name: 'WBC Studio',  price: 'ab kostenlos',  highlight: true  },
  { name: 'Houzz Pro',   price: '$199 / Monat',  highlight: false },
  { name: 'Mydoma',      price: '$64 / Monat',   highlight: false },
]

const rows: { label: string; wbc: Cell; houzz: Cell; mydoma: Cell }[] = [
  {
    label: 'Preis',
    wbc:    { type: 'good',    text: 'Kostenlos starten' },
    houzz:  { type: 'bad',     text: '$199/mo' },
    mydoma: { type: 'bad',     text: '$64/mo' },
  },
  {
    label: 'Kunden-Login nötig',
    wbc:    { type: 'good',    text: 'Kein Login' },
    houzz:  { type: 'bad',     text: 'Account nötig' },
    mydoma: { type: 'bad',     text: 'Account nötig' },
  },
  {
    label: 'DSGVO EU-Server',
    wbc:    { type: 'good',    text: 'Frankfurt' },
    houzz:  { type: 'bad',     text: 'USA-Server' },
    mydoma: { type: 'bad',     text: 'USA-Server' },
  },
  {
    label: 'Freigabe per Link',
    wbc:    { type: 'good',    text: 'Ein Klick' },
    houzz:  { type: 'bad',     text: 'Nicht möglich' },
    mydoma: { type: 'neutral', text: 'Begrenzt' },
  },
  {
    label: 'Schwerpunkt',
    wbc:    { type: 'good',    text: 'Produkte & Preise' },
    houzz:  { type: 'neutral', text: 'Marketing-Tool' },
    mydoma: { type: 'neutral', text: 'Client Portal' },
  },
  {
    label: 'Einstieg',
    wbc:    { type: 'good',    text: 'Sofort startklar' },
    houzz:  { type: 'bad',     text: 'Komplex' },
    mydoma: { type: 'neutral', text: 'Mittel' },
  },
]

// ── Zell-Renderer ─────────────────────────────────────────────
function Cell({ cell, isWBC }: { cell: Cell; isWBC?: boolean }) {
  const icon =
    cell.type === 'good'    ? <Check  className={`w-4 h-4 shrink-0 ${isWBC ? 'text-emerald-400' : 'text-emerald-500'}`} strokeWidth={2.5} /> :
    cell.type === 'bad'     ? <X      className="w-4 h-4 shrink-0 text-red-400"   strokeWidth={2.5} /> :
                              <Minus  className="w-4 h-4 shrink-0 text-gray-400"  strokeWidth={2}   />

  return (
    <div className={`flex items-center gap-2 text-[14px] font-medium ${
      isWBC
        ? cell.type === 'good' ? 'text-white' : 'text-white/60'
        : cell.type === 'bad' ? 'text-gray-500' : 'text-gray-400'
    }`}>
      {icon}
      <span>{cell.text}</span>
    </div>
  )
}

// ── Komponente ────────────────────────────────────────────────
export default function WhyWBC() {
  return (
    <section id="warum-wbc" className="bg-[#0F1117] py-24 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" aria-hidden />

      <div className="relative z-10 max-w-5xl mx-auto px-5">
        <AnimateOnScroll>
          <div className="text-center mb-14">
            <h2 className="font-syne font-bold text-[36px] md:text-[52px] text-white mb-4 leading-[1.1]">
              Warum Designer WBC Studio wählen
            </h2>
            <p className="text-white/40 text-[16px]">
              Kein 3D-Renderer den du nie nutzt. Kein Marketing-Paket das du nicht brauchst.
            </p>
          </div>
        </AnimateOnScroll>

        {/* Comparison Card */}
        <AnimateOnScroll delay={100} className="w-full">
          <div className="rounded-2xl overflow-hidden border border-white/10">

            {/* Tool-Header */}
            <div className="grid grid-cols-3">
              {tools.map((tool, i) => (
                <div
                  key={tool.name}
                  className={`px-5 py-5 ${
                    tool.highlight
                      ? 'bg-[#6366F1]'
                      : i === 1
                        ? 'bg-white/[0.05] border-x border-white/10'
                        : 'bg-white/[0.03]'
                  }`}
                >
                  <p className={`font-syne font-bold text-[15px] mb-1 ${tool.highlight ? 'text-white' : 'text-white/50'}`}>
                    {tool.name}
                  </p>
                  <p className={`text-[13px] font-semibold ${tool.highlight ? 'text-indigo-200' : 'text-white/25'}`}>
                    {tool.price}
                  </p>
                </div>
              ))}
            </div>

            {/* Feature rows */}
            {rows.map((row, i) => (
              <div
                key={row.label}
                className={`grid grid-cols-3 border-t border-white/[0.08] ${
                  i % 2 === 0 ? 'bg-white/[0.02]' : 'bg-transparent'
                }`}
              >
                {/* WBC cell */}
                <div className="px-5 py-4 border-r border-white/[0.08]">
                  <p className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-1.5">
                    {row.label}
                  </p>
                  <Cell cell={row.wbc} isWBC />
                </div>

                {/* Houzz cell */}
                <div className="px-5 py-4 border-r border-white/[0.08] flex flex-col justify-end">
                  <Cell cell={row.houzz} />
                </div>

                {/* Mydoma cell */}
                <div className="px-5 py-4 flex flex-col justify-end">
                  <Cell cell={row.mydoma} />
                </div>
              </div>
            ))}

            {/* CTA row */}
            <div className="grid grid-cols-3 border-t border-white/[0.08]">
              <div className="px-5 py-5 bg-[#6366F1]/20">
                <a
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-indigo-300 hover:text-white transition-colors"
                >
                  Jetzt starten →
                </a>
              </div>
              <div className="px-5 py-5 bg-white/[0.02] border-x border-white/[0.08]">
                <p className="text-[12px] text-white/20">Monatlich kündbar</p>
              </div>
              <div className="px-5 py-5">
                <p className="text-[12px] text-white/20">Jahresabo nötig</p>
              </div>
            </div>
          </div>
        </AnimateOnScroll>

        {/* Bottom chips */}
        <AnimateOnScroll delay={200}>
          <div className="flex flex-wrap justify-center gap-3 mt-10">
            {[
              '✓ Kein Overkill',
              '✓ Kein 3D-Renderer',
              '✓ Keine Buchhaltung',
              '✓ Kein Jahresabo',
            ].map((chip) => (
              <span
                key={chip}
                className="px-4 py-1.5 rounded-full border border-white/10 text-[13px] text-white/40 bg-white/[0.03]"
              >
                {chip}
              </span>
            ))}
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  )
}
