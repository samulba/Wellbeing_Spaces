'use client'

import Link from 'next/link'
import { useFormState, useFormStatus } from 'react-dom'
import {
  saveAllgemein,
  addListItem,
  deleteListItem,
  saveFreigabe,
  type EinstellungActionState,
} from '@/app/actions/einstellungen'
import {
  inviteUser,
  updateUserRolle,
  deactivateUser,
  reactivateUser,
  type TeamActionState,
} from '@/app/actions/team'
import { updatePasswort, type ProfilActionState } from '@/app/actions/profil'
import type { User } from '@supabase/supabase-js'

// ── Konstanten ────────────────────────────────────────────────

const TABS = [
  { key: 'allgemein',   label: 'Allgemein' },
  { key: 'kategorien',  label: 'Kategorien' },
  { key: 'team',        label: 'Team' },
  { key: 'sicherheit',  label: 'Sicherheit' },
  { key: 'abrechnung',  label: 'Abrechnung' },
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
      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
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
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
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
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
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

// ── Tab: Kategorien ───────────────────────────────────────────

function ListeAbschnitt({
  titel,
  beschreibung,
  schluessel,
  items,
  feldLabel,
  platzhalter,
}: {
  titel: string
  beschreibung?: string
  schluessel: string
  items: string[]
  feldLabel: string
  platzhalter: string
}) {
  const boundAdd = addListItem.bind(null, schluessel)
  const [state, action] = useFormState(boundAdd, null)

  return (
    <Abschnitt titel={titel} beschreibung={beschreibung}>
      <div className="space-y-4">
        {/* Liste */}
        {items.length === 0 ? (
          <p className="text-sm text-gray-400">Noch keine Einträge vorhanden.</p>
        ) : (
          <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
            {items.map((item) => {
              const deleteAction = deleteListItem.bind(null, schluessel, item)
              return (
                <li key={item} className="flex items-center justify-between px-4 py-2.5 bg-white hover:bg-gray-50 transition-colors">
                  <span className="text-sm text-gray-700">{item}</span>
                  <form action={deleteAction}>
                    <button
                      type="submit"
                      className="text-xs text-red-400/60 hover:text-red-500 transition-colors px-2 py-1"
                      onClick={(e) => {
                        if (!confirm(`„${item}" löschen?`)) e.preventDefault()
                      }}
                    >
                      Entfernen
                    </button>
                  </form>
                </li>
              )
            })}
          </ul>
        )}

        {/* Hinzufügen */}
        <form action={action} className="flex items-center gap-2">
          <input
            name="name"
            placeholder={platzhalter}
            required
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <SubmitButton label={feldLabel} />
        </form>
        <Meldung state={state} />
      </div>
    </Abschnitt>
  )
}

function KategorienTab({
  kategorien,
  raumtypen,
  projektarten,
}: {
  kategorien: string[]
  raumtypen: string[]
  projektarten: string[]
}) {
  return (
    <div className="space-y-6 max-w-2xl">
      <ListeAbschnitt
        titel="Produktkategorien"
        beschreibung="Kategorien für Produkte in Räumen (z.B. Möbel, Leuchten)"
        schluessel="produktkategorien"
        items={kategorien}
        feldLabel="Hinzufügen"
        platzhalter="z.B. Spiegel"
      />
      <ListeAbschnitt
        titel="Raumtypen"
        beschreibung="Typen für neue Räume in Projekten"
        schluessel="raumtypen"
        items={raumtypen}
        feldLabel="Hinzufügen"
        platzhalter="z.B. Empfang"
      />
      <ListeAbschnitt
        titel="Projektarten"
        beschreibung="Klassifizierung von Projekten"
        schluessel="projektarten"
        items={projektarten}
        feldLabel="Hinzufügen"
        platzhalter="z.B. Umbau"
      />
    </div>
  )
}

// ── Tab: Team ─────────────────────────────────────────────────

const avatarFarben = ['bg-indigo-500', 'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500']
function userFarbe(email: string) { return avatarFarben[email.charCodeAt(0) % avatarFarben.length] }
function userKuerzel(email: string, name?: string) {
  if (name) return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
  return email.slice(0, 2).toUpperCase()
}

function TeamTab({ team }: { team: User[] }) {
  const [state, action] = useFormState(inviteUser, null)

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Mitarbeiterliste */}
      <Abschnitt
        titel={`Teammitglieder (${team.length})`}
        beschreibung="Alle Nutzer mit Zugang zu dieser Instanz"
      >
        {team.length === 0 ? (
          <p className="text-sm text-gray-400">Noch keine Mitglieder.</p>
        ) : (
          <ul className="divide-y divide-gray-100 -mx-6 -mb-5">
            {team.map((u) => {
              const name  = u.user_metadata?.full_name as string | undefined
              const email = u.email ?? ''
              const rolle = (u.user_metadata?.rolle as string | undefined) ?? 'Mitarbeiter'
              const banned = !!u.banned_until
              const rolleAendernAdmin      = updateUserRolle.bind(null, u.id, 'Admin')
              const rolleAendernMitarbeiter = updateUserRolle.bind(null, u.id, 'Mitarbeiter')
              const deaktivierenAction = deactivateUser.bind(null, u.id)
              const reaktivierenAction = reactivateUser.bind(null, u.id)

              return (
                <li key={u.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${userFarbe(email)}`}>
                      {userKuerzel(email, name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {name || email}
                      </p>
                      {name && (
                        <p className="text-xs text-gray-400 truncate">{email}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      rolle === 'Admin'
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {rolle}
                    </span>

                    {banned && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-600 font-medium">
                        Deaktiviert
                      </span>
                    )}

                    <form action={rolle === 'Admin' ? rolleAendernMitarbeiter : rolleAendernAdmin}>
                      <button
                        type="submit"
                        className="text-xs text-gray-400 hover:text-indigo-600 transition-colors whitespace-nowrap"
                      >
                        Zu {rolle === 'Admin' ? 'Mitarbeiter' : 'Admin'}
                      </button>
                    </form>

                    <form action={banned ? reaktivierenAction : deaktivierenAction}>
                      <button
                        type="submit"
                        className={`text-xs font-medium transition-colors whitespace-nowrap ${
                          banned
                            ? 'text-emerald-600 hover:text-emerald-700'
                            : 'text-red-400/70 hover:text-red-500'
                        }`}
                        onClick={(e) => {
                          if (!banned && !confirm(`${email} deaktivieren?`)) e.preventDefault()
                        }}
                      >
                        {banned ? 'Reaktivieren' : 'Deaktivieren'}
                      </button>
                    </form>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Abschnitt>

      {/* Einladen */}
      <Abschnitt
        titel="Mitglied einladen"
        beschreibung="Sendet eine Einladungs-E-Mail mit einem Anmeldelink"
      >
        <form action={action} className="space-y-4">
          <div className="grid grid-cols-[1fr_160px] gap-3">
            <Feld
              label="E-Mail-Adresse"
              name="email"
              type="email"
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
              <select
                name="rolle"
                defaultValue="Mitarbeiter"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              >
                <option>Mitarbeiter</option>
                <option>Admin</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SubmitButton label="Einladung senden" />
            <Meldung state={state} />
          </div>
        </form>
      </Abschnitt>
    </div>
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
                  className="accent-indigo-600"
                />
                <span className="text-sm text-gray-700">Deaktiviert</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="freigabe_pin_schutz"
                  value="true"
                  defaultChecked={einstellungen.freigabe_pin_schutz === 'true'}
                  className="accent-indigo-600"
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
  kategorien,
  raumtypen,
  projektarten,
  team,
  userEmail,
  lastSignIn,
}: {
  aktuellerTab: string
  einstellungen: Record<string, string>
  kategorien: string[]
  raumtypen: string[]
  projektarten: string[]
  team: User[]
  userEmail: string
  lastSignIn: string | null
}) {
  return (
    <div>
      {/* Tab-Leiste */}
      <div className="flex gap-0 mb-8 border-b border-gray-200">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/dashboard/einstellungen?tab=${t.key}`}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              aktuellerTab === t.key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Inhalt */}
      {aktuellerTab === 'allgemein'  && <AllgemeinTab einstellungen={einstellungen} />}
      {aktuellerTab === 'kategorien' && (
        <KategorienTab kategorien={kategorien} raumtypen={raumtypen} projektarten={projektarten} />
      )}
      {aktuellerTab === 'team'       && <TeamTab team={team} />}
      {aktuellerTab === 'sicherheit' && (
        <SicherheitTab userEmail={userEmail} lastSignIn={lastSignIn} einstellungen={einstellungen} />
      )}
      {aktuellerTab === 'abrechnung' && <AbrechnungTab />}
    </div>
  )
}
