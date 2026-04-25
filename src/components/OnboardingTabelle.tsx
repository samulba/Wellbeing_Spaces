'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronDown, ChevronUp, Check, Plus, User, Mail, Phone, MapPin,
  Home, Euro, Clock, Palette, MessageSquare, ExternalLink, Trash2,
  X, ChevronRight, Settings2, Briefcase, Inbox, CheckCircle2,
  UserPlus, Layers,
} from 'lucide-react'
import {
  onboardingLinkErstellen,
  onboardingStatusAendern,
  onboardingLinkLoeschen,
  kundeAusOnboardingAnlegen,
} from '@/app/actions/onboarding'
import { kundeUndProjektAusOnboarding } from '@/app/actions/onboarding-erweitert'
import type { OnboardingAnfrage, OnboardingStatus, OnboardingVorlage } from '@/lib/supabase/types'

// ── Filter-Typ ────────────────────────────────────────────────
type FilterTyp = 'alle' | 'offen' | 'ausgefuellt' | 'abgeschlossen' | 'abgelehnt'

// ── Vorlage-Typ-Info ──────────────────────────────────────────
function getTypInfo(typ: string | null | undefined): {
  icon: React.ReactNode
  label: string
  bg: string
  text: string
} {
  switch (typ) {
    case 'neukunde':
      return {
        icon: <UserPlus className="w-4 h-4" />,
        label: 'Neukunde',
        bg: 'bg-amber-50',
        text: 'text-amber-600',
      }
    case 'projekt':
      return {
        icon: <Briefcase className="w-4 h-4" />,
        label: 'Projekt',
        bg: 'bg-blue-50',
        text: 'text-blue-600',
      }
    default:
      return {
        icon: <Layers className="w-4 h-4" />,
        label: 'Universal',
        bg: 'bg-gray-100',
        text: 'text-gray-500',
      }
  }
}

// ── Status-Helfer ─────────────────────────────────────────────
//
// `kunde_name` ist KEIN zuverlässiger "ausgefüllt"-Indikator: bei verknüpftem
// Kunden wird er beim Link-Erstellen bereits vorausgefüllt. Wir prüfen daher:
// - V2-Flow: `antworten` enthält Daten
// - Legacy: `kunde_name` gesetzt UND kein Prefill-Kunde verlinkt
// - Status explizit `abgeschlossen`
function istEingereicht(a: OnboardingAnfrage): boolean {
  if (a.status === 'abgeschlossen') return true
  if (a.antworten && Object.keys(a.antworten as object).length > 0) return true
  if (a.kunde_name && !a.kunde_id) return true
  return false
}

function istBegonnen(a: OnboardingAnfrage): boolean {
  if (istEingereicht(a)) return false
  if (a.status === 'in_bearbeitung') return true
  if (a.auto_save && (a.fortschritt ?? 0) > 0) return true
  return false
}

// ── Badge-Konfiguration ───────────────────────────────────────
function getBadge(a: OnboardingAnfrage): { label: string; cls: string } {
  if (a.status === 'abgeschlossen') return { label: 'Abgeschlossen',    cls: 'bg-blue-100 text-blue-700' }
  if (a.status === 'abgelehnt')     return { label: 'Abgelehnt',        cls: 'bg-red-100 text-red-600' }
  if (istEingereicht(a))            return { label: 'Eingereicht',      cls: 'bg-emerald-100 text-emerald-700' }
  if (istBegonnen(a))               return { label: 'In Bearbeitung',   cls: 'bg-indigo-100 text-indigo-700' }
  if (a.kunde_id)                   return { label: 'Wartet auf Kunde', cls: 'bg-amber-100 text-amber-700' }
  return                                   { label: 'Wartet auf Eintrag', cls: 'bg-gray-100 text-gray-600' }
}

