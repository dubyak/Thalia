'use client'

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  type ReactNode
} from 'react'
import type { ChatMessage, OnboardingPhase, BusinessProfile, AgentResponse } from '@/lib/types'
import { apiChatService } from '@/services/chat-service-api'
import { useLocale } from '@/contexts/LocaleContext'
import { useCustomer } from '@/contexts/CustomerContext'

interface ChatState {
  messages: ChatMessage[]
  phase: OnboardingPhase
  isTyping: boolean
  businessProfile: Partial<BusinessProfile>
  isComplete: boolean
  overlayOpen: boolean
  mode: 'onboarding' | 'servicing' | 'coaching'
  testerFirstName: string | null
  approvedAmount: number
  maxAmount: number      // slider display max; starts = approvedAmount, unlocks to ceilingAmount on negotiation
  ceilingAmount: number  // API ceiling; always = tester's max (e.g. 11000)
  // Survey-provided context
  businessType: string | null
  loanPurpose: string | null
  testerContext: string | null
}

type ChatAction =
  | { type: 'ADD_MESSAGE'; message: ChatMessage }
  | { type: 'SET_TYPING'; typing: boolean }
  | { type: 'SET_PHASE'; phase: OnboardingPhase }
  | { type: 'UPDATE_PROFILE'; data: Partial<BusinessProfile> }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'OPEN_OVERLAY' }
  | { type: 'CLOSE_OVERLAY' }
  | { type: 'SET_MODE'; mode: 'onboarding' | 'servicing' | 'coaching' }
  | { type: 'RESET' }
  | { type: 'START_ONBOARDING'; name: string; approvedAmount: number; maxAmount: number; businessType?: string; loanPurpose?: string; testerContext?: string }
  | { type: 'START_SERVICING'; name: string; approvedAmount: number }
  | { type: 'START_COACHING'; name: string; approvedAmount: number }
  | { type: 'UPDATE_MAX'; maxAmount: number }

const INITIAL_STATE: ChatState = {
  messages: [],
  phase: '0',
  isTyping: false,
  businessProfile: {},
  isComplete: false,
  overlayOpen: false,
  mode: 'onboarding',
  testerFirstName: null,
  approvedAmount: 10000,
  maxAmount: 10000,
  ceilingAmount: 11000,
  businessType: null,
  loanPurpose: null,
  testerContext: null,
}

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.message] }
    case 'SET_TYPING':
      return { ...state, isTyping: action.typing }
    case 'SET_PHASE':
      return { ...state, phase: action.phase }
    case 'UPDATE_PROFILE':
      return { ...state, businessProfile: { ...state.businessProfile, ...action.data } }
    case 'COMPLETE_ONBOARDING':
      return { ...state, isComplete: true, phase: 'complete' }
    case 'OPEN_OVERLAY':
      return { ...state, overlayOpen: true }
    case 'CLOSE_OVERLAY':
      return { ...state, overlayOpen: false }
    case 'SET_MODE':
      return { ...state, mode: action.mode }
    case 'RESET':
      return INITIAL_STATE
    case 'START_ONBOARDING':
      return {
        ...INITIAL_STATE,
        mode: 'onboarding',
        testerFirstName: action.name,
        approvedAmount: action.approvedAmount,
        maxAmount: action.approvedAmount,
        ceilingAmount: action.maxAmount,
        businessType: action.businessType ?? null,
        loanPurpose: action.loanPurpose ?? null,
        testerContext: action.testerContext ?? null,
      }
    case 'START_SERVICING':
      return {
        ...INITIAL_STATE,
        mode: 'servicing',
        testerFirstName: action.name,
        approvedAmount: action.approvedAmount,
      }
    case 'START_COACHING':
      return {
        ...INITIAL_STATE,
        mode: 'coaching',
        testerFirstName: action.name,
        approvedAmount: action.approvedAmount,
      }
    case 'UPDATE_MAX':
      return { ...state, maxAmount: action.maxAmount }
    default:
      return state
  }
}

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

/** Add multi-bubble agent messages with staggered delays proportional to length */
async function addBubblesWithDelay(
  messages: string[],
  response: AgentResponse,
  dispatchFn: React.Dispatch<ChatAction>,
) {
  for (let i = 0; i < messages.length; i++) {
    // Between bubbles: typing indicator with length-proportional delay
    if (i > 0) {
      const wordCount = messages[i].split(/\s+/).length
      const delay = Math.min(400 + wordCount * 15, 1200) + Math.random() * 200
      dispatchFn({ type: 'SET_TYPING', typing: true })
      await new Promise((r) => setTimeout(r, delay))
      dispatchFn({ type: 'SET_TYPING', typing: false })
    }

    const msg: ChatMessage = {
      id: makeId(),
      role: 'agent',
      content: messages[i],
      timestamp: new Date(),
      phase: response.phase,
      // Offer flag only on the last bubble
      isOffer: i === messages.length - 1 ? response.isOffer : false,
      offerAmount: i === messages.length - 1 ? response.offerAmount : undefined,
    }
    dispatchFn({ type: 'ADD_MESSAGE', message: msg })
  }
}

