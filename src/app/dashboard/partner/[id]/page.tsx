import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { partnerSoftDelete } from '@/app/actions/partner'
import ConfirmDeleteButton from '@/components/ConfirmDeleteButton'
import NotizBlock, { type Notiz } from '@/components/NotizBlock'
import LogoUpload from '@/components/LogoUpload'
import { ExternalLink, Mail, Phone, Globe } from 'lucide-react'

type ProduktMitRaum = {
  id: string; name: string; menge: number; einheit: string
  verkaufspreis: number | null
  raeume: { id: string; name: string; projekte: { id: string; name: string } | null } | null
  produktstatus: { status: string } | null
}

const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)

const modellBadge: Record<string, string> = {
  Prozent:     'bg-indigo-50 text-indigo-700',
  Fix:         'bg-emerald-50 text-emerald-700',
  Individuell: 'bg-gray-100 text-gray-600',
}
const statusBadge: Record<string, string> = {
  ausstehend:     'bg-gray-100 text-gray-500',
  freigegeben:    'bg-emerald-50 text-emerald-700',
  abgelehnt:      'bg-red-50 text-red-600',
  ueberarbeitung: 'bg-amber-50 text-amber-700',
}
const statusLabel: Record<string, string> = {
  ausstehend: 'Ausstehend', freigegeben: 'Freigegeben',
  abgelehnt: 'Abgelehnt', ueberarbeitung: 'Überarbeitung',
}


async function getPartnerNotizen(partnerId: string): Promise<Notiz[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('notizen')
    .select('id, inhalt, erstellt_von, erstellt_am, bearbeitet_am')
    .eq('typ', 'partner')
    .eq('referenz_id', partnerId)
    .is('deleted_at', null)
    .order('erstellt_am', { ascending: false })
  return (data ?? []) as Notiz[]
}