function formatAbstand(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const std = Math.floor(ms / 3_600_000)
  if (std < 1)   return 'gerade eben'
  if (std < 24)  return `vor ${std} Std.`
  const tage = Math.floor(std / 24)
  if (tage === 1) return 'gestern'
  if (tage < 30)  return `vor ${tage} Tg.`
  const monate = Math.floor(tage / 30)
  if (monate < 12) return `vor ${monate} Mon.`
  return `vor ${Math.floor(monate / 12)} J.`
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
  kunden,
  onClose,
}: {
  vorlagen: OnboardingVorlage[]
  kunden: { id: string; name: string }[]
  onClose: () => void
}) {
  const standard = vorlagen.find((v) => v.ist_standard)
  const [gewaehlt, setGewaehlt]       = useState<string>(standard?.id ?? vorlagen[0]?.id ?? '')
  const [kundeId, setKundeId]         = useState<string>('')
  const [kopiert, setKopiert]         = useState(false)
  const [isPending, startTransition]  = useTransition()

  const aktuelleVorlage = vorlagen.find((v) => v.id === gewaehlt)
  const istProjektVorlage = aktuelleVorlage?.typ === 'projekt'

  // Wenn von Projekt- zu Nicht-Projekt-Vorlage gewechselt wird,
  // die Kunde-Auswahl zurücksetzen.
  function handleVorlageWechsel(id: string) {
    const neueVorlage = vorlagen.find((v) => v.id === id)
    if (neueVorlage?.typ !== 'projekt') {
      setKundeId('')
    }
    setGewaehlt(id)
  }

  function handleErstellen() {
    if (!gewaehlt) return
    startTransition(async () => {
      const { pfad } = await onboardingLinkErstellen(
        gewaehlt || null,
        kundeId || null,
      )
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Neuen Onboarding-Link erstellen</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pb-4 overflow-y-auto flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vorlage auswählen
          </label>
          <div className="space-y-2">
            {vorlagen.map((v) => {
              const aktiv = gewaehlt === v.id
              const typInfo = getTypInfo(v.typ)
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleVorlageWechsel(v.id)}
                  className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                    aktiv
                      ? 'border-wellbeing-green bg-wellbeing-green/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div
                    className={`mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${typInfo.bg} ${typInfo.text}`}
                  >
                    {typInfo.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{v.name}</p>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${typInfo.bg} ${typInfo.text}`}>
                        {typInfo.label}
                      </span>
                      {v.ist_standard && (
                        <span className="text-[10px] font-semibold text-wellbeing-green bg-wellbeing-green/10 px-1.5 py-0.5 rounded-full">
                          Standard
                        </span>
                      )}
                    </div>
                    {v.beschreibung && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{v.beschreibung}</p>
                    )}
                    <p className="text-[11px] text-gray-400 mt-0.5">{v.fragen.length} Fragen</p>
                  </div>
                  <div
                    className={`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      aktiv ? 'border-wellbeing-green bg-wellbeing-green' : 'border-gray-300'
                    }`}
                  >
                    {aktiv && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Kunden-Dropdown für Projekt-Vorlagen */}
          {istProjektVorlage && (
            <div className="mt-4 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Kunden verknüpfen
                <span className="ml-1.5 text-[11px] font-normal text-gray-400">(optional)</span>
              </label>
              <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">
                Wähle einen bestehenden Kunden — dann werden Kontaktdaten
                automatisch vorausgefüllt und der Link der Person zugeordnet.
              </p>
              {kunden.length === 0 ? (
                <p className="text-xs text-gray-400 italic px-3 py-2 bg-white border border-gray-100 rounded-lg">
                  Noch keine Kunden angelegt.
                </p>
              ) : (
                <select
                  value={kundeId}
                  onChange={(e) => setKundeId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-wellbeing-green focus:ring-2 focus:ring-wellbeing-green/20 transition-all"
                >
                  <option value="">— Kein Kunde (neu erfassen) —</option>
                  {kunden.map((k) => (
                    <option key={k.id} value={k.id}>{k.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <Link
            href="/dashboard/onboarding/vorlagen"
            className="flex items-center gap-1.5 mt-3 text-xs text-gray-400 hover:text-wellbeing-green transition-colors"
          >
            <Settings2 className="w-3 h-3" />
            Vorlagen verwalten
          </Link>
        </div>

        <div className="px-6 pt-3 pb-6 shrink-0 border-t border-gray-100">
          <button
            onClick={handleErstellen}
            disabled={isPending || kopiert || !gewaehlt}
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
  vorlageName,
  verknuepfterKundeName,
  onLoeschenStart,
}: {
  anfrage: OnboardingAnfrage
  vorlageName?: string
  verknuepfterKundeName?: string
  onLoeschenStart: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [kopiert, setKopiert]        = useState(false)
  const [fehler, setFehler]          = useState<string | null>(null)
  const offen = anfrage.status === 'offen' || anfrage.status === 'in_bearbeitung'
  const hatDaten = istEingereicht(anfrage)
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
        <div className="bg-white border border-gray-100 rounded-xl p-4 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            {istBegonnen(anfrage) ? 'Status: In Bearbeitung' : 'Status: Wartet auf Eintrag'}
          </p>
          <dl className="space-y-2.5 text-sm">
            <div className="flex items-start gap-2">
              <User className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <dt className="text-[11px] text-gray-400">Adressat</dt>
                <dd className="text-gray-700">
                  {verknuepfterKundeName
                    ? <>Verknüpft mit <span className="font-medium">{verknuepfterKundeName}</span></>
                    : 'Kein Kunde verknüpft – Link wartet auf Eintrag durch einen neuen Interessenten.'}
                </dd>
              </div>
            </div>
            {vorlageName && (
              <div className="flex items-start gap-2">
                <Layers className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <dt className="text-[11px] text-gray-400">Vorlage</dt>
                  <dd className="text-gray-700">{vorlageName}</dd>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Clock className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <dt className="text-[11px] text-gray-400">Erstellt</dt>
                <dd className="text-gray-700">{formatDatum(anfrage.created_at)} ({formatAbstand(anfrage.created_at)})</dd>
              </div>
            </div>
            {istBegonnen(anfrage) && (
              <div className="flex items-start gap-2">
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <dt className="text-[11px] text-gray-400">Fortschritt</dt>
                  <dd className="text-gray-700">{anfrage.fortschritt ?? 0} % · letzte Aktivität {formatAbstand(anfrage.updated_at)}</dd>
                </div>
              </div>
            )}
          </dl>
          <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
            Tipp: Kopiere den Link unten und schicke ihn per E-Mail / Chat. Sobald der Kunde das Formular einreicht, erscheinen seine Antworten hier.
          </p>
        </div>
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

type StatTone = 'gray' | 'amber' | 'emerald' | 'blue'

const STAT_TONE: Record<StatTone, { iconBg: string; iconText: string }> = {
  gray:    { iconBg: 'bg-gray-100',    iconText: 'text-gray-500' },
  amber:   { iconBg: 'bg-amber-50',    iconText: 'text-amber-600' },
  emerald: { iconBg: 'bg-emerald-50',  iconText: 'text-emerald-600' },
  blue:    { iconBg: 'bg-blue-50',     iconText: 'text-blue-600' },
}

function StatCard({
  icon,
  label,
  value,
  tone = 'gray',
  highlight,
}: {
  icon: React.ReactNode
  label: string
  value: number
  tone?: StatTone
  highlight?: boolean
}) {
  const toneCls = STAT_TONE[tone]
  return (
    <div
      className={`rounded-xl px-4 py-3 flex items-center gap-3 border bg-white transition-colors ${
        highlight ? 'border-emerald-200 shadow-sm' : 'border-gray-100'
      }`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${toneCls.iconBg} ${toneCls.iconText}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider leading-none">
          {label}
        </p>
        <p className="text-2xl font-semibold text-gray-900 leading-tight mt-1 tabular-nums">
          {value}
        </p>
      </div>
    </div>
  )
}

function FilterTab({
  aktiv,
  onClick,
  label,
  count,
  highlight,
}: {
  aktiv: boolean
  onClick: () => void
  label: string
  count: number
  highlight?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
        aktiv
          ? 'bg-wellbeing-green/10 text-wellbeing-green-dark'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      }`}
    >
      <span>{label}</span>
      <span
        className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums ${
          aktiv
            ? 'bg-wellbeing-green text-white'
            : highlight && count > 0
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
        }`}
      >
        {count}
      </span>
    </button>
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
  kunden = [],
}: {
  anfragen: OnboardingAnfrage[]
  vorlagen: OnboardingVorlage[]
  kunden?: { id: string; name: string }[]
}) {
  const [offeneId, setOffeneId]         = useState<string | null>(null)
  const [modalOffen, setModalOffen]     = useState(false)
  const [loeschenId, setLoeschenId]     = useState<string | null>(null)
  const [filter, setFilter]             = useState<FilterTyp>('alle')
  const [isPendingDel, startDeleteTransition] = useTransition()

  const gesamt             = anfragen.length
  const offenCount         = anfragen.filter((a) => (a.status === 'offen' || a.status === 'in_bearbeitung') && !istEingereicht(a)).length
  const ausgefuelltCount   = anfragen.filter((a) => istEingereicht(a) && a.status !== 'abgeschlossen').length
  const abgeschlossenCount = anfragen.filter((a) => a.status === 'abgeschlossen').length
  const abgelehntCount     = anfragen.filter((a) => a.status === 'abgelehnt').length

  const vorlagenMap = new Map(vorlagen.map((v) => [v.id, v]))
  const kundenMap   = new Map(kunden.map((k) => [k.id, k.name]))

  const anfragenGefiltert = anfragen.filter((a) => {
    if (filter === 'alle')          return true
    if (filter === 'offen')         return (a.status === 'offen' || a.status === 'in_bearbeitung') && !istEingereicht(a)
    if (filter === 'ausgefuellt')   return istEingereicht(a) && a.status !== 'abgeschlossen'
    if (filter === 'abgeschlossen') return a.status === 'abgeschlossen'
    if (filter === 'abgelehnt')     return a.status === 'abgelehnt'
    return true
  })

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
        <LinkErstellenModal
          vorlagen={vorlagen}
          kunden={kunden}
          onClose={() => setModalOffen(false)}
        />
      )}

      <div className="h-full flex flex-col">

        {/* ── Header + Stats ──────────────────────────────────── */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 shrink-0">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Onboarding</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Personalisierte Links für neue Anfragen und Projekte
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/dashboard/onboarding/vorlagen"
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-500 border border-gray-200 hover:border-gray-300 rounded-lg transition-colors"
              >
                <Settings2 className="w-4 h-4" />
                Vorlagen
              </Link>
              <button
                onClick={() => setModalOffen(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-wellbeing-green hover:bg-wellbeing-green-dark rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Neuer Link
              </button>
            </div>
          </div>

          {/* Stat-Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={<Inbox className="w-4 h-4" />}         label="Gesamt"        value={gesamt}           tone="gray" />
            <StatCard icon={<Clock className="w-4 h-4" />}         label="Offen"         value={offenCount}       tone="amber" />
            <StatCard icon={<User className="w-4 h-4" />}          label="Ausgefüllt"    value={ausgefuelltCount} tone="emerald" highlight={ausgefuelltCount > 0} />
            <StatCard icon={<CheckCircle2 className="w-4 h-4" />}  label="Abgeschlossen" value={abgeschlossenCount} tone="blue" />
          </div>
        </div>

        {/* ── Filter-Tabs ──────────────────────────────────────── */}
        {anfragen.length > 0 && (
          <div className="bg-white border-b border-gray-100 px-6 shrink-0 overflow-x-auto">
            <div className="flex items-center gap-1 py-2 min-w-max">
              <FilterTab aktiv={filter === 'alle'}          onClick={() => setFilter('alle')}          label="Alle"          count={gesamt} />
              <FilterTab aktiv={filter === 'offen'}         onClick={() => setFilter('offen')}         label="Offen"         count={offenCount} />
              <FilterTab aktiv={filter === 'ausgefuellt'}   onClick={() => setFilter('ausgefuellt')}   label="Ausgefüllt"    count={ausgefuelltCount} highlight />
              <FilterTab aktiv={filter === 'abgeschlossen'} onClick={() => setFilter('abgeschlossen')} label="Abgeschlossen" count={abgeschlossenCount} />
              {abgelehntCount > 0 && (
                <FilterTab aktiv={filter === 'abgelehnt'}   onClick={() => setFilter('abgelehnt')}     label="Abgelehnt"     count={abgelehntCount} />
              )}
            </div>
          </div>
        )}

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
          ) : anfragenGefiltert.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <Inbox className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800 mb-1">Keine Einträge in diesem Filter</h3>
              <p className="text-xs text-gray-400 max-w-xs mb-4">
                Wechsle zurück auf „Alle“ oder wähle einen anderen Status.
              </p>
              <button
                onClick={() => setFilter('alle')}
                className="px-3 py-1.5 text-xs font-medium text-wellbeing-green border border-wellbeing-green/20 hover:bg-wellbeing-green/5 rounded-lg transition-colors"
              >
                Alle anzeigen
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {anfragenGefiltert.map((anfrage) => {
                const badge       = getBadge(anfrage)
                const vorlage     = anfrage.vorlage_id ? vorlagenMap.get(anfrage.vorlage_id) : undefined
                const typInfo     = getTypInfo(vorlage?.typ)
                const istOffen    = offeneId === anfrage.id
                const loeschen    = loeschenId === anfrage.id
                const eingereicht = istEingereicht(anfrage)
                const begonnen    = istBegonnen(anfrage)
                const kundeName   = anfrage.kunde_id ? kundenMap.get(anfrage.kunde_id) ?? anfrage.kunde_name : anfrage.kunde_name
                // Subtitle baut sich je nach Status zusammen, damit der Admin
                // sofort sieht: für wen ist der Link, was muss noch passieren.
                const subtitleTeile: string[] = []
                if (vorlage)              subtitleTeile.push(vorlage.name)
                if (eingereicht)          subtitleTeile.push(`Eingereicht ${formatAbstand(anfrage.updated_at)}`)
                else if (begonnen)        subtitleTeile.push(`Begonnen · ${anfrage.fortschritt ?? 0} %`)
                else                       subtitleTeile.push(`Erstellt ${formatAbstand(anfrage.created_at)}`)
                return (
                  <div
                    key={anfrage.id}
                    className={`bg-white border rounded-xl overflow-hidden transition-all ${
                      istOffen
                        ? 'border-wellbeing-green/40 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* ── Zeile ──────────────────────────────── */}
                    <button
                      type="button"
                      onClick={() => {
                        setOffeneId(istOffen ? null : anfrage.id)
                        setLoeschenId(null)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50/80 transition-colors"
                    >
                      {/* Typ-Avatar */}
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${typInfo.bg} ${typInfo.text}`}
                        title={typInfo.label}
                      >
                        {typInfo.icon}
                      </div>

                      {/* Name / Adressat + Subtitle */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {kundeName ?? 'Neuer Onboarding-Link'}
                          </p>
                          {anfrage.kunde_id && !eingereicht && (
                            <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full shrink-0">
                              Wartet auf Antwort
                            </span>
                          )}
                          {!anfrage.kunde_id && !eingereicht && !begonnen && (
                            <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0">
                              Noch nicht versendet?
                            </span>
                          )}
                          {anfrage.projekt_name && (
                            <span className="text-[11px] text-gray-400 truncate hidden sm:inline">
                              · {anfrage.projekt_name}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">
                          {subtitleTeile.join(' · ')}
                          {eingereicht && anfrage.kunde_email && (
                            <span className="text-gray-500"> · {anfrage.kunde_email}</span>
                          )}
                        </p>
                      </div>

                      {/* Meta rechts: Vorlage-Badge + Status + Datum */}
                      <div className="hidden md:flex flex-col items-end gap-1 shrink-0 max-w-[180px]">
                        <div className="flex items-center gap-1.5">
                          {vorlage && (
                            <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full truncate max-w-[120px]">
                              {vorlage.name}
                            </span>
                          )}
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400">
                          {eingereicht
                            ? `Eingereicht ${formatDatum(anfrage.updated_at)}`
                            : `Erstellt ${formatDatum(anfrage.created_at)}`}
                        </p>
                      </div>

                      {/* Status-Badge nur Mobile */}
                      <span className={`md:hidden text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${badge.cls}`}>
                        {badge.label}
                      </span>

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
                        vorlageName={vorlage?.name}
                        verknuepfterKundeName={anfrage.kunde_id ? kundenMap.get(anfrage.kunde_id) : undefined}
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

    </>
  )
}
