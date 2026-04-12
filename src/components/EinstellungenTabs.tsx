'use client'

import Link from 'next/link'
import { useFormState, useFormStatus } from 'react-dom'
import { useTransition } from 'react'
import {
  saveAllgemein,
  saveFreigabe,
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
import { updatePasswort, type ProfilActionState } from '@/app/actions/profil'
import type { TeamMitglied, Rolle } from '@/lib/supabase/types'
import { ROLLEN_CONFIG } from '@/lib/permissions'

// ── Konstanten ────────────────────────────────────────────────

const TABS = [
  { key: 'allgemein',          label: 'Allgemein' },
  { key: 'team',               label: 'Team' },
  { key: 'sicherheit',         label: 'Sicherheit' },
  { key: 'benachrichtigungen', label: 'Benachrichtigungen' },
  { key: 'freigabe',           label: 'Freigabe & Links' },
  { key: 'abrechnung',         label: 'Abrechnung' },
  { key: 'branding',           label: 'Branding', href: '/dashboard/einstellungen/branding' },
  { key: 'handbuch',           label: 'Handbuch', href: '/dashboard/einstellungen/handbuch' },
]

const ZEITZONEN = [
  'Europe/Berlin',
  'Europe/Vienna',
  'Europe/Zurich',
  'Europe/London',
  'Europe/Paris',
  'Europe/Amsterdam',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Warsaw',
  'Europe/Stockholm',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Asia/Dubai',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Australia/Sydney',
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

type AnyState = EinstellungActionState | TeamActionState | ProfilActionState

function Meldung({ state }: { state: AnyState }) {
  if (!state) return null
  if (state.fehler) return <p className="text-xs text-red-500">{state.fehler}</p>
  if (state.erfolg) return <p className="text-xs text-emerald-600">{state.erfolg}</p>
  return null
}

function Feld({
  label,
  name,
  defaultValue,
  type = 'text',
  required,
  min,
  max,
  step,
  hint,
}: {
  label: string
  name: string
  defaultValue?: string
  type?: string
  required?: boolean
  min?: string
  max?: string
  step?: string
  hint?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        min={min}
        max={max}
        step={step}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green-light"
      />
    </div>
  )
}

function AuswahlFeld({
  label,
  name,
  defaultValue,
  optionen,
  hint,
}: {
  label: string
  name: string
  defaultValue?: string
  optionen: { wert: string; label: string }[]
  hint?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green-light bg-white"
      >
        {optionen.map((o) => (
          <option key={o.wert} value={o.wert}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function Abschnitt({
  titel,
  beschreibung,
  children,
}: {
  titel: string
  beschreibung?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <h3 className="text-sm font-semibold text-gray-900">{titel}</h3>
        {beschreibung && (
          <p className="text-xs text-gray-500 mt-0.5">{beschreibung}</p>
        )}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

// ── Tab: Allgemein ────────────────────────────────────────────

function AllgemeinTab({ einstellungen }: { einstellungen: Record<string, string> }) {
  const [state, action] = useFormState(saveAllgemein, null)
  const e = einstellungen

  return (
    <div className="space-y-6 max-w-2xl">
      <Abschnitt
        titel="Anwendung"
        beschreibung="Grundlegende Einstellungen Ihrer Instanz"
      >
        <form action={action} className="space-y-5">
          <Feld
            label="App-Name"
            name="app_name"
            defaultValue={e.app_name ?? 'Studio'}
            required
            hint="Wird in der Seitenleiste und auf Freigabelinks angezeigt."
          />

          <div className="grid grid-cols-2 gap-4">
            <AuswahlFeld
              label="Standardwährung"
              name="standardwaehrung"
              defaultValue={e.standardwaehrung ?? 'EUR'}
              optionen={[
                { wert: 'EUR', label: 'Euro (EUR)' },
                { wert: 'CHF', label: 'Schweizer Franken (CHF)' },
                { wert: 'USD', label: 'US-Dollar (USD)' },
              ]}
            />
            <Feld
              label="MwSt.-Satz (%)"
              name="mwst_satz"
              type="number"
              defaultValue={e.mwst_satz ?? '19'}
              required
              min="0"
              max="100"
              step="0.01"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <AuswahlFeld
              label="Sprache"
              name="sprache"
              defaultValue={e.sprache ?? 'Deutsch'}
              optionen={[
                { wert: 'Deutsch', label: 'Deutsch' },
                { wert: 'English', label: 'English' },
              ]}
            />
            <AuswahlFeld
              label="Zeitzone"
              name="zeitzone"
              defaultValue={e.zeitzone ?? 'Europe/Berlin'}
              optionen={ZEITZONEN.map((z) => ({ wert: z, label: z }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <AuswahlFeld
              label="Datumsformat"
              name="datumsformat"
              defaultValue={e.datumsformat ?? 'DD.MM.YYYY'}
              optionen={[
                { wert: 'DD.MM.YYYY', label: 'DD.MM.YYYY (31.12.2025)' },
                { wert: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2025)' },
                { wert: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2025-12-31)' },
              ]}
            />
            <Feld
              label="Budget-Warnschwelle (%)"
              name="budget_warnschwelle"
              type="number"
              defaultValue={e.budget_warnschwelle ?? '80'}
              min="1"
              max="100"
              hint="Ab wann eine Budget-Warnung angezeigt wird."
            />
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
            <SubmitButton label="Einstellungen speichern" />
            <Meldung state={state} />
          </div>
        </form>
      </Abschnitt>
    </div>
  )
}



// ── Tab: Team ─────────────────────────────────────────────────

const AVATAR_FARBEN = ['bg-wellbeing-green', 'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500']
function avatarFarbe(email: string) { return AVATAR_FARBEN[email.charCodeAt(0) % AVATAR_FARBEN.length] }
function avatarKuerzel(email: string) { return email.slice(0, 2).toUpperCase() }

function TeamTab({ team, userRolle }: { team: TeamMitglied[]; userRolle: Rolle }) {
  const [einladeState, einladeAction] = useFormState(mitgliedEinladen, null)
  const [, startTransition] = useTransition()
  const istAdmin = userRolle === 'admin'

  function handleRolleAendern(mitgliedId: string, neueRolle: Rolle) {
    startTransition(async () => { await rolleAendern(mitgliedId, neueRolle) })
  }

  const aktive     = team.filter((m) => m.status === 'aktiv')
  const ausstehend = team.filter((m) => m.status === 'ausstehend')
  const deaktiviert = team.filter((m) => m.status === 'deaktiviert')

  return (
    <div className="space-y-6 max-w-3xl">

      {/* ── Aktive Mitglieder ─── */}
      <Abschnitt
        titel={`Aktive Mitglieder (${aktive.length})`}
        beschreibung="Alle Nutzer mit aktivem Zugang"
      >
        {aktive.length === 0 ? (
          <p className="text-sm text-gray-400">Noch keine aktiven Mitglieder.</p>
        ) : (
          <ul className="divide-y divide-gray-100 -mx-6 -mb-5">
            {aktive.map((m) => {
              const rollenInfo = ROLLEN_CONFIG[m.rolle]
              const entfernenAction = mitgliedEntfernen.bind(null, m.id)
              return (
                <li key={m.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${avatarFarbe(m.email)}`}>
                      {avatarKuerzel(m.email)}
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">{m.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${rollenInfo.badgeCls}`}>
                      {rollenInfo.label}
                    </span>
                    {istAdmin && (
                      <>
                        <select
                          defaultValue={m.rolle}
                          onChange={(e) => handleRolleAendern(m.id, e.target.value as Rolle)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-wellbeing-green-light"
                        >
                          <option value="admin">Admin</option>
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <form action={entfernenAction}>
                          <button
                            type="submit"
                            className="text-xs text-red-400 hover:text-red-600 transition-colors"
                            onClick={(e) => { if (!confirm(`${m.email} deaktivieren?`)) e.preventDefault() }}
                          >
                            Entfernen
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Abschnitt>

      {/* ── Ausstehende Einladungen ─── */}
      {ausstehend.length > 0 && (
        <Abschnitt
          titel={`Ausstehende Einladungen (${ausstehend.length})`}
          beschreibung="Einladungen, die noch nicht angenommen wurden"
        >
          <ul className="divide-y divide-gray-100 -mx-6 -mb-5">
            {ausstehend.map((m) => {
              const rollenInfo = ROLLEN_CONFIG[m.rolle]
              const zurueckziehenAction = einladungZurueckziehen.bind(null, m.id)
              const einladungsLink = m.einladungs_token ? `/einladung/${m.einladungs_token}` : null
              return (
                <li key={m.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-600 shrink-0">
                      {avatarKuerzel(m.email)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{m.email}</p>
                      <p className="text-xs text-gray-400">Eingeladen am {new Date(m.created_at).toLocaleDateString('de-DE')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${rollenInfo.badgeCls}`}>
                      {rollenInfo.label}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                      Ausstehend
                    </span>
                    {istAdmin && einladungsLink && (
                      <LinkKopierenButton pfad={einladungsLink} />
                    )}
                    {istAdmin && (
                      <form action={zurueckziehenAction}>
                        <button type="submit" className="text-xs text-red-400 hover:text-red-600 transition-colors">
                          Zurückziehen
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </Abschnitt>
      )}

      {/* ── Deaktivierte Mitglieder ─── */}
      {deaktiviert.length > 0 && (
        <Abschnitt
          titel={`Deaktiviert (${deaktiviert.length})`}
          beschreibung="Deaktivierte Accounts ohne Zugang"
        >
          <ul className="divide-y divide-gray-100 -mx-6 -mb-5">
            {deaktiviert.map((m) => {
              const reaktivierenAction = mitgliedReaktivieren.bind(null, m.id)
              return (
                <li key={m.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 gap-3 opacity-60">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                      {avatarKuerzel(m.email)}
                    </div>
                    <p className="text-sm text-gray-600 truncate">{m.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-600">
                      Deaktiviert
                    </span>
                    {istAdmin && (
                      <form action={reaktivierenAction}>
                        <button type="submit" className="text-xs text-emerald-600 hover:text-emerald-700 transition-colors">
                          Reaktivieren
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </Abschnitt>
      )}

      {/* ── Einladen (nur Admin) ─── */}
      {istAdmin && (
        <Abschnitt
          titel="Mitglied einladen"
          beschreibung="Erstellt einen Einladungslink (optional auch per E-Mail, wenn SMTP konfiguriert)"
        >
          <form action={einladeAction} className="space-y-4">
            <div className="grid grid-cols-[1fr_160px] gap-3">
              <Feld label="E-Mail-Adresse" name="email" type="email" required />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
                <select
                  name="rolle"
                  defaultValue="viewer"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green-light bg-white"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <SubmitButton label="Einladung erstellen" />
              <Meldung state={einladeState} />
            </div>
            {einladeState?.einladungsLink && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1.5">Einladungslink (kopieren und manuell senden):</p>
                <LinkKopierenButton pfad={einladeState.einladungsLink} voll />
              </div>
            )}
          </form>

          {/* Rollen-Erklärung */}
          <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-3 gap-3">
            {(Object.entries(ROLLEN_CONFIG) as [Rolle, typeof ROLLEN_CONFIG.admin][]).map(([key, cfg]) => (
              <div key={key} className="text-center p-3 bg-gray-50 rounded-lg">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badgeCls}`}>{cfg.label}</span>
                <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">{cfg.beschreibung}</p>
              </div>
            ))}
          </div>
        </Abschnitt>
      )}
    </div>
  )
}

// ── Link-Kopieren-Button ───────────────────────────────────────
function LinkKopierenButton({ pfad, voll }: { pfad: string; voll?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => {
        const url = window.location.origin + pfad
        navigator.clipboard.writeText(url)
      }}
      className={`text-xs font-medium text-wellbeing-green hover:text-wellbeing-green-dark transition-colors ${
        voll ? 'flex items-center gap-1.5 px-3 py-2 border border-wellbeing-green/30 rounded-lg bg-wellbeing-green/5 w-full justify-center' : ''
      }`}
    >
      Link kopieren
    </button>
  )
}

// ── Tab: Sicherheit ───────────────────────────────────────────

function SicherheitTab({
  userEmail,
  lastSignIn,
  einstellungen,
}: {
  userEmail: string
  lastSignIn: string | null
  einstellungen: Record<string, string>
}) {
  const [passwortState, passwortAction] = useFormState(updatePasswort, null)
  const [freigabeState, freigabeAction] = useFormState(saveFreigabe, null)

  const letzteAnmeldung = lastSignIn
    ? new Date(lastSignIn).toLocaleString('de-DE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : 'Unbekannt'

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Passwort */}
      <Abschnitt
        titel="Passwort ändern"
        beschreibung="Mindestens 6 Zeichen"
      >
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
      <Abschnitt
        titel="Aktive Sessions"
        beschreibung="Aktuell angemeldete Geräte und Sitzungen"
      >
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
          Weitere Session-Verwaltung (z.B. alle Sitzungen beenden) wird in einer zukünftigen Version verfügbar sein.
        </p>
      </Abschnitt>

      {/* Freigabelink-Einstellungen */}
      <Abschnitt
        titel="Freigabelink-Einstellungen"
        beschreibung="Standardverhalten für öffentliche Freigabelinks"
      >
        <form action={freigabeAction} className="space-y-5">
          <Feld
            label="Standard-Ablaufzeit (Tage)"
            name="freigabe_ablaufzeit"
            type="number"
            defaultValue={einstellungen.freigabe_ablaufzeit ?? '30'}
            min="1"
            max="365"
            hint="Nach wie vielen Tagen ein Freigabelink standardmässig abläuft."
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">PIN-Schutz</label>
            <p className="text-xs text-gray-400 mb-3">
              Freigabelinks werden mit einem PIN-Code gesichert, den Sie dem Kunden separat mitteilen.
            </p>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="freigabe_pin_schutz"
                  value="false"
                  defaultChecked={einstellungen.freigabe_pin_schutz !== 'true'}
                  className="accent-wellbeing-green"
                />
                <span className="text-sm text-gray-700">Deaktiviert</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="freigabe_pin_schutz"
                  value="true"
                  defaultChecked={einstellungen.freigabe_pin_schutz === 'true'}
                  className="accent-wellbeing-green"
                />
                <span className="text-sm text-gray-700">Aktiviert</span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <SubmitButton label="Einstellungen speichern" />
            <Meldung state={freigabeState} />
          </div>
        </form>
      </Abschnitt>
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

// ── Tab: Freigabe & Links ─────────────────────────────────────

function FreigabeLinksTab({ einstellungen }: { einstellungen: Record<string, string> }) {
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
              <select name="freigabe_ablaufzeit" defaultValue={einstellungen.freigabe_ablaufzeit ?? '30'}
                className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition">
                <option value="7">7 Tage</option>
                <option value="14">14 Tage</option>
                <option value="30">30 Tage</option>
                <option value="0">Kein Ablauf</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">PIN-Länge</label>
              <select name="freigabe_pin_laenge" defaultValue={einstellungen.freigabe_pin_laenge ?? '4'}
                className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition">
                <option value="4">4-stellig</option>
                <option value="6">6-stellig</option>
              </select>
            </div>
          </div>

          {/* Toggles */}
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

// ── Tab: Abrechnung ───────────────────────────────────────────

function AbrechnungTab() {
  return (
    <div className="space-y-6 max-w-2xl">
      <Abschnitt
        titel="Aktueller Plan"
        beschreibung="Übersicht Ihres Abonnements"
      >
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

      <Abschnitt
        titel="Upgrade"
        beschreibung="Erweiterte Funktionen für wachsende Teams"
      >
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
                <button
                  disabled
                  className="mt-1.5 text-xs px-3 py-1.5 bg-gray-200 text-gray-400 rounded-lg cursor-not-allowed font-medium"
                >
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

// ── Haupt-Komponente ──────────────────────────────────────────

export default function EinstellungenTabs({
  aktuellerTab,
  einstellungen,
  team,
  userRolle,
  userEmail,
  lastSignIn,
}: {
  aktuellerTab: string
  einstellungen: Record<string, string>
  team: TeamMitglied[]
  userRolle: Rolle
  userEmail: string
  lastSignIn: string | null
}) {
  const istAdmin = userRolle === 'admin'
  const sichtbareTabs = TABS.filter((t) => (t.key !== 'team' && t.key !== 'branding') || istAdmin)

  return (
    <div>
      {/* Tab-Leiste */}
      <div className="flex gap-0 mb-8 border-b border-gray-200">
        {sichtbareTabs.map((t) => (
          <Link
            key={t.key}
            href={'href' in t && t.href ? t.href : `/dashboard/einstellungen?tab=${t.key}`}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              aktuellerTab === t.key
                ? 'border-wellbeing-green text-wellbeing-green'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Inhalt */}
      {aktuellerTab === 'allgemein'          && <AllgemeinTab einstellungen={einstellungen} />}
      {aktuellerTab === 'team' && istAdmin   && <TeamTab team={team} userRolle={userRolle} />}
      {aktuellerTab === 'sicherheit'         && <SicherheitTab userEmail={userEmail} lastSignIn={lastSignIn} einstellungen={einstellungen} />}
      {aktuellerTab === 'benachrichtigungen' && <BenachrichtigungenTab einstellungen={einstellungen} />}
      {aktuellerTab === 'freigabe'           && <FreigabeLinksTab einstellungen={einstellungen} />}
      {aktuellerTab === 'abrechnung'         && <AbrechnungTab />}
    </div>
  )
}
