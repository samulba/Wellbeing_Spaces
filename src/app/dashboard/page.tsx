import { createClient } from '@/lib/supabase/server'

async function getUebersicht() {
  const supabase = await createClient()
  const [
    { count: kundenCount },
    { count: projekteCount },
    { count: partnerCount },
  ] = await Promise.all([
    supabase.from('kunden').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('projekte').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('partner').select('*', { count: 'exact', head: true }).is('deleted_at', null),
  ])
  return { kundenCount, projekteCount, partnerCount }
}

export default async function DashboardPage() {
  const { kundenCount, projekteCount, partnerCount } = await getUebersicht()

  const kacheln = [
    { label: 'Kunden', wert: kundenCount ?? 0, href: '/dashboard/kunden' },
    { label: 'Projekte', wert: projekteCount ?? 0, href: '/dashboard/projekte' },
    { label: 'Partner', wert: partnerCount ?? 0, href: '/dashboard/partner' },
  ]

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-stone-800">Übersicht</h1>
        <p className="text-sm text-stone-400 mt-0.5">WBC Studio – Internes Verwaltungstool</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {kacheln.map((k) => (
          <a
            key={k.label}
            href={k.href}
            className="bg-white border border-stone-100 rounded-xl p-6 hover:border-stone-200 hover:shadow-sm transition-all group"
          >
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-3">
              {k.label}
            </p>
            <p className="text-3xl font-semibold text-stone-800 group-hover:text-stone-600 transition-colors">
              {k.wert}
            </p>
          </a>
        ))}
      </div>

      <div className="bg-white border border-stone-100 rounded-xl p-6">
        <h2 className="text-sm font-medium text-stone-600 mb-4">Schnellzugriff</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { label: '+ Neuer Kunde', href: '/dashboard/kunden/neu' },
            { label: '+ Neues Projekt', href: '/dashboard/projekte/neu' },
            { label: '+ Neuer Partner', href: '/dashboard/partner/neu' },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
