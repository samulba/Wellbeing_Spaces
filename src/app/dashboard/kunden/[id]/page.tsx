import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { kundeSoftDelete } from '@/app/actions/kunden'
import type { Projekt } from '@/lib/supabase/types'

const projektStatusLabel: Record<string, string> = {
  offen: 'Offen',
  in_bearbeitung: 'In Bearbeitung',
  freigegeben: 'Freigegeben',
  abgeschlossen: 'Abgeschlossen',
}

const projektStatusFarbe: Record<string, string> = {
  offen: 'bg-stone-100 text-stone-500',
  in_bearbeitung: 'bg-blue-50 text-blue-600',
  freigegeben: 'bg-green-50 text-green-600',
  abgeschlossen: 'bg-stone-100 text-stone-400',
}

async function getKunde(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('kunden')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  return data
}

async function getProjekte(kundeId: string): Promise<Projekt[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('projekte')
    .select('*')
    .eq('kunde_id', kundeId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  return data ?? []
}

export default async function KundeDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const [kunde, projekte] = await Promise.all([
    getKunde(params.id),
    getProjekte(params.id),
  ])

  if (!kunde) notFound()

  const loeschenMitId = kundeSoftDelete.bind(null, kunde.id)

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link
            href="/dashboard/kunden"
            className="text-xs text-stone-400 hover:text-stone-700 transition-colors mb-3 inline-block"
          >
            ← Zurück zu Kunden
          </Link>
          <h1 className="text-xl font-semibold text-stone-800">{kunde.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/kunden/${kunde.id}/bearbeiten`}
            className="px-4 py-2 text-sm text-stone-600 border border-stone-200 hover:border-stone-300 hover:bg-stone-50 rounded-lg transition-colors"
          >
            Bearbeiten
          </Link>
          <form action={loeschenMitId}>
            <button
              type="submit"
              className="px-4 py-2 text-sm text-red-400 hover:text-red-600 transition-colors"
              onClick={(e) => {
                if (!confirm(`„${kunde.name}" wirklich löschen?`)) e.preventDefault()
              }}
            >
              Löschen
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stammdaten */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-stone-100 rounded-xl p-5">
            <h2 className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-4">
              Kontaktdaten
            </h2>
            <dl className="space-y-3">
              <InfoZeile label="Ansprechpartner" wert={kunde.ansprechpartner} />
              <InfoZeile label="E-Mail" wert={kunde.email} link={kunde.email ? `mailto:${kunde.email}` : undefined} />
              <InfoZeile label="Telefon" wert={kunde.telefon} link={kunde.telefon ? `tel:${kunde.telefon}` : undefined} />
              <InfoZeile label="Adresse" wert={kunde.adresse} />
            </dl>
          </div>

          {kunde.notizen && (
            <div className="bg-white border border-stone-100 rounded-xl p-5">
              <h2 className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-3">
                Notizen
              </h2>
              <p className="text-sm text-stone-600 whitespace-pre-wrap leading-relaxed">
                {kunde.notizen}
              </p>
            </div>
          )}
        </div>

        {/* Projekte */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-stone-100 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-50">
              <h2 className="text-sm font-medium text-stone-700">
                Projekte{' '}
                <span className="text-stone-400 font-normal">({projekte.length})</span>
              </h2>
              <Link
                href={`/dashboard/projekte/neu?kunde=${kunde.id}`}
                className="text-xs text-stone-500 hover:text-stone-800 transition-colors"
              >
                + Neues Projekt
              </Link>
            </div>

            {projekte.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-stone-400">Noch keine Projekte.</p>
              </div>
            ) : (
              <ul className="divide-y divide-stone-50">
                {projekte.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/dashboard/projekte/${p.id}`}
                      className="flex items-center justify-between px-5 py-4 hover:bg-stone-50 transition-colors group"
                    >
                      <div>
                        <p className="text-sm font-medium text-stone-800 group-hover:text-stone-600">
                          {p.name}
                        </p>
                        {p.beschreibung && (
                          <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">
                            {p.beschreibung}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          projektStatusFarbe[p.status] ?? 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {projektStatusLabel[p.status] ?? p.status}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoZeile({
  label,
  wert,
  link,
}: {
  label: string
  wert: string | null
  link?: string
}) {
  if (!wert) return null
  return (
    <div>
      <dt className="text-xs text-stone-400 mb-0.5">{label}</dt>
      <dd className="text-sm text-stone-700">
        {link ? (
          <a href={link} className="hover:text-stone-900 transition-colors">
            {wert}
          </a>
        ) : (
          wert
        )}
      </dd>
    </div>
  )
}
