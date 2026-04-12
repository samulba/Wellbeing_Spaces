import { createClient } from '@/lib/supabase/server'
import FreigabenTabelle, { type FreigabeEintrag } from '@/components/FreigabenTabelle'

async function getAlleProdukte(): Promise<FreigabeEintrag[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('produkte')
    .select(`
      id, name, kategorie, menge, einheit, verkaufspreis, bild_url, created_at,
      raeume(id, name, projekt_id, projekte(id, name, kunden(id, name))),
      produktstatus(status, kommentar)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  return (data ?? []) as unknown as FreigabeEintrag[]
}

export default async function FreigabenPage() {
  const eintraege = await getAlleProdukte()

  return (
    <div className="flex-1 overflow-y-auto animate-fadeIn">
      <FreigabenTabelle eintraege={eintraege} />
    </div>
  )
}
