'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useFlow } from '@/contexts/FlowContext'
import { useTester } from '@/contexts/TesterContext'
import { StatusBar } from '@/components/app-shell/StatusBar'
import { CheckCircle2 } from 'lucide-react'

const BENEFITS = [
  {
    icon: '⚡',
    title: 'Fast approval',
    desc: 'Answer a few questions and get your offer in minutes.',
  },
  {
    icon: '🧠',
    title: 'Business coaching included',
    desc: 'Get personalized tips to grow your sales and manage cash flow.',
  },
  {
    icon: '🔒',
    title: 'Safe and confidential',
    desc: 'Your information is private and protected.',
  },
]

export default function OptInPage() {
  const { dispatch } = useFlow()
  const { tester } = useTester()
  const router = useRouter()

  const amount = tester?.approvedAmount ?? 8000
  const formatted = `$${amount.toLocaleString('en-US')} MXN`

  const handleOptIn = () => {
    dispatch({ type: 'MSME_OPT_IN' })
    router.push('/intro')
  }

  const handleDecline = () => {
    dispatch({ type: 'SURVEY_COMPLETE', choice: 'personal' })
    router.push('/home')
  }

  return (
    <div className="flex flex-col min-h-dvh bg-white">
      <StatusBar />

      {/* Hero */}
      <div className="bg-[#083032] px-6 pt-4 pb-8 flex flex-col items-center text-center">
        <Image
          src="/thalia/Thalia-icon.png"
          alt="Thalia"
          width={64}
          height={64}
          className="rounded-full object-cover mb-4"
        />
        <p className="text-[#20bec6] text-sm font-medium mb-1">
          You have a pre-approved offer
        </p>
        <h1 className="text-white text-3xl font-bold mb-1">{formatted}</h1>
        <p className="text-[#a8c5c6] text-sm">
          Ready for your business — let's make it official.
        </p>
      </div>

      {/* Benefits */}
      <div className="flex-1 px-5 py-6 space-y-4">
        {BENEFITS.map((b) => (
          <div key={b.title} className="flex items-start gap-4">
            <div
              className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg"
              style={{ background: '#D2F2F4' }}
            >
              {b.icon}
            </div>
            <div>
              <p className="font-semibold text-[#314329] text-sm">{b.title}</p>
              <p className="text-[#6b7280] text-sm leading-snug">{b.desc}</p>
            </div>
          </div>
        ))}

        {/* Trust note */}
        <div
          className="mt-2 flex items-start gap-3 rounded-2xl px-4 py-3"
          style={{ background: '#f5f6f0' }}
        >
          <CheckCircle2 size={18} className="text-[#1a989e] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#4b5563] leading-relaxed">
            Chatting with Thalia takes about 5 minutes. You can skip any step that doesn't apply to you.
          </p>
        </div>
      </div>

      {/* CTAs */}
      <div className="px-6 pb-10 flex flex-col items-center gap-3">
        <button
          onClick={handleOptIn}
          className="text-white font-bold text-base touch-active active:opacity-80 w-full"
          style={{
            height: 52,
            borderRadius: 100,
            background: '#F06F14',
            maxWidth: 340,
          }}
        >
          I'm interested — let's go
        </button>
        <button
          onClick={handleDecline}
          className="text-sm font-medium py-1 touch-active"
          style={{ color: '#757575' }}
        >
          Not right now
        </button>
      </div>
    </div>
  )
}
