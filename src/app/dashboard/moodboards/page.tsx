import { getAlleMoodboards } from '@/app/actions/moodboard'
import StickyPageHeader from '@/components/StickyPageHeader'
import MoodboardsUebersichtClient from './MoodboardsUebersichtClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MoodboardsUebersichtPage() {
  const eintraege = await getAlleMoodboards()
  return (
    <div className="flex-1 overflow-y-auto animate-fadeIn">
      <StickyPageHeader
        title="Moodboards"
        count={eintraege.length}
        countLabel={eintraege.length === 1 ? 'Board' : 'Boards'}
        subtitle="Stimme den Stil mit deinem Kunden ab — bevor du konkrete Produkte einkaufst."
      />
      <div className="px-6 py-6">
        <MoodboardsUebersichtClient eintraege={eintraege} />
      </div>
    </div>
  )
}
