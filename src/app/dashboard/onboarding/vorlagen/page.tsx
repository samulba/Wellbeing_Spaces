import { alleVorlagenLaden } from '@/app/actions/onboarding'
import VorlagenVerwaltung from '@/components/VorlagenVerwaltung'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function VorlagenPage() {
  const vorlagen = await alleVorlagenLaden()

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 animate-fadeIn">
      <div className="mb-5">
        <Link
          href="/dashboard/onboarding"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Zurück zu Onboarding
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Onboarding-Vorlagen</h1>
        <p className="text-sm text-gray-500 mt-1">
          Passe die Fragen für deine Onboarding-Links an.
        </p>
      </div>
      <VorlagenVerwaltung vorlagen={vorlagen} />
    </div>
  )
}