export default async function PartnerDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const [{ data: partner }, { data: produkte }, notizen] = await Promise.all([
    supabase.from('partner').select('*').eq('id', params.id).is('deleted_at', null).single(),
    supabase
      .from('produkte')
      .select('id, name, menge, einheit, verkaufspreis, produktstatus(status), raeume!inner(id, name, projekte!inner(id, name))')
      .eq('partner_id', params.id).is('deleted_at', null)
      .order('created_at', { ascending: false }),
    getPartnerNotizen(params.id),
  ])

  if (!partner) notFound()

  const loeschenAktion = partnerSoftDelete.bind(null, partner.id)
  const gesamtUmsatz   = (produkte ?? []).reduce((s, p) => s + (p.verkaufspreis ?? 0) * p.menge, 0)
  const produktListe   = (produkte ?? []) as unknown as ProduktMitRaum[]

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-5">
          <LogoUpload typ="partner" entityId={partner.id} initialLogoUrl={partner.logo_url} name={partner.name} />
          <div>
            <Link href="/dashboard/partner" className="text-xs text-gray-400 hover:text-indigo-600 transition-colors mb-1 inline-block">
              ← Partner
            </Link>
            <h1 className="font-syne text-2xl font-bold text-gray-900 leading-tight">{partner.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              {partner.website && (
                <a href={partner.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-indigo-600 transition-colors">
                  <Globe className="w-3.5 h-3.5" />
                  {partner.website.replace(/^https?:\/\/(www\.)?/, '')}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {partner.provisionsmodell && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${modellBadge[partner.provisionsmodell] ?? 'bg-gray-100 text-gray-600'}`}>
                  {partner.provisionsmodell}
                  {partner.provisions_wert != null && partner.provisionsmodell === 'Prozent' && ` · ${partner.provisions_wert} %`}
                  {partner.provisions_wert != null && partner.provisionsmodell === 'Fix' && ` · ${eur(partner.provisions_wert)}`}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/partner/${partner.id}/bearbeiten`}
            className="px-4 py-2 text-xs font-medium text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:scale-[1.02] rounded-lg transition-all duration-200">
            Bearbeiten
          </Link>
          <ConfirmDeleteButton action={loeschenAktion} confirmMessage={`„${partner.name}" wirklich löschen?`} />
        </div>
      </div>

      {/* 3 Info-Kacheln */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-medium mb-1">Provisionsmodell</p>
          <p className="text-lg font-semibold text-gray-900">{partner.provisionsmodell ?? '–'}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-medium mb-1">Provisionssatz</p>
          <p className="text-lg font-semibold text-gray-900 font-mono">
            {partner.provisions_wert != null
              ? partner.provisionsmodell === 'Prozent'
                ? `${partner.provisions_wert} %`
                : eur(partner.provisions_wert)
              : '–'}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-medium mb-1">Gesamtumsatz (VP netto)</p>
          <p className="text-lg font-semibold text-indigo-600 font-mono">{gesamtUmsatz > 0 ? eur(gesamtUmsatz) : '–'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Linke Spalte */}
        <div className="space-y-4">
          {/* Kontakt */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Kontakt</h2>
            <dl className="space-y-3">
              {partner.ansprechpartner && (
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5">Ansprechpartner</dt>
                  <dd className="text-sm text-gray-800 font-medium">{partner.ansprechpartner}</dd>
                </div>
              )}
              {partner.email && (
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5">E-Mail</dt>
                  <dd>
                    <a href={`mailto:${partner.email}`} className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-indigo-600 transition-colors">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />{partner.email}
                    </a>
                  </dd>
                </div>
              )}
              {partner.telefon && (
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5">Telefon</dt>
                  <dd>
                    <a href={`tel:${partner.telefon}`} className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-indigo-600 transition-colors">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />{partner.telefon}
                    </a>
                  </dd>
                </div>
              )}
              {partner.website && (
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5">Website</dt>
                  <dd>
                    <a href={partner.website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-indigo-600 transition-colors">
                      <Globe className="w-3.5 h-3.5 text-gray-400" />
                      {partner.website.replace(/^https?:\/\/(www\.)?/, '')}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </dd>
                </div>
              )}
              {!partner.ansprechpartner && !partner.email && !partner.telefon && (
                <p className="text-sm text-gray-400">Keine Kontaktdaten hinterlegt.</p>
              )}
            </dl>
          </div>

          {/* Einkaufskonditionen */}
          {partner.einkaufskonditionen && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Einkaufskonditionen</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{partner.einkaufskonditionen}</p>
            </div>
          )}

          {/* Alte Notizen (Freitextfeld) */}
          {partner.notizen && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Notizen (alt)</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{partner.notizen}</p>
            </div>
          )}

          <NotizBlock typ="partner" referenzId={partner.id} initialNotizen={notizen} />
        </div>

        {/* Produkte-Tabelle */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                Zugeordnete Produkte <span className="text-gray-400 font-normal">({produktListe.length})</span>
              </h2>
              {gesamtUmsatz > 0 && (
                <span className="text-xs text-gray-500 font-mono">Gesamt: <span className="text-indigo-600 font-semibold">{eur(gesamtUmsatz)}</span></span>
              )}
            </div>

            {produktListe.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-gray-400">Noch keine Produkte diesem Partner zugeordnet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className={th + ' text-left'}>Produkt</th>
                      <th className={th + ' text-left'}>Projekt → Raum</th>
                      <th className={th}>Menge</th>
                      <th className={th}>VP netto</th>
                      <th className={th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produktListe.map((p, i) => {
                      const status = (p.produktstatus as { status: string } | null)?.status ?? 'ausstehend'
                      return (
                        <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${i < produktListe.length - 1 ? 'border-b border-gray-100' : ''}`}>
                          <td className="px-4 py-3.5 font-medium text-gray-900">{p.name}</td>
                          <td className="px-4 py-3.5 text-xs text-gray-500">
                            {p.raeume?.projekte && (
                              <Link href={`/dashboard/projekte/${p.raeume.projekte.id}`}
                                className="hover:text-indigo-600 transition-colors">
                                {p.raeume.projekte.name}
                              </Link>
                            )}
                            {p.raeume && <span className="text-gray-400"> › {p.raeume.name}</span>}
                          </td>
                          <td className="px-4 py-3.5 text-center text-gray-600">{p.menge} {p.einheit}</td>
                          <td className="px-4 py-3.5 text-center font-mono text-gray-700">{p.verkaufspreis != null ? eur(p.verkaufspreis) : '–'}</td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusBadge[status] ?? 'bg-gray-100 text-gray-500'}`}>
                              {statusLabel[status] ?? status}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const th = 'px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-widest'
