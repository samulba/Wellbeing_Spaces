'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, LayoutGrid, List, ExternalLink } from 'lucide-react'
import type { Partner } from '@/lib/supabase/types'

const modellBadge: Record<string, string> = {
  Prozent:     'bg-indigo-50 text-indigo-700',
  Fix:         'bg-emerald-50 text-emerald-700',
  Individuell: 'bg-gray-100 text-gray-600',
}

const avatarFarben = [
  'bg-indigo-500', 'bg-violet-500', 'bg-blue-500',
  'bg-emerald-500', 'bg-rose-500', 'bg-amber-500',
]
function avatarFarbe(name: string) { return avatarFarben[name.charCodeAt(0) % avatarFarben.length] }
function initials(name: string) { return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) }

const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)

export default function PartnerGrid({ partner }: { partner: Partner[] }) {
  const [suche,   setSuche]   = useState('')
  const [ansicht, setAnsicht] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    const s = localStorage.getItem('partner-ansicht')
    if (s === 'list' || s === 'grid') setAnsicht(s)
  }, [])

  function toggleAnsicht(neu: 'grid' | 'list') {
    setAnsicht(neu)
    localStorage.setItem('partner-ansicht', neu)
  }

  const gefiltert = suche.trim()
    ? partner.filter((p) =>
        p.name.toLowerCase().includes(suche.toLowerCase()) ||
        p.ansprechpartner?.toLowerCase().includes(suche.toLowerCase())
      )
    : partner

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative w-[340px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input type="text" placeholder="Partner suchen…" value={suche}
            onChange={(e) => setSuche(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition" />
        </div>
        <span className="text-sm text-gray-400">{gefiltert.length} {gefiltert.length === 1 ? 'Eintrag' : 'Einträge'}</span>
        <div className="ml-auto flex items-center border border-gray-200 rounded-lg overflow-hidden">
          <button onClick={() => toggleAnsicht('grid')} title="Kachelansicht"
            className={`px-3 py-2 transition-colors ${ansicht === 'grid' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
            <LayoutGrid className="w-4 h-4" /></button>
          <button onClick={() => toggleAnsicht('list')} title="Listenansicht"
            className={`px-3 py-2 border-l border-gray-200 transition-colors ${ansicht === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
            <List className="w-4 h-4" /></button>
        </div>
      </div>

      {gefiltert.length === 0 && suche && (
        <div className="text-center py-16 text-gray-400 text-sm">Kein Partner gefunden.</div>
      )}

      {/* Grid */}
      {gefiltert.length > 0 && ansicht === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {gefiltert.map((p) => (
            <Link key={p.id} href={`/dashboard/partner/${p.id}`}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-gray-300 hover:-translate-y-0.5 transition-all duration-200 group flex flex-col gap-4 cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3.5 min-w-0">
                  {p.logo_url ? (
                    <div className="w-14 h-14 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shrink-0">
                      <Image src={p.logo_url} alt={p.name} width={56} height={56} className="w-full h-full object-cover" unoptimized />
                    </div>
                  ) : (
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold text-white shrink-0 ${avatarFarbe(p.name)}`}>
                      {initials(p.name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">{p.name}</p>
                    {p.ansprechpartner && <p className="text-xs text-gray-500 truncate mt-0.5">{p.ansprechpartner}</p>}
                  </div>
                </div>
                {p.provisionsmodell && (
                  <span className={`shrink-0 ml-2 text-[10px] px-2 py-0.5 rounded-full font-medium ${modellBadge[p.provisionsmodell] ?? 'bg-gray-100 text-gray-600'}`}>
                    {p.provisionsmodell}
                    {p.provisions_wert != null && p.provisionsmodell === 'Prozent' && ` ${p.provisions_wert}%`}
                    {p.provisions_wert != null && p.provisionsmodell === 'Fix' && ` ${eur(p.provisions_wert)}`}
                  </span>
                )}
              </div>

              {p.einkaufskonditionen && (
                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{p.einkaufskonditionen}</p>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                {p.website ? (
                  <a href={p.website} target="_blank" rel="noopener noreferrer"
                    onClick={(e) => e.preventDefault()}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[140px]">{p.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                  </a>
                ) : <span />}
                <span className="text-xs font-medium text-gray-400 group-hover:text-indigo-600 transition-colors">
                  Öffnen →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Liste */}
      {gefiltert.length > 0 && ansicht === 'list' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className={th + ' text-left'}>Partnername</th>
                <th className={th}>Ansprechpartner</th>
                <th className={th}>Provisionsmodell</th>
                <th className={th + ' text-left'}>Konditionen</th>
                <th className={th}>Website</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {gefiltert.map((p, i) => (
                <tr key={p.id} className={`hover:bg-gray-50 transition-colors group ${i < gefiltert.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {p.logo_url ? (
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 bg-gray-50 shrink-0">
                          <Image src={p.logo_url} alt={p.name} width={32} height={32} className="w-full h-full object-cover" unoptimized />
                        </div>
                      ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 ${avatarFarbe(p.name)}`}>
                          {initials(p.name)}
                        </div>
                      )}
                      <span className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-center text-gray-500">{p.ansprechpartner ?? '–'}</td>
                  <td className="px-5 py-3.5 text-center">
                    {p.provisionsmodell ? (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${modellBadge[p.provisionsmodell] ?? ''}`}>
                        {p.provisionsmodell}
                        {p.provisions_wert != null && p.provisionsmodell === 'Prozent' && ` · ${p.provisions_wert} %`}
                        {p.provisions_wert != null && p.provisionsmodell === 'Fix' && ` · ${eur(p.provisions_wert)}`}
                      </span>
                    ) : <span className="text-gray-300">–</span>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs max-w-xs truncate">
                    {p.einkaufskonditionen
                      ? <span title={p.einkaufskonditionen}>{p.einkaufskonditionen.slice(0, 60)}{p.einkaufskonditionen.length > 60 ? '…' : ''}</span>
                      : '–'}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {p.website ? (
                      <a href={p.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : <span className="text-gray-300">–</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <Link href={`/dashboard/partner/${p.id}`} className="text-xs text-gray-300 group-hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100">Öffnen →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

const th = 'px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-widest'
