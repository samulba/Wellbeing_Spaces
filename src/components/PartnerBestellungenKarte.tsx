import Link from 'next/link'
import { Package, ChevronRight } from 'lucide-react'

export type PartnerBestellungZeile = {
  id: string
  bestellnummer: string | null
  status: string
  datum: string | null
  liefertermin: string | null
  summe: number
}

const STATUS: Record<string, { label: string; cls: string }> = {
  entwurf:    { label: 'Entwurf',     cls: 'bg-gray-100 text-gray-700' },
  bestaetigt: { label: 'Ausgelöst',   cls: 'bg-blue-50 text-blue-700' },
  versandt:   { label: 'Versandt',    cls: 'bg-indigo-50 text-indigo-700' },
  geliefert:  { label: 'Geliefert',   cls: 'bg-emerald-50 text-emerald-700' },
  storniert:  { label: 'Storniert',   cls: 'bg-rose-50 text-rose-700' },
  teilretour: { label: 'Teilretoure', cls: 'bg-amber-50 text-amber-700' },
}

const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
const datum = (d: string) => new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })

/** Bestellungen (lieferanten_bestellungen) bei diesem Partner — read-only, verlinkt ins Detail. */
export default function PartnerBestellungenKarte({ bestellungen }: { bestellungen: PartnerBestellungZeile[] }) {
  if (bestellungen.length === 0) return null

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5" /> Bestellungen
        </h2>
        <span className="text-[11px] text-gray-400">{bestellungen.length}</span>
      </div>
      <ul className="divide-y divide-gray-100">
        {bestellungen.map((b) => {
          const s = STATUS[b.status] ?? { label: b.status, cls: 'bg-gray-100 text-gray-700' }
          return (
            <li key={b.id}>
              <Link href={`/dashboard/bestellungen/${b.id}`} className="flex items-center gap-3 py-2.5 group">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800 group-hover:text-wellbeing-green transition-colors truncate">
                      {b.bestellnummer ?? 'Bestellung'}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${s.cls}`}>{s.label}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {b.datum ? datum(b.datum) : '—'}
                    {b.liefertermin && <> · Liefertermin {datum(b.liefertermin)}</>}
                  </p>
                </div>
                <span className="text-sm font-mono text-gray-700 shrink-0">{eur(b.summe)}</span>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-wellbeing-green shrink-0" />
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
