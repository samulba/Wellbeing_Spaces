import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { Partner } from '@/lib/supabase/types'

const modellBadge: Record<string, string> = {
  Prozent:     'bg-indigo-50 text-indigo-700',
  Fix:         'bg-emerald-50 text-emerald-700',
  Individuell: 'bg-gray-100 text-gray-600',
}

const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)

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

async function getPartner(): Promise<Partner[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('partner').select('*').is('deleted_at', null).order('name')
  return data ?? []
}

export default async function PartnerPage() {
  const partner = await getPartner()

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Partner</h1>
          <p className="text-sm text-gray-500 mt-0.5">{partner.length} Einträge</p>
        </div>
        <Link
          href="/dashboard/partner/neu"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] text-white text-sm font-medium rounded-lg transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          Neuer Partner
        </Link>
      </div>

      {partner.length === 0 && (
        <div className="text-center py-20 bg-white border border-gray-200 rounded-xl shadow-sm">
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
                  className={`hover:bg-gray-50 cursor-pointer transition-colors group ${i < partner.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${avatarFarbe(p.name)}`}>
                        {initials(p.name)}
                      </div>
                      <span className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">{p.ansprechpartner ?? '–'}</td>
                  <td className="px-5 py-3.5 text-center">
                    {p.provisionsmodell ? (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${modellBadge[p.provisionsmodell] ?? ''}`}>
                        {p.provisionsmodell}
                        {p.provisions_wert != null && p.provisionsmodell === 'Prozent' && ` · ${p.provisions_wert} %`}
                        {p.provisions_wert != null && p.provisionsmodell === 'Fix' && ` · ${eur(p.provisions_wert)}`}
                      </span>
                    ) : <span className="text-gray-300">–</span>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 max-w-xs truncate text-xs">
                    {p.einkaufskonditionen
                      ? <span title={p.einkaufskonditionen}>{p.einkaufskonditionen.slice(0, 60)}{p.einkaufskonditionen.length > 60 ? '…' : ''}</span>
                      : '–'}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {p.website ? (
                      <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-indigo-600 transition-colors">
                        Website ↗
                      </a>
                    ) : <span className="text-gray-300">–</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <Link href={`/dashboard/partner/${p.id}`} className="text-xs text-gray-300 group-hover:text-indigo-600 transition-colors">
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

const th = 'px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest'