interface ChatContextValue {
  state: ChatState
  sendMessage: (content: string) => Promise<void>
  sendImage: (dataUrl: string) => Promise<void>
  startOnboarding: (firstName: string, approvedAmount?: number, maxAmount?: number, businessType?: string, loanPurpose?: string, testerContext?: string) => Promise<void>
  startServicing: (firstName: string, profile: Record<string, string>, approvedAmount: number, maxAmount?: number) => Promise<void>
  startCoaching: (firstName: string, profile: Record<string, string>, approvedAmount: number, maxAmount?: number, isFirstVisit?: boolean) => Promise<void>
  openOverlay: () => void
  closeOverlay: () => void
  resetChat: () => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, INITIAL_STATE, (init) => {
    if (typeof window === 'undefined') return init
    try {
      const saved = localStorage.getItem('tala_chat_state')
      if (!saved) return init
      const parsed = JSON.parse(saved)
      return {
        ...init,
        messages: (parsed.messages ?? []).map((m: ChatMessage) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })),
        phase: parsed.phase ?? init.phase,
        mode: parsed.mode ?? init.mode,
        businessProfile: parsed.businessProfile ?? init.businessProfile,
        testerFirstName: parsed.testerFirstName ?? init.testerFirstName,
        approvedAmount: parsed.approvedAmount ?? init.approvedAmount,
        maxAmount: parsed.maxAmount ?? init.maxAmount,
        ceilingAmount: parsed.ceilingAmount ?? init.ceilingAmount,
      }
    } catch {
      return init
    }
  })
  const startingRef = useRef(false)
  const stateRef = useRef(state)
  stateRef.current = state

  // Persist chat state to localStorage on relevant state changes
  useEffect(() => {
    const toSave = {
      messages: state.messages,
      phase: state.phase,
      mode: state.mode,
      businessProfile: state.businessProfile,
      testerFirstName: state.testerFirstName,
      approvedAmount: state.approvedAmount,
      maxAmount: state.maxAmount,
      ceilingAmount: state.ceilingAmount,
    }
    localStorage.setItem('tala_chat_state', JSON.stringify(toSave))
  }, [state.messages, state.phase, state.mode, state.businessProfile,
      state.testerFirstName, state.approvedAmount, state.maxAmount, state.ceilingAmount])

  // Read locale from app-wide locale context
  const { locale } = useLocale()
  const localeRef = useRef(locale)
  localeRef.current = locale

  // Read customer from context (use ref so callbacks always see latest value)
  const { customer } = useCustomer()
  const customerRef = useRef(customer)
  customerRef.current = customer

  const processResponse = useCallback(
    async (response: AgentResponse) => {
      const s = stateRef.current
      if (response.phase !== s.phase) {
        dispatch({ type: 'SET_PHASE', phase: response.phase })
      }
      if (response.metadata?.collectedData) {
        dispatch({ type: 'UPDATE_PROFILE', data: response.metadata.collectedData })
      }
      // If agent negotiated the offer up, unlock the higher ceiling on the slider
      if (response.offerAmount && response.offerAmount > s.approvedAmount) {
        dispatch({ type: 'UPDATE_MAX', maxAmount: response.offerAmount })
      }

      // Add bubbles with staggered animation
      await addBubblesWithDelay(response.messages, response, dispatch)

      if (response.metadata?.nextAction === 'complete_onboarding') {
        dispatch({ type: 'COMPLETE_ONBOARDING' })
      }
    },
    []
  )

  const startOnboarding = useCallback(
    async (firstName: string, approvedAmount = 10000, maxAmount = 11000, businessType?: string, loanPurpose?: string, testerContext?: string) => {
      if (stateRef.current.messages.length > 0 || startingRef.current) return
      startingRef.current = true

      dispatch({ type: 'START_ONBOARDING', name: firstName, approvedAmount, maxAmount, businessType, loanPurpose, testerContext })
      dispatch({ type: 'SET_TYPING', typing: true })
      const t0 = Date.now()
      const response = await apiChatService.getOpeningMessage(firstName, approvedAmount, maxAmount, businessType, loanPurpose, localeRef.current, testerContext)
      const elapsed = Date.now() - t0
      if (elapsed < 1200) await new Promise((r) => setTimeout(r, 1200 - elapsed))
      dispatch({ type: 'SET_TYPING', typing: false })

      await processResponse(response)
    },
    [processResponse]
  )

  const startServicing = useCallback(
    async (firstName: string, profile: Record<string, string>, approvedAmount: number, maxAmount = 11000) => {
      dispatch({ type: 'START_SERVICING', name: firstName, approvedAmount })
      startingRef.current = true

      dispatch({ type: 'SET_TYPING', typing: true })
      const t0 = Date.now()
      const response = await apiChatService.getServicingOpening(firstName, profile, approvedAmount, maxAmount, 'servicing', true, localeRef.current)
      const elapsed = Date.now() - t0
      if (elapsed < 1200) await new Promise((r) => setTimeout(r, 1200 - elapsed))
      dispatch({ type: 'SET_TYPING', typing: false })

      await processResponse(response)
    },
    [processResponse]
  )

  const startCoaching = useCallback(
    async (firstName: string, profile: Record<string, string>, approvedAmount: number, maxAmount = 11000, isFirstVisit = true) => {
      if (stateRef.current.mode === 'coaching' && stateRef.current.messages.length > 0) return
      startingRef.current = true
      dispatch({ type: 'START_COACHING', name: firstName, approvedAmount })

      dispatch({ type: 'SET_TYPING', typing: true })
      const t0 = Date.now()
      const response = await apiChatService.getServicingOpening(firstName, profile, approvedAmount, maxAmount, 'coaching', isFirstVisit, localeRef.current)
      const elapsed = Date.now() - t0
      if (elapsed < 1200) await new Promise((r) => setTimeout(r, 1200 - elapsed))
      dispatch({ type: 'SET_TYPING', typing: false })

      await processResponse(response)
    },
    [processResponse]
  )

  const sendMessage = useCallback(
    async (content: string) => {
      const s = stateRef.current
      const customer = customerRef.current
      const userMsg: ChatMessage = {
        id: makeId(),
        role: 'user',
        content,
        timestamp: new Date(),
        phase: s.phase,
      }
      dispatch({ type: 'ADD_MESSAGE', message: userMsg })

      // Brief pause before typing starts (natural feel)
      await new Promise((r) => setTimeout(r, 300))
      dispatch({ type: 'SET_TYPING', typing: true })

      // API call happens while typing indicator is visible
      const t0 = Date.now()
      const response = await apiChatService.sendMessage(
        content,
        s.phase,
        s.mode,
        s.testerFirstName ?? undefined,
        s.approvedAmount,
        s.ceilingAmount,
        (s.mode === 'servicing' || s.mode === 'coaching')
          ? (s.businessProfile as Record<string, string>)
          : undefined,
        undefined,
        s.businessType ?? undefined,
        s.loanPurpose ?? undefined,
        localeRef.current,
        customer.customerId || undefined,
        customer.firstName && customer.lastName
          ? `${customer.firstName} ${customer.lastName}`
          : undefined,
        s.testerContext ?? undefined,
      )

      // Ensure minimum 800ms typing so it doesn't flash
      const elapsed = Date.now() - t0
      if (elapsed < 800) await new Promise((r) => setTimeout(r, 800 - elapsed))
      dispatch({ type: 'SET_TYPING', typing: false })

      await processResponse(response)
    },
    [processResponse]
  )

  const sendImage = useCallback(
    async (dataUrl: string) => {
      const s = stateRef.current
      const userMsg: ChatMessage = {
        id: makeId(),
        role: 'user',
        content: '',
        timestamp: new Date(),
        phase: s.phase,
        imageUrl: dataUrl,
      }
      dispatch({ type: 'ADD_MESSAGE', message: userMsg })

      await new Promise((r) => setTimeout(r, 300))
      dispatch({ type: 'SET_TYPING', typing: true })

      const t0 = Date.now()
      const response = await apiChatService.sendMessage(
        '',
        s.phase,
        s.mode,
        s.testerFirstName ?? undefined,
        s.approvedAmount,
        s.ceilingAmount,
        (s.mode === 'servicing' || s.mode === 'coaching')
          ? (s.businessProfile as Record<string, string>)
          : undefined,
        dataUrl,
        s.businessType ?? undefined,
        s.loanPurpose ?? undefined,
        localeRef.current,
      )

      const elapsed = Date.now() - t0
      if (elapsed < 800) await new Promise((r) => setTimeout(r, 800 - elapsed))
      dispatch({ type: 'SET_TYPING', typing: false })

      await processResponse(response)
    },
    [processResponse]
  )

  const openOverlay = useCallback(() => dispatch({ type: 'OPEN_OVERLAY' }), [])
  const closeOverlay = useCallback(() => dispatch({ type: 'CLOSE_OVERLAY' }), [])
  const resetChat = useCallback(() => {
    localStorage.removeItem('thalia_session_id')
    localStorage.removeItem('tala_chat_state')
    apiChatService.resetSession()
    startingRef.current = false
    dispatch({ type: 'RESET' })
  }, [])

  return (
    <ChatContext.Provider value={{ state, sendMessage, sendImage, startOnboarding, startServicing, startCoaching, openOverlay, closeOverlay, resetChat }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}
