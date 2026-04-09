import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Kunde } from '@/lib/supabase/types'

async function getKunden(): Promise<Kunde[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('kunden')
    .select('*')
    .is('deleted_at', null)
    .order('name')
  return data ?? []
}

export default async function KundenPage() {
  const kunden = await getKunden()

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-stone-800">Kunden</h1>
          <p className="text-sm text-stone-400 mt-0.5">{kunden.length} Einträge</p>
        </div>
        <Link
          href="/dashboard/kunden/neu"
          className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Neuer Kunde
        </Link>
      </div>

      {/* Leerzustand */}
      {kunden.length === 0 && (
        <div className="text-center py-16 bg-white border border-stone-100 rounded-xl">
          <p className="text-stone-400 text-sm">Noch keine Kunden angelegt.</p>
          <Link
            href="/dashboard/kunden/neu"
            className="inline-block mt-3 text-sm text-stone-600 underline underline-offset-2"
          >
            Ersten Kunden anlegen
          </Link>
        </div>
      )}

      {/* Tabelle */}
      {kunden.length > 0 && (
        <div className="bg-white border border-stone-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100">
                <th className={thKlasse}>Firmenname</th>
                <th className={thKlasse}>Ansprechpartner</th>
                <th className={thKlasse}>E-Mail</th>
                <th className={thKlasse}>Telefon</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {kunden.map((kunde, i) => (
                <tr
                  key={kunde.id}
                  className={`hover:bg-stone-50 transition-colors ${
                    i < kunden.length - 1 ? 'border-b border-stone-50' : ''
                  }`}
                >
                  <td className="px-5 py-3.5 font-medium text-stone-800">
                    {kunde.name}
                  </td>
                  <td className="px-5 py-3.5 text-stone-500">
                    {kunde.ansprechpartner ?? '–'}
                  </td>
                  <td className="px-5 py-3.5 text-stone-500">
                    {kunde.email ? (
                      <a
                        href={`mailto:${kunde.email}`}
                        className="hover:text-stone-800 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {kunde.email}
                      </a>
                    ) : (
                      '–'
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-stone-500">
                    {kunde.telefon ?? '–'}
                  </td>
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/dashboard/kunden/${kunde.id}`}
                      className="text-xs text-stone-400 hover:text-stone-700 transition-colors"
                    >
                      Öffnen →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const thKlasse =
  'px-5 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wide'
