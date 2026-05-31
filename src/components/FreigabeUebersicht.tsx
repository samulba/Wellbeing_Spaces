'use client'

import { useState, useTransition } from 'react'
import { Layers, Home, ListChecks, Clock, CheckCircle2, Trash2, History } from 'lucide-react'
import { freigabeTokenZurueckziehen } from '@/app/actions/freigaben'
import { ConfirmModal } from '@/components/ConfirmModal'
import FreigabeAuditDrawer from '@/components/FreigabeAuditDrawer'
import type { FreigabeToken } from '@/lib/supabase/types'

interface Props {
  projektId: string
  initialTokens: FreigabeToken[]
}

const scopeLabel = {
  projekt: 'Gesamtes Projekt',
  raum:    'Einzelner Raum',
  auswahl: 'Kuratierte Auswahl',
} as const

const scopeIcon = {
  projekt: Layers,
  raum:    Home,
  auswahl: ListChecks,
} as const

function fmtDatum(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function tokenStatus(t: FreigabeToken): { label: string; cls: string } {
  if (t.deleted_at) return { label: 'Zurückgezogen', cls: 'bg-gray-100 text-gray-500' }
  if (t.abgeschlossen_am) return { label: 'Abgeschlossen', cls: 'bg-emerald-100 text-emerald-700' }
  if (t.gueltig_bis && new Date(t.gueltig_bis) < new Date()) return { label: 'Abgelaufen', cls: 'bg-amber-100 text-amber-700' }
  if (t.bearbeitung_begonnen_am) return { label: 'In Bearbeitung', cls: 'bg-blue-100 text-blue-700' }
  return { label: 'Offen', cls: 'bg-wellbeing-green/10 text-wellbeing-green' }
}

export default function FreigabeUebersicht({ projektId, initialTokens }: Props) {
  const [tokens, setTokens] = useState(initialTokens)
  const [drawerOffen, setDrawerOffen] = useState(false)
  const [drawerToken, setDrawerToken] = useState<FreigabeToken | null>(null)
  const [drawerTokenLabel, setDrawerTokenLabel] = useState('')
  const [confirmTokenId, setConfirmTokenId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAuditOeffnen(t: FreigabeToken) {
    setDrawerToken(t)
    setDrawerTokenLabel(`${scopeLabel[t.scope_typ]} · erstellt ${fmtDatum(t.created_at)}`)
    setDrawerOffen(true)
  }

  function handleZurueckziehen(id: string) {
    startTransition(async () => {
      await freigabeTokenZurueckziehen(id, projektId)
      setTokens((prev) => prev.map((t) => t.id === id ? { ...t, deleted_at: new Date().toISOString(), aktiv: false } : t))
      setConfirmTokenId(null)
    })
  }

  if (tokens.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
          <History className="w-3.5 h-3.5" />
          Freigabe-Verlauf
        </h2>
        <p className="text-sm text-gray-400">Noch keine Freigabe-Links erstellt.</p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <History className="w-3.5 h-3.5" />
          Freigabe-Verlauf ({tokens.length})
        </h2>

        <ul className="divide-y divide-gray-100">
          {tokens.map((t) => {
            const Icon = scopeIcon[t.scope_typ]
            const status = tokenStatus(t)
            const kannZurueckgezogen = !t.deleted_at && !t.abgeschlossen_am
            return (
              <li key={t.id} className="py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{scopeLabel[t.scope_typ]}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${status.cls}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {fmtDatum(t.created_at)}</span>
                    {t.abgeschlossen_am && (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="w-3 h-3" />
                        {t.abgeschlossen_durch ?? 'Kunde'} · {fmtDatum(t.abgeschlossen_am)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleAuditOeffnen(t)}
                    className="text-xs text-wellbeing-green hover:text-wellbeing-green-dark px-2 py-1 rounded transition-colors"
                  >
                    Verlauf →
                  </button>
                  {kannZurueckgezogen && (
                    <button
                      type="button"
                      onClick={() => setConfirmTokenId(t.id)}
                      disabled={isPending}
                      aria-label="Link zurückziehen"
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <FreigabeAuditDrawer
        isOpen={drawerOffen}
        onClose={() => setDrawerOffen(false)}
        token={drawerToken}
        tokenLabel={drawerTokenLabel}
      />

      <ConfirmModal
        isOpen={confirmTokenId !== null}
        onClose={() => setConfirmTokenId(null)}
        onConfirm={() => confirmTokenId && handleZurueckziehen(confirmTokenId)}
        title="Freigabe-Link zurückziehen"
        message="Der Kunde kann diesen Link ab sofort nicht mehr öffnen. Der Verlauf und die bisherigen Entscheidungen bleiben erhalten."
        confirmText="Zurückziehen"
        variant="warning"
        isLoading={isPending}
      />
    </>
  )
}
