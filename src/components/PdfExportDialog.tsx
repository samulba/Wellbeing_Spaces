'use client'

import { useEffect, useMemo, useState } from 'react'
import { FileText, X, Download, type LucideIcon } from 'lucide-react'
import { useModal } from '@/lib/hooks/useModal'

// ── Generischer PDF-Export-Dialog (Auswahl → Live-Vorschau → Download) ──
// Extrahiert aus dem Raum-PDF-Modal (S137), damit ALLE PDFs denselben
// Auswahl-/Vorschau-Flow bekommen. Der Dialog baut nur die URL — die
// Filter-/Preis-Logik lebt in der jeweiligen PDF-Route (Query-Params).

export interface PdfOption { id: string; name: string }

export interface PdfFilterGroup {
  /** Query-Param-Name (z. B. 'gruppen', 'partner', 'raeume'). */
  key: string
  label: string
  icon?: LucideIcon
  options: PdfOption[]
  /** Pseudo-Option „Ohne …" (sendet das Token 'ohne'), nur wenn vorhanden. */
  ohneLabel?: string | null
}

export type PdfPreisModus =
  | {
      typ: 'checkboxen'
      toggles: { key: string; label: string; default?: boolean }[]
      hinweis?: string
    }
  | {
      typ: 'radio'
      param: string
      options: { value: string; label: string; hint?: string }[]
      default: string
      hinweis?: string
    }

interface Props {
  titel: string
  untertitel?: string
  buttonLabel?: string
  buttonTitle?: string
  /** Basis-Pfad der PDF-Route, z. B. `/api/raeume/<id>/pdf`. */
  basePath: string
  filterGroups: PdfFilterGroup[]
  preisModus?: PdfPreisModus
  emptyHint?: string
}

