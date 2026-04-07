'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { TesterProfile } from '@/lib/types'
import { DEFAULT_TESTERS } from '@/lib/constants'
import { getOfferForCode } from '@/lib/access-codes'

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
    const upper = code.toUpperCase()
    const offer = getOfferForCode(upper)
    if (!offer) return false

    const persona = DEFAULT_TESTERS.find((t) => t.code.toUpperCase() === upper)
    const extras = {
      approvedAmount: offer.initialOffer,
      maxAmount: offer.maxOffer,
      ...(offer.signUpDate !== undefined ? { signUpDate: offer.signUpDate } : {}),
      ...(offer.loanNumber !== undefined ? { loanNumber: offer.loanNumber } : {}),
    }
    const profile: TesterProfile = persona
      ? { ...persona, ...extras }
      : {
          id: upper.toLowerCase(),
          code: upper,
          name: offer.name ?? offer.firstName,
          firstName: offer.firstName,
          interestRateDaily: 0.0083,
          processingFeeRate: 0.0299,
          locale: 'es-MX',
          ...extras,
        }

    setTester(profile)
    localStorage.setItem('tala_tester_code', upper)
    return true
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
