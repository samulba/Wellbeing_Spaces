'use client'

import Link from 'next/link'
import { useFormState, useFormStatus } from 'react-dom'
import {
  saveAllgemein,
  addKategorie,
  deleteKategorie,
  type EinstellungActionState,
} from '@/app/actions/einstellungen'
import { inviteUser, updateUserRolle, deactivateUser, reactivateUser, type TeamActionState } from '@/app/actions/team'
import type { User } from '@supabase/supabase-js'

const tabs = [
  { key: 'allgemein', label: 'Allgemein' },
  { key: 'kategorien', label: 'Kategorien' },
  { key: 'team', label: 'Team' },
]

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

function Meldung({ state }: { state: EinstellungActionState | TeamActionState }) {
  if (!state) return null
  if (state.fehler) return <p className="text-xs text-red-500">{state.fehler}</p>
  if (state.erfolg) return <p className="text-xs text-emerald-600">{state.erfolg}</p>
  return null
}

// ── Tab: Allgemein ────────────────────────────────────────────
function AllgemeinTab({ einstellungen }: { einstellungen: Record<string, string> }) {
  const [state, action] = useFormState(saveAllgemein, null)
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm max-w-md">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
        Allgemeine Einstellungen
      </h2>
      <form action={action} className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">App-Name</label>
          <input
            name="app_name"
            defaultValue={einstellungen.app_name ?? 'Studio'}
            required
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">MwSt. (%)</label>
          <input
            name="mwst_satz"
            type="number"
            step="0.01"
            min="0"
            max="100"
            defaultValue={einstellungen.mwst_satz ?? '19'}
            required
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <div className="flex items-center gap-3">
          <SubmitButton label="Speichern" />
          <Meldung state={state} />
        </div>
      </form>
    </div>
  )
}

// ── Tab: Kategorien ───────────────────────────────────────────
function KategorienTab({ kategorien }: { kategorien: string[] }) {
  const [state, action] = useFormState(addKategorie, null)
  return (
    <div className="space-y-4 max-w-md">
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">
            Produktkategorien{' '}
            <span className="text-gray-400 font-normal">({kategorien.length})</span>
          </h2>
        </div>
        {kategorien.length === 0 ? (
          <p className="text-sm text-gray-400 px-5 py-4">Noch keine Kategorien.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {kategorien.map((k) => {
              const deleteAction = deleteKategorie.bind(null, k)
              return (
                <li key={k} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-gray-700">{k}</span>
                  <form action={deleteAction}>
                    <button
                      type="submit"
                      className="text-xs text-red-400/60 hover:text-red-500 transition-colors"
                      onClick={(e) => {
                        if (!confirm(`Kategorie „${k}" löschen?`)) e.preventDefault()
                      }}
                    >
                      ✕
                    </button>
                  </form>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
          Kategorie hinzufügen
        </h3>
        <form action={action} className="flex items-center gap-2">
          <input
            name="kategorie"
            placeholder="z.B. Spiegel"
            required
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <SubmitButton label="Hinzufügen" />
        </form>
        <div className="mt-2">
          <Meldung state={state} />
        </div>
      </div>
    </div>
  )
}

// ── Tab: Team ─────────────────────────────────────────────────
function TeamTab({ team }: { team: User[] }) {
  const [state, action] = useFormState(inviteUser, null)
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">
            Teammitglieder{' '}
            <span className="text-gray-400 font-normal">({team.length})</span>
          </h2>
        </div>
        {team.length === 0 ? (
          <p className="text-sm text-gray-400 px-5 py-4">Keine Mitglieder.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {team.map((u) => {
              const rolle = (u.user_metadata?.rolle as string | undefined) ?? 'Mitarbeiter'
              const banned = !!u.banned_until
              const rolleAendernAdmin = updateUserRolle.bind(null, u.id, 'Admin')
              const rolleAendernMitarbeiter = updateUserRolle.bind(null, u.id, 'Mitarbeiter')
              const deaktivierenAction = deactivateUser.bind(null, u.id)
              const reaktivierenAction = reactivateUser.bind(null, u.id)

              return (
                <li key={u.id} className="flex items-center justify-between px-5 py-3.5 gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {(u.user_metadata?.full_name as string | undefined) || u.email}
                    </p>
                    {u.user_metadata?.full_name && (
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      rolle === 'Admin'
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {rolle}
                    </span>
                    {banned && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-500 font-medium">
                        Deaktiviert
                      </span>
                    )}
                    <form action={rolle === 'Admin' ? rolleAendernMitarbeiter : rolleAendernAdmin}>
                      <button
                        type="submit"
                        className="text-xs text-gray-400 hover:text-indigo-600 transition-colors"
                      >
                        {rolle === 'Admin' ? '→ Mitarbeiter' : '→ Admin'}
                      </button>
                    </form>
                    <form action={banned ? reaktivierenAction : deaktivierenAction}>
                      <button
                        type="submit"
                        className={`text-xs transition-colors ${
                          banned
                            ? 'text-emerald-500 hover:text-emerald-600'
                            : 'text-red-400/60 hover:text-red-500'
                        }`}
                        onClick={(e) => {
                          if (!banned && !confirm(`${u.email} deaktivieren?`)) e.preventDefault()
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
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
          Mitglied einladen
        </h3>
        <form action={action} className="space-y-3">
          <div className="flex gap-2">
            <input
              name="email"
              type="email"
              placeholder="email@beispiel.de"
              required
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <select
              name="rolle"
              defaultValue="Mitarbeiter"
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            >
              <option>Mitarbeiter</option>
              <option>Admin</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <SubmitButton label="Einladung senden" />
            <Meldung state={state} />
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Haupt-Komponente ──────────────────────────────────────────
export default function EinstellungenTabs({
  aktuellerTab,
  einstellungen,
  kategorien,
  team,
}: {
  aktuellerTab: string
  einstellungen: Record<string, string>
  kategorien: string[]
  team: User[]
}) {
  return (
    <div>
      {/* Tab-Navigation */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/dashboard/einstellungen?tab=${t.key}`}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              aktuellerTab === t.key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Tab-Inhalt */}
      {aktuellerTab === 'allgemein' && (
        <AllgemeinTab einstellungen={einstellungen} />
      )}
      {aktuellerTab === 'kategorien' && (
        <KategorienTab kategorien={kategorien} />
      )}
      {aktuellerTab === 'team' && (
        <TeamTab team={team} />
      )}
    </div>
  )
}
