'use client'

import { useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { useChat } from '@/contexts/ChatContext'
import { useTester } from '@/contexts/TesterContext'
import { useCustomer } from '@/contexts/CustomerContext'
import { useFlow } from '@/contexts/FlowContext'
import { useLocale } from '@/contexts/LocaleContext'
import { ChatWindow } from './ChatWindow'

export function ChatOverlay() {
  const { state, closeOverlay, startCoaching } = useChat()
  const { tester } = useTester()
  const { customer } = useCustomer()
  const { flow, dispatch: flowDispatch } = useFlow()
  const { locale } = useLocale()

  const isFirstVisit = flow.coachingSessionCount === 0
  const coachingStarted = useRef(false)

  // Start coaching chat when overlay opens (unless already running)
  useEffect(() => {
    if (!state.overlayOpen) return
    if (state.mode === 'coaching' && state.messages.length > 0) return
    if (coachingStarted.current) return
    const coachingName = customer.firstName || tester?.firstName
    if (!coachingName) return

    coachingStarted.current = true
    const profile = (flow.businessProfile ?? {}) as Record<string, string>
    const approvedAmount = flow.loanConfig?.amount ?? tester?.approvedAmount ?? 8000
    const maxAmount = tester?.maxAmount ?? 12000
    startCoaching(coachingName, profile, approvedAmount, maxAmount, isFirstVisit)
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
      <div className="fixed inset-0 z-50 flex justify-center items-end pointer-events-none">
        <div
          className="bg-white flex flex-col rounded-t-3xl overflow-hidden animate-slide-up pointer-events-auto"
          style={{
            width: 'min(100vw, var(--app-max-width))',
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
                <p className="text-[10px] text-[#939490]">{locale === 'es-MX' ? 'Asistente de negocios' : 'Business assistant'}</p>
              </div>
            </div>
          </div>
          <button
            onClick={closeOverlay}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#f5f6f0] text-[#676d65] text-xs font-medium touch-active active:bg-[#e5e5e5]"
          >
            {locale === 'es-MX' ? 'Cerrar' : 'Close'}
            <ChevronDown size={14} />
          </button>
        </div>

        {/* Chat — fills remaining height */}
        <div className="flex-1 overflow-hidden flex flex-col bg-[#f8fafc]">
          <ChatWindow isFirstVisit={isFirstVisit} />
        </div>
        </div>
      </div>
    </>
  )
}
