'use client'

import type { OnboardingPhase } from '@/lib/types'
import { useTranslation } from '@/lib/i18n/useTranslation'

// Map phases to visible progress steps
const PHASE_TO_STEP: Record<string, number> = {
  '0': 1,   // Welcome — same step as "About Business" so counter doesn't jump
  '1': 1,
  '2': 1,
  '3': 1,
  '4': 2,   // Business Health (phases 4–8)
  '5': 2,
  '6': 2,
  '7': 2,
  '8': 2,
  '9': 3,   // Evidence (phase 9 is evidence, not phase 8)
  '10': 4,  // Coaching Preview
  '11': 5,  // Your Offer
  '12': 6,  // Closing
  'complete': 6,
}

const STEP_LABEL_KEYS: Record<number, string> = {
  1: 'progress.aboutBusiness',
  2: 'progress.businessHealth',
  3: 'progress.evidence',
  4: 'progress.coachingPreview',
  5: 'progress.yourOffer',
  6: 'progress.done',
}

const TOTAL_STEPS = 6

interface OnboardingProgressProps {
  phase: OnboardingPhase
}

export function OnboardingProgress({ phase }: OnboardingProgressProps) {
  const { t } = useTranslation()
  const step = PHASE_TO_STEP[String(phase)] ?? 1
  const progress = (step / TOTAL_STEPS) * 100
  const remaining = TOTAL_STEPS - step

  return (
    <div className="px-4 py-3 bg-white border-b border-[#e5e5e5]">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-semibold text-[#1a989e]">
          {phase === 'complete'
            ? t('common.completed')
            : remaining === 1
              ? t('progress.stepLeft', { count: remaining })
              : t('progress.stepsLeft', { count: remaining })}
        </span>
        <span className="text-xs text-[#939490] font-light">
          {t(STEP_LABEL_KEYS[step] ?? '')}
        </span>
      </div>
      <div className="w-full h-1.5 bg-[#e5e5e5] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#1a989e] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
