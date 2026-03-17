'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'

interface PageTransitionProps {
  children: React.ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()
  const [phase, setPhase] = useState<'visible' | 'exit' | 'enter'>('visible')
  const prevPathRef = useRef(pathname)

  useEffect(() => {
    if (pathname !== prevPathRef.current) {
      prevPathRef.current = pathname
      // New page content is already rendered — animate it in
      setPhase('enter')
      const timer = setTimeout(() => setPhase('visible'), 20)
      return () => clearTimeout(timer)
    }
  }, [pathname])

  const className =
    phase === 'enter'
      ? 'h-full opacity-0 translate-x-8'
      : 'h-full transition-all duration-350 ease-out opacity-100 translate-x-0'

  return <div className={className}>{children}</div>
}
