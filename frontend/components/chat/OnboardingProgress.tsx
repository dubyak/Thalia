import type { OnboardingPhase } from '@/lib/types'
import { cn } from '@/lib/utils'

const PHASE_LABELS: Record<string, string> = {
  '1': 'Intro',
  '2': 'Your business',
  '3': 'Your profile',
  '4': 'Your loan',
  '5': 'Evidence',
  '6': 'Coaching',
  '7': 'Offer',
  '8': 'Closing',
  'complete': 'Completed'
}

interface OnboardingProgressProps {
  phase: OnboardingPhase
}

export function OnboardingProgress({ phase }: OnboardingProgressProps) {
  const phaseNum = phase === 'complete' ? 8 : Number(phase)
  const totalSteps = 8
  const progress = (phaseNum / totalSteps) * 100

  return (
    <div className="px-4 py-3 bg-white border-b border-[#e5e5e5]">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-semibold text-[#1a989e]">
          {phase === 'complete' ? 'Completed' : `Step ${phaseNum} of ${totalSteps}`}
        </span>
        <span className="text-xs text-[#939490] font-light">
          {PHASE_LABELS[String(phase)] ?? ''}
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
