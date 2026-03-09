'use client'

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  type ReactNode
} from 'react'
import type { ChatMessage, OnboardingPhase, BusinessProfile, AgentResponse } from '@/lib/types'
import { apiChatService } from '@/services/chat-service-api'
import type { ChatHistoryItem } from '@/services/chat-service'

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
  | { type: 'START_SERVICING'; name: string; approvedAmount: number }
  | { type: 'START_COACHING'; name: string; approvedAmount: number }

const INITIAL_STATE: ChatState = {
  messages: [],
  phase: '0',
  isTyping: false,
  businessProfile: {},
  isComplete: false,
  overlayOpen: false,
  mode: 'onboarding',
  testerFirstName: null,
  approvedAmount: 8000,
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
    default:
      return state
  }
}

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

interface ChatContextValue {
  state: ChatState
  sendMessage: (content: string) => Promise<void>
  sendImage: (dataUrl: string) => Promise<void>
  startOnboarding: (firstName: string, mode?: 'onboarding' | 'servicing') => Promise<void>
  startServicing: (firstName: string, profile: Record<string, string>, approvedAmount: number) => Promise<void>
  startCoaching: (firstName: string, profile: Record<string, string>, approvedAmount: number, isFirstVisit?: boolean) => Promise<void>
  openOverlay: () => void
  closeOverlay: () => void
  resetChat: () => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, INITIAL_STATE)
  const startingRef = useRef(false)

  const addAgentMessage = useCallback(
    (response: AgentResponse) => {
      const msg: ChatMessage = {
        id: makeId(),
        role: 'agent',
        content: response.content,
        timestamp: new Date(),
        phase: response.phase,
        quickReplies: response.quickReplies,
        showPhotoUpload: response.showPhotoUpload,
        isOffer: response.isOffer,
        offerAmount: response.offerAmount,
      }
      dispatch({ type: 'ADD_MESSAGE', message: msg })

      if (response.phase !== state.phase) {
        dispatch({ type: 'SET_PHASE', phase: response.phase })
      }
      if (response.metadata?.collectedData) {
        dispatch({ type: 'UPDATE_PROFILE', data: response.metadata.collectedData })
      }
      if (response.metadata?.nextAction === 'complete_onboarding') {
        dispatch({ type: 'COMPLETE_ONBOARDING' })
      }
    },
    [state.phase]
  )

  const startOnboarding = useCallback(
    async (firstName: string, mode: 'onboarding' | 'servicing' = 'onboarding') => {
      if (state.messages.length > 0 || startingRef.current) return // already started
      startingRef.current = true

      if (mode === 'servicing') {
        dispatch({ type: 'SET_MODE', mode: 'servicing' })
      }

      dispatch({ type: 'SET_TYPING', typing: true })
      await new Promise((r) => setTimeout(r, 1200))
      dispatch({ type: 'SET_TYPING', typing: false })

      const response = mode === 'servicing'
        ? {
            content: `Hi ${firstName}! I'm Thalia, your business assistant.\n\nI'm here to help with questions about your loan and business coaching. What can I help you with today?`,
            phase: 'complete' as OnboardingPhase,
            quickReplies: ['When is my next payment?', 'Business tips', 'How do I make a payment?']
          }
        : await apiChatService.getOpeningMessage(firstName)

      addAgentMessage(response)
    },
    [state.messages.length, addAgentMessage]
  )

  const startServicing = useCallback(
    async (firstName: string, profile: Record<string, string>, approvedAmount: number) => {
      dispatch({ type: 'START_SERVICING', name: firstName, approvedAmount })
      startingRef.current = true

      dispatch({ type: 'SET_TYPING', typing: true })
      await new Promise((r) => setTimeout(r, 1200))
      dispatch({ type: 'SET_TYPING', typing: false })

      const response = await apiChatService.getServicingOpening(firstName, profile, approvedAmount, 'servicing')
      addAgentMessage(response)
    },
    [addAgentMessage]
  )

  const startCoaching = useCallback(
    async (firstName: string, profile: Record<string, string>, approvedAmount: number, isFirstVisit = true) => {
      dispatch({ type: 'START_COACHING', name: firstName, approvedAmount })
      startingRef.current = true

      dispatch({ type: 'SET_TYPING', typing: true })
      await new Promise((r) => setTimeout(r, 1200))
      dispatch({ type: 'SET_TYPING', typing: false })

      const response = await apiChatService.getServicingOpening(firstName, profile, approvedAmount, 'coaching', isFirstVisit)
      addAgentMessage(response)
    },
    [addAgentMessage]
  )

  const sendMessage = useCallback(
    async (content: string) => {
      // Add user message
      const userMsg: ChatMessage = {
        id: makeId(),
        role: 'user',
        content,
        timestamp: new Date(),
        phase: state.phase
      }
      dispatch({ type: 'ADD_MESSAGE', message: userMsg })

      // Show typing indicator
      dispatch({ type: 'SET_TYPING', typing: true })

      // Simulate realistic typing delay
      const delay = 800 + Math.random() * 1200
      await new Promise((r) => setTimeout(r, delay))

      // Build history for API context
      const history: ChatHistoryItem[] = state.messages.slice(-10).map((m) => ({
        role: m.role === 'agent' ? 'assistant' : 'user',
        content: m.content
      }))

      // Get AI response — pass profile context when in servicing/coaching mode
      const response = await apiChatService.sendMessage(
        content,
        state.phase,
        state.businessProfile,
        state.mode,
        history,
        state.testerFirstName ?? undefined,
        state.approvedAmount,
        (state.mode === 'servicing' || state.mode === 'coaching')
          ? (state.businessProfile as Record<string, string>)
          : undefined
      )

      dispatch({ type: 'SET_TYPING', typing: false })
      addAgentMessage(response)
    },
    [state.phase, state.businessProfile, state.mode, state.messages, state.testerFirstName, state.approvedAmount, addAgentMessage]
  )

  const sendImage = useCallback(
    async (dataUrl: string) => {
      // Add user message with image
      const userMsg: ChatMessage = {
        id: makeId(),
        role: 'user',
        content: '',
        timestamp: new Date(),
        phase: state.phase,
        imageUrl: dataUrl,
      }
      dispatch({ type: 'ADD_MESSAGE', message: userMsg })

      dispatch({ type: 'SET_TYPING', typing: true })
      const delay = 800 + Math.random() * 1200
      await new Promise((r) => setTimeout(r, delay))

      const history: ChatHistoryItem[] = state.messages.slice(-10).map((m) => ({
        role: m.role === 'agent' ? 'assistant' : 'user',
        content: m.content
      }))

      const response = await apiChatService.sendMessage(
        '',
        state.phase,
        state.businessProfile,
        state.mode,
        history,
        state.testerFirstName ?? undefined,
        state.approvedAmount,
        (state.mode === 'servicing' || state.mode === 'coaching')
          ? (state.businessProfile as Record<string, string>)
          : undefined,
        dataUrl
      )

      dispatch({ type: 'SET_TYPING', typing: false })
      addAgentMessage(response)
    },
    [state.phase, state.businessProfile, state.mode, state.messages, state.testerFirstName, state.approvedAmount, addAgentMessage]
  )

  const openOverlay = useCallback(() => dispatch({ type: 'OPEN_OVERLAY' }), [])
  const closeOverlay = useCallback(() => dispatch({ type: 'CLOSE_OVERLAY' }), [])
  const resetChat = useCallback(() => {
    sessionStorage.removeItem('thalia_session_id')
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
