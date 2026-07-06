'use client'

import { useEffect, useMemo, useState } from 'react'
import { FileText, X, Download, Layers, Handshake, Coins } from 'lucide-react'
import { useModal } from '@/lib/hooks/useModal'

interface Option { id: string; name: string }

interface Props {
  raumId: string
  /** Gruppen (produkt_bereiche), die im Raum tatsächlich vorkommen. */
  gruppen: Option[]
  hatOhneGruppe: boolean
  /** Partner, deren Produkte im Raum liegen. */
  partner: Option[]
  hatOhnePartner: boolean
}

/**
 * „PDF"-Export der Raum-Produktübersicht mit Auswahl + Live-Vorschau:
 * Gruppen und Partner/Lieferant filterbar, Preis-Spalten (EK netto / Kundenpreis
 * brutto) optional. Ohne Häkchen bleibt die PDF Lieferanten-sicher ohne Preise.
 * Use-Case: nur einen Lieferanten (z. B. Paulmann) mit Art.-Nr. + EK netto exportieren.
 */
export default function RaumPdfExportModal({ raumId, gruppen, hatOhneGruppe, partner, hatOhnePartner }: Props) {
  const [offen, setOffen] = useState(false)
  const modalRef = useModal(offen, () => setOffen(false))

  // Auswahl-State — initial ALLES angehakt (Standard-PDF wie bisher).
  const alleGruppenIds  = useMemo(() => [...gruppen.map((g) => g.id), ...(hatOhneGruppe ? ['ohne'] : [])], [gruppen, hatOhneGruppe])
  const allePartnerIds  = useMemo(() => [...partner.map((p) => p.id), ...(hatOhnePartner ? ['ohne'] : [])], [partner, hatOhnePartner])
  const [gewGruppen, setGewGruppen] = useState<Set<string>>(() => new Set(alleGruppenIds))
  const [gewPartner, setGewPartner] = useState<Set<string>>(() => new Set(allePartnerIds))
  const [zeigeEk, setZeigeEk] = useState(false)
  const [zeigeVk, setZeigeVk] = useState(false)

  // Sektionen nur zeigen, wenn es wirklich etwas auszuwählen gibt (nur „Ohne …"
  // als einzige Option wäre sinnlos → Sektion weg = kein Filter = alles drin).
  const zeigeGruppenWahl = gruppen.length > 0
  const zeigePartnerWahl = partner.length > 0

  const toggle = (set: Set<string>, id: string, apply: (n: Set<string>) => void) => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id); else next.add(id)
    apply(next)
  }

  const auswahlLeer =
    (zeigeGruppenWahl && gewGruppen.size === 0) ||
    (zeigePartnerWahl && gewPartner.size === 0)

  // Download-URL: Parameter nur setzen, wenn eine echte Teilmenge gewählt ist.
  const downloadUrl = useMemo(() => {
    const p = new URLSearchParams()
    if (zeigeGruppenWahl && gewGruppen.size < alleGruppenIds.length) p.set('gruppen', Array.from(gewGruppen).join(','))
    if (zeigePartnerWahl && gewPartner.size < allePartnerIds.length) p.set('partner', Array.from(gewPartner).join(','))
    if (zeigeEk) p.set('ek', '1')
    if (zeigeVk) p.set('vk', '1')
    const qs = p.toString()
    return `/api/raeume/${raumId}/pdf${qs ? `?${qs}` : ''}`
  }, [raumId, gewGruppen, gewPartner, zeigeEk, zeigeVk, alleGruppenIds, allePartnerIds, zeigeGruppenWahl, zeigePartnerWahl])

  // Live-Vorschau (debounced), damit nicht jeder Klick sofort ein PDF rendert.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!offen) return
    if (auswahlLeer) { setPreviewUrl(null); return }
    const t = window.setTimeout(() => {
      setPreviewUrl(`${downloadUrl}${downloadUrl.includes('?') ? '&' : '?'}inline=1`)
    }, 500)
    return () => window.clearTimeout(t)
  }, [offen, downloadUrl, auswahlLeer])

  const CheckZeile = ({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) => (
    <label className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-gray-50 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="w-4 h-4 rounded border-gray-300 text-wellbeing-green focus:ring-wellbeing-green/30"
      />
      <span className="text-sm text-gray-700 min-w-0 truncate">{label}</span>
    </label>
  )

  const AlleToggle = ({ alle, keine, onAlle, onKeine }: { alle: boolean; keine: boolean; onAlle: () => void; onKeine: () => void }) => (
    <span className="text-[11px] text-gray-400">
      <button type="button" onClick={onAlle} disabled={alle} className="hover:text-wellbeing-green disabled:opacity-40 disabled:hover:text-gray-400">Alle</button>
      {' · '}
      <button type="button" onClick={onKeine} disabled={keine} className="hover:text-wellbeing-green disabled:opacity-40 disabled:hover:text-gray-400">Keine</button>
    </span>
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setOffen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
        title="Produkt-Übersicht als PDF — Auswahl, Vorschau, Download"
      >
        <FileText className="w-4 h-4" /> PDF
      </button>

      {offen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="raum-pdf-titel"
            className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
          >
            {/* Kopf */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 id="raum-pdf-titel" className="text-base font-semibold text-gray-900">Produktübersicht als PDF</h2>
                <p className="text-xs text-gray-400 mt-0.5">Auswählen, was in die PDF soll — rechts die Vorschau, dann herunterladen.</p>
              </div>
              <button type="button" onClick={() => setOffen(false)} aria-label="Schließen" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inhalt: Optionen links · Vorschau rechts */}
            <div className="flex-1 min-h-0 flex flex-col md:flex-row">
              <div className="md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-gray-100 overflow-y-auto p-4 space-y-5">
                {zeigeGruppenWahl && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-widest"><Layers className="w-3.5 h-3.5" /> Gruppen</span>
                      <AlleToggle
                        alle={gewGruppen.size === alleGruppenIds.length}
                        keine={gewGruppen.size === 0}
                        onAlle={() => setGewGruppen(new Set(alleGruppenIds))}
                        onKeine={() => setGewGruppen(new Set())}
                      />
                    </div>
                    {gruppen.map((g) => (
                      <CheckZeile key={g.id} label={g.name} checked={gewGruppen.has(g.id)} onToggle={() => toggle(gewGruppen, g.id, setGewGruppen)} />
                    ))}
                    {hatOhneGruppe && (
                      <CheckZeile label="Ohne Gruppe" checked={gewGruppen.has('ohne')} onToggle={() => toggle(gewGruppen, 'ohne', setGewGruppen)} />
                    )}
                  </div>
                )}

                {zeigePartnerWahl && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-widest"><Handshake className="w-3.5 h-3.5" /> Partner / Lieferant</span>
                      <AlleToggle
                        alle={gewPartner.size === allePartnerIds.length}
                        keine={gewPartner.size === 0}
                        onAlle={() => setGewPartner(new Set(allePartnerIds))}
                        onKeine={() => setGewPartner(new Set())}
                      />
                    </div>
                    {partner.map((p) => (
                      <CheckZeile key={p.id} label={p.name} checked={gewPartner.has(p.id)} onToggle={() => toggle(gewPartner, p.id, setGewPartner)} />
                    ))}
                    {hatOhnePartner && (
                      <CheckZeile label="Ohne Partner" checked={gewPartner.has('ohne')} onToggle={() => toggle(gewPartner, 'ohne', setGewPartner)} />
                    )}
                  </div>
                )}

                <div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5"><Coins className="w-3.5 h-3.5" /> Preise</span>
                  <CheckZeile label="EK netto (Einkauf)" checked={zeigeEk} onToggle={() => setZeigeEk((v) => !v)} />
                  <CheckZeile label="Kundenpreis (brutto)" checked={zeigeVk} onToggle={() => setZeigeVk((v) => !v)} />
                  <p className="text-[11px] text-gray-400 mt-1.5 px-2 leading-relaxed">
                    Ohne Häkchen enthält die PDF <span className="font-medium text-gray-500">keine Preise</span> — sicher zum Weiterleiten an Lieferanten.
                  </p>
                </div>
              </div>

              {/* Vorschau */}
              <div className="flex-1 min-h-[320px] md:min-h-0 bg-gray-100 relative">
                {auswahlLeer ? (
                  <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-gray-400">
                    Bitte mindestens eine Gruppe und einen Partner auswählen.
                  </div>
                ) : previewUrl ? (
                  <iframe key={previewUrl} src={previewUrl} title="PDF-Vorschau" className="absolute inset-0 w-full h-full border-0" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">Vorschau wird geladen …</div>
                )}
              </div>
            </div>

            {/* Fuß */}
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-gray-100 shrink-0 bg-white">
              <button type="button" onClick={() => setOffen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200">
                Abbrechen
              </button>
              <a
                href={auswahlLeer ? undefined : downloadUrl}
                aria-disabled={auswahlLeer}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  auswahlLeer
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none'
                    : 'bg-wellbeing-green text-white hover:bg-wellbeing-green-dark'
                }`}
              >
                <Download className="w-4 h-4" /> PDF herunterladen
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
