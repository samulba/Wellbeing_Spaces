'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  Search, ChevronLeft, ChevronRight, Activity, User, FolderOpen,
  Building2, FileText, FileSignature, ClipboardList, Users as UsersIcon,
  Trash2, Archive, Plus, Pencil, ArrowRightLeft, Send, CheckCircle2,
  type LucideIcon,
} from 'lucide-react'
import { getAuditLog, type AuditLogEintrag, type AuditLogFilter } from '@/app/actions/audit'
import { useRealtimeRefresh } from '@/lib/hooks/useRealtimeRefresh'
import Dropdown from '@/components/Dropdown'
import type { TeamMitglied } from '@/lib/supabase/types'

// ── Aktion → Icon + Label ───────────────────────────────────
const AKTION_INFO: Record<string, { label: string; Icon: LucideIcon; tone: string }> = {
  // Kunde
  kunde_angelegt:       { label: 'Kunde angelegt',        Icon: Plus,            tone: 'text-blue-600 bg-blue-50' },
  kunde_aktualisiert:   { label: 'Kunde aktualisiert',    Icon: Pencil,          tone: 'text-blue-600 bg-blue-50' },
  kunde_archiviert:     { label: 'Kunde archiviert',      Icon: Archive,         tone: 'text-amber-600 bg-amber-50' },
  kunde_geloescht:      { label: 'Kunde gelöscht',        Icon: Trash2,          tone: 'text-red-600 bg-red-50' },
  // Projekt
  projekt_angelegt:         { label: 'Projekt angelegt',         Icon: Plus,            tone: 'text-emerald-600 bg-emerald-50' },
  projekt_aktualisiert:     { label: 'Projekt aktualisiert',     Icon: Pencil,          tone: 'text-emerald-600 bg-emerald-50' },
  projekt_status_geaendert: { label: 'Projekt-Status',           Icon: ArrowRightLeft,  tone: 'text-emerald-600 bg-emerald-50' },
  projekt_archiviert:       { label: 'Projekt archiviert',       Icon: Archive,         tone: 'text-amber-600 bg-amber-50' },
  projekt_geloescht:        { label: 'Projekt gelöscht',         Icon: Trash2,          tone: 'text-red-600 bg-red-50' },
  projekt_dupliziert:       { label: 'Projekt dupliziert',       Icon: Plus,            tone: 'text-emerald-600 bg-emerald-50' },
  // Partner
  partner_angelegt:    { label: 'Partner angelegt',    Icon: Plus,    tone: 'text-violet-600 bg-violet-50' },
  partner_aktualisiert:{ label: 'Partner aktualisiert',Icon: Pencil,  tone: 'text-violet-600 bg-violet-50' },
  partner_geloescht:   { label: 'Partner gelöscht',    Icon: Trash2,  tone: 'text-red-600 bg-red-50' },
  // Angebot
  angebot_erstellt:        { label: 'Angebot erstellt',       Icon: FileText,        tone: 'text-amber-600 bg-amber-50' },
  angebot_status_geaendert:{ label: 'Angebot-Status',         Icon: ArrowRightLeft,  tone: 'text-amber-600 bg-amber-50' },
  angebot_geloescht:       { label: 'Angebot gelöscht',       Icon: Trash2,          tone: 'text-red-600 bg-red-50' },
  // Vertrag
  vertrag_erstellt:           { label: 'Vertrag erstellt',         Icon: FileSignature,   tone: 'text-blue-600 bg-blue-50' },
  vertrag_status_geaendert:   { label: 'Vertrag-Status',           Icon: ArrowRightLeft,  tone: 'text-blue-600 bg-blue-50' },
  vertrag_unterzeichnet_kunde:{ label: 'Vertrag (Kunde signiert)', Icon: CheckCircle2,    tone: 'text-emerald-600 bg-emerald-50' },
  vertrag_unterzeichnet_firma:{ label: 'Vertrag (Firma signiert)', Icon: CheckCircle2,    tone: 'text-emerald-600 bg-emerald-50' },
  vertrag_geloescht:          { label: 'Vertrag gelöscht',         Icon: Trash2,          tone: 'text-red-600 bg-red-50' },
  // Team
  team_eingeladen:       { label: 'Mitglied eingeladen',  Icon: Send,            tone: 'text-blue-600 bg-blue-50' },
  team_rolle_geaendert:  { label: 'Rolle geändert',       Icon: ArrowRightLeft,  tone: 'text-blue-600 bg-blue-50' },
  team_deaktiviert:      { label: 'Mitglied deaktiviert', Icon: Trash2,          tone: 'text-red-600 bg-red-50' },
  team_reaktiviert:      { label: 'Mitglied reaktiviert', Icon: Plus,            tone: 'text-emerald-600 bg-emerald-50' },
  // Onboarding
  onboarding_link_erstellt: { label: 'Onboarding-Link erstellt', Icon: ClipboardList,   tone: 'text-amber-600 bg-amber-50' },
  onboarding_eingereicht:   { label: 'Onboarding eingereicht',   Icon: CheckCircle2,    tone: 'text-emerald-600 bg-emerald-50' },
  onboarding_geloescht:     { label: 'Onboarding gelöscht',      Icon: Trash2,          tone: 'text-red-600 bg-red-50' },
  // Freigabe
  freigabe_status_geaendert_admin: { label: 'Freigabe-Status (Admin)', Icon: ArrowRightLeft, tone: 'text-violet-600 bg-violet-50' },
  freigabe_bulk_aktion:            { label: 'Freigabe-Bulk-Aktion',    Icon: ArrowRightLeft, tone: 'text-violet-600 bg-violet-50' },
}

