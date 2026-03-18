'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'
import { StatusBar } from '@/components/app-shell/StatusBar'
import { useFlow } from '@/contexts/FlowContext'
import { useTester } from '@/contexts/TesterContext'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n/useTranslation'

type Step = 'loan-use' | 'business-type' | 'loan-purpose'

export default function SurveyPage() {
  const [step, setStep] = useState<Step>('loan-use')
  const [selected, setSelected] = useState<string | null>(null)
  const [businessType, setBusinessType] = useState('')
  const [loanPurpose, setLoanPurpose] = useState<string | null>(null)
  const { dispatch } = useFlow()
  const { tester } = useTester()
  const router = useRouter()
  const { t } = useTranslation()

  const LOAN_USE_OPTIONS = [
    { id: 'business', label: t('survey.loanUse.business'), emoji: '🏪' },
    { id: 'personal', label: t('survey.loanUse.personal'), emoji: '🏠' },
    { id: 'education', label: t('survey.loanUse.education'), emoji: '📚' },
    { id: 'health', label: t('survey.loanUse.health'), emoji: '💊' },
    { id: 'other', label: t('survey.loanUse.other'), emoji: '✨' },
  ]

  const LOAN_PURPOSE_OPTIONS = [
    { id: 'restock', label: t('survey.loanPurpose.restock') },
    { id: 'equipment', label: t('survey.loanPurpose.equipment') },
    { id: 'working-capital', label: t('survey.loanPurpose.workingCapital') },
    { id: 'expand', label: t('survey.loanPurpose.expand') },
    { id: 'other', label: t('survey.loanPurpose.other') },
  ]

  const handleLoanUseSelect = (id: string) => {
    setSelected(id)
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
          <div className="px-5 pt-2">
            <button
              onClick={() => setStep('loan-use')}
              className="w-8 h-8 flex items-center justify-center touch-active -ml-1"
            >
              <ChevronLeft size={22} className="text-white" />
            </button>
          </div>
          <div className="px-5 pb-6 pt-0">
            <p className="text-[#20bec6] text-sm font-light mb-1">
              {t('survey.greatChoice')}
            </p>
            <h1 className="text-white text-xl font-semibold leading-snug">
              {t('survey.businessTypeTitle')}
            </h1>
          </div>
        </div>

        <div className="flex-1 px-4 py-5">
          <input
            type="text"
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            placeholder={t('survey.businessTypePlaceholder')}
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
              {t('common.continue')}
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
          <div className="px-5 pt-2">
            <button
              onClick={() => setStep('business-type')}
              className="w-8 h-8 flex items-center justify-center touch-active -ml-1"
            >
              <ChevronLeft size={22} className="text-white" />
            </button>
          </div>
          <div className="px-5 pb-6 pt-0">
            <p className="text-[#20bec6] text-sm font-light mb-1">
              {t('survey.almostThere')} 👍
            </p>
            <h1 className="text-white text-xl font-semibold leading-snug">
              {t('survey.loanPurposeTitle')}
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
              {t('common.continue')}
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
            {t('survey.greeting', { name: tester?.firstName ?? 'welcome' })} 👋
          </p>
          <h1 className="text-white text-xl font-semibold leading-snug">
            {t('survey.loanUseTitle')}
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

      {selected && (
        <div className="px-4 pb-8">
          <button
            onClick={selected === 'business' ? () => setStep('business-type') : handlePersonalContinue}
            className="w-full h-14 rounded-[28px] text-white font-bold text-base touch-active active:opacity-80"
            style={{ background: '#F06B22' }}
          >
            {t('common.continue')}
          </button>
        </div>
      )}
    </div>
  )
}