export default function PdfExportDialog({
  titel, untertitel, buttonLabel = 'PDF', buttonTitle, basePath, filterGroups, preisModus, emptyHint,
}: Props) {
  const [offen, setOffen] = useState(false)
  const modalRef = useModal(offen, () => setOffen(false))

  // Sektionen ohne echte Optionen werden versteckt (= kein Filter = alles drin).
  const sichtbareGruppen = useMemo(() => filterGroups.filter((g) => g.options.length > 0), [filterGroups])
  const alleIds = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const g of sichtbareGruppen) m.set(g.key, [...g.options.map((o) => o.id), ...(g.ohneLabel ? ['ohne'] : [])])
    return m
  }, [sichtbareGruppen])

  // Auswahl-State: je Filter-Gruppe ein Set (initial ALLES angehakt).
  const [auswahl, setAuswahl] = useState<Record<string, Set<string>>>(() => {
    const init: Record<string, Set<string>> = {}
    for (const g of sichtbareGruppen) init[g.key] = new Set(alleIds.get(g.key) ?? [])
    return init
  })
  const [checks, setChecks] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    if (preisModus?.typ === 'checkboxen') for (const t of preisModus.toggles) init[t.key] = !!t.default
    return init
  })
  const [radio, setRadio] = useState<string>(() => (preisModus?.typ === 'radio' ? preisModus.default : ''))

  const toggleId = (key: string, id: string) => {
    setAuswahl((prev) => {
      const next = { ...prev, [key]: new Set(prev[key] ?? []) }
      if (next[key].has(id)) next[key].delete(id); else next[key].add(id)
      return next
    })
  }
  const setAlle = (key: string, alle: boolean) => {
    setAuswahl((prev) => ({ ...prev, [key]: new Set(alle ? (alleIds.get(key) ?? []) : []) }))
  }

  const auswahlLeer = sichtbareGruppen.some((g) => (auswahl[g.key]?.size ?? 0) === 0)

  // URL: Filter-Param nur bei echter Teilmenge; Checkbox-Toggles nur wenn an;
  // Radio-Param IMMER (der Dialog wählt den Modus explizit — nackte URL bleibt Default).
  const downloadUrl = useMemo(() => {
    const p = new URLSearchParams()
    for (const g of sichtbareGruppen) {
      const gew = auswahl[g.key] ?? new Set<string>()
      const alle = alleIds.get(g.key) ?? []
      if (gew.size > 0 && gew.size < alle.length) p.set(g.key, Array.from(gew).join(','))
    }
    if (preisModus?.typ === 'checkboxen') {
      for (const t of preisModus.toggles) if (checks[t.key]) p.set(t.key, '1')
    } else if (preisModus?.typ === 'radio') {
      p.set(preisModus.param, radio)
    }
    const qs = p.toString()
    return `${basePath}${qs ? `?${qs}` : ''}`
  }, [basePath, sichtbareGruppen, auswahl, alleIds, checks, radio, preisModus])

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

  return (
    <>
      <button
        type="button"
        onClick={() => setOffen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
        title={buttonTitle ?? `${titel} — Auswahl, Vorschau, Download`}
      >
        <FileText className="w-4 h-4" /> {buttonLabel}
      </button>

      {offen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pdf-export-titel"
            className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
          >
            {/* Kopf */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 id="pdf-export-titel" className="text-base font-semibold text-gray-900">{titel}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{untertitel ?? 'Auswählen, was in die PDF soll — rechts die Vorschau, dann herunterladen.'}</p>
              </div>
              <button type="button" onClick={() => setOffen(false)} aria-label="Schließen" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inhalt: Optionen links · Vorschau rechts */}
            <div className="flex-1 min-h-0 flex flex-col md:flex-row">
              <div className="md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-gray-100 overflow-y-auto p-4 space-y-5">
                {sichtbareGruppen.map((g) => {
                  const gew = auswahl[g.key] ?? new Set<string>()
                  const alle = alleIds.get(g.key) ?? []
                  const Icon = g.icon
                  return (
                    <div key={g.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
                          {Icon && <Icon className="w-3.5 h-3.5" />} {g.label}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          <button type="button" onClick={() => setAlle(g.key, true)} disabled={gew.size === alle.length} className="hover:text-wellbeing-green disabled:opacity-40 disabled:hover:text-gray-400">Alle</button>
                          {' · '}
                          <button type="button" onClick={() => setAlle(g.key, false)} disabled={gew.size === 0} className="hover:text-wellbeing-green disabled:opacity-40 disabled:hover:text-gray-400">Keine</button>
                        </span>
                      </div>
                      {g.options.map((o) => (
                        <CheckZeile key={o.id} label={o.name} checked={gew.has(o.id)} onToggle={() => toggleId(g.key, o.id)} />
                      ))}
                      {g.ohneLabel && (
                        <CheckZeile label={g.ohneLabel} checked={gew.has('ohne')} onToggle={() => toggleId(g.key, 'ohne')} />
                      )}
                    </div>
                  )
                })}

                {preisModus && (
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Preise</span>
                    {preisModus.typ === 'checkboxen' ? (
                      preisModus.toggles.map((t) => (
                        <CheckZeile key={t.key} label={t.label} checked={!!checks[t.key]} onToggle={() => setChecks((c) => ({ ...c, [t.key]: !c[t.key] }))} />
                      ))
                    ) : (
                      preisModus.options.map((o) => (
                        <label key={o.value} className="flex items-start gap-2.5 py-1.5 px-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="radio"
                            name="pdf-preis-modus"
                            checked={radio === o.value}
                            onChange={() => setRadio(o.value)}
                            className="w-4 h-4 mt-0.5 border-gray-300 text-wellbeing-green focus:ring-wellbeing-green/30"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm text-gray-700">{o.label}</span>
                            {o.hint && <span className="block text-[11px] text-gray-400">{o.hint}</span>}
                          </span>
                        </label>
                      ))
                    )}
                    {preisModus.hinweis && (
                      <p className="text-[11px] text-gray-400 mt-1.5 px-2 leading-relaxed">{preisModus.hinweis}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Vorschau */}
              <div className="flex-1 min-h-[320px] md:min-h-0 bg-gray-100 relative">
                {auswahlLeer ? (
                  <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-gray-400">
                    {emptyHint ?? 'Bitte in jeder Sektion mindestens einen Eintrag auswählen.'}
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
