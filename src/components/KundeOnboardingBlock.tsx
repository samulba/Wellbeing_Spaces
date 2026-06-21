'use client'

import { useState, type ReactNode } from 'react'
import {
  ClipboardList, ChevronDown, Wallet, LayoutGrid, Palette,
  CalendarClock, MapPin, StickyNote, Briefcase,
  UserPlus, Layers,
} from 'lucide-react'
import DynamischeAntwortenAnzeige from '@/components/onboarding/DynamischeAntwortenAnzeige'
import type { KundeOnboarding } from '@/app/actions/kunden'

// ── Helfer ────────────────────────────────────────────────────

const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

function budgetText(min: number | null, max: number | null): string | null {
  if (min != null && max != null) return min === max ? eur(min) : `${eur(min)} – ${eur(max)}`
  if (max != null) return `bis ${eur(max)}`
  if (min != null) return `ab ${eur(min)}`
  return null
}

function datum(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const TYP_INFO: Record<string, { label: string; icon: typeof UserPlus; cls: string }> = {
  neukunde:  { label: 'Neukunde-Onboarding', icon: UserPlus,  cls: 'bg-blue-50 text-blue-700' },
  projekt:   { label: 'Projekt-Onboarding',  icon: Briefcase, cls: 'bg-emerald-50 text-emerald-700' },
  universal: { label: 'Onboarding',          icon: Layers,    cls: 'bg-gray-100 text-gray-600' },
}
function typInfo(typ: string) {
  return TYP_INFO[typ] ?? { label: 'Onboarding', icon: ClipboardList, cls: 'bg-gray-100 text-gray-600' }
}

const STATUS_INFO: Record<string, { label: string; cls: string }> = {
  abgeschlossen:  { label: 'Abgeschlossen',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  eingereicht:    { label: 'Eingereicht',    cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  in_bearbeitung: { label: 'In Bearbeitung', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  offen:          { label: 'Offen',          cls: 'bg-gray-50 text-gray-500 border-gray-200' },
  abgelehnt:      { label: 'Abgelehnt',      cls: 'bg-red-50 text-red-600 border-red-200' },
  abgelaufen:     { label: 'Abgelaufen',     cls: 'bg-gray-50 text-gray-400 border-gray-200' },
}
function statusInfo(status: string) {
  return STATUS_INFO[status] ?? { label: status, cls: 'bg-gray-50 text-gray-500 border-gray-200' }
}

// ── Block ─────────────────────────────────────────────────────

export default function KundeOnboardingBlock({ onboardings }: { onboardings: KundeOnboarding[] }) {
  if (!onboardings || onboardings.length === 0) return null

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
        <ClipboardList className="w-3.5 h-3.5 text-gray-400" />
        Onboarding-Angaben
        {onboardings.length > 1 && (
          <span className="text-gray-400 normal-case font-normal tracking-normal">({onboardings.length})</span>
        )}
      </h2>
      {onboardings.map((o) => <OnboardingKarte key={o.id} o={o} />)}
    </div>
  )
}

function OnboardingKarte({ o }: { o: KundeOnboarding }) {
  const [offen, setOffen] = useState(false)

  const ti = typInfo(o.typ)
  const si = statusInfo(o.status)
  const TypIcon = ti.icon
  const wann = o.abgeschlossen_am ?? o.created_at

  const budget = budgetText(o.eckdaten.budget_min, o.eckdaten.budget_max)
  const raeume = o.eckdaten.raumtypen ?? []

  const facts: { icon: typeof Wallet; label: string; node: ReactNode }[] = []
  if (o.eckdaten.projekt_name)    facts.push({ icon: Briefcase,    label: 'Projekt',        node: o.eckdaten.projekt_name })
  if (budget)                     facts.push({ icon: Wallet,       label: 'Budget',         node: budget })
  if (raeume.length > 0)          facts.push({
    icon: LayoutGrid, label: 'Räume',
    node: (
      <div className="flex flex-wrap gap-1">
        {raeume.map((r, i) => (
          <span key={`${i}-${r}`} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{r}</span>
        ))}
      </div>
    ),
  })
  if (o.eckdaten.stil_praeferenzen) facts.push({ icon: Palette,      label: 'Stil',           node: o.eckdaten.stil_praeferenzen })
  if (o.eckdaten.zeitrahmen)        facts.push({ icon: CalendarClock, label: 'Zeitrahmen',     node: o.eckdaten.zeitrahmen })
  if (o.eckdaten.projekt_adresse)   facts.push({ icon: MapPin,       label: 'Projekt-Adresse', node: o.eckdaten.projekt_adresse })

  const hatAntworten = (o.antworten && Object.keys(o.antworten).length > 0) || o.dateien.length > 0

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      {/* Kopf */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-lg ${ti.cls}`}>
            <TypIcon className="w-3.5 h-3.5" />
            {ti.label}
          </span>
          {(o.titel || o.vorlageName) && (
            <span className="text-sm text-gray-700 truncate">{o.titel || o.vorlageName}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${si.cls}`}>{si.label}</span>
          <span className="text-[11px] text-gray-400">{datum(wann)}</span>
        </div>
      </div>

      {/* Eckdaten */}
      {facts.length > 0 ? (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-4">
          {facts.map((f, i) => {
            const Icon = f.icon
            return (
              <div key={`${i}-${f.label}`} className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <div className="min-w-0">
                  <dt className="text-[11px] text-gray-400 leading-none mb-1">{f.label}</dt>
                  <dd className="text-sm text-gray-800 break-words">{f.node}</dd>
                </div>
              </div>
            )
          })}
        </dl>
      ) : (
        <p className="text-sm text-gray-400 mt-4">Keine strukturierten Eckdaten erkannt — vollständige Antworten unten.</p>
      )}

      {/* Notizen / Wünsche */}
      {o.eckdaten.notizen && (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-amber-50/60 border border-amber-100 px-3 py-2.5">
          <StickyNote className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-amber-800 mb-0.5">Wünsche / Anmerkungen</p>
            <p className="text-sm text-amber-900/90 whitespace-pre-wrap leading-relaxed">{o.eckdaten.notizen}</p>
          </div>
        </div>
      )}

      {/* Vollständige Antworten (ausklappbar) */}
      {hatAntworten && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setOffen((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-wellbeing-green hover:text-wellbeing-green-dark transition-colors"
            aria-expanded={offen}
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${offen ? 'rotate-180' : ''}`} />
            {offen ? 'Vollständige Antworten ausblenden' : 'Alle eingereichten Antworten anzeigen'}
          </button>
          {offen && (
            <DynamischeAntwortenAnzeige
              anfrageId={o.id}
              vorlage={o.vorlage}
              antworten={o.antworten}
              dateien={o.dateien}
            />
          )}
        </div>
      )}
    </div>
  )
}
