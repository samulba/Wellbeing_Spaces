import AnimateOnScroll from './AnimateOnScroll'

const competitors = ['Houzz Pro', 'Excel', 'E-Mail-Chaos', 'Mydoma']

export default function CompetitorBadge() {
  return (
    <section className="bg-white border-y border-gray-100 py-14">
      <div className="max-w-5xl mx-auto px-5 text-center">
        <AnimateOnScroll type="fade-up">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-8">
            Die einfachere Alternative für Designer die produktiv arbeiten wollen
          </p>
        </AnimateOnScroll>

        <AnimateOnScroll delay={120} type="scale-in">
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
            {competitors.map((name, i) => (
              <AnimateOnScroll key={name} delay={i * 60} type="fade-up">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 shadow-sm hover:bg-gray-100 transition-colors">
                  <span className="text-[13px] font-medium text-gray-400 line-through decoration-gray-300">
                    {name}
                  </span>
                  <span className="text-red-400 text-[11px] font-bold">✕</span>
                </div>
              </AnimateOnScroll>
            ))}

            <AnimateOnScroll delay={300} type="fade-right">
              <div className="flex items-center gap-1.5 text-gray-300 font-light text-2xl mx-1">→</div>
            </AnimateOnScroll>

            <AnimateOnScroll delay={380} type="scale-in">
              <div className="flex items-center gap-2.5 px-6 py-3 bg-indigo-50 rounded-xl border-2 border-indigo-200 shadow-md shadow-indigo-100/60 hover:shadow-lg hover:shadow-indigo-100/80 hover:-translate-y-0.5 transition-all duration-200">
                <span className="font-syne font-bold text-[14px] text-[#6366F1]">WBC Studio</span>
                <span className="text-emerald-500 font-bold">✓</span>
              </div>
            </AnimateOnScroll>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  )
}
