'use client'

import { useState, useTransition } from 'react'
import { Layers, Home, ListChecks, Clock, CheckCircle2, History, Eye, Trash2, ExternalLink } from 'lucide-react'
import FreigabeAuditDrawer from '@/components/FreigabeAuditDrawer'
import { ConfirmModal } from '@/components/ConfirmModal'
import { freigabeTokenLoeschen } from '@/app/actions/freigaben'
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

/**
 * Archiv-/Verlaufs-Ansicht der Freigabe-Links: zeigt NUR abgeschlossene oder
 * zurückgezogene Links (die aktiven werden oben in „Kunden-Freigabelinks"
 * verwaltet). Pro Eintrag: echten Link öffnen (Titel), Vorschau, Protokoll,
 * endgültig löschen.
 */
export default function FreigabeUebersicht({ projektId, initialTokens }: Props) {
  const [tokens, setTokens] = useState(initialTokens)
  const [drawerOffen, setDrawerOffen] = useState(false)
  const [drawerToken, setDrawerToken] = useState<FreigabeToken | null>(null)
  const [drawerTokenLabel, setDrawerTokenLabel] = useState('')
  const [confirmLoeschenId, setConfirmLoeschenId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Archiv: zurückgezogen (deleted_at), abgeschlossen ODER deaktiviert (aktiv=false).
  // Auch deaktivierte Links müssen sichtbar bleiben — sonst „verschwinden" sie aus
  // beiden Listen, obwohl der Token noch existiert.
  const archiv = tokens.filter((t) => t.deleted_at || t.abgeschlossen_am || !t.aktiv)

  function handleAuditOeffnen(t: FreigabeToken) {
    setDrawerToken(t)
    setDrawerTokenLabel(`${scopeLabel[t.scope_typ]} · erstellt ${fmtDatum(t.created_at)}`)
    setDrawerOffen(true)
  }

  function handleLoeschen(id: string) {
    startTransition(async () => {
      await freigabeTokenLoeschen(id, projektId)
      setTokens((prev) => prev.filter((t) => t.id !== id))
      setConfirmLoeschenId(null)
    })
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
          <History className="w-3.5 h-3.5" />
          Verlauf &amp; Archiv{archiv.length > 0 ? ` (${archiv.length})` : ''}
        </h2>
        <p className="text-[11px] text-gray-400 mb-3">
          Abgeschlossene und zurückgezogene Links. Aktive Links verwaltest du oben unter &bdquo;Kunden-Freigabelinks&ldquo;.
        </p>

        {archiv.length === 0 ? (
          <p className="text-sm text-gray-400">Noch keine abgeschlossenen oder zurückgezogenen Links.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {archiv.map((t) => {
              const Icon = scopeIcon[t.scope_typ]
              const status = t.deleted_at
                ? { label: 'Zurückgezogen', cls: 'bg-gray-100 text-gray-500' }
                : { label: 'Abgeschlossen', cls: 'bg-emerald-100 text-emerald-700' }
              return (
                <li key={t.id} className="py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={`/freigabe/${t.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Echten Link in neuem Tab öffnen"
                        className="text-sm font-medium text-gray-900 hover:text-wellbeing-green hover:underline underline-offset-2 inline-flex items-center gap-1 transition-colors"
                      >
                        {scopeLabel[t.scope_typ]}
                        <ExternalLink className="w-3 h-3 opacity-50" />
                      </a>
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
                    <a
                      href={`/freigabe/${t.token}?vorschau=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Vorschau (speichert nichts)"
                      aria-label="Vorschau öffnen"
                      className="p-1.5 text-gray-400 hover:text-wellbeing-green rounded transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleAuditOeffnen(t)}
                      className="text-xs text-wellbeing-green hover:text-wellbeing-green-dark px-2 py-1 rounded transition-colors"
                    >
                      Verlauf →
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmLoeschenId(t.id)}
                      disabled={isPending}
                      title="Endgültig löschen"
                      aria-label="Link endgültig löschen"
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <FreigabeAuditDrawer
        isOpen={drawerOffen}
        onClose={() => setDrawerOffen(false)}
        token={drawerToken}
        tokenLabel={drawerTokenLabel}
      />

      <ConfirmModal
        isOpen={confirmLoeschenId !== null}
        onClose={() => setConfirmLoeschenId(null)}
        onConfirm={() => confirmLoeschenId && handleLoeschen(confirmLoeschenId)}
        title="Freigabe-Link endgültig löschen"
        message="Der Link wird vollständig aus dem Archiv entfernt. Das kann nicht rückgängig gemacht werden."
        confirmText="Endgültig löschen"
        variant="danger"
        isLoading={isPending}
      />
    </>
  )
}
