import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import type { RaumBudgetDetail } from '@/app/actions/raeume'

const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

function ampel(prozent: number): { farbe: string; text: string } {
  if (prozent >= 100) return { farbe: '#ef4444', text: 'text-red-600' }
  if (prozent >= 80)  return { farbe: '#f59e0b', text: 'text-amber-600' }
  return { farbe: '#445c49', text: 'text-wellbeing-green' }
}

function MiniDonut({ prozent, farbe }: { prozent: number; farbe: string }) {
  const clamped = Math.min(100, Math.max(0, prozent))
  const R = 28
  const C = 2 * Math.PI * R
  const dash = (clamped / 100) * C
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0">
      <circle cx="32" cy="32" r={R} fill="none" stroke="#e5e7eb" strokeWidth="5" />
      <circle
        cx="32" cy="32" r={R}
        fill="none"
        stroke={farbe}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${C - dash}`}
        strokeDashoffset={C / 4}
        transform="rotate(-90 32 32)"
        style={{ transition: 'stroke-dasharray 0.4s ease' }}
      />
      <text
        x="32" y="36"
        textAnchor="middle"
        className="font-syne font-bold"
        fontSize="14"
        fill={farbe}
      >
        {Math.round(clamped)}%
      </text>
    </svg>
  )
}

function RaumBudgetCard({
  detail,
  projektId,
}: {
  detail: RaumBudgetDetail
  projektId: string
}) {
  const prozent = detail.budget && detail.budget > 0
    ? (detail.verbraucht / detail.budget) * 100
    : 0
  const farbton = ampel(prozent)
  const ueberzogen = detail.budget != null && detail.verbraucht > detail.budget

  return (
    <Link
      href={`/dashboard/projekte/${projektId}/raeume/${detail.raumId}`}
      className="group block bg-white border border-gray-200 rounded-xl p-4 hover:border-wellbeing-green/40 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-3 mb-3">
        {detail.budget != null && detail.budget > 0 ? (
          <MiniDonut prozent={prozent} farbe={farbton.farbe} />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
            <span className="text-[10px] text-gray-400 text-center leading-tight">Kein<br/>Budget</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 text-sm truncate group-hover:text-wellbeing-green transition-colors">
            {detail.name}
          </p>
          {detail.budget != null && detail.budget > 0 ? (
            <p className={`text-[12px] mt-0.5 ${farbton.text} font-medium tabular-nums`}>
              {eur(detail.verbraucht)} <span className="text-gray-400 font-normal">von {eur(detail.budget)}</span>
            </p>
          ) : (
            <p className="text-[12px] mt-0.5 text-gray-500 tabular-nums">
              {eur(detail.verbraucht)} verbraucht
            </p>
          )}
          {ueberzogen && (
            <p className="flex items-center gap-1 text-[11px] text-red-600 mt-0.5">
              <AlertTriangle className="w-3 h-3" />
              überzogen um {eur(detail.verbraucht - (detail.budget ?? 0))}
            </p>
          )}
        </div>
      </div>

      {detail.top3Kategorien.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-gray-100">
          {detail.top3Kategorien.map((k) => (
            <div key={k.kategorie} className="flex items-center gap-2 text-[11px]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-gray-600 truncate">{k.kategorie}</span>
                  <span className="text-gray-500 font-mono tabular-nums shrink-0 ml-2">{eur(k.betrag)}</span>
                </div>
                <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-wellbeing-green-light"
                    style={{ width: `${Math.round(k.anteil * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {detail.verbraucht === 0 && (
        <p className="text-[11px] text-gray-400 pt-2 border-t border-gray-100 italic">
          Noch keine Produkte im Raum
        </p>
      )}
    </Link>
  )
}

export default function RaumBudgetGrid({
  details,
  projektId,
}: {
  details: RaumBudgetDetail[]
  projektId: string
}) {
  if (details.length === 0) return null
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {details.map((d) => (
        <RaumBudgetCard key={d.raumId} detail={d} projektId={projektId} />
      ))}
    </div>
  )
}