const ENTITAET_LABEL: Record<string, { label: string; Icon: LucideIcon }> = {
  kunde:         { label: 'Kunde',          Icon: Building2 },
  projekt:       { label: 'Projekt',        Icon: FolderOpen },
  partner:       { label: 'Partner',        Icon: User },
  angebot:       { label: 'Angebot',        Icon: FileText },
  vertrag:       { label: 'Vertrag',        Icon: FileSignature },
  team_mitglied: { label: 'Team-Mitglied',  Icon: UsersIcon },
  onboarding:    { label: 'Onboarding',     Icon: ClipboardList },
  freigabe:      { label: 'Freigabe',       Icon: Activity },
}

const AKTIONEN_FILTER = Object.keys(AKTION_INFO)
const ENTITAETEN_FILTER = Object.keys(ENTITAET_LABEL)

// ── Avatar-Hilfen ──────────────────────────────────────────
const AVATAR_FARBEN = [
  'bg-emerald-500', 'bg-blue-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500', 'bg-teal-500', 'bg-indigo-500', 'bg-pink-500',
]
function avatarFarbe(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return AVATAR_FARBEN[h % AVATAR_FARBEN.length]
}
function avatarKuerzel(name: string | null, email: string | null): string {
  const n = name?.trim()
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return n.slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return '??'
}

