'use client'

import type { ReactNode } from 'react'
import Reveal, { type RevealVariant } from './Reveal'

export type AnimationType = RevealVariant

/** Thin alias on top of Reveal — kept for backward compatibility with existing call sites.
 *  `delay` is in milliseconds to match the old API; Reveal expects seconds. */
export default function AnimateOnScroll({
  children,
  delay = 0,
  className = '',
  type = 'fade-up',
}: {
  children: ReactNode
  delay?: number
  className?: string
  type?: AnimationType
}) {
  return (
    <Reveal variant={type} delay={delay / 1000} className={className}>
      {children}
    </Reveal>
  )
}
