'use client'

import { useEffect, useRef } from 'react'
import { useChat } from '@/contexts/ChatContext'
import { ChatBubble } from './ChatBubble'
import { ChatInput } from './ChatInput'
import { TypingIndicator } from './TypingIndicator'
import { OnboardingProgress } from './OnboardingProgress'
import { CoachingStarterGrid } from './CoachingStarterGrid'

interface ChatWindowProps {
  showProgress?: boolean
  onComplete?: () => void
  isFirstVisit?: boolean
}

export function ChatWindow({ showProgress = false, onComplete, isFirstVisit = false }: ChatWindowProps) {
  const { state, sendMessage, sendImage } = useChat()
  const { messages, isTyping, phase } = state
  const bottomRef = useRef<HTMLDivElement>(null)

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

        {showStarterGrid && (
          <CoachingStarterGrid onSelect={sendMessage} />
        )}

        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Input */}
      <ChatInput onSend={sendMessage} onImageSend={sendImage} disabled={isTyping || state.isComplete} />
    </div>
  )
}
