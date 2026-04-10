import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { kundeSoftDelete } from '@/app/actions/kunden'
import { Plus } from 'lucide-react'
import ConfirmDeleteButton from '@/components/ConfirmDeleteButton'
import type { Projekt } from '@/lib/supabase/types'

const projektStatusLabel: Record<string, string> = {
  offen: 'Offen',
  in_bearbeitung: 'In Bearbeitung',
  freigegeben: 'Freigegeben',
  abgeschlossen: 'Abgeschlossen',
}

const projektStatusFarbe: Record<string, string> = {
  offen:          'bg-gray-100 text-gray-600',
  in_bearbeitung: 'bg-blue-50 text-blue-700',
  freigegeben:    'bg-emerald-50 text-emerald-700',
  abgeschlossen:  'bg-gray-100 text-gray-500',
}

const avatarFarben = [
  'bg-indigo-100 text-indigo-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-violet-100 text-violet-700',
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
]

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}
function avatarFarbe(name: string) {
  return avatarFarben[name.charCodeAt(0) % avatarFarben.length]
}

async function getKunde(id: string) {
  const supabase = await createClient()
  const { data } = await supabase.from('kunden').select('*').eq('id', id).is('deleted_at', null).single()
  return data
}

async function getProjekte(kundeId: string): Promise<Projekt[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('projekte').select('*').eq('kunde_id', kundeId).is('deleted_at', null)
    .order('created_at', { ascending: false })
  return data ?? []
}

export default async function KundeDetailPage({ params }: { params: { id: string } }) {
  const [kunde, projekte] = await Promise.all([getKunde(params.id), getProjekte(params.id)])
  if (!kunde) notFound()

  const loeschenMitId = kundeSoftDelete.bind(null, kunde.id)

  return (
    <div className="px-6 py-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${avatarFarbe(kunde.name)}`}>
            {initials(kunde.name)}
          </div>
          <div>
            <Link href="/dashboard/kunden" className="text-xs text-gray-400 hover:text-indigo-600 transition-colors mb-0.5 inline-block">
              ← Kunden
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">{kunde.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/kunden/${kunde.id}/bearbeiten`}
            className="px-4 py-2 text-xs font-medium text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:scale-[1.02] rounded-lg transition-all duration-200"
          >
            Bearbeiten
          </Link>
          <ConfirmDeleteButton
            action={loeschenMitId}
            confirmMessage={`„${kunde.name}" wirklich löschen?`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stammdaten */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Kontaktdaten</h2>
            <dl className="space-y-3">
              <InfoZeile label="Ansprechpartner" wert={kunde.ansprechpartner} />
              <InfoZeile label="E-Mail" wert={kunde.email} link={kunde.email ? `mailto:${kunde.email}` : undefined} />
              <InfoZeile label="Telefon" wert={kunde.telefon} link={kunde.telefon ? `tel:${kunde.telefon}` : undefined} />
              <InfoZeile label="Adresse" wert={kunde.adresse} />
            </dl>
          </div>
          {kunde.notizen && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Notizen</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{kunde.notizen}</p>
            </div>
          )}
        </div>

        {/* Projekte */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                Projekte <span className="text-gray-400 font-normal">({projekte.length})</span>
              </h2>
              <Link
                href={`/dashboard/projekte/neu?kunde=${kunde.id}`}
                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Neues Projekt
              </Link>
            </div>
            {projekte.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-gray-400">Noch keine Projekte.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {projekte.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/dashboard/projekte/${p.id}`}
                      className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors group"
                    >
                      <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{p.name}</p>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${projektStatusFarbe[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
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

function InfoZeile({ label, wert, link }: { label: string; wert: string | null; link?: string }) {
  if (!wert) return null
  return (
    <div>
      <dt className="text-xs text-gray-500 mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-700">
        {link ? <a href={link} className="hover:text-indigo-600 transition-colors">{wert}</a> : wert}
      </dd>
    </div>
  )
}
