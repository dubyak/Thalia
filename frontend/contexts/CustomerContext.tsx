'use client'

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode
} from 'react'

interface CustomerState {
  firstName: string | null
  lastName: string | null
  customerId: string | null
}

const INITIAL_STATE: CustomerState = {
  firstName: null,
  lastName: null,
  customerId: null
}

type CustomerAction =
  | { type: 'SET_NAME'; firstName: string; lastName: string; customerId?: string }
  | { type: 'CLEAR_NAME' }

function customerReducer(state: CustomerState, action: CustomerAction): CustomerState {
  switch (action.type) {
    case 'SET_NAME':
      return {
        firstName: action.firstName,
        lastName: action.lastName,
        customerId: action.customerId || null
      }
    case 'CLEAR_NAME':
      return INITIAL_STATE
    default:
      return state
  }
}

interface CustomerContextValue {
  customer: CustomerState
  dispatch: React.Dispatch<CustomerAction>
}

const CustomerContext = createContext<CustomerContextValue | null>(null)

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customer, dispatch] = useReducer(customerReducer, INITIAL_STATE, (init) => {
    if (typeof window === 'undefined') return init
    try {
      // Use sessionStorage so stale names from previous sessions never bleed through
      const saved = sessionStorage.getItem('tala_customer_state')
      return saved ? { ...init, ...JSON.parse(saved) } : init
    } catch {
      return init
    }
  })

  // Persist customer state to sessionStorage (clears when tab/session ends)
  useEffect(() => {
    if (customer.firstName === null && customer.lastName === null && customer.customerId === null) {
      sessionStorage.removeItem('tala_customer_state')
    } else {
      sessionStorage.setItem('tala_customer_state', JSON.stringify(customer))
    }
  }, [customer])

  return (
    <CustomerContext.Provider value={{ customer, dispatch }}>
      {children}
    </CustomerContext.Provider>
  )
}

export function useCustomer() {
  const ctx = useContext(CustomerContext)
  if (!ctx) throw new Error('useCustomer must be used within CustomerProvider')
  return ctx
}
