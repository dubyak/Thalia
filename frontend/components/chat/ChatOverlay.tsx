'use client'

import { useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { useChat } from '@/contexts/ChatContext'
import { useTester } from '@/contexts/TesterContext'
import { useFlow } from '@/contexts/FlowContext'
import { ChatWindow } from './ChatWindow'

export function ChatOverlay() {
  const { state, closeOverlay, startCoaching } = useChat()
  const { tester } = useTester()
  const { flow, dispatch: flowDispatch } = useFlow()

  const isFirstVisit = flow.coachingSessionCount === 0

  // Start coaching chat when overlay opens (unless already running)
  useEffect(() => {
    if (!state.overlayOpen) return
    if (state.mode === 'coaching' && state.messages.length > 0) return
    if (!tester?.firstName) return

    const profile = (flow.businessProfile ?? {}) as Record<string, string>
    const approvedAmount = flow.loanConfig?.amount ?? tester.approvedAmount ?? 8000
    startCoaching(tester.firstName, profile, approvedAmount, isFirstVisit)
    if (isFirstVisit) {
      flowDispatch({ type: 'COACHING_STARTED' })
    }
  }, [state.overlayOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!state.overlayOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 animate-fade-in"
        onClick={closeOverlay}
      />

      {/* Sheet */}
      <div
        className="fixed z-50 bg-white flex flex-col rounded-t-3xl overflow-hidden animate-slide-up"
        style={{
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 'var(--app-max-width)',
          height: '85dvh'
        }}
      >
        {/* Sheet header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e5e5] flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/thalia/Thalia-chat-starts.svg"
              alt="Thalia"
              style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
            <div>
              <p className="font-semibold text-[#1f1c2f] text-sm">Thalia</p>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#bec658]" />
                <p className="text-[10px] text-[#939490]">Business Coach</p>
              </div>
            </div>
          </div>
          <button
            onClick={closeOverlay}
            className="w-8 h-8 rounded-full bg-[#f5f6f0] flex items-center justify-center touch-active"
          >
            <ChevronDown size={18} className="text-[#676d65]" />
          </button>
        </div>

        {/* Chat — fills remaining height */}
        <div className="flex-1 overflow-hidden flex flex-col bg-[#f8fafc]">
          <ChatWindow isFirstVisit={isFirstVisit} />
        </div>
      </div>
    </>
  )
}
