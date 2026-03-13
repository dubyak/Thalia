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
      const saved = localStorage.getItem('tala_customer_state')
      return saved ? { ...init, ...JSON.parse(saved) } : init
    } catch {
      return init
    }
  })

  // Persist customer state to localStorage
  useEffect(() => {
    if (customer.firstName === null && customer.lastName === null && customer.customerId === null) {
      // Cleared state — remove from storage
      localStorage.removeItem('tala_customer_state')
    } else {
      // Active state — persist to storage
      localStorage.setItem('tala_customer_state', JSON.stringify(customer))
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
