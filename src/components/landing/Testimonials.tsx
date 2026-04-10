import AnimateOnScroll from './AnimateOnScroll'

const testimonials = [
  {
    name: 'Sarah M.',
    role: 'Interior Designerin, München',
    initials: 'SM',
    color: 'from-violet-400 to-violet-600',
    quote:
      'Endlich kein Excel-Chaos mehr. Mit WBC Studio erstelle ich Produktlisten in Minuten und meine Kunden geben per Link frei – ohne eine einzige Rückfrage.',
  },
  {
    name: 'Tobias K.',
    role: 'Architektur Studio, Berlin',
    initials: 'TK',
    color: 'from-indigo-400 to-indigo-600',
    quote:
      'Die Preiskalkulation spart uns täglich Zeit. Einkaufspreis rein, Marge setzen und der Verkaufspreis steht – automatisch. Genau das was wir gebraucht haben.',
  },
  {
    name: 'Lisa R.',
    role: 'Raumplanerin, Hamburg',
    initials: 'LR',
    color: 'from-emerald-400 to-emerald-600',
    quote:
      'Meine Kunden lieben es, dass sie keine App installieren oder ein Konto erstellen müssen. Einfach Link öffnen und freigeben. So unkompliziert sollte das immer sein.',
  },
]

export default function Testimonials() {
  return (
    <section className="bg-[#F8F9FA] py-28 relative overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-indigo-100/60 blur-[100px] rounded-full pointer-events-none"
        aria-hidden
      />

      <div className="relative z-10 max-w-5xl mx-auto px-5">
        <AnimateOnScroll type="blur-in">
          <div className="text-center mb-16">
            <p className="text-[11px] font-bold text-[#6366F1] uppercase tracking-[0.2em] mb-3">
              Echte Stimmen
            </p>
            <h2 className="font-syne font-bold text-[36px] md:text-[48px] text-[#0F1117] leading-[1.1]">
              Was Designer sagen
            </h2>
          </div>
        </AnimateOnScroll>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <AnimateOnScroll key={t.name} delay={i * 130} type="scale-in">
              <div className="bg-white rounded-2xl border border-gray-200 p-7 flex flex-col gap-5 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50 hover:-translate-y-1.5 transition-all duration-300 h-full">
                {/* Stars */}
                <div className="flex gap-0.5 text-amber-400 text-[15px]">★★★★★</div>

                {/* Quote mark */}
                <div className="font-serif text-[60px] text-indigo-100 leading-none -mb-4 select-none">
                  &ldquo;
                </div>

                {/* Quote */}
                <p className="text-[14px] text-gray-600 leading-relaxed flex-1">
                  {t.quote}
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-[12px] font-bold shrink-0`}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-gray-900">{t.name}</p>
                    <p className="text-[11px] text-gray-400">{t.role}</p>
                  </div>
                </div>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  )
}
