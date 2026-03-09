'use client'

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode
} from 'react'
import type { FlowState, LoanConfig, BusinessProfile } from '@/lib/types'

const INITIAL_STATE: FlowState = {
  loginComplete: false,
  surveyComplete: false,
  surveyChoice: null,
  surveyBusinessType: undefined,
  surveyLoanPurpose: undefined,
  msmeOptIn: false,
  onboardingComplete: false,
  offerAccepted: false,
  termsAccepted: false,
  cashoutBankSelected: false,
  cashoutConfirmed: false,
  disbursementComplete: false,
  coachingSessionCount: 0,
  selectedBank: undefined,
  loanConfig: undefined,
  businessProfile: undefined
}

type FlowAction =
  | { type: 'LOGIN_COMPLETE' }
  | { type: 'SURVEY_COMPLETE'; choice: 'business' | 'personal'; businessType?: string; loanPurpose?: string }
  | { type: 'MSME_OPT_IN' }
  | { type: 'ONBOARDING_COMPLETE'; profile: BusinessProfile }
  | { type: 'OFFER_ACCEPTED'; config: LoanConfig }
  | { type: 'TERMS_ACCEPTED' }
  | { type: 'BANK_SELECTED'; bank: string }
  | { type: 'CASHOUT_CONFIRMED' }
  | { type: 'DISBURSEMENT_COMPLETE' }
  | { type: 'COACHING_STARTED' }
  | { type: 'RESET' }

function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'LOGIN_COMPLETE':
      return { ...state, loginComplete: true }
    case 'SURVEY_COMPLETE':
      return { ...state, surveyComplete: true, surveyChoice: action.choice, surveyBusinessType: action.businessType, surveyLoanPurpose: action.loanPurpose }
    case 'MSME_OPT_IN':
      return { ...state, msmeOptIn: true }
    case 'ONBOARDING_COMPLETE':
      return { ...state, onboardingComplete: true, businessProfile: action.profile }
    case 'OFFER_ACCEPTED':
      return { ...state, offerAccepted: true, loanConfig: action.config }
    case 'TERMS_ACCEPTED':
      return { ...state, termsAccepted: true }
    case 'BANK_SELECTED':
      return { ...state, cashoutBankSelected: true, selectedBank: action.bank }
    case 'CASHOUT_CONFIRMED':
      return { ...state, cashoutConfirmed: true }
    case 'DISBURSEMENT_COMPLETE':
      return { ...state, disbursementComplete: true }
    case 'COACHING_STARTED':
      return { ...state, coachingSessionCount: state.coachingSessionCount + 1 }
    case 'RESET':
      return INITIAL_STATE
    default:
      return state
  }
}

interface FlowContextValue {
  flow: FlowState
  dispatch: React.Dispatch<FlowAction>
}

const FlowContext = createContext<FlowContextValue | null>(null)

export function FlowProvider({ children }: { children: ReactNode }) {
  const [flow, dispatch] = useReducer(flowReducer, INITIAL_STATE, (init) => {
    if (typeof window === 'undefined') return init
    try {
      const saved = localStorage.getItem('tala_flow_state')
      return saved ? { ...init, ...JSON.parse(saved) } : init
    } catch {
      return init
    }
  })

  // Persist flow state to localStorage
  useEffect(() => {
    localStorage.setItem('tala_flow_state', JSON.stringify(flow))
  }, [flow])

  return (
    <FlowContext.Provider value={{ flow, dispatch }}>
      {children}
    </FlowContext.Provider>
  )
}

export function useFlow() {
  const ctx = useContext(FlowContext)
  if (!ctx) throw new Error('useFlow must be used within FlowProvider')
  return ctx
}
