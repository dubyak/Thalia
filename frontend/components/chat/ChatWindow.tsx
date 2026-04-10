'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useChat } from '@/contexts/ChatContext'
import { useFlow } from '@/contexts/FlowContext'
import { useLocale } from '@/contexts/LocaleContext'
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
  const { locale } = useLocale()
  const router = useRouter()
  const isEs = locale === 'es-MX'
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

  // Note: onComplete is now triggered by the "Disburse my loan" button, not automatically

  const showStarterGrid =
    state.mode === 'coaching' &&
    isFirstVisit &&
    messages.length === 1 &&
    !isTyping

  // Show "Configure my loan" button after the offer message
  const lastMessage = messages[messages.length - 1]
  const showConfigureButton =
    !offerHandled &&
    !isTyping &&
    lastMessage?.isOffer &&
    lastMessage?.role === 'agent'

  // Show "Disburse my loan" button after terms accepted and agent gives closing
  const showDisbursementButton =
    offerHandled &&
    state.isComplete &&
    !isTyping

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

    // Synthetic message triggers Phase 12 closing from the agent.
    // sendMessage awaits bubble animation, so when it resolves the closing is visible.
    const acceptMsg = isEs
      ? `Acepté el crédito de $${loanConfig.amount.toLocaleString()} MXN con ${loanConfig.installments} pago${loanConfig.installments > 1 ? 's' : ''}.`
      : `I've accepted the loan of $${loanConfig.amount.toLocaleString()} MXN with ${loanConfig.installments} payment${loanConfig.installments > 1 ? 's' : ''}.`
    await sendMessage(acceptMsg)

    // Do NOT auto-navigate — wait for user to click the disbursement button
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
              {isEs ? 'Configurar mi crédito' : 'Configure my loan'}
            </button>
          </div>
        )}

        {showDisbursementButton && (
          <div className="flex justify-center pt-2 pb-1 animate-fade-in">
            <button
              onClick={() => onComplete?.()}
              className="px-6 py-3 rounded-full text-sm font-semibold transition-all active:scale-95 touch-active"
              style={{
                background: '#F06B22',
                color: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(240,107,34,0.3)',
              }}
            >
              {isEs ? 'Dispersar mi crédito' : 'Disburse my loan'}
            </button>
          </div>
        )}

        {showStarterGrid && (
          <CoachingStarterGrid onSelect={sendMessage} />
        )}

        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Input */}
      <ChatInput onSend={sendMessage} onImageSend={sendImage} disabled={isTyping || state.isComplete} placeholder={isEs ? 'Escribe tu mensaje...' : 'Type your message...'} />

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
