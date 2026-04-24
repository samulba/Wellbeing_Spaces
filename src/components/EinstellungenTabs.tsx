'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState, useTransition } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  saveAllgemein,
  saveFreigabeLinks,
  saveBenachrichtigungen,
  type EinstellungActionState,
} from '@/app/actions/einstellungen'
import {
  mitgliedEinladen,
  rolleAendern,
  mitgliedEntfernen,
  mitgliedReaktivieren,
  einladungZurueckziehen,
  type TeamActionState,
} from '@/app/actions/team'
import { updatePasswort, benutzerNamenAktualisieren, type ProfilActionState } from '@/app/actions/profil'
import {
  firmaAktualisieren,
  slugAendern,
  rechtsangabenAktualisieren,
  firmenDefaultsAktualisieren,
  type FirmaActionState,
} from '@/app/actions/organisation'
import AvatarUpload from './AvatarUpload'
import type { TeamMitglied, Rolle, Branding, Organisation, Rechtsform } from '@/lib/supabase/types'
import { ROLLEN_CONFIG } from '@/lib/permissions'
import HandbuchClient from '@/app/dashboard/einstellungen/handbuch/HandbuchClient'
import BrandingEditor from '@/components/BrandingEditor'
import VertragsVorlagenVerwaltung from '@/components/VertragsVorlagenVerwaltung'
import type { VertragsVorlage } from '@/lib/supabase/types'
import { ConfirmModal } from '@/components/ConfirmModal'
import ChangelogTab from '@/components/ChangelogTab'
import type { ChangelogEntry } from '@/lib/changelog'

// ── Konstanten ────────────────────────────────────────────────

const TABS = [
  { key: 'profil',             label: 'Profil' },
  { key: 'firma',              label: 'Firma' },
  { key: 'workspace',          label: 'Workspace' },
  { key: 'branding',           label: 'Branding' },
  { key: 'team',               label: 'Team' },
  { key: 'vorlagen',           label: 'Vorlagen' },
  { key: 'freigaben',          label: 'Freigaben' },
  { key: 'benachrichtigungen', label: 'Benachrichtigungen' },
  { key: 'abrechnung',         label: 'Abrechnung' },
  { key: 'rechtliches',        label: 'Rechtliches' },
  { key: 'handbuch',           label: 'Handbuch' },
  { key: 'changelog',          label: 'Änderungen' },
]

const RECHTSFORMEN: Rechtsform[] = [
  'GmbH', 'GbR', 'Einzelunternehmen', 'UG (haftungsbeschränkt)',
  'AG', 'e.K.', 'OHG', 'KG', 'Sonstige',
]

const ZEITZONEN = [
  'Europe/Berlin', 'Europe/Vienna', 'Europe/Zurich', 'Europe/London',
  'Europe/Paris', 'Europe/Amsterdam', 'Europe/Madrid', 'Europe/Rome',
  'Europe/Warsaw', 'Europe/Stockholm', 'America/New_York', 'America/Chicago',
  'America/Denver', 'America/Los_Angeles', 'America/Sao_Paulo',
  'Asia/Dubai', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Singapore', 'Australia/Sydney',
]

// ── Gemeinsame UI-Helfer ──────────────────────────────────────

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
    >
      {pending ? 'Speichern…' : label}
    </button>
  )
}

type AnyState = EinstellungActionState | TeamActionState | ProfilActionState | FirmaActionState

function Meldung({ state }: { state: AnyState }) {
  if (!state) return null
  if (state.fehler) return <p className="text-xs text-red-500">{state.fehler}</p>
  if (state.erfolg) return <p className="text-xs text-emerald-600">{state.erfolg}</p>
  return null
}

function Feld({
  label, name, defaultValue, value, onChange, type = 'text',
  required, min, max, step, hint, placeholder, disabled,
}: {
  label: string; name: string
  defaultValue?: string
  value?: string
  onChange?: (v: string) => void
  type?: string
  required?: boolean; min?: string; max?: string; step?: string; hint?: string
  placeholder?: string
  disabled?: boolean
}) {
  const kontrolliert = value !== undefined
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      <input
        name={name} type={type}
        {...(kontrolliert
          ? { value, onChange: (e) => onChange?.(e.target.value) }
          : { defaultValue })}
        required={required} min={min} max={max} step={step} placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green-light ${
          disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''
        }`}
      />
    </div>
  )
}

function TextareaFeld({
  label, name, defaultValue, hint, placeholder, rows = 4, disabled,
}: {
  label: string; name: string; defaultValue?: string; hint?: string
  placeholder?: string; rows?: number; disabled?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      <textarea
        name={name} defaultValue={defaultValue} rows={rows} placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green-light font-mono leading-relaxed ${
          disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''
        }`}
      />
    </div>
  )
}

