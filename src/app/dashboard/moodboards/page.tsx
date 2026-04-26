import Link from 'next/link'
import { Palette, Share2, FolderOpen, Eye } from 'lucide-react'
import { getAlleMoodboards } from '@/app/actions/moodboard'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const formatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit', month: '2-digit', year: 'numeric',
})

export default async function MoodboardsUebersichtPage() {
  const eintraege = await getAlleMoodboards()

  // Gruppiere nach Projekt
  const grouped = new Map<string, { projekt_name: string; eintraege: typeof eintraege }>()
  eintraege.forEach((e) => {
    const g = grouped.get(e.projekt_id)
    if (g) g.eintraege.push(e)
    else grouped.set(e.projekt_id, { projekt_name: e.projekt_name, eintraege: [e] })
  })
  const projekte = Array.from(grouped.entries()).sort(
    (a, b) => a[1].projekt_name.localeCompare(b[1].projekt_name, 'de'),
  )

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-wellbeing-cream flex items-center justify-center">
            <Palette className="w-5 h-5 text-wellbeing-green-dark" />
          </div>
          <div>
            <h1 className="text-2xl font-medium text-gray-800">Moodboards</h1>
            <p className="text-sm text-gray-500">
              Alle Moodboards aller Projekte
              {eintraege.length > 0 && <span className="ml-1">· {eintraege.length}</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {eintraege.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl px-6 py-16 text-center">
          <Palette className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h2 className="text-base font-medium text-gray-700">Noch kein Moodboard erstellt</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            Öffne einen Raum in einem Projekt und klicke dort auf &bdquo;Moodboard&ldquo;, um das erste Board anzulegen.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {projekte.map(([projektId, group]) => (
            <section key={projektId}>
              <div className="flex items-center gap-2 mb-3">
                <FolderOpen className="w-4 h-4 text-gray-400" />
                <Link
                  href={`/dashboard/projekte/${projektId}`}
                  className="text-sm font-medium text-gray-700 hover:text-wellbeing-green"
                >
                  {group.projekt_name}
                </Link>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-xs text-gray-400">
                  {group.eintraege.length} {group.eintraege.length === 1 ? 'Board' : 'Boards'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.eintraege.map((e) => (
                  <Link
                    key={e.id}
                    href={`/dashboard/projekte/${e.projekt_id}/raeume/${e.raum_id}/moodboard`}
                    className="group bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden hover:border-wellbeing-green/40 hover:shadow-md transition-all"
                  >
                    {/* Vorschau-Block */}
                    <div className="aspect-[4/3] bg-gradient-to-br from-wellbeing-cream via-white to-wellbeing-sand/20 flex items-center justify-center relative">
                      {e.vorschau_bild_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.vorschau_bild_url} alt={e.name} className="w-full h-full object-cover" />
                      ) : (
                        <Palette className="w-10 h-10 text-wellbeing-green/30" />
                      )}
                      {e.freigabe_aktiv && (
                        <div className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 bg-wellbeing-green/90 text-white text-[10px] font-medium rounded-full">
                          <Share2 className="w-3 h-3" /> Freigabe
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="px-3 py-2.5">
                      <div className="text-sm font-medium text-gray-800 truncate">{e.name}</div>
                      <div className="text-xs text-gray-500 truncate mt-0.5">Raum: {e.raum_name}</div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[11px] text-gray-400">
                          {formatter.format(new Date(e.updated_at))}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-wellbeing-green opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye className="w-3 h-3" /> Öffnen
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
