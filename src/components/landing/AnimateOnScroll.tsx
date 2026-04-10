'use client'

import { useEffect, useRef, type ReactNode } from 'react'

export type AnimationType = 'fade-up' | 'fade-left' | 'fade-right' | 'scale-in' | 'blur-in'

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
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible')
          observer.disconnect()
        }
      },
      { threshold: 0.07 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`${type} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}
