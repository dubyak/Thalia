'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

type Locale = 'en' | 'es-MX'

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  toggleLocale: () => void
}

const STORAGE_KEY = 'tala_locale'

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('es-MX')

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'es-MX') {
      setLocaleState(saved)
    }
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    localStorage.setItem(STORAGE_KEY, l)
  }, [])

  const toggleLocale = useCallback(() => {
    setLocaleState((prev) => {
      const next = prev === 'en' ? 'es-MX' : 'en'
      localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }, [])

  return (
    <LocaleContext.Provider value={{ locale, setLocale, toggleLocale }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
  return ctx
}
