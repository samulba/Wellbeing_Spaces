import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Partner } from '@/lib/supabase/types'

const modellBadge: Record<string, string> = {
  Prozent:      'bg-blue-50 text-blue-600',
  Fix:          'bg-purple-50 text-purple-600',
  Individuell:  'bg-amber-50 text-amber-600',
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
          <h1 className="text-xl font-semibold text-stone-800">Partner</h1>
          <p className="text-sm text-stone-400 mt-0.5">{partner.length} Einträge</p>
        </div>
        <Link
          href="/dashboard/partner/neu"
          className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Neuer Partner
        </Link>
      </div>

      {partner.length === 0 && (
        <div className="text-center py-16 bg-white border border-stone-100 rounded-xl">
          <p className="text-stone-400 text-sm">Noch keine Partner angelegt.</p>
          <Link href="/dashboard/partner/neu" className="inline-block mt-3 text-sm text-stone-600 underline underline-offset-2">
            Ersten Partner anlegen
          </Link>
        </div>
      )}

      {partner.length > 0 && (
        <div className="bg-white border border-stone-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100">
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
                  className={`hover:bg-stone-50 transition-colors ${i < partner.length - 1 ? 'border-b border-stone-50' : ''}`}
                >
                  <td className="px-5 py-3.5 font-medium text-stone-800">{p.name}</td>
                  <td className="px-5 py-3.5 text-stone-500">{p.ansprechpartner ?? '–'}</td>
                  <td className="px-5 py-3.5 text-center">
                    {p.provisionsmodell ? (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${modellBadge[p.provisionsmodell] ?? ''}`}>
                        {p.provisionsmodell}
                        {p.provisions_wert != null && p.provisionsmodell === 'Prozent' && ` · ${p.provisions_wert} %`}
                        {p.provisions_wert != null && p.provisionsmodell === 'Fix' && ` · ${eur(p.provisions_wert)}`}
                      </span>
                    ) : (
                      <span className="text-stone-300">–</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-stone-400 max-w-xs truncate text-xs">
                    {p.einkaufskonditionen ? (
                      <span title={p.einkaufskonditionen}>{p.einkaufskonditionen.slice(0, 60)}{p.einkaufskonditionen.length > 60 ? '…' : ''}</span>
                    ) : '–'}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {p.website ? (
                      <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-xs text-stone-400 hover:text-stone-700 transition-colors">
                        Website ↗
                      </a>
                    ) : <span className="text-stone-300">–</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <Link href={`/dashboard/partner/${p.id}`} className="text-xs text-stone-400 hover:text-stone-700 transition-colors">
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

const th = 'px-5 py-3 text-xs font-medium text-stone-400 uppercase tracking-wide'
