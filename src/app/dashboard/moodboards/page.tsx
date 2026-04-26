import { getAlleMoodboards } from '@/app/actions/moodboard'
import MoodboardsUebersichtClient from './MoodboardsUebersichtClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MoodboardsUebersichtPage() {
  const eintraege = await getAlleMoodboards()
  return <MoodboardsUebersichtClient eintraege={eintraege} />
}
