'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { TesterProfile } from '@/lib/types'
import { DEFAULT_TESTERS } from '@/lib/constants'

interface TesterContextValue {
  tester: TesterProfile | null
  setTesterByCode: (code: string) => boolean
  clearTester: () => void
}

const TesterContext = createContext<TesterContextValue | null>(null)

export function TesterProvider({ children }: { children: ReactNode }) {
  const [tester, setTester] = useState<TesterProfile | null>(null)

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('tala_tester_code')
    if (saved) {
      setTesterByCode(saved)
    }
  }, [])

  const setTesterByCode = (code: string): boolean => {
    const found = DEFAULT_TESTERS.find(
      (t) => t.code.toUpperCase() === code.toUpperCase()
    )
    if (found) {
      setTester(found)
      localStorage.setItem('tala_tester_code', code.toUpperCase())
      return true
    }
    return false
  }

  const clearTester = () => {
    setTester(null)
    localStorage.removeItem('tala_tester_code')
    localStorage.removeItem('tala_flow_state')
    localStorage.removeItem('tala_chat_state')
    localStorage.removeItem('thalia_session_id')
    sessionStorage.removeItem('tala_customer_state')
  }

  return (
    <TesterContext.Provider value={{ tester, setTesterByCode, clearTester }}>
      {children}
    </TesterContext.Provider>
  )
}

export function useTester() {
  const ctx = useContext(TesterContext)
  if (!ctx) throw new Error('useTester must be used within TesterProvider')
  return ctx
}
