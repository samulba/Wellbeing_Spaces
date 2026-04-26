import { notFound } from 'next/navigation'
import Image from 'next/image'
import { Palette, MessageSquare } from 'lucide-react'
import { getMoodboardOeffentlich, getMoodboardKommentareOeffentlich } from '@/app/actions/moodboard'
import MoodboardPraesentation from '@/components/moodboard/MoodboardPraesentation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Props {
  params: { token: string }
}

export default async function MoodboardOeffentlichPage({ params }: Props) {
  const board = await getMoodboardOeffentlich(params.token)
  if (!board) notFound()
  const initialPins = board.kommentareAktiv
    ? await getMoodboardKommentareOeffentlich(params.token)
    : []

  return (
    <div className="min-h-screen bg-wellbeing-cream/30 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Image src="/logo-mittel.png" alt="Wellbeing Spaces" width={36} height={36} className="shrink-0" />
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-medium text-gray-800 truncate">
                {board.name}
              </div>
              <div className="text-[11px] sm:text-xs text-gray-500 truncate">
                {board.projektName} · {board.raumName}
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-xs text-gray-400">
            {board.kommentareAktiv && (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[11px] font-medium">
                <MessageSquare className="w-3 h-3" />
                Kommentare aktiv
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" />
              Moodboard
            </span>
          </div>
        </div>
      </header>

      {/* Beschreibung */}
      {board.beschreibung && (
        <div className="bg-white border-b border-gray-200 px-4 py-3 sm:px-6">
          <div className="max-w-6xl mx-auto text-sm text-gray-600">
            {board.beschreibung}
          </div>
        </div>
      )}

      {/* Canvas */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <MoodboardPraesentation
          canvasJson={board.canvasJson}
          name={board.name}
          freigabeToken={params.token}
          kommentareAktiv={board.kommentareAktiv}
          initialPins={initialPins}
        />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-4 py-3 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[11px] sm:text-xs text-gray-400">
          <span>Erstellt mit Wellbeing Spaces</span>
          <a
            href="https://wellbeing-spaces.de"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-wellbeing-green"
          >
            wellbeing-spaces.de
          </a>
        </div>
      </footer>
    </div>
  )
}
