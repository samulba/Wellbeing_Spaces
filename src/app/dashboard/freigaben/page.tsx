import { createClient } from '@/lib/supabase/server'
import FreigabenTabelle, { type FreigabeEintrag } from '@/components/FreigabenTabelle'

async function getAlleProdukte(): Promise<FreigabeEintrag[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('produkte')
    .select(`
      id, name, kategorie, menge, einheit, verkaufspreis,
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
    <div className="flex-1 overflow-y-auto px-6 py-6 animate-fadeIn">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Freigaben</h1>
        <p className="text-sm text-gray-500 mt-0.5">Produktfreigaben aller Projekte im Überblick</p>
      </div>
      <FreigabenTabelle eintraege={eintraege} />
    </div>
  )
}
