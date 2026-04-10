import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import RaumHinzufuegen from '@/components/RaumHinzufuegen'
import FreigabeLinkKarte from '@/components/FreigabeLinkKarte'
import { raumAnlegen, raumSoftDelete } from '@/app/actions/raeume'
import { projektSoftDelete, projektStatusAendern } from '@/app/actions/projekte'
import { ChevronRight } from 'lucide-react'
import ConfirmDeleteButton from '@/components/ConfirmDeleteButton'
import type { ProjektMitKunde, Raum } from '@/lib/supabase/types'

const statusOptionen = [
  { wert: 'offen',          label: 'Offen',          farbe: 'bg-gray-100 text-gray-600' },
  { wert: 'in_bearbeitung', label: 'In Bearbeitung',  farbe: 'bg-blue-50 text-blue-700' },
  { wert: 'freigegeben',    label: 'Freigegeben',     farbe: 'bg-emerald-50 text-emerald-700' },
  { wert: 'abgeschlossen',  label: 'Abgeschlossen',   farbe: 'bg-gray-100 text-gray-500' },
]

async function getProjekt(id: string): Promise<ProjektMitKunde | null> {
  const supabase = await createClient()
  const { data } = await supabase.from('projekte').select('*, kunden(id, name)').eq('id', id).is('deleted_at', null).single()
  return data as ProjektMitKunde | null
}

async function getRaeume(projektId: string): Promise<Raum[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('raeume').select('*').eq('projekt_id', projektId).is('deleted_at', null).order('reihenfolge').order('created_at')
  return data ?? []
}

async function getAktivenToken(projektId: string) {
  const supabase = await createClient()
  const { data } = await supabase.from('freigabe_tokens').select('id, token').eq('projekt_id', projektId).eq('aktiv', true).maybeSingle()
  return data
}

export default async function ProjektDetailPage({ params }: { params: { id: string } }) {
  const [projekt, raeume, aktiverToken] = await Promise.all([
    getProjekt(params.id),
    getRaeume(params.id),
    getAktivenToken(params.id),
  ])

  if (!projekt) notFound()

  const raumHinzufuegenAktion = raumAnlegen.bind(null, projekt.id)
  const loeschenAktion = projektSoftDelete.bind(null, projekt.id)

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
            <Link href="/dashboard/projekte" className="hover:text-indigo-600 transition-colors">Projekte</Link>
            <ChevronRight className="w-3 h-3" />
            {projekt.kunden && (
              <>
                <Link href={`/dashboard/kunden/${projekt.kunden.id}`} className="hover:text-indigo-600 transition-colors">
                  {projekt.kunden.name}
                </Link>
                <ChevronRight className="w-3 h-3" />
              </>
            )}
            <span className="text-gray-600">{projekt.name}</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">{projekt.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/projekte/${projekt.id}/bearbeiten`}
            className="px-4 py-2 text-xs font-medium text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:scale-[1.02] rounded-lg transition-all duration-200"
          >
            Bearbeiten
          </Link>
          <ConfirmDeleteButton
            action={loeschenAktion}
            confirmMessage={`„${projekt.name}" wirklich löschen?`}
          />
        </div>
      </div>

      {/* Status-Umschalter */}
      <div className="flex items-center gap-2 mb-6">
        {statusOptionen.map((s) => {
          const istAktiv = projekt.status === s.wert
          const statusAendernAktion = projektStatusAendern.bind(null, projekt.id, s.wert as import('@/lib/supabase/types').ProjektStatus)
          return (
            <form key={s.wert} action={statusAendernAktion}>
              <button
                type="submit"
                className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition-all duration-200 hover:scale-[1.02] ${
                  istAktiv
                    ? s.farbe + ' ring-2 ring-offset-1 ring-indigo-200'
                    : 'bg-white text-gray-400 border border-gray-200 hover:border-gray-300'
                }`}
              >
                {s.label}
              </button>
            </form>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Linke Spalte */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Projektdetails</h2>
            <dl className="space-y-3">
              <InfoZeile label="Projektart" wert={projekt.projektart} />
              <InfoZeile label="Standort" wert={projekt.standort} />
              {projekt.gesamtbudget != null && (
                <div>
                  <dt className="text-xs text-gray-500 mb-0.5">Gesamtbudget</dt>
                  <dd className="text-sm font-semibold text-gray-900">
                    {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(projekt.gesamtbudget)}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-gray-500 mb-0.5">Angelegt am</dt>
                <dd className="text-sm text-gray-600">
                  {new Date(projekt.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </dd>
              </div>
            </dl>
          </div>

          {projekt.beschreibung && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Notizen</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{projekt.beschreibung}</p>
            </div>
          )}

          <FreigabeLinkKarte projektId={projekt.id} initialToken={aktiverToken ?? null} />
        </div>

        {/* Rechte Spalte: Räume */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                Räume <span className="text-gray-400 font-normal">({raeume.length})</span>
              </h2>
              <RaumHinzufuegen aktion={raumHinzufuegenAktion} />
            </div>

            {raeume.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-gray-400">Noch keine Räume angelegt.</p>
                <p className="text-xs text-gray-300 mt-1">Über &bdquo;+ Raum hinzufügen&ldquo; erstellen.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {raeume.map((raum) => {
                  const raumLoeschenAktion = raumSoftDelete.bind(null, raum.id, projekt.id)
                  return (
                    <li key={raum.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors group cursor-pointer">
                      <div>
                        <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{raum.name}</p>
                        {raum.beschreibung && (
                          <p className="text-xs text-gray-500 mt-0.5">{raum.beschreibung}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/dashboard/projekte/${projekt.id}/raeume/${raum.id}`}
                          className="text-xs text-gray-400 hover:text-indigo-600 transition-colors font-medium"
                        >
                          Öffnen →
                        </Link>
                        <ConfirmDeleteButton
                          action={raumLoeschenAktion}
                          confirmMessage={`Raum „${raum.name}" löschen?`}
                          className="text-xs text-red-400/60 hover:text-red-500 transition-colors"
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoZeile({ label, wert }: { label: string; wert: string | null }) {
  if (!wert) return null
  return (
    <div>
      <dt className="text-xs text-gray-500 mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-700">{wert}</dd>
    </div>
  )
}
