'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Mail, MailX, X, Copy, Check, Crown, User, Eye, Trash2, Loader2, ChevronDown,
} from 'lucide-react'
import type { TeamMitgliedRow, PortalRolle } from '@/app/actions/portal'
import {
  mitarbeiterEinladen,
  mitarbeiterRolleAendern,
  mitarbeiterEntfernen,
} from '@/app/actions/portal'

const ROLLEN_INFO: Record<PortalRolle, { label: string; desc: string; Icon: typeof Crown }> = {
  inhaber:     { label: 'Inhaber',     desc: 'Voller Zugriff, kann Mitglieder einladen & verwalten', Icon: Crown },
  mitarbeiter: { label: 'Mitarbeiter', desc: 'Kann Produkte freigeben und Nachrichten senden',       Icon: User  },
  gast:        { label: 'Gast',        desc: 'Nur Lesezugriff — keine Interaktionen',                Icon: Eye   },
}

function avatarFarben(key: string) {
  const COLORS = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500']
  return COLORS[key.charCodeAt(0) % COLORS.length]
}
function initials(v: string, n: string, e: string) {
  const s = `${v?.[0] ?? ''}${n?.[0] ?? ''}`.toUpperCase()
  return s || e.slice(0, 2).toUpperCase()
}

export default function TeamClient({
  initialTeam,
  currentUserId,
}: {
  initialTeam: TeamMitgliedRow[]
  currentUserId: string
}) {
  const router = useRouter()
  const [team, setTeam] = useState(initialTeam)
  const [modalOffen, setModalOffen] = useState(false)
  const [confirmEntfernen, setConfirmEntfernen] = useState<TeamMitgliedRow | null>(null)

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs opacity-60">
          {team.length} {team.length === 1 ? 'Mitglied' : 'Mitglieder'}
        </p>
        <button
          onClick={() => setModalOffen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold brand-radius-sm brand-primary shadow-sm hover:brightness-95 transition"
        >
          <Plus className="w-4 h-4" />
          Mitglied einladen
        </button>
      </div>

      {/* Liste */}
      <div className="bg-white border border-black/[0.06] brand-radius overflow-hidden">
        {team.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-gray-500">Noch keine Mitglieder im Team.</p>
          </div>
        ) : (
          <ul className="divide-y divide-black/[0.05]">
            {team.map((m) => (
              <TeamMitgliedZeile
                key={m.id}
                m={m}
                currentUserId={currentUserId}
                onChange={(neu) => setTeam((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...neu } : x)))}
                onRemove={() => setConfirmEntfernen(m)}
              />
            ))}
          </ul>
        )}
      </div>

      {modalOffen && (
        <EinladungsModal
          onClose={() => setModalOffen(false)}
          onEingeladen={() => { router.refresh(); setModalOffen(false) }}
        />
      )}

      {confirmEntfernen && (
        <EntfernenModal
          mitglied={confirmEntfernen}
          onClose={() => setConfirmEntfernen(null)}
          onEntfernt={() => {
            setTeam((prev) => prev.map((x) => (x.id === confirmEntfernen.id ? { ...x, aktiv: false } : x)))
            setConfirmEntfernen(null)
          }}
        />
      )}
    </>
  )
}

