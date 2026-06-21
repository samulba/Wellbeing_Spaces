'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Package, Truck, CheckCircle2, AlertTriangle, Clock,
  ExternalLink, Upload, Trash2, Save, X, Loader2, FileText, Mail,
} from 'lucide-react'
import { lieferantenBestellungMail } from '@/lib/mail-templates'
import {
  bestellungAktualisieren, bestellungAusloesen, bestellungVersandt,
  bestellungGeliefert, bestellungStornieren, bestellungLoeschen,
  bestellungDokumentHochladen, positionEntfernen,
  type BestellungMitDetails,
} from '@/app/actions/lieferanten-bestellungen'

interface Props {
  bestellung: BestellungMitDetails
}

export default function BestellungDetailClient({ bestellung: initial }: Props) {
  const router = useRouter()
  const [b, setB] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  const [erfolg, setErfolg] = useState<string | null>(null)

  // Form-State
  const [bestellNr, setBestellNr] = useState(b.bestellnummer ?? '')
  const [liefertermin, setLiefertermin] = useState(b.liefertermin_geplant ?? '')
  const [trackingUrl, setTrackingUrl] = useState(b.tracking_url ?? '')
  const [lieferschein, setLieferschein] = useState(b.lieferschein_nr ?? '')
  const [versandkosten, setVersandkosten] = useState(b.versandkosten?.toString() ?? '0')
  const [notizen, setNotizen] = useState(b.notizen ?? '')

  function showToast(text: string, fehler?: boolean) {
    if (fehler) { setFehler(text); setTimeout(() => setFehler(null), 4000) }
    else        { setErfolg(text); setTimeout(() => setErfolg(null), 3000) }
  }

  function handleSpeichern() {
    startTransition(async () => {
      const r = await bestellungAktualisieren({
        id: b.id,
        bestellnummer:        bestellNr || null,
        liefertermin_geplant: liefertermin || null,
        tracking_url:         trackingUrl || null,
        lieferschein_nr:      lieferschein || null,
        versandkosten:        Number(versandkosten) || 0,
        notizen:              notizen || null,
      })
      if (r.fehler) showToast(r.fehler, true)
      else { showToast('Gespeichert.'); router.refresh() }
    })
  }

  function handleStatusUebergang(action: 'bestaetigen' | 'versandt' | 'geliefert' | 'stornieren') {
    if (action === 'stornieren' && !confirm('Bestellung wirklich stornieren? Alle Produkte werden auf „Storniert" gesetzt.')) return
    startTransition(async () => {
      const r = action === 'bestaetigen' ? await bestellungAusloesen({ bestellungId: b.id })
              : action === 'versandt'    ? await bestellungVersandt(b.id)
              : action === 'geliefert'   ? await bestellungGeliefert(b.id)
              : await bestellungStornieren(b.id)
      if (r.fehler) showToast(r.fehler, true)
      else { showToast('Status aktualisiert.'); router.refresh() }
    })
  }

  function handleLoeschen() {
    if (!confirm('Bestellung wirklich löschen? Alle Positionen werden entfernt, raum_produkte bleiben aber bestehen.')) return
    startTransition(async () => {
      const r = await bestellungLoeschen(b.id)
      if (r.fehler) showToast(r.fehler, true)
      else router.push('/dashboard/bestellungen')
    })
  }

  function handleEmailAnLieferanten() {
    if (!b.partner) return
    const mail = lieferantenBestellungMail({
      partnerName:     b.partner.name,
      bestellnummer:   b.bestellnummer,
      liefertermin:    b.liefertermin_geplant,
      notizen:         b.notizen,
      positionen: b.positionen.map((p) => ({
        name:             p.raum_produkt?.produkt?.name ?? 'Unbekannt',
        menge:            p.menge,
        einheit:          p.raum_produkt?.produkt?.einheit ?? 'Stk',
        einzelpreisNetto: p.einzelpreis_netto,
      })),
    })
    const empf = b.partner.email ?? ''
    const subject = encodeURIComponent(mail.subject)
    const body    = encodeURIComponent(mail.plainText)
    window.location.href = `mailto:${empf}?subject=${subject}&body=${body}`
  }

  function handlePositionEntfernen(posId: string) {
    if (!confirm('Position aus Bestellung entfernen?')) return
    startTransition(async () => {
      const r = await positionEntfernen(posId)
      if (r.fehler) showToast(r.fehler, true)
      else router.refresh()
    })
  }

  async function handleDokumentUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('datei', file)
    const r = await bestellungDokumentHochladen(b.id, fd)
    setUploading(false)
    if (r.fehler) showToast(r.fehler, true)
    else if (r.url) {
      setB({ ...b, bestellbestaetigung_url: r.url })
      showToast('Bestellbestätigung hochgeladen.')
    }
  }

  // Aktion-Buttons abhaengig vom Status
  const naechsteAktionen: Array<{ label: string; action: 'bestaetigen' | 'versandt' | 'geliefert' | 'stornieren'; primary?: boolean }> = (() => {
    if (b.status === 'entwurf')    return [{ label: 'Bestellung auslösen', action: 'bestaetigen', primary: true }, { label: 'Stornieren', action: 'stornieren' }]
    if (b.status === 'bestaetigt') return [{ label: 'Versandt markieren', action: 'versandt', primary: true }, { label: 'Stornieren', action: 'stornieren' }]
    if (b.status === 'versandt')   return [{ label: 'Geliefert markieren', action: 'geliefert', primary: true }]
    return []
  })()

  return (
    <div className="flex-1 overflow-y-auto animate-fadeIn">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-6 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/dashboard/bestellungen"
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Bestellungen
            </Link>
            <span className="text-gray-300">/</span>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">{b.bestellnummer ?? 'Entwurf'}</div>
              <h1 className="text-lg font-semibold text-gray-900">{b.partner?.name ?? 'Unbekannter Lieferant'}</h1>
            </div>
            <StatusBadge status={b.status} />
          </div>
          <div className="flex items-center gap-2">
            {b.partner && (
              <button
                type="button"
                onClick={handleEmailAnLieferanten}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                title={b.partner.email ? `An ${b.partner.email}` : 'E-Mail-Vorlage in Mail-App öffnen'}
              >
                <Mail className="w-3.5 h-3.5" />
                E-Mail an Lieferant
              </button>
            )}
            {naechsteAktionen.map((a) => (
              <button
                key={a.action}
                type="button"
                onClick={() => handleStatusUebergang(a.action)}
                disabled={pending}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                  a.primary
                    ? 'bg-wellbeing-green hover:bg-wellbeing-green-dark text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {a.label}
              </button>
            ))}
            <button
              type="button"
              onClick={handleLoeschen}
              disabled={pending}
              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              title="Bestellung löschen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-6xl mx-auto space-y-6">
        {/* Toasts */}
        {erfolg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 rounded-lg text-sm">{erfolg}</div>
        )}
        {fehler && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-lg text-sm">{fehler}</div>
        )}

        {/* Daten + Tracking */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-4">Bestelldaten</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bestellnummer">
                <input
                  type="text"
                  value={bestellNr}
                  onChange={(e) => setBestellNr(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-wellbeing-green focus:ring-2 focus:ring-wellbeing-green/20"
                />
              </Field>
              <Field label="Liefertermin">
                <input
                  type="date"
                  value={liefertermin}
                  onChange={(e) => setLiefertermin(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-wellbeing-green focus:ring-2 focus:ring-wellbeing-green/20"
                />
              </Field>
              <Field label="Tracking-URL">
                <input
                  type="url"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-wellbeing-green focus:ring-2 focus:ring-wellbeing-green/20"
                />
              </Field>
              <Field label="Lieferschein-Nr.">
                <input
                  type="text"
                  value={lieferschein}
                  onChange={(e) => setLieferschein(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-wellbeing-green focus:ring-2 focus:ring-wellbeing-green/20"
                />
              </Field>
              <Field label="Versandkosten (€)">
                <input
                  type="number"
                  step="0.01"
                  value={versandkosten}
                  onChange={(e) => setVersandkosten(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-wellbeing-green focus:ring-2 focus:ring-wellbeing-green/20"
                />
              </Field>
              <Field label="Gesamtpreis netto">
                <div className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg font-medium tabular-nums">
                  {b.gesamtpreis_netto.toFixed(2)} €
                </div>
              </Field>
              <div className="col-span-2">
                <Field label="Notizen">
                  <textarea
                    value={notizen}
                    onChange={(e) => setNotizen(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-wellbeing-green focus:ring-2 focus:ring-wellbeing-green/20 resize-none"
                  />
                </Field>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={handleSpeichern}
                disabled={pending}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-wellbeing-green hover:bg-wellbeing-green-dark text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Speichern
              </button>
            </div>
          </div>

          {/* Bestellbestätigung */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-4">Bestellbestätigung</h2>
            {b.bestellbestaetigung_url ? (
              <div className="space-y-2">
                <a
                  href={b.bestellbestaetigung_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FileText className="w-4 h-4 text-wellbeing-green shrink-0" />
                  <span className="text-sm text-gray-700 flex-1 truncate">Dokument öffnen</span>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                </a>
                <label className="block text-xs text-gray-500 cursor-pointer hover:text-wellbeing-green transition-colors">
                  Anderes hochladen…
                  <input type="file" accept="application/pdf,image/*" className="hidden" onChange={handleDokumentUpload} />
                </label>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-2 px-3 py-6 border-2 border-dashed border-gray-300 hover:border-wellbeing-green hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                <Upload className="w-5 h-5 text-gray-400" />
                <span className="text-xs text-gray-500">PDF / Bild hochladen</span>
                <span className="text-[10px] text-gray-400">max 25 MB</span>
                <input type="file" accept="application/pdf,image/*" className="hidden" onChange={handleDokumentUpload} />
              </label>
            )}
            {uploading && <p className="text-xs text-gray-500 mt-2 inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Lade hoch…</p>}
          </div>
        </div>

        {/* Positionen */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Positionen</h2>
              <p className="text-xs text-gray-500">{b.positionen.length} {b.positionen.length === 1 ? 'Eintrag' : 'Einträge'}</p>
            </div>
          </div>
          {b.positionen.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-500 text-center">Noch keine Positionen.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {b.positionen.map((pos) => {
                const rp = pos.raum_produkt
                return (
                  <div key={pos.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-50 border border-gray-200 shrink-0 flex items-center justify-center">
                      {rp?.produkt?.bild_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={rp.produkt.bild_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{rp?.produkt?.name ?? '—'}</div>
                      <div className="text-xs text-gray-500 truncate mt-0.5">
                        {rp?.raum?.projekt_name && `${rp.raum.projekt_name} · `}
                        {rp?.raum?.name}
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 tabular-nums shrink-0 text-right">
                      <div>{pos.menge} {rp?.produkt?.einheit ?? 'Stk'} × {pos.einzelpreis_netto.toFixed(2)} €</div>
                      <div className="text-xs font-medium text-gray-900">{(pos.menge * pos.einzelpreis_netto).toFixed(2)} €</div>
                    </div>
                    {rp?.raum && (
                      <Link
                        href={`/dashboard/projekte/${rp.raum.projekt_id}/raeume/${rp.raum.id}`}
                        className="text-gray-300 hover:text-wellbeing-green transition-colors shrink-0"
                        title="Zum Produkt im Raum"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => handlePositionEntfernen(pos.id)}
                      disabled={pending}
                      className="text-gray-300 hover:text-red-600 transition-colors shrink-0 p-1"
                      title="Position entfernen"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
          {b.versandkosten > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-center text-sm">
              <span className="text-gray-500">Versandkosten</span>
              <span className="text-gray-700 tabular-nums">{b.versandkosten.toFixed(2)} €</span>
            </div>
          )}
          <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-center bg-gray-50">
            <span className="text-sm font-medium text-gray-900">Gesamt netto</span>
            <span className="text-base font-semibold text-gray-900 tabular-nums">{b.gesamtpreis_netto.toFixed(2)} €</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-1">{label}</span>
      {children}
    </label>
  )
}

function StatusBadge({ status }: { status: BestellungMitDetails['status'] }) {
  const cfg: Record<typeof status, { bg: string; text: string; label: string; Icon: React.ComponentType<{ className?: string }> }> = {
    entwurf:    { bg: 'bg-gray-100',    text: 'text-gray-700',     label: 'Entwurf',    Icon: Clock },
    bestaetigt: { bg: 'bg-blue-50',     text: 'text-blue-700',     label: 'Ausgelöst',  Icon: CheckCircle2 },
    versandt:   { bg: 'bg-indigo-50',   text: 'text-indigo-700',   label: 'Versandt',   Icon: Truck },
    geliefert:  { bg: 'bg-emerald-50',  text: 'text-emerald-700',  label: 'Geliefert',  Icon: CheckCircle2 },
    storniert:  { bg: 'bg-rose-50',     text: 'text-rose-700',     label: 'Storniert',  Icon: AlertTriangle },
    teilretour: { bg: 'bg-amber-50',    text: 'text-amber-700',    label: 'Teilretour', Icon: AlertTriangle },
  }
  const c = cfg[status]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${c.bg} ${c.text}`}>
      <c.Icon className="w-3 h-3" />
      {c.label}
    </span>
  )
}
