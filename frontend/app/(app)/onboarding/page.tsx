'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useChat } from '@/contexts/ChatContext'
import { useTester } from '@/contexts/TesterContext'
import { useCustomer } from '@/contexts/CustomerContext'
import { useFlow } from '@/contexts/FlowContext'
import { useLocale } from '@/contexts/LocaleContext'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { StatusBar } from '@/components/app-shell/StatusBar'
import { ResetMenu } from '@/components/app-shell/ResetMenu'
import { ChevronLeft } from 'lucide-react'

export default function OnboardingPage() {
  const { startOnboarding, resetChat, state } = useChat()
  const { tester } = useTester()
  const { customer } = useCustomer()
  const { locale } = useLocale()
  const isEs = locale === 'es-MX'
  const { flow, dispatch } = useFlow()
  const router = useRouter()
  const startedRef = useRef(false)

  // Start onboarding once per page mount — pass survey context to the agent
  const displayName = customer.firstName
  useEffect(() => {
    if (!displayName || startedRef.current) return
    startedRef.current = true

    // If messages exist (restored from localStorage), skip reset+start
    if (state.messages.length > 0) return

    resetChat()
    const testerCtx = tester?.loanNumber
      ? `Loyal Tala customer since ${tester.signUpDate} — on their ${tester.loanNumber}th loan.`
      : undefined
    setTimeout(() => startOnboarding(
      displayName,
      tester?.approvedAmount,
      tester?.maxAmount,
      flow.surveyBusinessType ?? tester?.businessType,
      flow.surveyLoanPurpose,
      testerCtx,
    ), 0)
  }, [displayName]) // eslint-disable-line react-hooks/exhaustive-deps

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
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push('/survey')}
            className="w-8 h-8 flex items-center justify-center touch-active -ml-1"
          >
            <ChevronLeft size={22} className="text-[#1f1c2f]" />
          </button>

          {/* Avatar + name in center */}
          <div className="flex items-center gap-3 flex-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/thalia/SupportAgentWidget.svg"
              alt="Thalia"
              style={{ width: 36, height: 36, flexShrink: 0 }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[#1f1c2f] font-semibold text-sm leading-tight">Thalia</p>
              <p className="text-[#1a989e] text-xs font-medium flex items-center gap-1 leading-tight">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#1a989e]" />
                {isEs ? 'Asistente de negocios' : 'Business assistant'}
              </p>
            </div>
          </div>

          {/* Reset menu on right */}
          <ResetMenu variant="icon" />
        </div>
      </div>

      {/* Chat window fills remaining height */}
      <div className="flex-1 overflow-hidden flex flex-col bg-white">
        <ChatWindow showProgress onComplete={handleComplete} />
      </div>
    </div>
  )
}
