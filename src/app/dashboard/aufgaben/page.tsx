import StickyPageHeader from '@/components/StickyPageHeader'
import { getAufgaben, getAufgabePickerOptionen } from '@/app/actions/aufgaben'
import AufgabenBoardClient from './AufgabenBoardClient'

export const dynamic = 'force-dynamic'

export default async function AufgabenPage() {
  const [aufgaben, pickerOptionen] = await Promise.all([
    getAufgaben(),
    getAufgabePickerOptionen(),
  ])

  return (
    <div className="flex-1 overflow-y-auto animate-fadeIn bg-gray-50">
      <StickyPageHeader
        title="Aufgaben"
        count={aufgaben.length}
        countLabel={aufgaben.length === 1 ? 'Aufgabe' : 'Aufgaben'}
        subtitle="Alle Aufgaben deiner Organisation auf einem Brett"
      />
      <div className="px-6 py-6">
        <AufgabenBoardClient initialeAufgaben={aufgaben} pickerOptionen={pickerOptionen} />
      </div>
    </div>
  )
}
