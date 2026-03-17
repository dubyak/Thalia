import type { OnboardingPhase } from '@/lib/types'

// Map phases to visible progress steps
const PHASE_TO_STEP: Record<string, number> = {
  '0': 1,   // Welcome
  '1': 2,   // Business profile
  '2': 2,
  '3': 2,
  '4': 3,   // Business health
  '5': 3,
  '6': 3,
  '7': 3,
  '8': 4,   // Evidence
  '9': 5,   // Coaching demo
  '10': 6,  // Offer
  '11': 7,  // Closing
  'complete': 7,
}

const STEP_LABELS: Record<number, string> = {
  1: 'Welcome',
  2: 'About your business',
  3: 'Business health',
  4: 'Evidence',
  5: 'Coaching preview',
  6: 'Your offer',
  7: 'Done',
}

const TOTAL_STEPS = 7

interface OnboardingProgressProps {
  phase: OnboardingPhase
}

export function OnboardingProgress({ phase }: OnboardingProgressProps) {
  const step = PHASE_TO_STEP[String(phase)] ?? 1
  const progress = (step / TOTAL_STEPS) * 100

  return (
    <div className="px-4 py-3 bg-white border-b border-[#e5e5e5]">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-semibold text-[#1a989e]">
          {phase === 'complete' ? 'Completed' : `${TOTAL_STEPS - step} ${TOTAL_STEPS - step === 1 ? 'step' : 'steps'} left`}
        </span>
        <span className="text-xs text-[#939490] font-light">
          {STEP_LABELS[step] ?? ''}
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
