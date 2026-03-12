'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useChat } from '@/contexts/ChatContext'
import { useFlow } from '@/contexts/FlowContext'
import { ChatBubble } from './ChatBubble'
import { ChatInput } from './ChatInput'
import { TypingIndicator } from './TypingIndicator'
import { OnboardingProgress } from './OnboardingProgress'
import { CoachingStarterGrid } from './CoachingStarterGrid'
import type { LoanConfig } from '@/lib/types'

const LoanConfigModal = dynamic(() => import('./LoanConfigModal').then(m => m.LoanConfigModal), { ssr: false })
const TermsModal = dynamic(() => import('./TermsModal').then(m => m.TermsModal), { ssr: false })

interface ChatWindowProps {
  showProgress?: boolean
  onComplete?: () => void
  isFirstVisit?: boolean
}

export function ChatWindow({ showProgress = false, onComplete, isFirstVisit = false }: ChatWindowProps) {
  const { state, sendMessage, sendImage } = useChat()
  const { dispatch: flowDispatch } = useFlow()
  const { messages, isTyping, phase } = state
  const bottomRef = useRef<HTMLDivElement>(null)

  // Modal state
  const [configOpen, setConfigOpen] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const [pendingConfig, setPendingConfig] = useState<{ amount: number; installments: 1 | 2 } | null>(null)
  const [offerHandled, setOfferHandled] = useState(false)

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Trigger onComplete when onboarding finishes
  useEffect(() => {
    if (state.isComplete && onComplete) {
      const timer = setTimeout(onComplete, 1500)
      return () => clearTimeout(timer)
    }
  }, [state.isComplete, onComplete])

  const showStarterGrid =
    state.mode === 'coaching' &&
    isFirstVisit &&
    messages.length === 1 &&
    !isTyping

  // Show "ready" button after onboarding welcome, before the user has sent anything
  const hasUserMessage = messages.some((m) => m.role === 'user')
  const showReadyButton =
    state.mode === 'onboarding' &&
    messages.length > 0 &&
    !hasUserMessage &&
    !isTyping &&
    !state.isComplete

  // Show "Configure my loan" button after the offer message
  const lastMessage = messages[messages.length - 1]
  const showConfigureButton =
    !offerHandled &&
    !isTyping &&
    lastMessage?.isOffer &&
    lastMessage?.role === 'agent'

  // LoanConfigModal → TermsModal
  const handleConfigContinue = (amount: number, installments: 1 | 2) => {
    setPendingConfig({ amount, installments })
    setConfigOpen(false)
    setTimeout(() => setTermsOpen(true), 300)
  }

  // TermsModal → flow dispatch + synthetic message to trigger Phase 11 closing
  const handleTermsAccept = async (loanConfig: LoanConfig) => {
    setTermsOpen(false)
    setOfferHandled(true)

    flowDispatch({ type: 'OFFER_ACCEPTED', config: loanConfig })
    flowDispatch({ type: 'TERMS_ACCEPTED' })

    // Synthetic message triggers Phase 11 closing from the agent.
    // sendMessage awaits bubble animation, so when it resolves the closing is visible.
    await sendMessage(
      `I've accepted the loan of $${loanConfig.amount.toLocaleString()} MXN with ${loanConfig.installments} payment${loanConfig.installments > 1 ? 's' : ''}.`
    )

    // Navigate to cashout directly — don't rely on Phase 11 advancing to "complete".
    // Terms are already accepted; the agent closing message has already rendered above.
    setTimeout(() => onComplete?.(), 2500)
  }

  return (
    <div className="flex flex-col h-full">
      {showProgress && (
        <OnboardingProgress phase={phase} />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3 app-scroll">
        {messages.map((msg) => (
          <ChatBubble
            key={msg.id}
            message={msg}
          />
        ))}

        {isTyping && <TypingIndicator />}

        {showReadyButton && (
          <div className="flex justify-center pt-2 pb-1 animate-fade-in">
            <button
              onClick={() => sendMessage("I'm ready to get started")}
              className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-95 touch-active"
              style={{
                background: '#00A69C',
                color: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(0,166,156,0.25)',
              }}
            >
              I'm ready to get started
            </button>
          </div>
        )}

        {showConfigureButton && (
          <div className="flex justify-center pt-2 pb-1 animate-fade-in">
            <button
              onClick={() => setConfigOpen(true)}
              className="px-5 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-95 touch-active"
              style={{
                background: '#F06B22',
                color: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(240,107,34,0.3)',
              }}
            >
              Configure my loan
            </button>
          </div>
        )}

        {showStarterGrid && (
          <CoachingStarterGrid onSelect={sendMessage} />
        )}

        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Input */}
      <ChatInput onSend={sendMessage} onImageSend={sendImage} disabled={isTyping || state.isComplete} />

      {/* Modals */}
      <LoanConfigModal
        open={configOpen}
        approvedAmount={state.approvedAmount}
        maxAmount={state.maxAmount}
        onClose={() => setConfigOpen(false)}
        onContinue={handleConfigContinue}
      />

      {pendingConfig && (
        <TermsModal
          open={termsOpen}
          amount={pendingConfig.amount}
          installments={pendingConfig.installments}
          onClose={() => setTermsOpen(false)}
          onAccept={handleTermsAccept}
        />
      )}
    </div>
  )
}
