'use client'

import { useState } from 'react'
import { X, FileText, ShieldCheck, Download, CheckCircle2, Coins } from 'lucide-react'
import { useModal } from '@/lib/hooks/useModal'
import { formatEuro } from '@/lib/geld'
import type { FreigabeEinreichung, FreigabeEinreichungPosition } from '@/lib/supabase/types'

const statusInfo: Record<string, { label: string; cls: string }> = {
  freigegeben:    { label: 'Freigegeben',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  abgelehnt:      { label: 'Abgelehnt',     cls: 'bg-red-50 text-red-600 border-red-200' },
  ueberarbeitung: { label: 'Überarbeitung', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  ausstehend:     { label: 'Offen',         cls: 'bg-gray-100 text-gray-500 border-gray-200' },
}

function fmtDatum(iso: string): string {
  try {
    return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  } catch { return iso }
}

function StatusPill({ status }: { status: string }) {
  const s = statusInfo[status] ?? statusInfo.ausstehend
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${s.cls}`}>{s.label}</span>
}

function BelegModal({ beleg, onClose }: { beleg: FreigabeEinreichung; onClose: () => void }) {
  const ref = useModal(true, onClose)
  const positionen = (beleg.positionen ?? []) as FreigabeEinreichungPosition[]
  const summen = beleg.summen

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[88vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-gray-100">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-wellbeing-green text-white text-[11px] font-semibold">Freigabe {beleg.lfd_nr}</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-wellbeing-green uppercase tracking-widest">
                <ShieldCheck className="w-3 h-3" /> Unveränderlicher Beleg
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-gray-900 truncate">{beleg.unterzeichner_name}</p>
            <p className="text-[11px] text-gray-400">Abgesendet am {fmtDatum(beleg.abgesendet_am)}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`/api/freigaben/einreichung/${beleg.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-wellbeing-green border border-wellbeing-green/30 rounded-lg hover:bg-wellbeing-green/5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </a>
            <button type="button" onClick={onClose} aria-label="Schließen" className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 px-6 py-3 bg-gray-50 border-b border-gray-100 text-center">
          <div><p className="text-base font-bold text-gray-900 tabular-nums">{summen?.gesamt ?? positionen.length}</p><p className="text-[10px] text-gray-500 uppercase tracking-wide">Gesamt</p></div>
          <div><p className="text-base font-bold text-emerald-600 tabular-nums">{summen?.freigegeben ?? 0}</p><p className="text-[10px] text-gray-500 uppercase tracking-wide">Freigegeben</p></div>
          <div><p className="text-base font-bold text-red-500 tabular-nums">{summen?.abgelehnt ?? 0}</p><p className="text-[10px] text-gray-500 uppercase tracking-wide">Abgelehnt</p></div>
          <div><p className="text-base font-bold text-amber-600 tabular-nums">{summen?.ueberarbeitung ?? 0}</p><p className="text-[10px] text-gray-500 uppercase tracking-wide">Überarbeitung</p></div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {beleg.allgemeiner_kommentar && beleg.allgemeiner_kommentar.trim() && (
            <div className="rounded-lg border border-wellbeing-terracotta/25 bg-wellbeing-cream/60 px-3 py-2 mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-wellbeing-terracotta/80">Anmerkung des Kunden</p>
              <p className="text-[13px] text-wellbeing-green-dark whitespace-pre-line break-words">{beleg.allgemeiner_kommentar}</p>
            </div>
          )}
          {positionen.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Keine Positionen im Beleg.</p>
          ) : positionen.map((p, i) => (
            <div key={p.raum_produkt_id + '_' + i} className="flex items-start gap-3 rounded-lg border border-gray-200 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900">{p.produkt_name}</span>
                  {p.ist_kundenwahl && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-wellbeing-green text-white text-[10px] font-semibold">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Kundenwahl
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5 text-[11px] text-gray-400">
                  {p.raum_name && <span>{p.raum_name}</span>}
                  {p.bereich_name && <><span className="text-gray-300">·</span><span>{p.bereich_name}</span></>}
                  {p.block_name && <><span className="text-gray-300">·</span><span>Block: {p.block_name}</span></>}
                </div>
                {p.kommentar && p.kommentar.trim() && (
                  <p className="mt-1 text-[12px] text-wellbeing-green-dark whitespace-pre-line break-words">&bdquo;{p.kommentar}&ldquo;</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <StatusPill status={p.status} />
                <p className="mt-1 text-[11px] text-gray-500 tabular-nums">{p.menge}× {p.einzelpreis_netto != null ? formatEuro(p.einzelpreis_netto) : '—'}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between gap-3">
          <p className="text-[10px] text-gray-300 font-mono truncate" title={beleg.content_hash ?? ''}>
            {beleg.content_hash ? `Prüfsumme ${beleg.content_hash.slice(0, 16)}…` : ''}
          </p>
          <p className="text-sm font-semibold text-gray-900">Freigegeben netto: {formatEuro(summen?.summe_freigegeben_netto ?? 0)}</p>
        </div>
      </div>
    </div>
  )
}

export default function EingereichteFreigaben({ einreichungen, projektId }: { einreichungen: FreigabeEinreichung[]; projektId: string }) {
  const [offen, setOffen] = useState<FreigabeEinreichung | null>(null)

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <FileText className="w-4 h-4 text-wellbeing-green" />
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Eingereichte Freigaben</h3>
        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[11px] font-semibold tabular-nums">{einreichungen.length}</span>
        {/* Interne Kostenübersicht (freigegebene Produkte nach Partner, EK/VK/Marge) */}
        <a
          href={`/api/freigaben/projekt/${projektId}/intern/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          title="Interne Kostenübersicht (freigegebene Produkte nach Partner, mit Preisen) als PDF"
          className="ml-auto shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-wellbeing-green border border-wellbeing-green/30 rounded-lg hover:bg-wellbeing-green/5 transition-colors"
        >
          <Coins className="w-3.5 h-3.5" /> Interne Übersicht (PDF)
        </a>
      </div>

      {einreichungen.length === 0 ? (
        <p className="px-5 py-6 text-sm text-gray-400 leading-relaxed">
          Noch keine eingereichte Freigabe. Sobald ein Kunde eine Freigabe verbindlich absendet, erscheint hier
          ein <span className="font-medium text-gray-500">unveränderlicher Beleg</span> (mit Unterzeichner &amp;
          Zeitstempel) — jederzeit abrufbar und als PDF, egal was du später in den Räumen änderst.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {einreichungen.map((e) => (
            <li key={e.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/70 transition-colors">
              <button type="button" onClick={() => setOffen(e)} className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-wellbeing-green text-white text-[11px] font-semibold shrink-0">Freigabe {e.lfd_nr}</span>
                  <span className="text-sm font-medium text-gray-900 truncate">{e.unterzeichner_name}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 flex-wrap text-[11px] text-gray-400">
                  <span>{fmtDatum(e.abgesendet_am)}</span>
                  <span className="text-gray-300">·</span>
                  <span className="text-emerald-600 font-medium">{e.summen?.freigegeben ?? 0} freigegeben</span>
                  {(e.summen?.abgelehnt ?? 0) > 0 && <><span className="text-gray-300">·</span><span className="text-red-500 font-medium">{e.summen.abgelehnt} abgelehnt</span></>}
                  {(e.summen?.ueberarbeitung ?? 0) > 0 && <><span className="text-gray-300">·</span><span className="text-amber-600 font-medium">{e.summen.ueberarbeitung} Überarbeitung</span></>}
                </div>
              </button>
              <a
                href={`/api/freigaben/einreichung/${e.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                title="PDF-Protokoll herunterladen"
                className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-wellbeing-green border border-wellbeing-green/30 rounded-lg hover:bg-wellbeing-green/5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> PDF
              </a>
              <button type="button" onClick={() => setOffen(e)} className="shrink-0 px-2.5 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Ansehen
              </button>
            </li>
          ))}
        </ul>
      )}

      {offen && <BelegModal beleg={offen} onClose={() => setOffen(null)} />}
    </div>
  )
}
