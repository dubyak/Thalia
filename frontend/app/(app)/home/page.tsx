'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useChat } from '@/contexts/ChatContext'
import { useFlow } from '@/contexts/FlowContext'
import { useTester } from '@/contexts/TesterContext'
import { FloatingChatButton } from '@/components/chat/FloatingChatButton'
import { ChatOverlay } from '@/components/chat/ChatOverlay'
import { StatusBar } from '@/components/app-shell/StatusBar'
import { formatMXN } from '@/lib/constants'
import { HelpCircle, User, ChevronRight, Flame, ArrowRight, RotateCcw } from 'lucide-react'

export default function HomePage() {
  const { flow, dispatch: flowDispatch } = useFlow()
  const { tester } = useTester()
  const { openOverlay, resetChat } = useChat()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const handleReset = () => {
    resetChat()
    flowDispatch({ type: 'RESET' })
    router.push('/survey')
  }

  const loan = mounted ? flow.loanConfig : undefined
  const amount = loan?.amount ?? tester?.approvedAmount ?? 8000
  const totalRepayment = loan?.totalRepayment ?? amount * 1.12
  const monthlyPayment = loan?.monthlyPayment ?? totalRepayment
  const firstPaymentDate = loan?.firstPaymentDate ?? '1 de marzo'

  return (
    <div className="flex flex-col min-h-dvh bg-white">
      {/* Status bar + TALA header */}
      <div className="bg-white border-b border-[#f0f0f0]">
        <StatusBar />
        <div className="px-5 py-3 flex items-center justify-between">
          {/* TALA wordmark */}
          <span className="text-[#1a989e] text-2xl font-bold tracking-tight">TALA</span>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 rounded-full border border-[#e8e8e6] flex items-center justify-center touch-active">
              <HelpCircle size={16} className="text-[#939490]" />
            </button>
            <button className="w-8 h-8 rounded-full border border-[#e8e8e6] flex items-center justify-center touch-active">
              <User size={16} className="text-[#939490]" />
            </button>
            {/* Prototype reset — for usability testing only */}
            <button
              onClick={handleReset}
              className="w-8 h-8 rounded-full border border-[#fbe9dd] bg-[#fff8f4] flex items-center justify-center touch-active"
              title="Restart prototype"
            >
              <RotateCcw size={14} className="text-[#f06f14]" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Payment due card */}
        <div className="mx-5 mt-5 mb-4 bg-white rounded-2xl p-4" style={{ boxShadow: '0 2px 4px 0 rgba(0,0,0,0.25)' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: '#314329' }}>Payment due {firstPaymentDate}</p>
          <p className="font-semibold leading-tight mb-4" style={{ color: '#314329', fontSize: 40, lineHeight: '48px' }}>
            {formatMXN(monthlyPayment)}
          </p>
          <button
            className="text-white font-bold text-sm touch-active active:opacity-80 mb-3 flex items-center justify-center"
            style={{ width: 280, height: 38, borderRadius: 100, background: '#F06F14' }}
          >
            Make a payment
          </button>
          <button className="flex items-center gap-1 text-sm font-medium touch-active" style={{ color: '#00A69C' }}>
            View credit details
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Divider */}
        <div className="h-px bg-[#f0f0f0] mx-5 mb-4" />

        {/* Your growth card */}
        <div className="mx-5 mb-4 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #083032 0%, #1a989e 100%)' }}>
          <div className="p-4 flex items-center gap-3">
            {/* Tree illustration placeholder */}
            <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🌱</span>
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm leading-snug mb-0.5">
                Your growth is in your hands
              </p>
              <p className="text-white/60 text-xs font-light leading-snug">
                Start a payment streak to unlock higher limits
              </p>
              <button className="mt-2 flex items-center gap-1 text-[#20bec6] text-xs font-semibold touch-active">
                Grow with Tala
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Two-up card grid */}
        <div className="grid grid-cols-2 gap-3 px-5 mb-4">
          {/* Repayment streak card */}
          <div
            className="h-[190px] rounded-2xl relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0d4a4d 0%, #1a989e 100%)' }}
          >
            <div className="absolute top-4 right-4">
              <Flame size={20} className="text-[#f06f14]" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-white font-semibold text-xs mb-1 leading-snug">
                Add to your repayment streak!
              </p>
              <p className="text-white/70 text-[10px] font-light leading-relaxed">
                You have paid {'{x}'} loans on time in a row. Keep the streak going!
              </p>
            </div>
          </div>

          {/* Know the ways card */}
          <div className="h-[190px] rounded-2xl relative overflow-hidden bg-[#d2f2f4]">
            <div className="absolute top-4 right-4 text-lg">💳</div>
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-[#083032] font-semibold text-xs mb-1 leading-snug">
                Know the ways you can pay?
              </p>
              <p className="text-[#676d65] text-[10px] font-light leading-relaxed">
                From your bank's app or at the nearest OXXO. Tap to discover your ideal method.
              </p>
            </div>
          </div>
        </div>

        {/* Help center */}
        <div className="mx-5 mb-3">
          <button className="w-full bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3 border border-[#e8e8e6] touch-active active:bg-[#f8fafc]">
            <div className="w-9 h-9 rounded-xl bg-[#fbe9dd] flex items-center justify-center flex-shrink-0">
              <HelpCircle size={18} className="text-[#f06f14]" />
            </div>
            <p className="flex-1 text-left font-semibold text-sm text-[#1f1c2f]">Help center</p>
            <ChevronRight size={18} className="text-[#c9c8c6]" />
          </button>
        </div>
      </div>

      <FloatingChatButton />
      <ChatOverlay />
    </div>
  )
}
