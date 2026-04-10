import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Partner } from '@/lib/supabase/types'

const modellBadge: Record<string, string> = {
  Prozent:     'bg-indigo-50 text-indigo-700',
  Fix:         'bg-emerald-50 text-emerald-700',
  Individuell: 'bg-gray-100 text-gray-600',
}

const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)

async function getPartner(): Promise<Partner[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('partner')
    .select('*')
    .is('deleted_at', null)
    .order('name')
  return data ?? []
}

export default async function PartnerPage() {
  const partner = await getPartner()

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Partner</h1>
          <p className="text-sm text-gray-500 mt-0.5">{partner.length} Einträge</p>
        </div>
        <Link
          href="/dashboard/partner/neu"
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Neuer Partner
        </Link>
      </div>

      {partner.length === 0 && (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl shadow-sm">
          <p className="text-gray-500 text-sm">Noch keine Partner angelegt.</p>
          <Link href="/dashboard/partner/neu" className="inline-block mt-3 text-sm text-indigo-600 underline underline-offset-2">
            Ersten Partner anlegen
          </Link>
        </div>
      )}

      {partner.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className={th + ' text-left'}>Partnername</th>
                <th className={th}>Ansprechpartner</th>
                <th className={th}>Provisionsmodell</th>
                <th className={th}>Konditionen</th>
                <th className={th}>Website</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {partner.map((p, i) => (
                <tr
                  key={p.id}
                  className={`hover:bg-gray-50 transition-colors ${i < partner.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <td className="px-5 py-3.5 font-medium text-gray-900">{p.name}</td>
                  <td className="px-5 py-3.5 text-gray-500">{p.ansprechpartner ?? '–'}</td>
                  <td className="px-5 py-3.5 text-center">
                    {p.provisionsmodell ? (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${modellBadge[p.provisionsmodell] ?? ''}`}>
                        {p.provisionsmodell}
                        {p.provisions_wert != null && p.provisionsmodell === 'Prozent' && ` · ${p.provisions_wert} %`}
                        {p.provisions_wert != null && p.provisionsmodell === 'Fix' && ` · ${eur(p.provisions_wert)}`}
                      </span>
                    ) : (
                      <span className="text-gray-300">–</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 max-w-xs truncate text-xs">
                    {p.einkaufskonditionen ? (
                      <span title={p.einkaufskonditionen}>{p.einkaufskonditionen.slice(0, 60)}{p.einkaufskonditionen.length > 60 ? '…' : ''}</span>
                    ) : '–'}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {p.website ? (
                      <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-indigo-600 transition-colors">
                        Website ↗
                      </a>
                    ) : <span className="text-gray-300">–</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <Link href={`/dashboard/partner/${p.id}`} className="text-xs text-gray-400 hover:text-indigo-600 transition-colors">
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

const th = 'px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-widest'
