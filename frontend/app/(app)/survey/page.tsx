'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { StatusBar } from '@/components/app-shell/StatusBar'
import { useFlow } from '@/contexts/FlowContext'
import { useTester } from '@/contexts/TesterContext'
import { cn } from '@/lib/utils'

const LOAN_USE_OPTIONS = [
  { id: 'business', label: 'For my business', emoji: '🏪' },
  { id: 'personal', label: 'Personal expenses', emoji: '🏠' },
  { id: 'education', label: 'Education', emoji: '📚' },
  { id: 'health', label: 'Health', emoji: '💊' },
  { id: 'other', label: 'Other', emoji: '✨' },
]

export default function SurveyPage() {
  const [selected, setSelected] = useState<string | null>(null)
  const { dispatch } = useFlow()
  const { tester } = useTester()
  const router = useRouter()

  const handleSelect = (id: string) => {
    setSelected(id)
    if (id === 'business') {
      setTimeout(() => {
        dispatch({ type: 'SURVEY_COMPLETE', choice: 'business' })
        router.push('/intro')
      }, 400)
    }
  }

  const handleContinue = () => {
    dispatch({ type: 'SURVEY_COMPLETE', choice: 'personal' })
    router.push('/home')
  }

  return (
    <div className="flex flex-col min-h-dvh bg-[#f5f6f0]">
      <div className="bg-[#083032]">
        <StatusBar dark />
        <div className="px-5 pb-6 pt-2">
          <p className="text-[#20bec6] text-sm font-light mb-1">
            Hi, {tester?.firstName ?? 'welcome'} 👋
          </p>
          <h1 className="text-white text-xl font-semibold leading-snug">
            What will you use this loan for?
          </h1>
        </div>
      </div>

      <div className="flex-1 px-4 py-5 space-y-3">
        {LOAN_USE_OPTIONS.map((opt) => {
          const isSelected = selected === opt.id
          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              className={cn(
                'w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200 touch-active',
                isSelected
                  ? 'bg-[#00A69C] border-[#00A69C] shadow-md'
                  : 'bg-white border-[#e5e5e5]'
              )}
            >
              <span className="text-2xl">{opt.emoji}</span>
              <span className={cn('flex-1 font-semibold text-base', isSelected ? 'text-white' : 'text-[#1b1b1b]')}>
                {opt.label}
              </span>
              {isSelected && <CheckCircle2 size={20} className="text-white" />}
            </button>
          )
        })}
      </div>

      {selected && selected !== 'business' && (
        <div className="px-4 pb-8">
          <button
            onClick={handleContinue}
            className="w-full h-14 rounded-[28px] text-white font-bold text-base touch-active active:opacity-80"
            style={{ background: '#F06B22' }}
          >
            Continue
          </button>
        </div>
      )}
    </div>
  )
}
