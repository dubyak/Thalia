'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ChevronRight } from 'lucide-react'
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

const LOAN_PURPOSE_OPTIONS = [
  { id: 'restock', label: 'Restock inventory' },
  { id: 'equipment', label: 'Buy equipment' },
  { id: 'working-capital', label: 'Working capital' },
  { id: 'expand', label: 'Expand the business' },
  { id: 'other', label: 'Something else' },
]

type Step = 'loan-use' | 'business-type' | 'loan-purpose'

export default function SurveyPage() {
  const [step, setStep] = useState<Step>('loan-use')
  const [selected, setSelected] = useState<string | null>(null)
  const [businessType, setBusinessType] = useState('')
  const [loanPurpose, setLoanPurpose] = useState<string | null>(null)
  const { dispatch } = useFlow()
  const { tester } = useTester()
  const router = useRouter()

  const handleLoanUseSelect = (id: string) => {
    setSelected(id)
    if (id === 'business') {
      setTimeout(() => setStep('business-type'), 400)
    }
  }

  const handleBusinessTypeContinue = () => {
    if (!businessType.trim()) return
    setStep('loan-purpose')
  }

  const handlePurposeSelect = (id: string) => {
    setLoanPurpose(id)
  }

  const handleBusinessContinue = () => {
    if (!loanPurpose) return
    const purposeLabel = LOAN_PURPOSE_OPTIONS.find(o => o.id === loanPurpose)?.label ?? loanPurpose
    dispatch({
      type: 'SURVEY_COMPLETE',
      choice: 'business',
      businessType: businessType.trim(),
      loanPurpose: purposeLabel,
    })
    router.push('/intro')
  }

  const handlePersonalContinue = () => {
    dispatch({ type: 'SURVEY_COMPLETE', choice: 'personal' })
    router.push('/home')
  }

  // Step 2: Business type (free text)
  if (step === 'business-type') {
    return (
      <div className="flex flex-col min-h-dvh bg-[#f5f6f0]">
        <div className="bg-[#083032]">
          <StatusBar dark />
          <div className="px-5 pb-6 pt-2">
            <p className="text-[#20bec6] text-sm font-light mb-1">
              Great choice
            </p>
            <h1 className="text-white text-xl font-semibold leading-snug">
              What type of business do you have?
            </h1>
          </div>
        </div>

        <div className="flex-1 px-4 py-5">
          <input
            type="text"
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            placeholder="e.g. Bakery, Market stall, Online shop"
            className="w-full p-4 rounded-2xl border-2 border-[#e5e5e5] bg-white text-[#1b1b1b] text-base font-semibold placeholder:font-normal placeholder:text-[#999] focus:border-[#00A69C] focus:outline-none transition-colors"
            autoFocus
          />
        </div>

        {businessType.trim() && (
          <div className="px-4 pb-8">
            <button
              onClick={handleBusinessTypeContinue}
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

  // Step 3: Loan purpose for business users
  if (step === 'loan-purpose') {
    return (
      <div className="flex flex-col min-h-dvh bg-[#f5f6f0]">
        <div className="bg-[#083032]">
          <StatusBar dark />
          <div className="px-5 pb-6 pt-2">
            <p className="text-[#20bec6] text-sm font-light mb-1">
              Almost there 👍
            </p>
            <h1 className="text-white text-xl font-semibold leading-snug">
              What do you plan to use the loan for?
            </h1>
          </div>
        </div>

        <div className="flex-1 px-4 py-5 space-y-3">
          {LOAN_PURPOSE_OPTIONS.map((opt) => {
            const isSelected = loanPurpose === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => handlePurposeSelect(opt.id)}
                className={cn(
                  'w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200 touch-active',
                  isSelected
                    ? 'bg-[#00A69C] border-[#00A69C] shadow-md'
                    : 'bg-white border-[#e5e5e5]'
                )}
              >
                <span className={cn('flex-1 font-semibold text-base', isSelected ? 'text-white' : 'text-[#1b1b1b]')}>
                  {opt.label}
                </span>
                {isSelected ? (
                  <CheckCircle2 size={20} className="text-white" />
                ) : (
                  <ChevronRight size={18} className="text-[#c2c6c0]" />
                )}
              </button>
            )
          })}
        </div>

        {loanPurpose && (
          <div className="px-4 pb-8">
            <button
              onClick={handleBusinessContinue}
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

  // Step 1: Loan use selection
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
              onClick={() => handleLoanUseSelect(opt.id)}
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
            onClick={handlePersonalContinue}
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
