'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Plus, FolderOpen, Package, X, ChevronRight } from 'lucide-react'

export default function NeuesProduktModal() {
  const [offen, setOffen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  // Portal-Target muss nur client-seitig existieren (SSR-safe)
  useEffect(() => { setMounted(true) }, [])

  // ESC schließt das Modal + Body-Scroll blockieren
  useEffect(() => {
    if (!offen) return
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOffen(false) }
    window.addEventListener('keydown', onEsc)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onEsc)
      document.body.style.overflow = prevOverflow
    }
  }, [offen])

  function navigate(href: string) {
    setOffen(false)
    router.push(href)
  }

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) setOffen(false) }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fadeIn">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Neues Produkt anlegen</h2>
          <button
            onClick={() => setOffen(false)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {/* Option 1 — Bibliothek (primär) */}
          <button
            onClick={() => navigate('/dashboard/produkte/bibliothek/neu')}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl border-2 border-wellbeing-green bg-wellbeing-green/5 hover:bg-wellbeing-green/10 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-wellbeing-green flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                Zur Produktbibliothek
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Ohne Projekt – später zuweisen
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-wellbeing-green shrink-0" />
          </button>

          {/* Option 2 — Projekt */}
          <button
            onClick={() => navigate('/dashboard/produkte/neu')}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-wellbeing-cream transition-colors">
              <FolderOpen className="w-5 h-5 text-gray-500 group-hover:text-wellbeing-green transition-colors" />
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
  )

  return (
    <>
      <button
        onClick={() => setOffen(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-wellbeing-green hover:bg-wellbeing-green-dark text-white text-sm font-medium rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Neues Produkt
      </button>

      {/*
       * Portal-Render in document.body: entkoppelt das Modal vom
       * Backdrop-blur-Parent (StickyPageHeader), der sonst als
       * Containing-Block für position:fixed fungiert und das Modal
       * oben-links am Header verankern würde statt mittig am Viewport.
       */}
      {offen && mounted && createPortal(modal, document.body)}
    </>
  )
}
