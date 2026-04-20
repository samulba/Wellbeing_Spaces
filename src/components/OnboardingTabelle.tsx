'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronDown, ChevronUp, Check, Plus, User, Mail, Phone, MapPin,
  Home, Euro, Clock, Palette, MessageSquare, ExternalLink, Trash2,
  X, ChevronRight, Settings2, Briefcase,
} from 'lucide-react'
import {
  onboardingLinkErstellen,
  onboardingStatusAendern,
  onboardingLinkLoeschen,
  kundeAusOnboardingAnlegen,
} from '@/app/actions/onboarding'
import { kundeUndProjektAusOnboarding } from '@/app/actions/onboarding-erweitert'
import type { OnboardingAnfrage, OnboardingStatus, OnboardingVorlage } from '@/lib/supabase/types'

// ── Badge-Konfiguration ───────────────────────────────────────
function getBadge(a: OnboardingAnfrage): { label: string; cls: string } {
  if (a.status === 'abgeschlossen') return { label: 'Abgeschlossen', cls: 'bg-blue-100 text-blue-700' }
  if (a.status === 'abgelehnt')     return { label: 'Abgelehnt',     cls: 'bg-red-100 text-red-600' }
  if (a.kunde_name)                 return { label: 'Ausgefüllt',    cls: 'bg-emerald-100 text-emerald-700' }
  return                                   { label: 'Offen',         cls: 'bg-amber-100 text-amber-700' }
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

// ── Link-Erstellen-Modal ──────────────────────────────────────
function LinkErstellenModal({
  vorlagen,
  onClose,
}: {
  vorlagen: OnboardingVorlage[]
  onClose: () => void
}) {
  const [gewaehlt, setGewaehlt]       = useState<string>('')
  const [kopiert, setKopiert]         = useState(false)
  const [isPending, startTransition]  = useTransition()

  const standard = vorlagen.find((v) => v.ist_standard)

  function handleErstellen() {
    const vorlage_id = gewaehlt || standard?.id || null
    startTransition(async () => {
      const { pfad } = await onboardingLinkErstellen(vorlage_id)
      const url = window.location.origin + pfad
      await navigator.clipboard.writeText(url)
      setKopiert(true)
      setTimeout(() => {
        setKopiert(false)
        onClose()
      }, 2000)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Neuen Onboarding-Link erstellen</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vorlage auswählen
          </label>
          <div className="space-y-2">
            {vorlagen.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setGewaehlt(v.id)}
                className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                  (gewaehlt === v.id || (!gewaehlt && v.ist_standard))
                    ? 'border-wellbeing-green bg-wellbeing-green/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  (gewaehlt === v.id || (!gewaehlt && v.ist_standard))
                    ? 'border-wellbeing-green bg-wellbeing-green'
                    : 'border-gray-300'
                }`}>
                  {(gewaehlt === v.id || (!gewaehlt && v.ist_standard)) && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {v.name}
                    {v.ist_standard && (
                      <span className="ml-1.5 text-[10px] font-semibold text-wellbeing-green bg-wellbeing-green/10 px-1.5 py-0.5 rounded-full">
                        Standard
                      </span>
                    )}
                  </p>
                  {v.beschreibung && (
                    <p className="text-xs text-gray-400 mt-0.5">{v.beschreibung}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">{v.fragen.length} Fragen</p>
                </div>
              </button>
            ))}
          </div>

          <Link
            href="/dashboard/onboarding/vorlagen"
            className="flex items-center gap-1.5 mt-3 text-xs text-gray-400 hover:text-wellbeing-green transition-colors"
          >
            <Settings2 className="w-3 h-3" />
            Vorlagen verwalten
          </Link>
        </div>

        <button
          onClick={handleErstellen}
          disabled={isPending || kopiert}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 rounded-xl transition-colors"
        >
          {kopiert ? (
            <><Check className="w-4 h-4" /> Link kopiert!</>
          ) : isPending ? (
            <>Wird erstellt…</>
          ) : (
            <><Plus className="w-4 h-4" /> Link erstellen & kopieren</>
          )}
        </button>
      </div>
    </div>
  )
}

// ── Löschen-Bestätigung ───────────────────────────────────────
function LoeschenBestaetigung({
  onConfirm,
  onCancel,
  isPending,
}: {
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}) {
  return (
    <div className="flex items-center gap-2 px-5 py-3 bg-red-50 border-t border-red-100">
      <p className="text-xs text-red-600 flex-1">Link und alle Daten wirklich löschen?</p>
      <button
        onClick={onConfirm}
        disabled={isPending}
        className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50"
      >
        {isPending ? 'Löschen…' : 'Ja, löschen'}
      </button>
      <button
        onClick={onCancel}
        className="px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
      >
        Abbrechen
      </button>
    </div>
  )
}

// ── Erweiterte Detailansicht ──────────────────────────────────
function AnfrageDetail({
  anfrage,
  onLoeschenStart,
}: {
  anfrage: OnboardingAnfrage
  onLoeschenStart: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [kopiert, setKopiert]        = useState(false)
  const [fehler, setFehler]          = useState<string | null>(null)
  const offen = anfrage.status === 'offen'
  const hatDaten = !!anfrage.kunde_name
  const hatProjektName = !!anfrage.projekt_name

  function handleStatus(status: OnboardingStatus) {
    startTransition(async () => {
      await onboardingStatusAendern(anfrage.id, status)
    })
  }

  function handleKundeAnlegen() {
    setFehler(null)
    startTransition(async () => {
      await kundeAusOnboardingAnlegen(anfrage.id)
    })
  }

  function handleKundeUndProjektAnlegen() {
    setFehler(null)
    startTransition(async () => {
      try {
        const res = await kundeUndProjektAusOnboarding(anfrage.id, { raeume_erstellen: true })
        if (res.projekt_id) {
          router.push(`/dashboard/projekte/${res.projekt_id}`)
        } else {
          router.push(`/dashboard/kunden/${res.kunde_id}`)
        }
      } catch (e) {
        setFehler(e instanceof Error ? e.message : 'Fehler beim Anlegen.')
      }
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
      {hatDaten ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Kontakt */}
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
      ) : (
        <p className="text-xs text-gray-400 italic mb-4">
          Der Kunde hat das Formular noch nicht ausgefüllt.
        </p>
      )}

      {fehler && (
        <p className="text-xs text-red-500 mt-3">{fehler}</p>
      )}

      {/* Aktionen */}
      <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-200">
        {hatDaten && offen && hatProjektName && (
          <button
            onClick={handleKundeUndProjektAnlegen}
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 rounded-lg transition-colors"
          >
            <Briefcase className="w-3.5 h-3.5" />
            {isPending ? 'Wird angelegt…' : 'Kunde + Projekt anlegen'}
          </button>
        )}
        {hatDaten && offen && !hatProjektName && (
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

        <div className="flex items-center gap-2 ml-auto">
          {offen && (
            <button
              onClick={handleLinkKopieren}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-500 border border-gray-200 hover:border-gray-300 rounded-lg transition-colors"
            >
              {kopiert ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <ExternalLink className="w-3.5 h-3.5" />}
              {kopiert ? 'Kopiert!' : 'Link kopieren'}
            </button>
          )}
          <button
            onClick={onLoeschenStart}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-400 hover:text-red-500 border border-red-100 hover:border-red-200 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Löschen
          </button>
        </div>
      </div>
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
export default function OnboardingTabelle({
  anfragen,
  vorlagen,
}: {
  anfragen: OnboardingAnfrage[]
  vorlagen: OnboardingVorlage[]
}) {
  const [offeneId, setOffeneId]         = useState<string | null>(null)
  const [modalOffen, setModalOffen]     = useState(false)
  const [loeschenId, setLoeschenId]     = useState<string | null>(null)
  const [isPendingDel, startDeleteTransition] = useTransition()

  const ausgefuelltCount = anfragen.filter((a) => a.status === 'offen' && a.kunde_name).length

  function handleLoeschen(id: string) {
    startDeleteTransition(async () => {
      await onboardingLinkLoeschen(id)
      setLoeschenId(null)
      setOffeneId(null)
    })
  }

  return (
    <>
      {modalOffen && (
        <LinkErstellenModal vorlagen={vorlagen} onClose={() => setModalOffen(false)} />
      )}

      <div className="h-full flex flex-col">

        {/* ── Header (sticky, bleibt beim Scrollen stehen) ───── */}
        <div className="bg-white/85 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Onboarding</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {anfragen.length} Links
              {ausgefuelltCount > 0 && (
                <span className="ml-1.5 bg-emerald-100 text-emerald-700 text-[11px] font-semibold px-1.5 py-0.5 rounded-full">
                  {ausgefuelltCount} ausgefüllt
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/onboarding/vorlagen"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-500 border border-gray-200 hover:border-gray-300 rounded-lg transition-colors"
            >
              <Settings2 className="w-4 h-4" />
              Vorlagen
            </Link>
            <button
              onClick={() => setModalOffen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-wellbeing-green hover:bg-wellbeing-green-dark rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Neuen Link erstellen
            </button>
          </div>
        </div>

        {/* ── Liste ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {anfragen.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              {/* Illustration */}
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-2xl bg-wellbeing-green/10 flex items-center justify-center">
                  <Plus className="w-8 h-8 text-wellbeing-green/40" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Check className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="absolute -bottom-2 -left-2 w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-amber-500" />
                </div>
              </div>

              <h3 className="text-sm font-semibold text-gray-800 mb-1">Noch keine Onboarding-Links</h3>
              <p className="text-xs text-gray-400 max-w-xs mb-6">
                Erstelle einen personalisierten Link und schicke ihn an neue Kunden – sie können ihre Wünsche direkt online einreichen.
              </p>

              <button
                onClick={() => setModalOffen(true)}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-wellbeing-green hover:bg-wellbeing-green-dark rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                Ersten Link erstellen
              </button>

              {/* Vorlage-Hinweis */}
              {vorlagen.length > 0 && (
                <div className="mt-8 w-full max-w-sm">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Verfügbare Vorlagen</p>
                  <div className="space-y-2">
                    {vorlagen.slice(0, 3).map((v) => (
                      <div key={v.id} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                        <div className="w-8 h-8 rounded-lg bg-wellbeing-green/10 flex items-center justify-center shrink-0">
                          <ChevronRight className="w-4 h-4 text-wellbeing-green" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-xs font-medium text-gray-800 truncate">{v.name}</p>
                          <p className="text-[10px] text-gray-400">{v.fragen.length} Fragen</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {anfragen.map((anfrage) => {
                const badge   = getBadge(anfrage)
                const istOffen = offeneId === anfrage.id
                const loeschen = loeschenId === anfrage.id
                return (
                  <div
                    key={anfrage.id}
                    className="bg-white border border-gray-200 rounded-xl overflow-hidden"
                  >
                    {/* ── Zeile ──────────────────────────────── */}
                    <button
                      type="button"
                      onClick={() => {
                        setOffeneId(istOffen ? null : anfrage.id)
                        setLoeschenId(null)
                      }}
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

                      {/* Datum */}
                      <div className="text-right hidden md:block shrink-0">
                        <p className="text-xs text-gray-400">
                          {anfrage.kunde_name
                            ? `Ausgefüllt ${formatDatum(anfrage.updated_at)}`
                            : `Erstellt ${formatDatum(anfrage.created_at)}`}
                        </p>
                      </div>

                      {/* Expand-Icon */}
                      <span className="text-gray-400 shrink-0">
                        {istOffen
                          ? <ChevronUp className="w-4 h-4" />
                          : <ChevronDown className="w-4 h-4" />}
                      </span>
                    </button>

                    {/* ── Detail-Panel ───────────────────────── */}
                    {istOffen && !loeschen && (
                      <AnfrageDetail
                        anfrage={anfrage}
                        onLoeschenStart={() => setLoeschenId(anfrage.id)}
                      />
                    )}

                    {/* ── Löschen-Bestätigung ─────────────────── */}
                    {loeschen && (
                      <LoeschenBestaetigung
                        isPending={isPendingDel}
                        onConfirm={() => handleLoeschen(anfrage.id)}
                        onCancel={() => setLoeschenId(null)}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Weiterleitung zur Vorlagenverwaltung – kleine Hinweiskarte */}
      <div className="px-6 pb-4">
        <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
          <p className="text-xs text-gray-500">
            Passe Fragen mit <span className="font-medium text-gray-700">Vorlagen</span> an deine Kunden an.
          </p>
          <Link
            href="/dashboard/onboarding/vorlagen"
            className="flex items-center gap-1 text-xs font-medium text-wellbeing-green hover:text-wellbeing-green-dark transition-colors"
          >
            Vorlagen verwalten <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </>
  )
}
