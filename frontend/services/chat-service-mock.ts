// Fallback mock service used when API key is not configured
import type { AgentResponse, OnboardingPhase, BusinessProfile } from '@/lib/types'

const PHASE_SCRIPTS: Record<string, string[]> = {
  '1': [
    "Hi! 👋 I'm **Thalia**, your AI business assistant from Tala.\n\nI'm here to help you get the best loan offer for your business — and stick around as your ongoing business partner after that.\n\nThis will take about 5 minutes. You can skip any optional steps. **Step 1 of 8** — let's go!",
  ],
  '2': [
    "Great! What are your average weekly sales? An estimate is fine.",
  ],
  '3': [
    "Got it! What are your main business costs and how often do you pay them?",
  ],
  '4': [
    "Last question for Part 1 — what are you planning to use the loan for?",
  ],
  '5': [
    "That's everything for Part 1 — nice work! One optional step before Part 2 — want to share a photo of your shop or a bank statement? Completely optional, won't affect your offer.",
  ],
  '6': [
    "Now for Part 2: let me show you a quick preview of how I can help grow your business day-to-day.",
    "That's great thinking! This is exactly the kind of work I can help with every day from your home screen. Ready to see your offer?"
  ],
  '7': [
    "Here's your offer! Let me check what works best for you...\n\nWhich payment plan works best?",
  ],
  '8': [
    "You're all set — congratulations! Your loan will be disbursed once you add your bank details. I'll be here as your Business Coach any time from your home screen."
  ]
}

let phaseMessageIndex: Record<string, number> = {}

export const mockChatService = {
  async getOpeningMessage(firstName: string): Promise<AgentResponse> {
    phaseMessageIndex = {}
    return {
      content: `Hi, ${firstName}! 👋 I'm **Thalia**, your AI business assistant from Tala.\n\nI'm here to help you get the best loan offer for your business — and stay as your ongoing business partner after that.\n\nThis takes about 5 minutes. You can skip any optional steps. **Step 1 of 6** — let's go!`,
      phase: 1,
      quickReplies: ["Let's get started!", 'How does this work?', 'How long will this take?']
    }
  },

  async sendMessage(
    content: string,
    phase: OnboardingPhase,
    profile: Partial<BusinessProfile>,
    mode: 'onboarding' | 'servicing' | 'coaching'
  ): Promise<AgentResponse> {
    if (mode === 'servicing' || mode === 'coaching') {
      return {
        content: "I'm here to help! You can ask me about your loan balance, payment schedule, or get business tips. What would you like to know?",
        phase,
        quickReplies: ['How do I make a payment?', 'When is my next payment?', 'Give me a business tip']
      }
    }

    const phaseKey = String(phase)
    const scripts = PHASE_SCRIPTS[phaseKey] ?? []
    const idx = phaseMessageIndex[phaseKey] ?? 0
    const script = scripts[idx] ?? scripts[scripts.length - 1] ?? "Let's keep going!"

    phaseMessageIndex[phaseKey] = Math.min(idx + 1, scripts.length - 1)

    // Advance phase after last script line
    const isLastInPhase = idx >= scripts.length - 1
    let nextPhase: OnboardingPhase = phase

    if (isLastInPhase && typeof phase === 'number') {
      nextPhase = phase < 8 ? ((phase + 1) as OnboardingPhase) : 'complete'
    }

    const isComplete = nextPhase === 'complete'

    return {
      content: script,
      phase: nextPhase,
      showPhotoUpload: nextPhase === 5 || nextPhase === '5',
      quickReplies: getQuickReplies(nextPhase),
      metadata: {
        nextAction: isComplete ? 'complete_onboarding' : 'continue'
      }
    }
  }
}

function getQuickReplies(phase: OnboardingPhase): string[] {
  const replies: Record<string, string[]> = {
    '1': ["Let's get started!", 'Sounds good!'],
    '2': ['Under $3,000', '$3,000–$8,000', '$8,000–$15,000', 'Over $15,000'],
    '3': [],
    '4': ['Restock inventory', 'Buy equipment', 'Working capital', 'Other'],
    '5': ['Upload a photo', 'Skip this step'],
    '6': [],
    '7': ['1 payment – 30 days', '2 payments – 60 days', 'I have a question'],
    '8': [],
    'complete': []
  }
  return replies[String(phase)] ?? []
}
