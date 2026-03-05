import type { AgentResponse, OnboardingPhase, BusinessProfile } from '@/lib/types'

export interface ChatHistoryItem {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatServiceInterface {
  sendMessage(
    content: string,
    phase: OnboardingPhase,
    profile: Partial<BusinessProfile>,
    mode: 'onboarding' | 'servicing' | 'coaching',
    history: ChatHistoryItem[],
    testerName?: string
  ): Promise<AgentResponse>

  getOpeningMessage(firstName: string): Promise<AgentResponse>
}

// Detect next phase based on message count/content
export function detectNextPhase(
  currentPhase: OnboardingPhase,
  messageCount: number,
  userMessage: string
): OnboardingPhase {
  if (currentPhase === 'complete') return 'complete'

  const lower = userMessage.toLowerCase()

  // Phase transitions based on enough exchanges in each phase
  const phaseThresholds: Record<number, number> = {
    1: 1,  // Move from phase 1 after 1 user reply
    2: 2,  // Phase 2 after 2 exchanges (value demo)
    3: 3,  // Phase 3 after 3 exchanges (3 profile questions)
    4: 3,  // Phase 4 after 3 exchanges (3 health signals)
    5: 1   // Phase 5 after 1 exchange (optional)
  }

  const threshold = phaseThresholds[currentPhase as number] ?? 2

  if (messageCount >= threshold && typeof currentPhase === 'number' && currentPhase < 6) {
    return (currentPhase + 1) as OnboardingPhase
  }

  if (currentPhase === 6) {
    if (lower.includes('ok') || lower.includes('listo') || lower.includes('sure') || messageCount >= 1) {
      return 'complete'
    }
  }

  return currentPhase
}
