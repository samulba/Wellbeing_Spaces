'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

interface Props {
  kategorien: string[]
}

const STATUS_OPTIONEN = [
  { wert: 'ausstehend',     label: 'Ausstehend'    },
  { wert: 'freigegeben',    label: 'Freigegeben'   },
  { wert: 'abgelehnt',      label: 'Abgelehnt'     },
  { wert: 'ueberarbeitung', label: 'Überarbeitung' },
]

const SORT_OPTIONEN = [
  { wert: 'name_asc',   label: 'Name A → Z'  },
  { wert: 'name_desc',  label: 'Name Z → A'  },
  { wert: 'preis_asc',  label: 'Preis ↑'     },
  { wert: 'preis_desc', label: 'Preis ↓'     },
  { wert: 'status',     label: 'Status'      },
]

export default function FilterBar({ kategorien }: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const params   = useSearchParams()

  const setParam = useCallback((key: string, value: string) => {
    const p = new URLSearchParams(params.toString())
    if (value) p.set(key, value)
    else p.delete(key)
    router.replace(`${pathname}?${p.toString()}`, { scroll: false })
  }, [router, pathname, params])

  const reset = useCallback(() => {
    router.replace(pathname, { scroll: false })
  }, [router, pathname])

  const kategorie = params.get('kategorie') ?? ''
  const status    = params.get('status')    ?? ''
  const sort      = params.get('sort')      ?? ''
  const hatFilter = kategorie || status || sort

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Kategorie */}
      <select
        value={kategorie}
        onChange={(e) => setParam('kategorie', e.target.value)}
        className={sel}
      >
        <option value="">Alle Kategorien</option>
        {kategorien.map((k) => (
          <option key={k} value={k}>{k}</option>
        ))}
      </select>

      {/* Status */}
      <select
        value={status}
        onChange={(e) => setParam('status', e.target.value)}
        className={sel}
      >
        <option value="">Alle Status</option>
        {STATUS_OPTIONEN.map((s) => (
          <option key={s.wert} value={s.wert}>{s.label}</option>
        ))}
      </select>

      {/* Sortierung */}
      <select
        value={sort}
        onChange={(e) => setParam('sort', e.target.value)}
        className={sel}
      >
        <option value="">Sortierung</option>
        {SORT_OPTIONEN.map((s) => (
          <option key={s.wert} value={s.wert}>{s.label}</option>
        ))}
      </select>

      {hatFilter && (
        <button
          onClick={reset}
          className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 hover:border-gray-300 px-2.5 py-1.5 rounded-lg transition-all hover:bg-gray-50"
        >
          ✕ Filter zurücksetzen
        </button>
      )}
    </div>
  )
}

const sel = 'px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition cursor-pointer'
