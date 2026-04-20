'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FolderInput, X, ChevronDown } from 'lucide-react'
import { produktZuRaumHinzufuegen } from '@/app/actions/raum-produkte'

export type ProjektOption = { id: string; name: string }
export type RaumOption    = { id: string; name: string; projekt_id: string }

export default function ProduktZuweisenModal({
  produktId,
  produktName,
  projekte,
  raeume,
}: {
  produktId: string
  produktName: string
  projekte: ProjektOption[]
  raeume: RaumOption[]
}) {
  const router = useRouter()
  const [open, setOpen]                     = useState(false)
  const [selectedProjekt, setSelectedProjekt] = useState('')
  const [selectedRaum, setSelectedRaum]       = useState('')
  const [rabattInput, setRabattInput]         = useState('')
  const [fehler, setFehler]                   = useState<string | null>(null)
  const [isPending, startTransition]          = useTransition()

  const filteredRaeume = raeume.filter((r) => r.projekt_id === selectedProjekt)

  function handleOpen(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setOpen(true)
    setSelectedProjekt('')
    setSelectedRaum('')
    setRabattInput('')
    setFehler(null)
  }

  function handleClose() {
    if (isPending) return
    setOpen(false)
  }

  function handleProjektChange(projektId: string) {
    setSelectedProjekt(projektId)
    setSelectedRaum('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedRaum) { setFehler('Bitte Projekt und Raum auswählen.'); return }
    let rabatt: number | null = null
    if (rabattInput.trim()) {
      const parsed = parseFloat(rabattInput.replace(',', '.'))
      if (isNaN(parsed) || parsed < 0 || parsed > 100) {
        setFehler('Rabatt muss zwischen 0 und 100 liegen.')
        return
      }
      rabatt = parsed
    }
    setFehler(null)
    startTransition(async () => {
      const result = await produktZuRaumHinzufuegen(produktId, selectedRaum, 1, null, undefined, rabatt)
      if (result?.fehler) {
        setFehler(result.fehler)
      } else {
        setOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <>
      {/* Trigger-Button */}
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-wellbeing-green bg-wellbeing-cream hover:bg-wellbeing-cream border border-wellbeing-green-light rounded-lg transition-colors whitespace-nowrap"
        title="Zu Projekt zuweisen"
      >
        <FolderInput className="w-3 h-3" />
        Zuweisen
      </button>

      {/* Modal */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={handleClose}
          />
          <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Zu Projekt zuweisen</h2>
                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[240px]">{produktName}</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Projekt */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Projekt <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedProjekt}
                    onChange={(e) => handleProjektChange(e.target.value)}
                    required
                    className="w-full appearance-none px-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-wellbeing-green-light focus:border-wellbeing-green-light"
                  >
                    <option value="">Projekt wählen…</option>
                    {projekte.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Raum – nur wenn Projekt gewählt */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Raum <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedRaum}
                    onChange={(e) => setSelectedRaum(e.target.value)}
                    required
                    disabled={!selectedProjekt || filteredRaeume.length === 0}
                    className="w-full appearance-none px-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-wellbeing-green-light focus:border-wellbeing-green-light disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">
                      {!selectedProjekt
                        ? 'Erst Projekt wählen…'
                        : filteredRaeume.length === 0
                        ? 'Keine Räume vorhanden'
                        : 'Raum wählen…'}
                    </option>
                    {filteredRaeume.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Rabatt (optional) */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Rabatt (%) <span className="text-gray-400 font-normal">optional</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={rabattInput}
                    onChange={(e) => setRabattInput(e.target.value)}
                    placeholder="z.B. 15"
                    className="w-full px-3 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-wellbeing-green-light focus:border-wellbeing-green-light"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Nur für dieses Raum-Produkt. Wird auf den VP angewendet.
                </p>
              </div>

              {fehler && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {fehler}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isPending || !selectedRaum}
                  className="px-4 py-2 text-sm font-medium bg-wellbeing-green hover:bg-wellbeing-green-dark disabled:opacity-50 text-white rounded-xl transition-colors"
                >
                  {isPending ? 'Wird zugewiesen…' : 'Zuweisen'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  )
}
