'use client'

import { useEffect, useRef } from 'react'

/**
 * A11y-Helper für Modals.
 *
 *  - ESC-Taste schließt das Modal (onClose)
 *  - Body-Scroll-Lock während das Modal offen ist
 *  - Focus-Trap: TAB/Shift+TAB bleiben innerhalb des Modal-Containers
 *  - Rückgabe: containerRef (an das äußerste Modal-div hängen)
 *
 * Verwendung:
 *   const ref = useModal(isOpen, onClose)
 *   return <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="titel-id">…</div>
 */
export function useModal(isOpen: boolean, onClose: () => void) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    // Body-Scroll-Lock
    const origOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      // Focus-Trap: erste/letzte fokussierbare Elemente zyklisch halten
      const root = containerRef.current
      if (!root) return

      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute('aria-hidden'))

      if (focusable.length === 0) return

      const first = focusable[0]
      const last  = focusable[focusable.length - 1]
      const active = document.activeElement as HTMLElement | null

      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)

    // Initialer Focus auf das erste fokussierbare Element im Container
    const timer = window.setTimeout(() => {
      const root = containerRef.current
      if (!root) return
      const firstFocusable = root.querySelector<HTMLElement>(
        'input:not([type="hidden"]), button, textarea, select, [tabindex]:not([tabindex="-1"])'
      )
      firstFocusable?.focus()
    }, 50)

    return () => {
      document.body.style.overflow = origOverflow
      window.removeEventListener('keydown', onKeyDown)
      window.clearTimeout(timer)
    }
  }, [isOpen, onClose])

  return containerRef
}
