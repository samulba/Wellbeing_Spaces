import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { eventsAbrufen } from '@/app/actions/timeline'
import TimelineView from './TimelineView'

interface Props {
  params: { id: string }
}

export default async function TimelinePage({ params }: Props) {
  const supabase = await createClient()

  const { data: projekt } = await supabase
    .from('projekte')
    .select('id, name, kunden(name)')
    .eq('id', params.id)
    .is('deleted_at', null)
    .single()

  if (!projekt) notFound()

  const events = await eventsAbrufen(params.id)

  return (
    <div className="flex-1 overflow-hidden flex flex-col animate-fadeIn">
      <TimelineView
        projektId={params.id}
        projektName={projekt.name}
        initialEvents={events}
      />
    </div>
  )
}
