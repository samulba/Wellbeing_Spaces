import { redirect } from 'next/navigation'
import { portalDashboardDaten } from '@/app/actions/portal'
import { brandingFuerToken }    from '@/app/actions/branding'
import { portalLogout }         from '@/app/actions/portal'
import Link from 'next/link'
import Image from 'next/image'
import { FolderOpen, Clock, MessageSquare, CheckCircle2, ChevronRight, LogOut, User } from 'lucide-react'

const STATUS_LABEL: Record<string, string> = {
  offen: 'Offen', in_bearbeitung: 'In Bearbeitung',
  freigegeben: 'Freigegeben', abgeschlossen: 'Abgeschlossen',
}
const STATUS_FARBE: Record<string, string> = {
  offen: 'bg-gray-100 text-gray-600', in_bearbeitung: 'bg-amber-100 text-amber-700',
  freigegeben: 'bg-blue-100 text-blue-700', abgeschlossen: 'bg-emerald-100 text-emerald-700',
}

export default async function PortalDashboardPage() {
  const [daten, branding] = await Promise.all([
    portalDashboardDaten().catch(() => null),
    brandingFuerToken(),
  ])

  if (!daten) redirect('/portal/login')

  const { session, projekte, aktivitaeten, ungelesenNachrichten } = daten
  const firma = branding?.firmenname    ?? 'Wellbeing Spaces'
  const prim  = branding?.primary_color ?? '#445c49'

  const offeneFreigaben = projekte.reduce((s, p) => s + p.stats.ausstehend, 0)

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding?.logo_url ? (
              <Image src={branding.logo_url} alt={firma} width={80} height={28} className="h-7 w-auto object-contain" />
            ) : (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: prim }}>
                {firma[0]}
              </div>
            )}
            <span className="text-sm font-semibold text-gray-700 hidden sm:block">{firma}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/portal/profil"
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition">
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:block">{session.vorname}</span>
            </Link>
            <form action={portalLogout}>
              <button type="submit" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition">
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:block">Abmelden</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Begrüßung */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Willkommen, {session.vorname}!
          </h1>
          <p className="text-sm text-gray-500 mt-1">Hier ist Ihr persönlicher Projektüberblick.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <FolderOpen className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">Projekte</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{projekte.length}</p>
          </div>
          <div className={`bg-white border rounded-2xl p-4 shadow-sm ${offeneFreigaben > 0 ? 'border-amber-200 bg-amber-50/50' : 'border-gray-100'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Clock className={`w-4 h-4 ${offeneFreigaben > 0 ? 'text-amber-500' : 'text-gray-400'}`} />
              <span className="text-xs text-gray-500">Offene Freigaben</span>
            </div>
            <p className={`text-2xl font-bold ${offeneFreigaben > 0 ? 'text-amber-600' : 'text-gray-900'}`}>{offeneFreigaben}</p>
          </div>
          <div className={`bg-white border rounded-2xl p-4 shadow-sm col-span-2 sm:col-span-1 ${ungelesenNachrichten > 0 ? 'border-blue-200 bg-blue-50/50' : 'border-gray-100'}`}>
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className={`w-4 h-4 ${ungelesenNachrichten > 0 ? 'text-blue-500' : 'text-gray-400'}`} />
              <span className="text-xs text-gray-500">Neue Nachrichten</span>
            </div>
            <p className={`text-2xl font-bold ${ungelesenNachrichten > 0 ? 'text-blue-600' : 'text-gray-900'}`}>{ungelesenNachrichten}</p>
          </div>
        </div>

        {/* Hinweis offene Freigaben */}
        {offeneFreigaben > 0 && (
          <div className="mb-6 p-4 rounded-2xl border flex items-center gap-3" style={{ background: prim + '10', borderColor: prim + '30' }}>
            <Clock className="w-5 h-5 shrink-0" style={{ color: prim }} />
            <p className="text-sm" style={{ color: prim }}>
              <strong>{offeneFreigaben} Produkt{offeneFreigaben !== 1 ? 'e' : ''}</strong> warten auf Ihre Freigabe.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Projekte */}
          <div className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Meine Projekte</h2>
            {projekte.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-sm">
                <FolderOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Noch keine Projekte.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {projekte.map((p) => {
                  const pct = p.stats.gesamt > 0
                    ? Math.round((p.stats.freigegeben / p.stats.gesamt) * 100) : 0
                  return (
                    <Link key={p.id} href={`/portal/projekte/${p.id}`}
                      className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-gray-200 transition-all group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-gray-700">
                            {p.name}
                          </p>
                          <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_FARBE[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {STATUS_LABEL[p.status] ?? p.status}
                          </span>
                        </div>
                        {p.stats.gesamt > 0 && (
                          <div>
                            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                              <span>Freigaben</span>
                              <span>{p.stats.freigegeben}/{p.stats.gesamt}</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: prim }} />
                            </div>
                          </div>
                        )}
                        {p.stats.ausstehend > 0 && (
                          <p className="text-xs text-amber-600 mt-1.5 font-medium">
                            {p.stats.ausstehend} Freigabe{p.stats.ausstehend !== 1 ? 'n' : ''} ausstehend
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 ml-3 group-hover:text-gray-500 transition-colors" />
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Aktivitäts-Feed */}
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Letzte Aktivitäten</h2>
            {aktivitaeten.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center shadow-sm">
                <p className="text-xs text-gray-400">Noch keine Aktivitäten.</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm divide-y divide-gray-50">
                {aktivitaeten.map((a) => (
                  <div key={a.id} className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-gray-300 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-700 leading-snug">{a.titel}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {new Date(a.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
