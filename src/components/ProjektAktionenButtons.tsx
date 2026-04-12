'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, ArchiveRestore, Copy, X, Check } from 'lucide-react'
import {
  projektArchivieren,
  projektWiederherstellen,
  projektDuplizieren,
} from '@/app/actions/projekte'

interface Kunde { id: string; name: string }

// ── Duplizieren-Modal ─────────────────────────────────────────
function DuplizierenModal({
  projektId,
  projektName,
  aktuellerKundeId,
  kunden,
  onClose,
}: {
  projektId: string
  projektName: string
  aktuellerKundeId: string
  kunden: Kunde[]
  onClose: () => void
}) {
  const router = useRouter()
  const [name, setName]                     = useState(`${projektName} (Kopie)`)
  const [kundeId, setKundeId]               = useState(aktuellerKundeId)
  const [kopiereRaeume, setKopiereRaeume]   = useState(true)
  const [kopiereProdukte, setKopiereProdukte] = useState(true)
  const [isPending, startTransition]        = useTransition()

  function handleDuplizieren() {
    startTransition(async () => {
      const { id } = await projektDuplizieren(projektId, {
        neuerName: name.trim() || `${projektName} (Kopie)`,
        kundeId,
        kopiereRaeume,
        kopiereProdukte: kopiereRaeume && kopiereProdukte,
      })
      onClose()
      router.push(`/dashboard/projekte/${id}`)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Projekt duplizieren</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Neuer Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Neuer Projektname</label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
            />
          </div>

          {/* Kunde */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Kunde</label>
            <select
              value={kundeId}
              onChange={(e) => setKundeId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
            >
              {kunden.map((k) => (
                <option key={k.id} value={k.id}>{k.name}</option>
              ))}
            </select>
          </div>

          {/* Checkboxen */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Was kopieren?</p>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={kopiereRaeume}
                onChange={(e) => {
                  setKopiereRaeume(e.target.checked)
                  if (!e.target.checked) setKopiereProdukte(false)
                }}
                className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-400/30"
              />
              <span className="text-sm text-gray-700">Räume kopieren</span>
            </label>
            <label className={`flex items-center gap-3 cursor-pointer select-none ${!kopiereRaeume ? 'opacity-40 pointer-events-none' : ''}`}>
              <input
                type="checkbox"
                checked={kopiereProdukte}
                disabled={!kopiereRaeume}
                onChange={(e) => setKopiereProdukte(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-400/30"
              />
              <span className="text-sm text-gray-700">Produkte kopieren</span>
            </label>
          </div>

          <p className="text-xs text-gray-400">
            Nicht kopiert: Freigabe-Links, Notizen, Dateien. Status wird auf &quot;In Bearbeitung&quot; gesetzt.
          </p>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleDuplizieren}
            disabled={isPending || !name.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors"
          >
            {isPending ? (
              'Wird kopiert…'
            ) : (
              <><Check className="w-4 h-4" /> Duplizieren</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Haupt-Komponente ──────────────────────────────────────────
export default function ProjektAktionenButtons({
  projektId,
  projektName,
  aktuellerKundeId,
  kunden,
  archiviert,
}: {
  projektId: string
  projektName: string
  aktuellerKundeId: string
  kunden: Kunde[]
  archiviert: boolean
}) {
  const [modalOffen, setModalOffen]     = useState(false)
  const [isPending, startTransition]    = useTransition()

  function handleArchivieren() {
    if (!window.confirm(`„${projektName}" archivieren? Das Projekt wird read-only.`)) return
    startTransition(async () => {
      await projektArchivieren(projektId)
    })
  }

  function handleWiederherstellen() {
    startTransition(async () => {
      await projektWiederherstellen(projektId)
    })
  }

  return (
    <>
      {modalOffen && (
        <DuplizierenModal
          projektId={projektId}
          projektName={projektName}
          aktuellerKundeId={aktuellerKundeId}
          kunden={kunden}
          onClose={() => setModalOffen(false)}
        />
      )}

      {archiviert ? (
        <button
          onClick={handleWiederherstellen}
          disabled={isPending}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-emerald-600 border border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50 rounded-lg transition-all duration-200 disabled:opacity-50"
        >
          <ArchiveRestore className="w-3.5 h-3.5" />
          {isPending ? 'Wird wiederhergestellt…' : 'Wiederherstellen'}
        </button>
      ) : (
        <>
          <button
            onClick={() => setModalOffen(true)}
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-blue-600 border border-blue-200 hover:border-blue-300 hover:bg-blue-50 rounded-lg transition-all duration-200 disabled:opacity-50"
          >
            <Copy className="w-3.5 h-3.5" />
            Duplizieren
          </button>
          <button
            onClick={handleArchivieren}
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-gray-500 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-lg transition-all duration-200 disabled:opacity-50"
          >
            <Archive className="w-3.5 h-3.5" />
            {isPending ? 'Wird archiviert…' : 'Archivieren'}
          </button>
        </>
      )}
    </>
  )
}
