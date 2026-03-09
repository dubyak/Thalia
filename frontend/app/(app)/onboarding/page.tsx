'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useChat } from '@/contexts/ChatContext'
import { useTester } from '@/contexts/TesterContext'
import { useFlow } from '@/contexts/FlowContext'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { StatusBar } from '@/components/app-shell/StatusBar'
import { ChevronLeft } from 'lucide-react'

export default function OnboardingPage() {
  const { startOnboarding, resetChat, state } = useChat()
  const { tester } = useTester()
  const { flow, dispatch } = useFlow()
  const router = useRouter()
  const startedRef = useRef(false)

  // Start onboarding once per page mount — pass survey context to the agent
  useEffect(() => {
    if (!tester?.firstName || startedRef.current) return
    startedRef.current = true
    resetChat()
    setTimeout(() => startOnboarding(
      tester.firstName,
      tester.approvedAmount,
      tester.maxAmount,
      flow.surveyBusinessType ?? tester.businessType,
      flow.surveyLoanPurpose,
    ), 0)
  }, [tester?.firstName]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleComplete = () => {
    dispatch({
      type: 'ONBOARDING_COMPLETE',
      profile: state.businessProfile
    })
    // Offer is accepted in-chat via TermsModal → /cashout.
    // This fallback fires only if onboarding completes without an in-chat offer acceptance.
    router.push('/cashout')
  }

  return (
    <div className="flex flex-col h-dvh bg-[#f5f6f0]">
      {/* Header — Thalia avatar + name + status */}
      <div className="bg-white border-b border-[#f0f0f0] flex-shrink-0">
        <StatusBar />
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push('/survey')}
            className="w-8 h-8 flex items-center justify-center touch-active -ml-1"
          >
            <ChevronLeft size={22} className="text-[#1f1c2f]" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/thalia/SupportAgentWidget-Post-disbursement.svg"
            alt="Thalia"
            style={{ width: 36, height: 36, flexShrink: 0 }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[#1f1c2f] font-semibold text-sm leading-tight">Thalia</p>
            <p className="text-[#1a989e] text-xs font-medium flex items-center gap-1 leading-tight">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#1a989e]" />
              Business assistant
            </p>
          </div>
        </div>
      </div>

      {/* Chat window fills remaining height */}
      <div className="flex-1 overflow-hidden flex flex-col bg-white">
        <ChatWindow showProgress onComplete={handleComplete} />
      </div>
    </div>
  )
}
