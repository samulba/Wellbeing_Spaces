'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, ArchiveRestore, Copy, X, Check, MoreVertical, Trash2 } from 'lucide-react'
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
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Neuer Projektname</label>
            <input
              type="text" autoFocus value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Kunde</label>
            <select
              value={kundeId} onChange={(e) => setKundeId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-wellbeing-green/20 focus:border-wellbeing-green-light transition"
            >
              {kunden.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Was kopieren?</p>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={kopiereRaeume} onChange={(e) => { setKopiereRaeume(e.target.checked); if (!e.target.checked) setKopiereProdukte(false) }} className="w-4 h-4 rounded border-gray-300" />
              <span className="text-sm text-gray-700">Räume kopieren</span>
            </label>
            <label className={`flex items-center gap-3 cursor-pointer select-none ${!kopiereRaeume ? 'opacity-40 pointer-events-none' : ''}`}>
              <input type="checkbox" checked={kopiereProdukte} disabled={!kopiereRaeume} onChange={(e) => setKopiereProdukte(e.target.checked)} className="w-4 h-4 rounded border-gray-300" />
              <span className="text-sm text-gray-700">Produkte kopieren</span>
            </label>
          </div>
          <p className="text-xs text-gray-400">Nicht kopiert: Freigabe-Links, Notizen, Dateien.</p>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors">Abbrechen</button>
          <button
            onClick={handleDuplizieren} disabled={isPending || !name.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 rounded-xl transition-colors"
          >
            {isPending ? 'Wird kopiert…' : <><Check className="w-4 h-4" /> Duplizieren</>}
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
  loeschenAktion,
}: {
  projektId: string
  projektName: string
  aktuellerKundeId: string
  kunden: Kunde[]
  archiviert: boolean
  loeschenAktion: (formData: FormData) => void | Promise<void>
}) {
  const [modalOffen, setModalOffen]   = useState(false)
  const [menuOffen, setMenuOffen]     = useState(false)
  const [isPending, startTransition]  = useTransition()
  const menuRef                       = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOffen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleArchivieren() {
    if (!window.confirm(`„${projektName}" archivieren? Das Projekt wird read-only.`)) return
    setMenuOffen(false)
    startTransition(async () => { await projektArchivieren(projektId) })
  }

  function handleWiederherstellen() {
    startTransition(async () => { await projektWiederherstellen(projektId) })
  }

  if (archiviert) {
    return (
      <button
        onClick={handleWiederherstellen} disabled={isPending}
        className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-emerald-600 border border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50 rounded-lg transition-all duration-200 disabled:opacity-50"
      >
        <ArchiveRestore className="w-3.5 h-3.5" />
        {isPending ? 'Wird wiederhergestellt…' : 'Wiederherstellen'}
      </button>
    )
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

      {/* ⋮ Dropdown */}
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOffen((v) => !v)}
          className={`p-2 text-gray-500 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-lg transition-all duration-200 ${menuOffen ? 'bg-gray-100 border-gray-300' : ''}`}
          aria-label="Weitere Aktionen"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>

        {menuOffen && (
          <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden py-1">
            {/* Duplizieren */}
            <button
              onClick={() => { setModalOffen(true); setMenuOffen(false) }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-gray-400" />
              Duplizieren
            </button>

            {/* Archivieren */}
            <button
              onClick={handleArchivieren} disabled={isPending}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Archive className="w-3.5 h-3.5 text-gray-400" />
              {isPending ? 'Wird archiviert…' : 'Archivieren'}
            </button>

            <div className="h-px bg-gray-100 my-1" />

            {/* Löschen */}
            <form action={loeschenAktion}>
              <button
                type="submit"
                onClick={(e) => {
                  if (!confirm(`„${projektName}" wirklich löschen?`)) e.preventDefault()
                  else setMenuOffen(false)
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Löschen
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  )
}
