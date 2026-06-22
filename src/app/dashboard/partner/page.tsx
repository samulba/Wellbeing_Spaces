import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import PartnerGrid, { type KonditionInfo } from '@/components/PartnerGrid'
import StickyPageHeader from '@/components/StickyPageHeader'
import type { Partner, PartnerKondition } from '@/lib/supabase/types'
import { resolvePartnerKonditionen } from '@/lib/partner-konditionen'

const eur0 = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
const num = (n: number) => (Number.isInteger(n) ? String(n) : String(n).replace('.', ','))

/** Provision/EK-Rabatt aus der Standard-Kondition (partner_konditionen = SSOT seit S78). */
function konditionAnzeige(kond: PartnerKondition[], jetzt: Date): KonditionInfo {
  if (kond.length === 0) return { provision: null, rabatt: null }
  const r = resolvePartnerKonditionen(kond, '', jetzt)
  let provision: string | null = null
  if (r.provisionTyp === 'fix' && r.provisionFix != null)      provision = `${eur0(r.provisionFix)} fix`
  else if (r.provisionProzent != null)                         provision = `${num(r.provisionProzent)} %`
  else if (r.staffelHinweis)                                   provision = 'gestaffelt'
  else if (kond.some((k) => k.typ === 'kategorie_basiert' && k.aktiv !== false)) provision = 'je Kategorie'
  const rabatt = r.einkaufsrabattProzent != null ? `${num(r.einkaufsrabattProzent)} % EK` : null
  return { provision, rabatt }
}

async function getPartnerMitKonditionen(): Promise<{ partner: Partner[]; konditionInfo: Record<string, KonditionInfo> }> {
  const supabase = await createClient()
  const { data: partnerData } = await supabase.from('partner').select('*').is('deleted_at', null).order('name')
  const partner = partnerData ?? []

  const konditionInfo: Record<string, KonditionInfo> = {}
  if (partner.length > 0) {
    // Konditionen aller Partner in einer Query (org-scoped via RLS). Fail-safe → leere Map.
    const { data: kondData } = await supabase
      .from('partner_konditionen')
      .select('*')
      .in('partner_id', partner.map((p) => p.id))

    const byPartner = new Map<string, PartnerKondition[]>()
    for (const k of (kondData ?? []) as PartnerKondition[]) {
      const arr = byPartner.get(k.partner_id) ?? []
      arr.push(k)
      byPartner.set(k.partner_id, arr)
    }
    const jetzt = new Date()
    for (const p of partner) konditionInfo[p.id] = konditionAnzeige(byPartner.get(p.id) ?? [], jetzt)
  }

  return { partner, konditionInfo }
}

export default async function PartnerPage() {
  const { partner, konditionInfo } = await getPartnerMitKonditionen()

  return (
    <div className="flex-1 overflow-y-auto animate-fadeIn">
      <StickyPageHeader
        title="Partner"
        count={partner.length}
        action={
          <Link
            href="/dashboard/partner/neu"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-wellbeing-green hover:bg-wellbeing-green-dark hover:scale-[1.02] active:scale-[0.98] text-white text-sm font-medium rounded-lg transition-all duration-200"
          >
            <Plus className="w-4 h-4" />Neuer Partner
          </Link>
        }
      />
      <div className="px-6 py-6">
        {partner.length === 0 ? (
          <div className="text-center py-20 bg-white border border-gray-200 rounded-xl shadow-sm">
            <p className="text-gray-500 text-sm">Noch keine Partner angelegt.</p>
            <Link href="/dashboard/partner/neu" className="inline-block mt-3 text-sm text-wellbeing-green underline underline-offset-2">
              Ersten Partner anlegen
            </Link>
          </div>
        ) : (
          <PartnerGrid partner={partner} konditionInfo={konditionInfo} />
        )}
      </div>
    </div>
  )
}
