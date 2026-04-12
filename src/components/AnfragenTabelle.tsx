'use client'

import { useState, useTransition } from 'react'
import { ChevronDown, ChevronUp, Check, Plus, User, Mail, Phone, MapPin, Home, Euro, Clock, Palette, MessageSquare, ExternalLink } from 'lucide-react'
import {
  onboardingLinkErstellen,
  onboardingStatusAendern,
  kundeAusOnboardingAnlegen,
} from '@/app/actions/onboarding'
import type { OnboardingAnfrage, OnboardingStatus } from '@/lib/supabase/types'

// ── Badge-Konfiguration ───────────────────────────────────────
function getBadge(a: OnboardingAnfrage): { label: string; cls: string } {
  if (a.status === 'abgeschlossen') return { label: 'Abgeschlossen', cls: 'bg-emerald-100 text-emerald-700' }
  if (a.status === 'abgelehnt')     return { label: 'Abgelehnt',     cls: 'bg-red-100 text-red-600' }
  if (a.kunde_name)                 return { label: 'Neue Anfrage',  cls: 'bg-amber-100 text-amber-700' }
  return                                   { label: 'Link aktiv',    cls: 'bg-gray-100 text-gray-500' }
}

function formatBudget(min: number | null, max: number | null): string {
  const fmt = (n: number) => n.toLocaleString('de-DE') + ' €'
  if (!min && !max) return '—'
  if (!min && max)  return `bis ${fmt(max)}`
  if (min && !max)  return `ab ${fmt(min)}`
  return `${fmt(min!)} – ${fmt(max!)}`
}

