import type { PartnerKondition, ResolvedPartnerKonditionen } from '@/lib/supabase/types'
import { resolvePartnerKonditionen } from '@/lib/partner-konditionen'
import { Calculator } from 'lucide-react'

const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
const num = (n: number) => (Number.isInteger(n) ? String(n) : String(n).replace('.', ','))

function provText(r: ResolvedPartnerKonditionen): string {
  if (r.provisionTyp === 'fix' && r.provisionFix != null) return `${eur(r.provisionFix)} fix`
  if (r.provisionProzent != null)                          return `${num(r.provisionProzent)} %`
  if (r.staffelHinweis)                                    return 'gestaffelt'
  return '–'
}

function Row({ label, r }: { label: string; r: ResolvedPartnerKonditionen }) {
  return (
    <tr className="border-b border-gray-50 last:border-0">
      <td className="py-2 pr-3 text-gray-700">{label}</td>
      <td className="py-2 pr-3 text-center font-medium text-gray-900">{provText(r)}</td>
      <td className="py-2 pr-3 text-center text-gray-600">{r.einkaufsrabattProzent != null ? `${num(r.einkaufsrabattProzent)} %` : '–'}</td>
      <td className="py-2 pr-3 text-center text-gray-600">{r.zahlungszielTage != null ? `${r.zahlungszielTage} Tage` : '–'}</td>
      <td className="py-2 text-center text-gray-600">
        {r.skontoProzent != null ? `${num(r.skontoProzent)} %${r.skontoTage != null ? ` / ${r.skontoTage} T` : ''}` : '–'}
      </td>
    </tr>
  )
}

/**
 * Read-only Vorschau: zeigt, welche Provision/EK-Rabatt/Zahlungsziel/Skonto der
 * Resolver (src/lib/partner-konditionen.ts) heute auflöst. Standard-Zeile +
 * nur die Kategorien, die davon ABWEICHEN (kategorie_basiert), damit die Tabelle
 * nicht aus identischen Zeilen besteht.
 */
export default function PartnerKonditionenVorschau({
  konditionen,
  kategorien,
}: {
  konditionen: PartnerKondition[]
  kategorien: { name: string }[]
}) {
  if (!konditionen || konditionen.length === 0) return null

  const jetzt = new Date()
  const standard = resolvePartnerKonditionen(konditionen, null, jetzt)
  const abweichend = kategorien
    .map((k) => ({ name: k.name, r: resolvePartnerKonditionen(konditionen, k.name, jetzt) }))
    .filter(({ r }) =>
      r.provisionProzent !== standard.provisionProzent ||
      r.provisionFix !== standard.provisionFix ||
      r.einkaufsrabattProzent !== standard.einkaufsrabattProzent,
    )

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Calculator className="w-4 h-4 text-wellbeing-green" />
        <h3 className="text-sm font-semibold text-gray-900">So wird gerechnet</h3>
      </div>
      <p className="text-xs text-gray-400 mt-1 mb-4">Heute gültige Konditionen, vom System aufgelöst.</p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-medium text-gray-500">
              <th className="py-2 pr-3 text-left">Geltung</th>
              <th className="py-2 pr-3">Provision</th>
              <th className="py-2 pr-3">EK-Rabatt</th>
              <th className="py-2 pr-3">Zahlungsziel</th>
              <th className="py-2">Skonto</th>
            </tr>
          </thead>
          <tbody>
            <Row label="Standard (alle Kategorien)" r={standard} />
            {abweichend.map(({ name, r }) => <Row key={name} label={name} r={r} />)}
          </tbody>
        </table>
      </div>

      {standard.staffelHinweis && (
        <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          {standard.staffelHinweis}
        </p>
      )}
    </div>
  )
}
