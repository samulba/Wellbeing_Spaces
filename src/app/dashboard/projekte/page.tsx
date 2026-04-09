import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { ProjektMitKunde } from '@/lib/supabase/types'

const statusLabel: Record<string, string> = {
  offen: 'Offen',
  in_bearbeitung: 'In Bearbeitung',
  freigegeben: 'Freigegeben',
  abgeschlossen: 'Abgeschlossen',
}

const statusFarbe: Record<string, string> = {
  offen: 'bg-stone-100 text-stone-500',
  in_bearbeitung: 'bg-blue-50 text-blue-600',
  freigegeben: 'bg-green-50 text-green-600',
  abgeschlossen: 'bg-stone-100 text-stone-400',
}

async function getProjekte(): Promise<ProjektMitKunde[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('projekte')
    .select('*, kunden(id, name)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  return (data ?? []) as ProjektMitKunde[]
}

export default async function ProjektePage() {
  const projekte = await getProjekte()

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-stone-800">Projekte</h1>
          <p className="text-sm text-stone-400 mt-0.5">{projekte.length} Einträge</p>
        </div>
        <Link
          href="/dashboard/projekte/neu"
          className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Neues Projekt
        </Link>
      </div>

      {/* Leerzustand */}
      {projekte.length === 0 && (
        <div className="text-center py-16 bg-white border border-stone-100 rounded-xl">
          <p className="text-stone-400 text-sm">Noch keine Projekte angelegt.</p>
          <Link
            href="/dashboard/projekte/neu"
            className="inline-block mt-3 text-sm text-stone-600 underline underline-offset-2"
          >
            Erstes Projekt anlegen
          </Link>
        </div>
      )}

      {/* Karten-Grid */}
      {projekte.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projekte.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/projekte/${p.id}`}
              className="bg-white border border-stone-100 rounded-xl p-5 hover:border-stone-200 hover:shadow-sm transition-all group block"
            >
              {/* Status-Badge */}
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    statusFarbe[p.status] ?? 'bg-stone-100 text-stone-500'
                  }`}
                >
                  {statusLabel[p.status] ?? p.status}
                </span>
                {p.projektart && (
                  <span className="text-xs text-stone-400">{p.projektart}</span>
                )}
              </div>

              {/* Name */}
              <h2 className="text-sm font-semibold text-stone-800 group-hover:text-stone-600 transition-colors leading-snug mb-1">
                {p.name}
              </h2>

              {/* Kunde */}
              <p className="text-xs text-stone-400 mb-3">
                {p.kunden?.name ?? '–'}
              </p>

              {/* Meta */}
              <div className="flex items-center gap-3 text-xs text-stone-400 border-t border-stone-50 pt-3 mt-auto">
                {p.standort && <span>{p.standort}</span>}
                {p.gesamtbudget != null && (
                  <span className="ml-auto font-medium text-stone-500">
                    {new Intl.NumberFormat('de-DE', {
                      style: 'currency',
                      currency: 'EUR',
                      maximumFractionDigits: 0,
                    }).format(p.gesamtbudget)}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
