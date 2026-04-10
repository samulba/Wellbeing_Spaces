import AnimateOnScroll from './AnimateOnScroll'
import { AlertTriangle, Mail, Calculator } from 'lucide-react'

const pains = [
  {
    icon: AlertTriangle,
    title: 'Produktlisten in Excel die beim Kunden Fragezeichen hinterlassen',
    bg: 'bg-orange-50', border: 'border-orange-100', iconColor: 'text-orange-500',
  },
  {
    icon: Mail,
    title: 'Endlose E-Mail-Schleifen bis zur Freigabe eines Sofas',
    bg: 'bg-red-50', border: 'border-red-100', iconColor: 'text-red-500',
  },
  {
    icon: Calculator,
    title: 'Manuelle Preiskalkulation die Stunden kostet und Fehler produziert',
    bg: 'bg-amber-50', border: 'border-amber-100', iconColor: 'text-amber-500',
  },
]

export default function ProblemSolution() {
  return (
    <section className="bg-white py-24">
      <div className="max-w-5xl mx-auto px-5">
        <AnimateOnScroll type="blur-in">
          <h2 className="font-syne font-bold text-[36px] md:text-[52px] text-[#0F1117] text-center mb-14 leading-[1.1]">
            Kennst du das?
          </h2>
        </AnimateOnScroll>

        <div className="grid md:grid-cols-3 gap-5 mb-14">
          {pains.map((pain, i) => (
            <AnimateOnScroll key={i} delay={i * 120} type="fade-up">
              <div className={`rounded-2xl border p-7 h-full ${pain.bg} ${pain.border} hover:-translate-y-1 transition-transform duration-300`}>
                <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center mb-4">
                  <pain.icon className={`w-5 h-5 ${pain.iconColor}`} />
                </div>
                <p className="text-[15px] font-medium text-gray-800 leading-snug">{pain.title}</p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>

        <AnimateOnScroll delay={360} type="scale-in">
          <div className="flex flex-col items-center gap-5">
            <div className="w-px h-10 bg-gradient-to-b from-gray-200 to-transparent" />
            <p className="font-syne font-bold text-[24px] md:text-[32px] text-[#0F1117] text-center">
              Mit WBC Studio war das gestern.
            </p>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  )
}