// ── Mitglied-Zeile ──────────────────────────────────────────
function TeamMitgliedZeile({
  m, currentUserId, onChange, onRemove,
}: {
  m: TeamMitgliedRow
  currentUserId: string
  onChange: (updates: Partial<TeamMitgliedRow>) => void
  onRemove: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [rollenOffen, setRollenOffen] = useState(false)

  const info = ROLLEN_INFO[m.rolle]
  const Icon = info.Icon
  const istIch = m.id === currentUserId
  const istInhaber = m.rolle === 'inhaber'
  const kannBearbeiten = !istIch && !istInhaber

  function handleRolleAendern(neu: PortalRolle) {
    setRollenOffen(false)
    if (neu === m.rolle) return
    startTransition(async () => {
      const res = await mitarbeiterRolleAendern(m.id, neu)
      if (!res?.fehler) onChange({ rolle: neu })
    })
  }

  return (
    <li className={`flex items-center gap-4 px-4 py-3.5 ${!m.aktiv ? 'opacity-50' : ''}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${avatarFarben(m.email)}`}>
        {initials(m.vorname, m.nachname, m.email)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {[m.vorname, m.nachname].filter(Boolean).join(' ') || m.email.split('@')[0]}
          </p>
          {istIch && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold uppercase tracking-wide">
              Du
            </span>
          )}
          {m.einladung_offen && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium inline-flex items-center gap-1">
              <Mail className="w-2.5 h-2.5" /> Einladung offen
            </span>
          )}
          {!m.aktiv && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
              Deaktiviert
            </span>
          )}
        </div>
        <p className="text-xs opacity-60 truncate">{m.email}</p>
      </div>

      {/* Rolle */}
      <div className="shrink-0 relative">
        {kannBearbeiten ? (
          <button
            type="button"
            onClick={() => setRollenOffen((v) => !v)}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border border-black/10 brand-radius-sm hover:bg-black/[0.04] disabled:opacity-60 transition"
          >
            <Icon className="w-3.5 h-3.5" />
            {info.label}
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600">
            <Icon className="w-3.5 h-3.5" />
            {info.label}
          </span>
        )}

        {rollenOffen && (
          <div className="absolute right-0 top-full mt-1 z-20 w-64 bg-white rounded-xl shadow-xl border border-black/[0.06] py-1 text-left">
            {(['mitarbeiter', 'gast'] as const).map((r) => {
              const I = ROLLEN_INFO[r].Icon
              const aktiv = m.rolle === r
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRolleAendern(r)}
                  className={`w-full px-3 py-2 flex items-start gap-2 hover:bg-black/[0.03] transition-colors ${
                    aktiv ? 'bg-black/[0.03]' : ''
                  }`}
                >
                  <I className="w-3.5 h-3.5 mt-0.5 opacity-70 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-800">{ROLLEN_INFO[r].label}</p>
                    <p className="text-[11px] text-gray-500 leading-snug">{ROLLEN_INFO[r].desc}</p>
                  </div>
                  {aktiv && <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-1" />}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Entfernen */}
      {kannBearbeiten && m.aktiv && (
        <button
          type="button"
          onClick={onRemove}
          disabled={isPending}
          className="shrink-0 w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
          title="Mitglied entfernen"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </li>
  )
}

// ── Einladungs-Modal ──────────────────────────────────────────
function EinladungsModal({
  onClose, onEingeladen,
}: {
  onClose: () => void
  onEingeladen: () => void
}) {
  const [email,    setEmail]    = useState('')
  const [vorname,  setVorname]  = useState('')
  const [nachname, setNachname] = useState('')
  const [rolle,    setRolle]    = useState<Exclude<PortalRolle, 'inhaber'>>('mitarbeiter')
  const [fehler,   setFehler]   = useState<string | null>(null)
  const [link,     setLink]     = useState<string | null>(null)
  const [mailSent, setMailSent] = useState<boolean | null>(null)
  const [kopiert,  setKopiert]  = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSend() {
    setFehler(null)
    startTransition(async () => {
      const res = await mitarbeiterEinladen({ email, vorname, nachname, rolle })
      if (res?.fehler) { setFehler(res.fehler); return }
      setLink(res?.einladungsLink ?? null)
      setMailSent(res?.mailGesendet ?? false)
    })
  }

  function copyLink(l: string) {
    navigator.clipboard.writeText(l).then(() => {
      setKopiert(true)
      setTimeout(() => setKopiert(false), 2000)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white brand-radius-lg shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-black/[0.06]">
          <h2 className="text-base font-semibold text-gray-900">Mitglied einladen</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-lg hover:bg-black/[0.04] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {link ? (
            <div>
              {mailSent ? (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-100 brand-radius-sm mb-4">
                  <Mail className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    Einladung per E-Mail an <strong>{email}</strong> verschickt.
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-100 brand-radius-sm mb-4">
                  <MailX className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 leading-relaxed">
                    E-Mail konnte nicht automatisch gesendet werden. Kopiere den Link und sende ihn selbst.
                  </p>
                </div>
              )}
              <div className="flex items-center gap-2 p-3 bg-black/[0.03] brand-radius-sm">
                <code className="flex-1 text-[11px] text-gray-600 truncate">{link}</code>
                <button onClick={() => copyLink(link)} className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs brand-primary brand-radius-sm hover:brightness-95 transition">
                  {kopiert ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {kopiert ? 'Kopiert' : 'Kopieren'}
                </button>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={onClose} className="flex-1 py-2.5 text-sm border border-black/10 brand-radius-sm hover:bg-black/[0.03] transition">
                  Schließen
                </button>
                <button onClick={onEingeladen} className="flex-1 py-2.5 text-sm font-semibold brand-primary brand-radius-sm hover:brightness-95 transition">
                  Fertig
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Vorname</label>
                  <input value={vorname} onChange={(e) => setVorname(e.target.value)} placeholder="Anna"
                    className="w-full px-3 py-2.5 text-sm border border-black/10 brand-radius-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 brand-ring transition" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Nachname</label>
                  <input value={nachname} onChange={(e) => setNachname(e.target.value)} placeholder="Muster"
                    className="w-full px-3 py-2.5 text-sm border border-black/10 brand-radius-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 brand-ring transition" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">E-Mail</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="anna@example.com"
                  className="w-full px-3 py-2.5 text-sm border border-black/10 brand-radius-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 brand-ring transition" />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">Rolle</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['mitarbeiter', 'gast'] as const).map((r) => {
                    const I = ROLLEN_INFO[r].Icon
                    const aktiv = rolle === r
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRolle(r)}
                        className={`text-left p-3 border brand-radius-sm transition ${
                          aktiv
                            ? 'border-[color:var(--brand-primary)] bg-[color:rgba(var(--brand-primary-rgb),0.05)]'
                            : 'border-black/10 hover:border-black/20 bg-white'
                        }`}
                      >
                        <I className="w-4 h-4 mb-1.5 opacity-70" />
                        <p className="text-xs font-semibold text-gray-800">{ROLLEN_INFO[r].label}</p>
                        <p className="text-[11px] text-gray-500 leading-snug">{ROLLEN_INFO[r].desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {fehler && <p className="text-xs text-red-500">{fehler}</p>}

              <div className="flex gap-2 pt-1">
                <button onClick={onClose} className="flex-1 py-2.5 text-sm border border-black/10 brand-radius-sm hover:bg-black/[0.03] transition">
                  Abbrechen
                </button>
                <button
                  onClick={handleSend}
                  disabled={isPending || !email}
                  className="flex-1 py-2.5 text-sm font-semibold brand-primary brand-radius-sm hover:brightness-95 disabled:opacity-60 inline-flex items-center justify-center gap-2 transition"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Einladung erstellen'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Entfernen-Confirm ────────────────────────────────────────
function EntfernenModal({
  mitglied, onClose, onEntfernt,
}: {
  mitglied: TeamMitgliedRow
  onClose: () => void
  onEntfernt: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const name = [mitglied.vorname, mitglied.nachname].filter(Boolean).join(' ') || mitglied.email

  function handle() {
    startTransition(async () => {
      const res = await mitarbeiterEntfernen(mitglied.id)
      if (!res?.fehler) onEntfernt()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white brand-radius-lg shadow-2xl w-full max-w-sm p-6">
        <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
          <Trash2 className="w-5 h-5 text-red-600" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 text-center mb-1.5">Mitglied entfernen?</h3>
        <p className="text-sm text-gray-500 text-center mb-5">
          <strong>{name}</strong> kann sich anschließend nicht mehr im Portal anmelden.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} disabled={isPending} className="flex-1 py-2.5 text-sm border border-black/10 brand-radius-sm hover:bg-black/[0.03] disabled:opacity-60 transition">
            Abbrechen
          </button>
          <button onClick={handle} disabled={isPending} className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 brand-radius-sm inline-flex items-center justify-center gap-2 transition">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entfernen'}
          </button>
        </div>
      </div>
    </div>
  )
}