// ── Komponente ──────────────────────────────────────────────
export default function AuditLogClient({ team }: { team: TeamMitglied[] }) {
  const [data, setData] = useState<{ eintraege: AuditLogEintrag[]; total: number; page: number; perPage: number }>({
    eintraege: [], total: 0, page: 0, perPage: 25,
  })
  const [filter, setFilter] = useState<AuditLogFilter>({ page: 0, perPage: 25 })
  const [isPending, startTransition] = useTransition()

  // User-Info-Map per user_id für Avatar + Name in der Liste
  const userMap = new Map(
    team
      .filter((m) => !!m.user_id)
      .map((m) => [
        m.user_id as string,
        {
          name:       [m.vorname, m.nachname].filter(Boolean).join(' ') || null,
          email:      m.email,
          avatar_url: m.avatar_url ?? null,
        },
      ]),
  )

  // Team-Filter-Optionen
  const teamFilterOptionen = [
    { value: '', label: 'Alle Mitglieder' },
    ...team
      .filter((m) => !!m.user_id)
      .map((m) => ({
        value: m.user_id as string,
        label: [m.vorname, m.nachname].filter(Boolean).join(' ') || m.email,
      })),
  ]

  function laden(f: AuditLogFilter = filter) {
    startTransition(async () => {
      const r = await getAuditLog(f)
      setData(r)
    })
  }

  useEffect(() => { laden(filter) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter])

  // Live-Updates: neue Audit-Eintrage erscheinen sofort
  useRealtimeRefresh({
    channelName: 'audit-log-live',
    table:       'audit_log',
    onChange:    () => laden(filter),
    debounceMs:  500,
  })

  const seiten = Math.max(1, Math.ceil(data.total / data.perPage))

  return (
    <div className="space-y-4">
      {/* Sticky Header + Filter-Leiste */}
      <div className="sticky top-[60px] z-20 -mt-4 pt-4 pb-1 bg-gray-50 space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Aktivitätslog</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Alle wichtigen Aktionen deiner Organisation — Anlegen, Ändern, Löschen, Status-Wechsel, Team-Änderungen, Vertragsereignisse.
          </p>
        </div>

        {/* Filter-Leiste */}
        <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Suche User-E-Mail oder Entitäts-Name…"
            value={filter.q ?? ''}
            onChange={(e) => setFilter({ ...filter, q: e.target.value, page: 0 })}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light"
          />
        </div>

        <Dropdown
          value={filter.aktion ?? ''}
          onChange={(v) => setFilter({ ...filter, aktion: v || undefined, page: 0 })}
          placeholder="Alle Aktionen"
          options={[
            { value: '', label: 'Alle Aktionen' },
            ...AKTIONEN_FILTER.map((a) => ({ value: a, label: AKTION_INFO[a]?.label ?? a })),
          ]}
          className="w-44"
        />

        <Dropdown
          value={filter.entitaet ?? ''}
          onChange={(v) => setFilter({ ...filter, entitaet: v || undefined, page: 0 })}
          placeholder="Alle Entitäten"
          options={[
            { value: '', label: 'Alle Entitäten' },
            ...ENTITAETEN_FILTER.map((t) => ({ value: t, label: ENTITAET_LABEL[t]?.label ?? t })),
          ]}
          className="w-40"
        />

        <Dropdown
          value={filter.user_id ?? ''}
          onChange={(v) => setFilter({ ...filter, user_id: v || undefined, page: 0 })}
          placeholder="Alle Mitglieder"
          options={teamFilterOptionen}
          className="w-44"
        />

        {(filter.q || filter.aktion || filter.entitaet || filter.user_id) && (
          <button
            type="button"
            onClick={() => setFilter({ page: 0, perPage: 25 })}
            className="text-xs text-gray-400 hover:text-gray-700"
          >
            Zurücksetzen
          </button>
        )}

        <span className="ml-auto text-xs text-gray-400 shrink-0">
          {data.total} {data.total === 1 ? 'Eintrag' : 'Einträge'}
        </span>
        </div>
      </div>

      {/* Liste */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {isPending && data.eintraege.length === 0 ? (
          <p className="text-center py-12 text-xs text-gray-400">Lädt…</p>
        ) : data.eintraege.length === 0 ? (
          <p className="text-center py-12 text-xs text-gray-400">Keine Einträge gefunden.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {data.eintraege.map((e) => {
              const aktion   = AKTION_INFO[e.aktion] ?? { label: e.aktion, Icon: Activity, tone: 'text-gray-500 bg-gray-100' }
              const ent      = ENTITAET_LABEL[e.entitaet_typ] ?? { label: e.entitaet_typ, Icon: Activity }
              const Icon     = aktion.Icon
              const EntIcon  = ent.Icon
              const detVon   = (e.details as { von?: unknown })?.von
              const detZu    = (e.details as { zu?: unknown })?.zu
              const userInfo = e.user_id ? userMap.get(e.user_id) : null
              const userName = userInfo?.name ?? e.user_email ?? 'System'
              const userMail = userInfo?.email ?? e.user_email ?? null
              return (
                <li key={e.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${aktion.tone}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap text-sm">
                      <span className="font-medium text-gray-900">{aktion.label}</span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                        <EntIcon className="w-3 h-3" />
                        {ent.label}
                      </span>
                      {e.entitaet_name && (
                        <span className="font-medium text-gray-700 truncate">· {e.entitaet_name}</span>
                      )}
                      {detVon != null && detZu != null && (
                        <span className="text-[11px] text-gray-500">
                          ({String(detVon)} → {String(detZu)})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500">
                      {/* Avatar */}
                      {userInfo?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={userInfo.avatar_url}
                          alt={userName}
                          className="w-5 h-5 rounded-full object-cover border border-gray-200 shrink-0"
                        />
                      ) : (
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-semibold text-white shrink-0 ${avatarFarbe(userMail ?? userName)}`}>
                          {avatarKuerzel(userInfo?.name ?? null, userMail)}
                        </div>
                      )}
                      <span className="font-medium text-gray-700 truncate">{userName}</span>
                      <span className="text-gray-300">·</span>
                      <span>{formatAbstand(e.created_at)}</span>
                      <span className="text-gray-300 hidden sm:inline">· {formatDatum(e.created_at)}</span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {seiten > 1 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">
            Seite {data.page + 1} von {seiten}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFilter({ ...filter, page: Math.max(0, (filter.page ?? 0) - 1) })}
              disabled={data.page === 0 || isPending}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 hover:bg-gray-50 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Zurück
            </button>
            <button
              type="button"
              onClick={() => setFilter({ ...filter, page: (filter.page ?? 0) + 1 })}
              disabled={data.page + 1 >= seiten || isPending}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 hover:bg-gray-50 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Weiter
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function formatAbstand(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000)        return 'gerade eben'
  const min = Math.floor(ms / 60_000)
  if (min < 60)           return `vor ${min} Min.`
  const h = Math.floor(min / 60)
  if (h < 24)             return `vor ${h} Std.`
  const t = Math.floor(h / 24)
  if (t === 1)            return 'gestern'
  if (t < 30)             return `vor ${t} Tg.`
  return `vor ${Math.floor(t / 30)} Mon.`
}

function formatDatum(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
