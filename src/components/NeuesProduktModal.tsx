'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, FolderOpen, Package, X, ChevronRight } from 'lucide-react'

export default function NeuesProduktModal() {
  const [offen, setOffen] = useState(false)
  const router = useRouter()

  function navigate(href: string) {
    setOffen(false)
    router.push(href)
  }

  return (
    <>
      <button
        onClick={() => setOffen(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-wellbeing-green hover:bg-wellbeing-green-dark text-white text-sm font-medium rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Neues Produkt
      </button>

      {offen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOffen(false) }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Neues Produkt anlegen</h2>
              <button
                onClick={() => setOffen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Options */}
            <div className="p-4 space-y-2">
              <button
                onClick={() => navigate('/dashboard/produkte/neu')}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-xl border border-gray-200 hover:border-wellbeing-green-light hover:bg-wellbeing-cream/50 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-wellbeing-cream flex items-center justify-center shrink-0 group-hover:bg-wellbeing-green-light transition-colors">
                  <FolderOpen className="w-5 h-5 text-wellbeing-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-wellbeing-green-dark transition-colors">
                    Zu einem Projekt hinzufügen
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Projekt → Raum auswählen, dann anlegen
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-wellbeing-green-light transition-colors shrink-0" />
              </button>

              <button
                onClick={() => navigate('/dashboard/produkte/bibliothek/neu')}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-xl border border-gray-200 hover:border-wellbeing-green-light hover:bg-wellbeing-cream/50 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-wellbeing-cream transition-colors">
                  <Package className="w-5 h-5 text-gray-500 group-hover:text-wellbeing-green transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-wellbeing-green-dark transition-colors">
                    Zur Produktbibliothek
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Ohne Projekt – später zuweisen
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-wellbeing-green-light transition-colors shrink-0" />
              </button>
            </div>

            <div className="px-6 pb-4">
              <button
                onClick={() => setOffen(false)}
                className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
