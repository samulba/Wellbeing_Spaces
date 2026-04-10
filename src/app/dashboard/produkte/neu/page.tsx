import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ChevronRight, FolderOpen, DoorOpen, ArrowLeft } from 'lucide-react'

export default async function ProduktNeuPage({
  searchParams,
}: {
  searchParams: Promise<{ projekt_id?: string }>
}) {
  const supabase = await createClient()
  const { projekt_id: projektId } = await searchParams

  // ── Schritt 2: Raum auswählen ──────────────────────────────
  if (projektId) {
    const [{ data: projekt }, { data: raeume }] = await Promise.all([
      supabase
        .from('projekte')
        .select('id, name, kunden:kunde_id(name)')
        .eq('id', projektId)
        .is('deleted_at', null)
        .single(),
      supabase
        .from('raeume')
        .select('id, name, reihenfolge')
        .eq('projekt_id', projektId)
        .is('deleted_at', null)
        .order('reihenfolge'),
    ])

    if (!projekt) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-500">Projekt nicht gefunden.</p>
        </div>
      )
    }

    const kundeName = (projekt as { kunden?: { name?: string } | null }).kunden?.name ?? ''

    return (
      <div className="flex-1 overflow-y-auto px-6 py-6 animate-fadeIn max-w-2xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
          <Link href="/dashboard/produkte" className="hover:text-gray-600 transition-colors">
            Produkte
          </Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/dashboard/produkte/neu" className="hover:text-gray-600 transition-colors">
            Neues Produkt
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-600">{projekt.name}</span>
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Raum wählen</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Projekt: <span className="font-medium text-gray-700">{projekt.name}</span>
            {kundeName && <span className="text-gray-400"> · {kundeName}</span>}
          </p>
        </div>

        {raeume && raeume.length > 0 ? (
          <div className="space-y-2">
            {raeume.map((raum) => (
              <Link
                key={raum.id}
                href={`/dashboard/projekte/${projektId}/raeume/${raum.id}/produkte/neu`}
                className="flex items-center gap-4 px-5 py-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-gray-100 group-hover:bg-indigo-50 flex items-center justify-center transition-colors">
                  <DoorOpen className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                </div>
                <span className="flex-1 text-sm font-medium text-gray-800 group-hover:text-indigo-700 transition-colors">
                  {raum.name}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
            <p className="text-sm text-gray-500">Dieses Projekt hat noch keine Räume.</p>
            <Link
              href={`/dashboard/projekte/${projektId}`}
              className="mt-3 inline-block text-sm text-indigo-600 hover:underline"
            >
              Zum Projekt → Raum anlegen
            </Link>
          </div>
        )}

        <Link
          href="/dashboard/produkte/neu"
          className="inline-flex items-center gap-1.5 mt-6 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Anderes Projekt wählen
        </Link>
      </div>
    )
  }

  // ── Schritt 1: Projekt auswählen ───────────────────────────
  const { data: projekte } = await supabase
    .from('projekte')
    .select('id, name, kunden:kunde_id(name)')
    .is('deleted_at', null)
    .order('name')

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 animate-fadeIn max-w-2xl">
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-6">
        <Link href="/dashboard/produkte" className="hover:text-gray-600 transition-colors">
          Produkte
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-600">Neues Produkt</span>
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Projekt wählen</h1>
        <p className="text-sm text-gray-500 mt-0.5">In welchem Projekt soll das Produkt angelegt werden?</p>
      </div>

      {projekte && projekte.length > 0 ? (
        <div className="space-y-2">
          {projekte.map((p) => {
            const kundeName = (p as { kunden?: { name?: string } | null }).kunden?.name ?? ''
            return (
              <Link
                key={p.id}
                href={`/dashboard/produkte/neu?projekt_id=${p.id}`}
                className="flex items-center gap-4 px-5 py-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-gray-100 group-hover:bg-indigo-50 flex items-center justify-center transition-colors">
                  <FolderOpen className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 group-hover:text-indigo-700 transition-colors truncate">
                    {p.name}
                  </p>
                  {kundeName && (
                    <p className="text-xs text-gray-400 truncate">{kundeName}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors shrink-0" />
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
          <p className="text-sm text-gray-500">Noch keine Projekte vorhanden.</p>
          <Link
            href="/dashboard/projekte/neu"
            className="mt-3 inline-block text-sm text-indigo-600 hover:underline"
          >
            Erstes Projekt anlegen →
          </Link>
        </div>
      )}
    </div>
  )
}
