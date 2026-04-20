'use client'

import { useId } from 'react'
import { X, AlertTriangle, Trash2, Info } from 'lucide-react'
import { useModal } from '@/lib/hooks/useModal'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  isLoading?: boolean
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Bestätigen',
  cancelText = 'Abbrechen',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  const ref = useModal(isOpen, onClose)
  const titleId = useId()
  const msgId   = useId()

  if (!isOpen) return null

  const icons = {
    danger:  <Trash2        className="w-5 h-5 text-red-600" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600" />,
    info:    <Info          className="w-5 h-5 text-blue-600" />,
  }

  const btnColors = {
    danger:  'bg-red-600 hover:bg-red-700',
    warning: 'bg-amber-500 hover:bg-amber-600',
    info:    'bg-blue-600 hover:bg-blue-700',
  }

  const bgColors = {
    danger:  'bg-red-100',
    warning: 'bg-amber-100',
    info:    'bg-blue-100',
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4"
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={msgId}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className={`w-10 h-10 rounded-full ${bgColors[variant]} flex items-center justify-center shrink-0`}>
            {icons[variant]}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <h3 id={titleId} className="text-sm font-semibold text-gray-900 mb-1.5">{title}</h3>
        <p id={msgId} className="text-xs text-gray-500 mb-5 leading-relaxed">{message}</p>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2 text-xs font-medium text-white rounded-lg flex items-center justify-center gap-1.5 ${btnColors[variant]} disabled:opacity-50 transition-colors`}
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Bitte warten…
              </>
            ) : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
