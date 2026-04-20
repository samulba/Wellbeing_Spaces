'use client'

import { m, useReducedMotion, type Variants } from 'framer-motion'
import type { ReactNode } from 'react'

export type RevealVariant = 'fade-up' | 'fade-left' | 'fade-right' | 'scale-in' | 'blur-in'

const VARIANTS: Record<RevealVariant, Variants> = {
  'fade-up': {
    hidden: { opacity: 0, y: 32 },
    visible: { opacity: 1, y: 0 },
  },
  'fade-left': {
    hidden: { opacity: 0, x: -36 },
    visible: { opacity: 1, x: 0 },
  },
  'fade-right': {
    hidden: { opacity: 0, x: 36 },
    visible: { opacity: 1, x: 0 },
  },
  'scale-in': {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
  },
  'blur-in': {
    hidden: { opacity: 0, filter: 'blur(8px)', y: 16 },
    visible: { opacity: 1, filter: 'blur(0px)', y: 0 },
  },
}

export default function Reveal({
  children,
  variant = 'fade-up',
  delay = 0,
  className = '',
  as = 'div',
  amount = 0.15,
  once = true,
}: {
  children: ReactNode
  variant?: RevealVariant
  delay?: number
  className?: string
  as?: 'div' | 'section' | 'article' | 'li' | 'span'
  amount?: number
  once?: boolean
}) {
  const prefersReduced = useReducedMotion()
  const Tag = m[as]

  if (prefersReduced) {
    return <div className={className}>{children}</div>
  }

  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      variants={VARIANTS[variant]}
      transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Tag>
  )
}
