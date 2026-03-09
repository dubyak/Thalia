'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { OnboardingPhase } from '@/lib/types'
import { useChat } from '@/contexts/ChatContext'
import { useFlow } from '@/contexts/FlowContext'
import { ChatBubble } from './ChatBubble'
import { ChatInput } from './ChatInput'

import { TypingIndicator } from './TypingIndicator'
import { PhotoUploadPrompt } from './PhotoUploadPrompt'
import { OnboardingProgress } from './OnboardingProgress'
import { TermsModal } from './TermsModal'
import { CoachingStarterGrid } from './CoachingStarterGrid'
import type { LoanConfig } from '@/lib/types'

interface ChatWindowProps {
  showProgress?: boolean
  phase?: OnboardingPhase
  onComplete?: () => void
  isFirstVisit?: boolean
}

export function ChatWindow({ showProgress = false, onComplete, isFirstVisit = false }: ChatWindowProps) {
  const { state, sendMessage, sendImage } = useChat()
  const { messages, isTyping, phase } = state
  const { dispatch: flowDispatch } = useFlow()
  const router = useRouter()
  const bottomRef = useRef<HTMLDivElement>(null)

  const [termsOpen, setTermsOpen] = useState(false)
  const [pendingOffer, setPendingOffer] = useState<{ amount: number; installments: 1 | 2 } | null>(null)

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

  const lastMessage = messages[messages.length - 1]
  const showPhotoUpload = lastMessage?.role === 'agent' && lastMessage.showPhotoUpload
  const showStarterGrid =
    state.mode === 'coaching' &&
    isFirstVisit &&
    messages.length === 1 &&
    !isTyping

  const handlePhotoSkip = () => {
    sendMessage('Skip this step')
  }

  const handlePhotoUpload = () => {
    sendMessage('I shared a photo of my business')
  }

  const handleOfferAccept = (amount: number, installments: 1 | 2) => {
    setPendingOffer({ amount, installments })
    setTermsOpen(true)
  }

  const handleTermsAccept = (loanConfig: LoanConfig) => {
    flowDispatch({ type: 'OFFER_ACCEPTED', config: loanConfig })
    flowDispatch({ type: 'TERMS_ACCEPTED' })
    router.push('/cashout')
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
            onOfferAccept={handleOfferAccept}
          />
        ))}

        {isTyping && <TypingIndicator />}

        {showPhotoUpload && !isTyping && (
          <PhotoUploadPrompt onUpload={handlePhotoUpload} onSkip={handlePhotoSkip} />
        )}

        {showStarterGrid && (
          <CoachingStarterGrid onSelect={sendMessage} />
        )}

        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Input */}
      <ChatInput onSend={sendMessage} onImageSend={sendImage} disabled={isTyping || state.isComplete} />

      {/* Terms modal */}
      {pendingOffer && (
        <TermsModal
          open={termsOpen}
          amount={pendingOffer.amount}
          installments={pendingOffer.installments}
          onClose={() => setTermsOpen(false)}
          onAccept={handleTermsAccept}
        />
      )}
    </div>
  )
}