function AuswahlFeld({
  label, name, defaultValue, optionen, hint, disabled, leererWert,
}: {
  label: string; name: string; defaultValue?: string
  optionen: { wert: string; label: string }[]; hint?: string
  disabled?: boolean
  leererWert?: string  // Wenn gesetzt, wird eine leere Option als erste angezeigt
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      <div className="relative">
        <select
          name={name} defaultValue={defaultValue}
          disabled={disabled}
          className={`w-full px-3 py-2 pr-9 text-sm border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-wellbeing-green-light bg-white ${
            disabled ? 'text-gray-500 cursor-not-allowed bg-gray-50' : ''
          }`}
        >
          {leererWert !== undefined && <option value="">{leererWert}</option>}
          {optionen.map((o) => <option key={o.wert} value={o.wert}>{o.label}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  )
}

function Abschnitt({
  titel, beschreibung, children,
}: {
  titel: string; beschreibung?: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <h3 className="text-sm font-semibold text-gray-900">{titel}</h3>
        {beschreibung && <p className="text-xs text-gray-500 mt-0.5">{beschreibung}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

// ── Tab: Profil ───────────────────────────────────────────────

function ProfilTab({
  userEmail,
  userAvatarUrl,
  userVorname,
  userNachname,
  lastSignIn,
}: {
  userEmail: string
  userAvatarUrl: string | null
  userVorname: string | null
  userNachname: string | null
  lastSignIn: string | null
}) {
  const [passwortState, passwortAction] = useFormState(updatePasswort, null)
  const [namenState,    namenAction]    = useFormState(benutzerNamenAktualisieren, null)

  const nameLabel = [userVorname, userNachname].filter(Boolean).join(' ') || userEmail

  const letzteAnmeldung = lastSignIn
    ? new Date(lastSignIn).toLocaleString('de-DE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : 'Unbekannt'

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Profilbild */}
      <Abschnitt titel="Profilbild" beschreibung="Erscheint im Team-Tab und in Kommentaren">
        <AvatarUpload initialUrl={userAvatarUrl} userLabel={nameLabel} />
      </Abschnitt>

      {/* Name */}
      <Abschnitt titel="Dein Name" beschreibung="Wie andere dich im Team sehen">
        <form action={namenAction} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Feld label="Vorname"  name="vorname"  defaultValue={userVorname  ?? ''} placeholder="Max" />
            <Feld label="Nachname" name="nachname" defaultValue={userNachname ?? ''} placeholder="Mustermann" />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <SubmitButton label="Name speichern" />
            <Meldung state={namenState} />
          </div>
        </form>
      </Abschnitt>

      {/* Konto-Info */}
      <Abschnitt titel="Mein Konto" beschreibung="Persönliche Anmeldedaten">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">E-Mail-Adresse</label>
            <p className="text-sm text-gray-700 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">{userEmail}</p>
            <p className="text-[11px] text-gray-400 mt-1">E-Mail-Änderung erfordert Bestätigung per E-Mail.</p>
          </div>
        </div>
      </Abschnitt>

      {/* Passwort */}
      <Abschnitt titel="Passwort ändern" beschreibung="Mindestens 6 Zeichen">
        <form action={passwortAction} className="space-y-4">
          <Feld label="Neues Passwort" name="passwort" type="password" required />
          <Feld label="Passwort bestätigen" name="bestaetigung" type="password" required />
          <div className="flex items-center gap-3 pt-1">
            <SubmitButton label="Passwort ändern" />
            <Meldung state={passwortState} />
          </div>
        </form>
      </Abschnitt>

      {/* Aktive Sessions */}
      <Abschnitt titel="Aktive Sessions" beschreibung="Aktuell angemeldete Geräte">
        <div className="border border-gray-100 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-white">
            <div>
              <p className="text-sm font-medium text-gray-900">Aktuelle Sitzung</p>
              <p className="text-xs text-gray-400 mt-0.5">{userEmail}</p>
            </div>
            <div className="text-right">
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                Aktiv
              </span>
              <p className="text-xs text-gray-400 mt-1">Zuletzt: {letzteAnmeldung}</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Weitere Session-Verwaltung wird in einer zukünftigen Version verfügbar sein.
        </p>
      </Abschnitt>
    </div>
  )
}

// ── Tab: Workspace ────────────────────────────────────────────

function WorkspaceTab({
  einstellungen,
  organisation,
  istAdmin,
}: {
  einstellungen: Record<string, string>
  organisation: Organisation | null
  istAdmin: boolean
}) {
  const [state, action] = useFormState(saveAllgemein, null)
  const [defaultsState, defaultsAction] = useFormState(firmenDefaultsAktualisieren, null)
  const e = einstellungen

  return (
    <div className="space-y-6 max-w-2xl">
      <Abschnitt titel="Anwendung" beschreibung="Grundlegende Einstellungen Ihrer Instanz">
        <form action={action} className="space-y-5">
          <Feld
            label="App-Name" name="app_name" defaultValue={e.app_name ?? 'Studio'} required
            hint="Wird in der Seitenleiste und auf Freigabelinks angezeigt."
          />
          <div className="grid grid-cols-2 gap-4">
            <AuswahlFeld
              label="Standardwährung" name="standardwaehrung" defaultValue={e.standardwaehrung ?? 'EUR'}
              optionen={[
                { wert: 'EUR', label: 'Euro (EUR)' },
                { wert: 'CHF', label: 'Schweizer Franken (CHF)' },
                { wert: 'USD', label: 'US-Dollar (USD)' },
              ]}
            />
            <Feld
              label="MwSt.-Satz (%)" name="mwst_satz" type="number"
              defaultValue={e.mwst_satz ?? '19'} required min="0" max="100" step="0.01"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <AuswahlFeld
              label="Sprache" name="sprache" defaultValue={e.sprache ?? 'Deutsch'}
              optionen={[
                { wert: 'Deutsch', label: 'Deutsch' },
                { wert: 'English', label: 'English' },
              ]}
            />
            <AuswahlFeld
              label="Zeitzone" name="zeitzone" defaultValue={e.zeitzone ?? 'Europe/Berlin'}
              optionen={ZEITZONEN.map((z) => ({ wert: z, label: z }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <AuswahlFeld
              label="Datumsformat" name="datumsformat" defaultValue={e.datumsformat ?? 'DD.MM.YYYY'}
              optionen={[
                { wert: 'DD.MM.YYYY', label: 'DD.MM.YYYY (31.12.2025)' },
                { wert: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2025)' },
                { wert: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2025-12-31)' },
              ]}
            />
            <Feld
              label="Budget-Warnschwelle (%)" name="budget_warnschwelle" type="number"
              defaultValue={e.budget_warnschwelle ?? '80'} min="1" max="100"
              hint="Ab wann eine Budget-Warnung angezeigt wird."
            />
          </div>
          <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
            <SubmitButton label="Einstellungen speichern" />
            <Meldung state={state} />
          </div>
        </form>
      </Abschnitt>

      {/* ── Firmen-Defaults ────────────────────────────────── */}
      <Abschnitt titel="Firmen-Defaults" beschreibung="Vorgabewerte für neue Angebote und Verträge.">
        <form action={defaultsAction} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Feld
              label="Standard-Zahlungsziel" name="standard_zahlungsziel_tage" type="number"
              defaultValue={(organisation?.standard_zahlungsziel_tage ?? 14).toString()}
              min="0" max="365" step="1"
              hint="In Tagen. Typisch: 14. Wird bei neuen Angeboten + Rechnungen vorbelegt."
              disabled={!istAdmin}
            />
            <Feld
              label="Standard-Angebotsgültigkeit" name="standard_angebot_gueltigkeit_tage" type="number"
              defaultValue={(organisation?.standard_angebot_gueltigkeit_tage ?? 30).toString()}
              min="0" max="365" step="1"
              hint={`In Tagen. Typisch: 30. Wird bei neuen Angeboten als "gültig bis" vorbelegt.`}
              disabled={!istAdmin}
            />
          </div>
          {istAdmin && (
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              <SubmitButton label="Defaults speichern" />
              <Meldung state={defaultsState} />
            </div>
          )}
        </form>
      </Abschnitt>

      {/* Platzhalter: DSGVO / Account */}
      <Abschnitt titel="Daten & Konto" beschreibung="Datenschutz und Kontoverwaltung">
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-gray-800">DSGVO-Export</p>
              <p className="text-xs text-gray-500 mt-0.5">Alle Ihre Daten als ZIP herunterladen</p>
            </div>
            <button disabled className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-400 cursor-not-allowed">
              Bald verfügbar
            </button>
          </div>
          <div className="h-px bg-gray-100" />
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-red-600">Konto löschen</p>
              <p className="text-xs text-gray-500 mt-0.5">Alle Daten unwiderruflich entfernen</p>
            </div>
            <button disabled className="px-3 py-1.5 text-xs font-medium border border-red-200 rounded-lg text-red-400 cursor-not-allowed">
              Bald verfügbar
            </button>
          </div>
        </div>
      </Abschnitt>
    </div>
  )
}

// ── Tab: Firma ─────────────────────────────────────────────────

function FirmaTab({
  organisation,
  istAdmin,
}: {
  organisation: Organisation | null
  istAdmin: boolean
}) {
  const [basisState, basisAction]   = useFormState(firmaAktualisieren, null)
  const [slugState, slugAction]     = useFormState(slugAendern, null)
  const [slugModalOffen, setSlugModalOffen] = useState(false)
  const [neuerSlug, setNeuerSlug]   = useState(organisation?.slug ?? '')

  if (!organisation) {
    return (
      <div className="max-w-2xl">
        <p className="text-sm text-gray-500">Keine Organisation geladen.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Basisdaten */}
      <Abschnitt titel="Firma" beschreibung="Identität deiner Firma. Wird auf Freigabelinks, Mails und im Portal angezeigt.">
        <form action={basisAction} className="space-y-5">
          <Feld
            label="Firmenname" name="name" defaultValue={organisation.name} required
            hint="So heißt deine Firma offiziell – erscheint in Mails + Kundenportal."
            disabled={!istAdmin}
          />
          <div className="grid grid-cols-2 gap-4">
            <Feld
              label="Kontakt-E-Mail" name="email" type="email"
              defaultValue={organisation.email ?? ''}
              placeholder="info@deine-firma.de"
              disabled={!istAdmin}
            />
            <Feld
              label="Telefon" name="telefon"
              defaultValue={organisation.telefon ?? ''}
              placeholder="+49 …"
              disabled={!istAdmin}
            />
          </div>
          <Feld
            label="Website" name="website" type="url"
            defaultValue={organisation.website ?? ''}
            placeholder="https://deine-firma.de"
            disabled={!istAdmin}
          />
          <Feld
            label="Adresse" name="adresse"
            defaultValue={organisation.adresse ?? ''}
            placeholder="Musterstraße 12, 12345 Musterstadt"
            hint="Vollständige Geschäftsadresse. Wird u. a. im Impressum genutzt."
            disabled={!istAdmin}
          />
          <Feld
            label="Logo-URL" name="logo_url" type="url"
            defaultValue={organisation.logo_url ?? ''}
            placeholder="https://…/logo.png"
            hint="Öffentlich erreichbare URL. Upload-Feld kommt später."
            disabled={!istAdmin}
          />
          {istAdmin && (
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              <SubmitButton label="Firmendaten speichern" />
              <Meldung state={basisState} />
            </div>
          )}
        </form>
      </Abschnitt>

      {/* Login-Slug */}
      <Abschnitt titel="Login-Slug" beschreibung="Der Slug ist Teil der Login-URL deiner Firma.">
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4">
            <p className="text-[11px] uppercase tracking-wide font-semibold text-gray-500 mb-1">Aktueller Login-Link</p>
            <p className="text-sm font-mono text-gray-800">
              app.wellbeing-spaces.de/login?firma=
              <span className="text-wellbeing-green font-semibold">{organisation.slug ?? '–'}</span>
            </p>
          </div>
          {istAdmin && (
            <button
              type="button"
              onClick={() => { setNeuerSlug(organisation.slug ?? ''); setSlugModalOffen(true) }}
              className="px-4 py-2 text-xs font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              Slug ändern
            </button>
          )}
        </div>
      </Abschnitt>

      {/* Slug-Änderungs-Modal */}
      {slugModalOffen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSlugModalOffen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 p-6">
            <h3 className="font-syne font-bold text-[18px] text-gray-900 mb-1">Slug ändern?</h3>
            <p className="text-[13px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4 leading-relaxed">
              ⚠️ Nach der Änderung müssen sich <strong>alle Teammitglieder</strong> mit dem neuen Slug neu einloggen. Alte Login-Links funktionieren nicht mehr.
            </p>
            <form action={slugAction} className="space-y-4">
              <Feld
                label="Neuer Slug" name="slug"
                value={neuerSlug}
                onChange={(v) => setNeuerSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="deine-firma"
                hint="Nur Kleinbuchstaben, Ziffern, Bindestriche. 2–60 Zeichen."
                required
              />
              {slugState?.fehler && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{slugState.fehler}</p>
              )}
              {slugState?.erfolg && (
                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">{slugState.erfolg}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSlugModalOffen(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-[13px] font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Abbrechen
                </button>
                <SlugSaveButton />
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function SlugSaveButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex-1 py-2.5 bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 text-white text-[13px] font-semibold rounded-xl transition-colors"
    >
      {pending ? 'Speichern…' : 'Slug ändern'}
    </button>
  )
}

// ── Tab: Branding ─────────────────────────────────────────────

function BrandingTab({ branding }: { branding: Branding | null }) {
  return (
    <div>
      <div className="mb-5">
        <p className="text-sm text-gray-500">Farben, Logo und Erscheinungsbild für Kundenansichten</p>
      </div>
      <BrandingEditor branding={branding} />
    </div>
  )
}

// ── Tab: Team ─────────────────────────────────────────────────

const AVATAR_FARBEN = ['bg-wellbeing-green', 'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500']
function avatarFarbe(s: string) { return AVATAR_FARBEN[s.charCodeAt(0) % AVATAR_FARBEN.length] }
function avatarKuerzel(email: string) {
  const local = email.split('@')[0]
  const parts = local.split(/[._-]/)
  if (parts.length >= 2 && parts[0] && parts[1]) return (parts[0][0] + parts[1][0]).toUpperCase()
  return local.slice(0, 2).toUpperCase()
}
function zeitstempelAnzeige(iso: string | null | undefined): string {
  if (!iso) return '–'
  const d = new Date(iso)
  const heute = new Date()
  if (d.toDateString() === heute.toDateString())
    return 'Heute, ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function TeamTab({
  team, userRolle, userId, userEmail, lastSignIn,
}: {
  team: TeamMitglied[]
  userRolle: Rolle
  userId: string
  userEmail: string
  lastSignIn: string | null
}) {
  const [einladenOffen, setEinladenOffen] = useState(false)
  const [offenesMenue, setOffenesMenue]   = useState<string | null>(null)
  const [confirmDeaktivId, setConfirmDeaktivId] = useState<string | null>(null)
  const [einladeState, einladeAction]     = useFormState(mitgliedEinladen, null)
  const [, startTransition]               = useTransition()
  const confirmMitglied = team.find(m => m.id === confirmDeaktivId)
  const istAdmin = userRolle === 'admin'

  const aktive      = team.filter((m) => m.status === 'aktiv')
  const ausstehend  = team.filter((m) => m.status === 'ausstehend')
  const deaktiviert = team.filter((m) => m.status === 'deaktiviert')
  const currentUserInList = aktive.some((m) => m.user_id === userId || m.email === userEmail)

  function handleRolleAendern(mitgliedId: string, neueRolle: Rolle) {
    setOffenesMenue(null)
    startTransition(async () => { await rolleAendern(mitgliedId, neueRolle) })
  }

  function handleMitgliedDeaktivieren(id: string) {
    startTransition(async () => { await mitgliedEntfernen(id) })
    setConfirmDeaktivId(null)
    setOffenesMenue(null)
  }

  return (
    <>
    <ConfirmModal
      isOpen={confirmDeaktivId !== null}
      onClose={() => setConfirmDeaktivId(null)}
      onConfirm={() => confirmDeaktivId && handleMitgliedDeaktivieren(confirmDeaktivId)}
      title="Mitglied deaktivieren"
      message={confirmMitglied ? `${confirmMitglied.email} wird deaktiviert und kann sich nicht mehr anmelden.` : 'Dieses Mitglied wird deaktiviert.'}
      confirmText="Deaktivieren"
      variant="warning"
    />
    <div className="space-y-6 max-w-3xl">

      {/* Backdrop: schließt offene Dropdowns */}
      {offenesMenue && (
        <div className="fixed inset-0 z-10" onClick={() => setOffenesMenue(null)} />
      )}

      {/* ── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Team-Mitglieder</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {aktive.length + (currentUserInList ? 0 : 1)} aktiv
            {ausstehend.length > 0 ? ` · ${ausstehend.length} eingeladen` : ''}
          </p>
        </div>
        {istAdmin && (
          <button
            type="button"
            onClick={() => setEinladenOffen(true)}
            className="px-3 py-2 bg-wellbeing-green hover:bg-wellbeing-green-dark text-white text-xs font-medium rounded-lg transition-colors"
          >
            + Mitglied einladen
          </button>
        )}
      </div>

      {/* ── Aktive Mitglieder ─── */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Aktiv</p>
        </div>
        <ul className="divide-y divide-gray-100">
          {/* Aktueller User — immer zuerst wenn nicht in DB */}
          {!currentUserInList && (
            <li className="flex items-center gap-4 px-5 py-4 bg-wellbeing-green/[0.02]">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${avatarFarbe(userEmail)}`}>
                {avatarKuerzel(userEmail)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-900 truncate">{userEmail}</p>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-wellbeing-green/10 text-wellbeing-green shrink-0">Du</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Zuletzt aktiv: {zeitstempelAnzeige(lastSignIn)}</p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${ROLLEN_CONFIG.admin.badgeCls}`}>
                Admin
              </span>
            </li>
          )}

          {/* Mitglieder aus DB */}
          {aktive.map((m) => {
            const istCurrentUser = m.user_id === userId || m.email === userEmail
            const rollenInfo = ROLLEN_CONFIG[m.rolle] ?? ROLLEN_CONFIG.viewer
            const menuOffen = offenesMenue === m.id
            return (
              <li
                key={m.id}
                className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50/40 transition-colors ${istCurrentUser ? 'bg-wellbeing-green/[0.02]' : ''}`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${avatarFarbe(m.email)}`}>
                  {avatarKuerzel(m.email)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900 truncate">{m.email}</p>
                    {istCurrentUser && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-wellbeing-green/10 text-wellbeing-green shrink-0">Du</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Zuletzt aktiv: {istCurrentUser ? zeitstempelAnzeige(lastSignIn) : '–'}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${rollenInfo.badgeCls}`}>
                  {rollenInfo.label}
                </span>
                {istAdmin && !istCurrentUser && (
                  <div className="relative shrink-0 z-20">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setOffenesMenue(menuOffen ? null : m.id) }}
                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-bold"
                    >
                      ⋮
                    </button>
                    {menuOffen && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-30 overflow-hidden">
                        <div className="px-3 py-2.5 border-b border-gray-100">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Rolle</p>
                          <select
                            defaultValue={m.rolle}
                            onChange={(e) => handleRolleAendern(m.id, e.target.value as Rolle)}
                            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-wellbeing-green-light"
                          >
                            <option value="admin">Admin</option>
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        </div>
                        <div>
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2.5 text-xs text-red-500 hover:bg-red-50 transition-colors"
                            onClick={() => { setOffenesMenue(null); setConfirmDeaktivId(m.id) }}
                          >
                            Deaktivieren
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      {/* ── Ausstehende Einladungen ─── */}
      {ausstehend.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-amber-100 bg-amber-50/50">
            <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Ausstehend ({ausstehend.length})</p>
          </div>
          <ul className="divide-y divide-gray-100">
            {ausstehend.map((m) => {
              const rollenInfo = ROLLEN_CONFIG[m.rolle] ?? ROLLEN_CONFIG.viewer
              const zurueckziehenAction = einladungZurueckziehen.bind(null, m.id)
              const einladungsLink = m.einladungs_token ? `/einladung/${m.einladungs_token}` : null
              return (
                <li key={m.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/40 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-600 shrink-0">
                    {avatarKuerzel(m.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{m.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Eingeladen: {new Date(m.created_at).toLocaleDateString('de-DE')}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${rollenInfo.badgeCls}`}>
                    {rollenInfo.label}
                  </span>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700 shrink-0">Ausstehend</span>
                  {istAdmin && (
                    <div className="flex items-center gap-3 shrink-0">
                      {einladungsLink && (
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(window.location.origin + einladungsLink)}
                          className="text-xs text-wellbeing-green hover:text-wellbeing-green-dark transition-colors"
                        >
                          Link kopieren
                        </button>
                      )}
                      <form action={zurueckziehenAction}>
                        <button type="submit" className="text-xs text-red-400 hover:text-red-600 transition-colors">
                          Zurückziehen
                        </button>
                      </form>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* ── Deaktivierte ─── */}
      {deaktiviert.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden opacity-70">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Deaktiviert ({deaktiviert.length})</p>
          </div>
          <ul className="divide-y divide-gray-100">
            {deaktiviert.map((m) => {
              const reaktivierenAction = mitgliedReaktivieren.bind(null, m.id)
              return (
                <li key={m.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/40 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                    {avatarKuerzel(m.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-500 truncate">{m.email}</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-600 shrink-0">Deaktiviert</span>
                  {istAdmin && (
                    <form action={reaktivierenAction} className="shrink-0">
                      <button type="submit" className="text-xs text-emerald-600 hover:text-emerald-700 transition-colors">
                        Reaktivieren
                      </button>
                    </form>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* ── Einladungs-Modal ─── */}
      {einladenOffen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setEinladenOffen(false) }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Mitglied einladen</h3>
              <button
                type="button"
                onClick={() => setEinladenOffen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <form action={einladeAction} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">E-Mail-Adresse</label>
                  <input
                    name="email" type="email" required autoFocus
                    placeholder="name@firma.de"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green/25 focus:border-wellbeing-green-light transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Rolle</label>
                  <select
                    name="rolle" defaultValue="editor"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green/25 bg-white transition"
                  >
                    <option value="viewer">Viewer — nur lesen</option>
                    <option value="editor">Editor — bearbeiten</option>
                    <option value="admin">Admin — voller Zugriff</option>
                  </select>
                </div>
                {einladeState?.fehler && (
                  <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{einladeState.fehler}</p>
                )}
                {einladeState?.erfolg && (
                  <div className="bg-emerald-50 px-3 py-2 rounded-lg space-y-1.5">
                    <p className="text-xs text-emerald-700 font-medium">{einladeState.erfolg}</p>
                    {einladeState.einladungsLink && (
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(window.location.origin + (einladeState.einladungsLink ?? ''))}
                        className="text-xs text-wellbeing-green hover:text-wellbeing-green-dark underline transition-colors"
                      >
                        Einladungslink kopieren
                      </button>
                    )}
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEinladenOffen(false)}
                    className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 text-sm bg-wellbeing-green hover:bg-wellbeing-green-dark text-white rounded-lg font-medium transition-colors"
                  >
                    Einladung senden
                  </button>
                </div>
              </form>
              <div className="pt-3 border-t border-gray-100 grid grid-cols-3 gap-2">
                {(Object.entries(ROLLEN_CONFIG) as [Rolle, typeof ROLLEN_CONFIG.admin][]).map(([key, cfg]) => (
                  <div key={key} className="text-center p-2.5 bg-gray-50 rounded-xl">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.badgeCls}`}>{cfg.label}</span>
                    <p className="text-[10px] text-gray-400 mt-1.5 leading-snug">{cfg.beschreibung}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}

// ── Tab: Freigaben ────────────────────────────────────────────

function FreigabenTab({ einstellungen }: { einstellungen: Record<string, string> }) {
  const [state, action] = useFormState(saveFreigabeLinks, null)

  return (
    <div className="space-y-6 max-w-2xl">
      <form action={action} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-sm font-semibold text-gray-900">Freigabelink-Einstellungen</h3>
          <p className="text-xs text-gray-500 mt-0.5">Gilt für neu erstellte Freigabelinks</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Standard-Ablaufzeit</label>
              <div className="relative">
                <select name="freigabe_ablaufzeit" defaultValue={einstellungen.freigabe_ablaufzeit ?? '30'}
                  className="w-full px-3 py-2.5 pr-9 text-sm bg-white border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition">
                  <option value="7">7 Tage</option>
                  <option value="14">14 Tage</option>
                  <option value="30">30 Tage</option>
                  <option value="0">Kein Ablauf</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">PIN-Länge</label>
              <div className="relative">
                <select name="freigabe_pin_laenge" defaultValue={einstellungen.freigabe_pin_laenge ?? '4'}
                  className="w-full px-3 py-2.5 pr-9 text-sm bg-white border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition">
                  <option value="4">4-stellig</option>
                  <option value="6">6-stellig</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {[
            { label: 'PIN-Schutz standard aktivieren', name: 'freigabe_pin_schutz', checked: einstellungen.freigabe_pin_schutz === 'true' },
            { label: 'Logo auf Freigabe zeigen',       name: 'freigabe_logo_zeigen', checked: einstellungen.freigabe_logo_zeigen === 'true' },
          ].map((t) => (
            <div key={t.name} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <p className="text-sm font-medium text-gray-800">{t.label}</p>
              <input type="hidden" name={t.name} value="false" />
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name={t.name} value="true" defaultChecked={t.checked} className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-wellbeing-green peer-focus:ring-2 peer-focus:ring-wellbeing-green-light after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-all peer-checked:after:translate-x-4" />
              </label>
            </div>
          ))}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Intro-Text für Kunden</label>
            <textarea name="freigabe_intro_text" rows={3} defaultValue={einstellungen.freigabe_intro_text ?? ''}
              placeholder="z.B. Bitte prüfen Sie die folgenden Produkte und geben Sie diese frei oder lehnen Sie sie ab."
              className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition resize-none" />
          </div>

          <button type="submit" className="px-4 py-2 text-sm font-medium bg-wellbeing-green hover:bg-wellbeing-green-dark text-white rounded-lg transition-colors">Speichern</button>
          {state?.fehler && <p className="text-xs text-red-500">{state.fehler}</p>}
          {state?.erfolg && <p className="text-xs text-emerald-600">{state.erfolg}</p>}
        </div>
      </form>
    </div>
  )
}

// ── Tab: Benachrichtigungen ───────────────────────────────────

function BenachrichtigungenTab({ einstellungen }: { einstellungen: Record<string, string> }) {
  const [state, action] = useFormState(saveBenachrichtigungen, null)

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
        Diese Einstellungen werden in einer zukünftigen Version aktiviert. Änderungen werden bereits gespeichert.
      </div>
      <form action={action} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-sm font-semibold text-gray-900">E-Mail-Benachrichtigungen</h3>
        </div>
        <div className="px-6 py-5 space-y-0">
          {[
            { label: 'Neue Freigabeanfrage',    name: 'benach_neue_freigabe', beschreibung: 'Bei neuer Kundenfreigabe benachrichtigen', checked: einstellungen.benach_neue_freigabe === 'true' },
            { label: 'Freigabe abgelehnt',       name: 'benach_ablehnung',     beschreibung: 'Bei Ablehnung durch den Kunden',            checked: einstellungen.benach_ablehnung     === 'true' },
            { label: 'Tägliche Zusammenfassung', name: 'benach_taeglich',      beschreibung: 'Einmal täglich alle offenen Aktionen',      checked: einstellungen.benach_taeglich      === 'true' },
          ].map((t) => (
            <div key={t.name} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-800">{t.label}</p>
                {t.beschreibung && <p className="text-xs text-gray-500 mt-0.5">{t.beschreibung}</p>}
              </div>
              <input type="hidden" name={t.name} value="false" />
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name={t.name} value="true" defaultChecked={t.checked} className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-wellbeing-green peer-focus:ring-2 peer-focus:ring-wellbeing-green-light after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-all peer-checked:after:translate-x-4" />
              </label>
            </div>
          ))}
        </div>
        <div className="px-6 pb-5 space-y-3 border-t border-gray-100 pt-4">
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Benachrichtigungs-E-Mail</label>
          <input name="benach_email" type="email" defaultValue={einstellungen.benach_email ?? ''}
            placeholder="lisa@wellbeing-concepts.de"
            className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition" />
          <button type="submit" className="px-4 py-2 text-sm font-medium bg-wellbeing-green hover:bg-wellbeing-green-dark text-white rounded-lg transition-colors">Speichern</button>
          {state?.fehler && <p className="text-xs text-red-500">{state.fehler}</p>}
          {state?.erfolg && <p className="text-xs text-emerald-600">{state.erfolg}</p>}
        </div>
      </form>
    </div>
  )
}

// ── Tab: Abrechnung ───────────────────────────────────────────

function AbrechnungTab() {
  return (
    <div className="space-y-6 max-w-2xl">
      <Abschnitt titel="Aktueller Plan" beschreibung="Übersicht Ihres Abonnements">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-gray-900">Free</p>
            <p className="text-sm text-gray-500 mt-1">
              Unbegrenzte Kunden, Projekte und Produkte. Alle Kernfunktionen inklusive.
            </p>
          </div>
          <span className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-500 font-medium">
            Aktueller Plan
          </span>
        </div>
      </Abschnitt>
      <Abschnitt titel="Upgrade" beschreibung="Erweiterte Funktionen für wachsende Teams">
        <div className="space-y-4">
          {[
            { name: 'Pro', preis: '29 EUR / Monat', features: 'Unbegrenzte Teammitglieder, PDF-Export, Prioritäts-Support' },
            { name: 'Business', preis: '79 EUR / Monat', features: 'Alles aus Pro + White-Label, API-Zugang, benutzerdefinierte Domain' },
          ].map((plan) => (
            <div key={plan.name} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50/50">
              <div>
                <p className="text-sm font-semibold text-gray-900">{plan.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{plan.features}</p>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className="text-sm font-mono text-gray-700">{plan.preis}</p>
                <button disabled className="mt-1.5 text-xs px-3 py-1.5 bg-gray-200 text-gray-400 rounded-lg cursor-not-allowed font-medium">
                  Bald verfügbar
                </button>
              </div>
            </div>
          ))}
        </div>
      </Abschnitt>
    </div>
  )
}

// ── Tab: Rechtliches ─────────────────────────────────────────

const IMPRESSUM_TEXT = `Angaben gemäß § 5 TMG

Samuel Liba
Unternehmensberatung
Geranienweg 7
85586 Poing

Telefon: 0176 31335327
E-Mail: info@vicinusmedia.com
USt-IdNr.: DE450215192

Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV:
Samuel Liba, Geranienweg 7, 85586 Poing

Haftungsausschluss

Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.

── Entwicklung & Design ──

Diese Software wurde konzipiert und entwickelt in Zusammenarbeit mit:

VicinusMedia
Webdesign & Webapps München
www.vicinusmedia.com`

const DATENSCHUTZ_TEXT = `Diese Datenschutzerklärung gilt für die Nutzung der Software "Wellbeing Spaces" (app.wellbeing-spaces.de).

Verantwortlicher: Samuel Liba, Geranienweg 7, 85586 Poing, info@vicinusmedia.com

Wir erheben und verarbeiten personenbezogene Daten nur, soweit dies zur Bereitstellung unserer Dienste erforderlich ist:
• E-Mail-Adresse und Passwort (für die Anmeldung)
• Von Ihnen eingegebene Projektdaten (Kunden, Räume, Produkte, Partner)
• Technische Verbindungsdaten durch Hosting-Anbieter

Hosting: Vercel Inc. (EU-Region Frankfurt), Supabase Inc. (eu-central-1).

Alle Preise verstehen sich zzgl. MwSt. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.

Ihre Rechte: Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung (Art. 18), Datenübertragbarkeit (Art. 20), Widerspruch (Art. 21).

Kontakt: info@vicinusmedia.com

Stand: April 2026`

const AGB_TEXT = `Allgemeine Geschäftsbedingungen (AGB)
Stand: April 2026

§ 1 Geltungsbereich
Diese AGB gelten für alle Leistungen von Samuel Liba, Unternehmensberatung, Geranienweg 7, 85586 Poing.

§ 2 Vertragsgegenstand
Gegenstand des Vertrages ist die Nutzung der Software "Wellbeing Spaces" als Software-as-a-Service (SaaS).

§ 3 Registrierung und Nutzerkonto
• Zur Nutzung ist eine Registrierung erforderlich
• Der Nutzer ist für die Geheimhaltung seiner Zugangsdaten verantwortlich

§ 4 Leistungen
• Bereitstellung der Software über das Internet
• Speicherung von Nutzerdaten auf unseren Servern
• Regelmäßige Updates und Wartung

§ 5 Vergütung
• Die Preise richten sich nach dem gewählten Tarif
• Alle Preise verstehen sich zzgl. MwSt.

§ 6 Datenschutz
Die Verarbeitung personenbezogener Daten erfolgt gemäß unserer Datenschutzerklärung.

§ 7 Haftung
• Haftung für Vorsatz und grobe Fahrlässigkeit unbeschränkt
• Bei leichter Fahrlässigkeit Haftung auf vorhersehbare Schäden begrenzt

§ 8 Kündigung
• Monatliche Tarife können zum Monatsende gekündigt werden
• Jährliche Tarife zum Ablauf der Vertragslaufzeit

§ 9 Schlussbestimmungen
• Es gilt deutsches Recht
• Gerichtsstand ist München`

function RechtlichesModal({
  titel,
  inhalt,
  onClose,
}: {
  titel: string
  inhalt: string
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 className="font-syne font-bold text-[17px] text-gray-900">{titel}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">
          <pre className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap font-sans">{inhalt}</pre>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  )
}

function RechtlichesTab({
  organisation,
  istAdmin,
}: {
  organisation: Organisation | null
  istAdmin: boolean
}) {
  const [rechtState, rechtAction] = useFormState(rechtsangabenAktualisieren, null)
  const [modal, setModal] = useState<'impressum' | 'datenschutz' | 'agb' | null>(null)

  const items = [
    {
      key: 'impressum' as const,
      titel: 'Impressum',
      beschreibung: 'Angaben gemäß § 5 TMG – Verantwortlicher, Kontaktdaten',
    },
    {
      key: 'datenschutz' as const,
      titel: 'Datenschutzerklärung',
      beschreibung: 'Informationen zur Verarbeitung personenbezogener Daten gemäß DSGVO',
    },
    {
      key: 'agb' as const,
      titel: 'Allgemeine Geschäftsbedingungen',
      beschreibung: 'Nutzungsbedingungen für die Software "Wellbeing Spaces"',
    },
  ]

  const inhalte = {
    impressum: IMPRESSUM_TEXT,
    datenschutz: DATENSCHUTZ_TEXT,
    agb: AGB_TEXT,
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* ── Deine Firmenangaben ─────────────────────────────── */}
      <Abschnitt titel="Deine Firmenangaben" beschreibung="Erscheinen auf Rechnungen, Angeboten, Verträgen + im Impressum des Kunden-Portals.">
        <form action={rechtAction} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <AuswahlFeld
              label="Rechtsform" name="rechtsform"
              defaultValue={organisation?.rechtsform ?? ''}
              leererWert="— bitte wählen —"
              optionen={RECHTSFORMEN.map((r) => ({ wert: r, label: r }))}
              disabled={!istAdmin}
            />
            <Feld
              label="Geschäftsführer / Inhaber" name="geschaeftsfuehrer"
              defaultValue={organisation?.geschaeftsfuehrer ?? ''}
              placeholder="Max Mustermann, Erika Mustermann"
              hint="Komma-getrennt bei mehreren Personen."
              disabled={!istAdmin}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Feld
              label="Handelsregister-Nr." name="handelsregister_nr"
              defaultValue={organisation?.handelsregister_nr ?? ''}
              placeholder="HRB 123456"
              disabled={!istAdmin}
            />
            <Feld
              label="Registergericht" name="registergericht"
              defaultValue={organisation?.registergericht ?? ''}
              placeholder="Amtsgericht München"
              disabled={!istAdmin}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Feld
              label="USt-IdNr." name="ust_id"
              defaultValue={organisation?.ust_id ?? ''}
              placeholder="DE123456789"
              hint="Pflicht auf Rechnungen, wenn vorhanden."
              disabled={!istAdmin}
            />
            <Feld
              label="Steuernummer" name="steuernummer"
              defaultValue={organisation?.steuernummer ?? ''}
              placeholder="123/456/78901"
              hint="Alternative falls keine USt-IdNr."
              disabled={!istAdmin}
            />
          </div>

          <div className="pt-4 border-t border-gray-100 space-y-4">
            <p className="text-[11px] uppercase tracking-wide font-semibold text-gray-500">Bankverbindung (für Rechnungen)</p>
            <div className="grid grid-cols-2 gap-4">
              <Feld
                label="Bank-Name" name="bank_name"
                defaultValue={organisation?.bank_name ?? ''}
                placeholder="Sparkasse Musterstadt"
                disabled={!istAdmin}
              />
              <Feld
                label="BIC" name="bank_bic"
                defaultValue={organisation?.bank_bic ?? ''}
                placeholder="BYLADEM1MUC"
                disabled={!istAdmin}
              />
            </div>
            <Feld
              label="IBAN" name="bank_iban"
              defaultValue={organisation?.bank_iban ?? ''}
              placeholder="DE89 3704 0044 0532 0130 00"
              disabled={!istAdmin}
            />
          </div>

          <div className="pt-4 border-t border-gray-100 space-y-4">
            <p className="text-[11px] uppercase tracking-wide font-semibold text-gray-500">Rechtstexte</p>
            <TextareaFeld
              label="Eigener Impressum-Text" name="impressum_text"
              defaultValue={organisation?.impressum_text ?? ''}
              rows={5}
              placeholder="Wird im Kunden-Portal angezeigt. HTML ist erlaubt."
              hint="Wenn leer, werden die obigen Stammdaten automatisch zusammengesetzt."
              disabled={!istAdmin}
            />
            <Feld
              label="Datenschutz-URL" name="datenschutz_url" type="url"
              defaultValue={organisation?.datenschutz_url ?? ''}
              placeholder="https://deine-firma.de/datenschutz"
              hint="Link zu deiner Datenschutzerklärung. Wird im Portal-Footer verlinkt."
              disabled={!istAdmin}
            />
            <TextareaFeld
              label="Standard-AGB-Text" name="standard_agb_text"
              defaultValue={organisation?.standard_agb_text ?? ''}
              rows={6}
              placeholder="Dieser Text wird als Default bei neuen Angeboten + Verträgen eingefügt."
              hint="Kann pro Angebot/Vertrag überschrieben werden."
              disabled={!istAdmin}
            />
          </div>

          {istAdmin && (
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              <SubmitButton label="Rechtsangaben speichern" />
              <Meldung state={rechtState} />
            </div>
          )}
        </form>
      </Abschnitt>

      {/* ── Wellbeing Spaces Rechtsinfos ─────────────────────── */}
      <Abschnitt titel="Rechtliches zu Wellbeing Spaces" beschreibung="Rechtliche Informationen zur Software. Klicke auf einen Eintrag, um den Text zu öffnen.">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
          {items.map((item) => (
            <div key={item.key} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.titel}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.beschreibung}</p>
              </div>
              <button
                onClick={() => setModal(item.key)}
                className="shrink-0 ml-4 px-4 py-2 text-xs font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                Anzeigen
              </button>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded-xl px-5 py-4 text-xs text-gray-500 space-y-1 mt-4">
          <p className="font-medium text-gray-700">Verantwortlicher</p>
          <p>Samuel Liba · Geranienweg 7, 85586 Poing</p>
          <p>info@vicinusmedia.com · 0176 31335327</p>
        </div>
      </Abschnitt>

      {modal && (
        <RechtlichesModal
          titel={items.find((i) => i.key === modal)!.titel}
          inhalt={inhalte[modal]}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

// ── Tab: Vorlagen ─────────────────────────────────────────────

function VorlagenTab({ vorlagen }: { vorlagen: VertragsVorlage[] }) {
  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-gray-900">Vertragsvorlagen</h2>
        <p className="text-xs text-gray-500 mt-1">
          Erstelle HTML-Vorlagen mit Platzhaltern, die beim Erstellen eines Vertrags automatisch mit echten Projektdaten befüllt werden.
        </p>
      </div>
      <VertragsVorlagenVerwaltung initialVorlagen={vorlagen} />
    </div>
  )
}

// ── Tab: Handbuch ─────────────────────────────────────────────

function HandbuchTab() {
  return (
    <div className="h-[calc(100vh-220px)] overflow-hidden -mx-6 -mb-6">
      <HandbuchClient />
    </div>
  )
}

// ── Haupt-Komponente ──────────────────────────────────────────

export default function EinstellungenTabs({
  aktuellerTab,
  einstellungen,
  team,
  userRolle,
  userEmail,
  userId,
  userAvatarUrl,
  userVorname,
  userNachname,
  lastSignIn,
  branding,
  vorlagen,
  changelog,
  organisation,
}: {
  aktuellerTab: string
  einstellungen: Record<string, string>
  team: TeamMitglied[]
  userRolle: Rolle
  userEmail: string
  userId: string
  userAvatarUrl: string | null
  userVorname: string | null
  userNachname: string | null
  lastSignIn: string | null
  branding: Branding | null
  vorlagen: VertragsVorlage[]
  changelog: ChangelogEntry[]
  organisation: Organisation | null
}) {
  const istAdmin = userRolle === 'admin'
  const adminOnlyKeys = new Set(['branding'])
  const sichtbareTabs = TABS.filter((t) => !adminOnlyKeys.has(t.key) || istAdmin)

  return (
    <div>
      {/* Tab-Leiste (sticky unter dem Page-Header) */}
      <div className="sticky top-[65px] z-20 bg-white/90 backdrop-blur-md -mx-6 px-6 flex flex-wrap gap-0 mb-8 border-b border-gray-200">
        {sichtbareTabs.map((t) => (
          <a
            key={t.key}
            href={`/dashboard/einstellungen?tab=${t.key}`}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              aktuellerTab === t.key
                ? 'border-wellbeing-green text-wellbeing-green'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      {/* Inhalt */}
      {aktuellerTab === 'profil'             && <ProfilTab userEmail={userEmail} userAvatarUrl={userAvatarUrl} userVorname={userVorname} userNachname={userNachname} lastSignIn={lastSignIn} />}
      {aktuellerTab === 'firma'              && <FirmaTab organisation={organisation} istAdmin={istAdmin} />}
      {aktuellerTab === 'workspace'          && <WorkspaceTab einstellungen={einstellungen} organisation={organisation} istAdmin={istAdmin} />}
      {aktuellerTab === 'branding' && istAdmin && <BrandingTab branding={branding} />}
      {aktuellerTab === 'team'               && <TeamTab team={team} userRolle={userRolle} userId={userId} userEmail={userEmail} lastSignIn={lastSignIn} />}
      {aktuellerTab === 'vorlagen'            && <VorlagenTab vorlagen={vorlagen} />}
      {aktuellerTab === 'freigaben'          && <FreigabenTab einstellungen={einstellungen} />}
      {aktuellerTab === 'benachrichtigungen' && <BenachrichtigungenTab einstellungen={einstellungen} />}
      {aktuellerTab === 'abrechnung'         && <AbrechnungTab />}
      {aktuellerTab === 'rechtliches'        && <RechtlichesTab organisation={organisation} istAdmin={istAdmin} />}
      {aktuellerTab === 'handbuch'           && <HandbuchTab />}
      {aktuellerTab === 'changelog'          && <ChangelogTab eintraege={changelog} />}

      {/* Fallback: alte Tab-Keys weiterleiten */}
      {(aktuellerTab === 'allgemein' || aktuellerTab === 'sicherheit') && (
        <WorkspaceTab einstellungen={einstellungen} organisation={organisation} istAdmin={istAdmin} />
      )}
      {aktuellerTab === 'freigabe' && <FreigabenTab einstellungen={einstellungen} />}
    </div>
  )
}