function formatDatum(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── Link-Erstellen-Button ─────────────────────────────────────
function LinkErstellenButton() {
  const [kopiert, setKopiert]         = useState(false)
  const [isPending, startTransition]  = useTransition()

  function handleErstellen() {
    startTransition(async () => {
      const { pfad } = await onboardingLinkErstellen()
      const url = window.location.origin + pfad
      await navigator.clipboard.writeText(url)
      setKopiert(true)
      setTimeout(() => setKopiert(false), 2500)
    })
  }

  return (
    <button
      onClick={handleErstellen}
      disabled={isPending}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 rounded-lg transition-colors"
    >
      {kopiert ? (
        <><Check className="w-4 h-4" /> Link kopiert!</>
      ) : isPending ? (
        <><Plus className="w-4 h-4" /> Wird erstellt…</>
      ) : (
        <><Plus className="w-4 h-4" /> Neuen Link erstellen</>
      )}
    </button>
  )
}

// ── Erweiterte Detailansicht ──────────────────────────────────
function AnfrageDetail({ anfrage }: { anfrage: OnboardingAnfrage }) {
  const [isPending, startTransition] = useTransition()
  const [kopiert, setKopiert]        = useState(false)
  const offen = anfrage.status === 'offen'
  const hatDaten = !!anfrage.kunde_name

  function handleStatus(status: OnboardingStatus) {
    startTransition(async () => {
      await onboardingStatusAendern(anfrage.id, status)
    })
  }

  function handleKundeAnlegen() {
    startTransition(async () => {
      await kundeAusOnboardingAnlegen(anfrage.id)
    })
  }

  function handleLinkKopieren() {
    const url = window.location.origin + `/onboarding/${anfrage.token}`
    navigator.clipboard.writeText(url).then(() => {
      setKopiert(true)
      setTimeout(() => setKopiert(false), 2000)
    })
  }

  return (
    <div className="border-t border-gray-100 bg-gray-50/70 px-5 py-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Kontakt */}
        {hatDaten && (
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2.5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Kontakt</p>
            {anfrage.kunde_name && (
              <DetailZeile icon={<User className="w-3.5 h-3.5" />} text={anfrage.kunde_name} />
            )}
            {anfrage.kunde_email && (
              <DetailZeile icon={<Mail className="w-3.5 h-3.5" />} text={anfrage.kunde_email} />
            )}
            {anfrage.kunde_telefon && (
              <DetailZeile icon={<Phone className="w-3.5 h-3.5" />} text={anfrage.kunde_telefon} />
            )}
          </div>
        )}

        {/* Projekt */}
        {(anfrage.projekt_name || anfrage.projekt_adresse || anfrage.raumtypen?.length) ? (
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2.5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Projekt</p>
            {anfrage.projekt_name && (
              <DetailZeile icon={<Home className="w-3.5 h-3.5" />} text={anfrage.projekt_name} />
            )}
            {anfrage.projekt_adresse && (
              <DetailZeile icon={<MapPin className="w-3.5 h-3.5" />} text={anfrage.projekt_adresse} />
            )}
            {anfrage.raumtypen && anfrage.raumtypen.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {anfrage.raumtypen.map((rt) => (
                  <span key={rt} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {rt}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* Budget & Zeitrahmen */}
        {(anfrage.budget_min != null || anfrage.budget_max != null || anfrage.zeitrahmen) ? (
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2.5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Budget & Zeit</p>
            {(anfrage.budget_min != null || anfrage.budget_max != null) && (
              <DetailZeile
                icon={<Euro className="w-3.5 h-3.5" />}
                text={formatBudget(anfrage.budget_min, anfrage.budget_max)}
              />
            )}
            {anfrage.zeitrahmen && (
              <DetailZeile icon={<Clock className="w-3.5 h-3.5" />} text={anfrage.zeitrahmen} />
            )}
          </div>
        ) : null}

        {/* Stil & Notizen */}
        {(anfrage.stil_praeferenzen || anfrage.notizen) ? (
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2.5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Stil & Wünsche</p>
            {anfrage.stil_praeferenzen && (
              <DetailZeile icon={<Palette className="w-3.5 h-3.5" />} text={anfrage.stil_praeferenzen} />
            )}
            {anfrage.notizen && (
              <DetailZeile icon={<MessageSquare className="w-3.5 h-3.5" />} text={anfrage.notizen} />
            )}
          </div>
        ) : null}
      </div>

      {/* Aktionen */}
      <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-200">
        {hatDaten && offen && (
          <button
            onClick={handleKundeAnlegen}
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 rounded-lg transition-colors"
          >
            <User className="w-3.5 h-3.5" />
            {isPending ? 'Wird angelegt…' : 'Als Kunde anlegen'}
          </button>
        )}
        {offen && (
          <button
            onClick={() => handleStatus('abgelehnt')}
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-500 hover:text-red-600 border border-red-200 hover:border-red-300 disabled:opacity-50 rounded-lg transition-colors"
          >
            Ablehnen
          </button>
        )}
        {anfrage.status === 'abgelehnt' && (
          <button
            onClick={() => handleStatus('offen')}
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-500 border border-gray-200 disabled:opacity-50 rounded-lg transition-colors hover:border-gray-300"
          >
            Wieder öffnen
          </button>
        )}
        <button
          onClick={handleLinkKopieren}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-500 border border-gray-200 hover:border-gray-300 rounded-lg transition-colors ml-auto"
        >
          {kopiert ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <ExternalLink className="w-3.5 h-3.5" />}
          {kopiert ? 'Kopiert!' : 'Link kopieren'}
        </button>
      </div>

      {!hatDaten && (
        <p className="text-xs text-gray-400 mt-3 italic">
          Der Kunde hat das Formular noch nicht ausgefüllt.
        </p>
      )}
    </div>
  )
}

function DetailZeile({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-2 text-sm text-gray-700">
      <span className="text-gray-400 mt-0.5 shrink-0">{icon}</span>
      <span className="break-words">{text}</span>
    </div>
  )
}

// ── Haupt-Komponente ──────────────────────────────────────────
export default function AnfragenTabelle({ anfragen }: { anfragen: OnboardingAnfrage[] }) {
  const [offeneId, setOffeneId] = useState<string | null>(null)

  const neueCount = anfragen.filter((a) => a.status === 'offen' && a.kunde_name).length

  return (
    <div className="h-full flex flex-col">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Onboarding-Anfragen</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {anfragen.length} Anfragen
            {neueCount > 0 && (
              <span className="ml-1.5 bg-amber-100 text-amber-700 text-[11px] font-semibold px-1.5 py-0.5 rounded-full">
                {neueCount} neu
              </span>
            )}
          </p>
        </div>
        <LinkErstellenButton />
      </div>

      {/* ── Liste ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {anfragen.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-sm">Noch keine Anfragen vorhanden.</p>
            <p className="text-xs mt-1">Erstelle einen Link und schicke ihn an neue Kunden.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {anfragen.map((anfrage) => {
              const badge = getBadge(anfrage)
              const offen = offeneId === anfrage.id
              return (
                <div
                  key={anfrage.id}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden"
                >
                  {/* ── Zeile ──────────────────────────────── */}
                  <button
                    type="button"
                    onClick={() => setOffeneId(offen ? null : anfrage.id)}
                    className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    {/* Status-Badge */}
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${badge.cls}`}>
                      {badge.label}
                    </span>

                    {/* Name / Platzhalter */}
                    <div className="flex-1 min-w-0">
                      {anfrage.kunde_name ? (
                        <>
                          <p className="text-sm font-medium text-gray-900 truncate">{anfrage.kunde_name}</p>
                          <p className="text-xs text-gray-400 truncate">{anfrage.kunde_email}</p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-400 italic">Noch nicht ausgefüllt</p>
                      )}
                    </div>

                    {/* Raumtypen-Pill */}
                    {anfrage.raumtypen && anfrage.raumtypen.length > 0 && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full shrink-0 hidden sm:block">
                        {anfrage.raumtypen.length} Räume
                      </span>
                    )}

                    {/* Datum */}
                    <span className="text-xs text-gray-400 shrink-0 hidden md:block">
                      {formatDatum(anfrage.created_at)}
                    </span>

                    {/* Expand-Icon */}
                    <span className="text-gray-400 shrink-0">
                      {offen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>

                  {/* ── Detail-Panel ───────────────────────── */}
                  {offen && (
                    <AnfrageDetail anfrage={anfrage} />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
