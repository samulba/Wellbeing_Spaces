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
      <AufgabenBoardClient initialeAufgaben={aufgaben} pickerOptionen={pickerOptionen} />
    </div>
  )
}
