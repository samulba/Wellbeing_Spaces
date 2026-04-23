'use client'

import { useEffect, useState } from 'react'
import { X, Check, XCircle, CircleDashed, Zap, User, LinkIcon } from 'lucide-react'
import { freigabeAuditFuerToken } from '@/app/actions/freigaben'
import type { FreigabeAudit, FreigabeKanal } from '@/lib/supabase/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  tokenId: string | null
  tokenLabel: string
}

const kanalLabel: Record<FreigabeKanal, string> = {
  portal: 'Kundenportal',
  token:  'Freigabe-Link',
  admin:  'Admin',
  system: 'System (Auto)',
}

const kanalIcon: Record<FreigabeKanal, typeof User> = {
  portal: User,
  token:  LinkIcon,
  admin:  User,
  system: Zap,
}

function statusIcon(status: string | null) {
  if (status === 'freigegeben') return <Check className="w-4 h-4 text-emerald-600" />
  if (status === 'abgelehnt' || status === 'ueberarbeitung') return <XCircle className="w-4 h-4 text-red-500" />
  return <CircleDashed className="w-4 h-4 text-gray-400" />
}

export default function FreigabeAuditDrawer({ isOpen, onClose, tokenId, tokenLabel }: Props) {
  const [eintraege, setEintraege] = useState<FreigabeAudit[]>([])
  const [ladend, setLadend] = useState(false)

  useEffect(() => {
    if (!isOpen || !tokenId) return
    let abgebrochen = false
    setLadend(true)
    freigabeAuditFuerToken(tokenId)
      .then((data) => { if (!abgebrochen) setEintraege(data) })
      .catch(() => { if (!abgebrochen) setEintraege([]) })
      .finally(() => { if (!abgebrochen) setLadend(false) })
    return () => { abgebrochen = true }
  }, [isOpen, tokenId])

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <aside
        className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[440px] bg-white shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-drawer-titel"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="min-w-0">
            <h2 id="audit-drawer-titel" className="text-sm font-semibold text-gray-900">Freigabe-Verlauf</h2>
            <p className="text-[11px] text-gray-400 truncate">{tokenLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {ladend && <p className="text-xs text-gray-400">Lädt…</p>}
          {!ladend && eintraege.length === 0 && (
            <p className="text-xs text-gray-400">Noch keine Statusänderungen protokolliert.</p>
          )}
          <ol className="space-y-4">
            {eintraege.map((e) => {
              const Icon = kanalIcon[e.kanal]
              return (
                <li key={e.id} className="relative pl-6">
                  <div className="absolute left-0 top-1">{statusIcon(e.neuer_status)}</div>
                  <div className="text-xs text-gray-700">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Icon className="w-3 h-3" />
                      <span className="font-medium">{kanalLabel[e.kanal]}</span>
                      <span>·</span>
                      <span>{e.geaendert_von}</span>
                    </div>
                    <div className="mt-0.5 text-gray-900">
                      Status: <strong>{e.neuer_status}</strong>
                      {e.alter_status && <span className="text-gray-400"> (vorher: {e.alter_status})</span>}
                    </div>
                    {e.kommentar && (
                      <p className="mt-1 text-[11px] text-gray-500 italic">&bdquo;{e.kommentar}&ldquo;</p>
                    )}
                    <p className="mt-1 text-[10px] text-gray-400">
                      {new Date(e.created_at).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </aside>
    </>
  )
}
