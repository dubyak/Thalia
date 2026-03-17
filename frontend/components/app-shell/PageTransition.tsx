'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'

interface PageTransitionProps {
  children: React.ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const prevPathRef = useRef(pathname)

  useEffect(() => {
    if (pathname !== prevPathRef.current) {
      setIsTransitioning(true)
      prevPathRef.current = pathname
      const timer = setTimeout(() => setIsTransitioning(false), 50)
      return () => clearTimeout(timer)
    }
  }, [pathname])

  return (
    <div
      className={`h-full transition-all duration-300 ease-out ${
        isTransitioning ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
      }`}
    >
      {children}
    </div>
  )
}
