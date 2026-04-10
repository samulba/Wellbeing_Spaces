import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, MapPin, Banknote } from 'lucide-react'
import type { ProjektMitKunde } from '@/lib/supabase/types'

const statusLabel: Record<string, string> = {
  offen: 'Offen',
  in_bearbeitung: 'In Bearbeitung',
  freigegeben: 'Freigegeben',
  abgeschlossen: 'Abgeschlossen',
}

const statusFarbe: Record<string, string> = {
  offen:          'bg-gray-100 text-gray-600',
  in_bearbeitung: 'bg-blue-50 text-blue-700',
  freigegeben:    'bg-emerald-50 text-emerald-700',
  abgeschlossen:  'bg-gray-100 text-gray-500',
}

async function getProjekte(): Promise<ProjektMitKunde[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('projekte').select('*, kunden(id, name)').is('deleted_at', null)
    .order('created_at', { ascending: false })
  return (data ?? []) as ProjektMitKunde[]
}

export default async function ProjektePage() {
  const projekte = await getProjekte()

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Projekte</h1>
          <p className="text-sm text-gray-500 mt-0.5">{projekte.length} Einträge</p>
        </div>
        <Link
          href="/dashboard/projekte/neu"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] text-white text-sm font-medium rounded-lg transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          Neues Projekt
        </Link>
      </div>

      {projekte.length === 0 && (
        <div className="text-center py-20 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-gray-500 text-sm">Noch keine Projekte angelegt.</p>
          <Link href="/dashboard/projekte/neu" className="inline-block mt-3 text-sm text-indigo-600 underline underline-offset-2">
            Erstes Projekt anlegen
          </Link>
        </div>
      )}

      {projekte.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {projekte.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/projekte/${p.id}`}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-gray-300 transition-all duration-200 group block"
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusFarbe[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {statusLabel[p.status] ?? p.status}
                </span>
                {p.projektart && (
                  <span className="text-xs text-gray-400 ml-2 truncate">{p.projektart}</span>
                )}
              </div>

              <h2 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors leading-snug mb-1">
                {p.name}
              </h2>
              <p className="text-xs text-gray-500 mb-3">{p.kunden?.name ?? '–'}</p>

              <div className="flex flex-col gap-1 text-xs text-gray-400 border-t border-gray-100 pt-3">
                {p.standort && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{p.standort}</span>
                  </div>
                )}
                {p.gesamtbudget != null && (
                  <div className="flex items-center gap-1 text-gray-500 font-medium">
                    <Banknote className="w-3 h-3 shrink-0" />
                    {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(p.gesamtbudget)}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
