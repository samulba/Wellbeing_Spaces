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
      <div className="mb-10">
        <h1 className="text-xl font-semibold text-gray-900">Übersicht</h1>
        <p className="text-sm text-gray-500 mt-1">Willkommen im Studio.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {kacheln.map((k) => (
          <a
            key={k.label}
            href={k.href}
            className="bg-white border border-gray-200 rounded-xl p-6 hover:border-indigo-300 hover:shadow-sm transition-all group"
          >
            <p className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-4">
              {k.label}
            </p>
            <p className="text-4xl font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
              {k.wert}
            </p>
          </a>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-4">Schnellzugriff</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { label: '+ Neuer Kunde', href: '/dashboard/kunden/neu' },
            { label: '+ Neues Projekt', href: '/dashboard/projekte/neu' },
            { label: '+ Neuer Partner', href: '/dashboard/partner/neu' },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-xs px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
