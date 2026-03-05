// Fallback mock service used when API key is not configured
import type { AgentResponse, OnboardingPhase, BusinessProfile } from '@/lib/types'

const PHASE_SCRIPTS: Record<string, string[]> = {
  '1': [
    "¡Hola! 👋 I'm **Thalia**, your AI business assistant from Tala.\n\nI'm here to help you get the best loan offer for your business — and stick around as your ongoing business partner after that.\n\nThis will take about 5 minutes. You can skip any optional steps. **Step 1 of 6** — let's go!",
  ],
  '2': [
    "Before I ask about your business details, I want to help you with something **right now**. 💡\n\nWhat's your biggest business challenge at the moment?\n\n- Getting more customers\n- Managing cash flow\n- Buying inventory at better prices\n- Something else",
    "That's a really common challenge for businesses like yours. Here's what tends to work:\n\n• **Short-term:** Try WhatsApp Business — send a simple promo to your existing customers. It costs nothing and typically brings 10-20% back within a week.\n• **Medium-term:** Ask your 3 best customers for a referral. Word-of-mouth is your strongest channel.\n\nI can go deeper on any of these later. For now, let me ask a few quick questions to check your loan offer. **Step 3 of 6**"
  ],
  '3': [
    "Great! Now a few quick questions about your business.\n\n**Step 3 of 6** — What type of business do you run? (e.g. food, clothing, electronics, services...)",
    "Got it! And how do you mainly sell — from a physical store, at a market, online, or from home?",
    "Perfect. And how long have you been running this business?"
  ],
  '4': [
    "Almost there! **Step 4 of 6** — Has anything changed in your business since your last Tala loan?",
    "Thanks for sharing that. How's your sales outlook looking for the next couple of weeks?",
    "One last thing — when you spend money on inventory or supplies, how quickly do you usually get that cash back? (A few days / 1-2 weeks / 3+ weeks)"
  ],
  '5': [
    "**Step 5 of 6** — This step is completely optional and won't affect your loan offer if you skip it. 👌\n\nWould you like to share a quick photo of your business? (your shop, products, a recent invoice or bank statement) — it helps me give you better advice.\n\nNo pressure — tap **Skip** if you'd prefer not to.",
  ],
  '6': [
    "You're amazing — thank you for sharing all of that! 🎉\n\nHere's what I know about you now: a business owner with real momentum. Let me check what Tala's best offer looks like for you...\n\n⏳ *Checking your offer now...*"
  ]
}

let phaseMessageIndex: Record<string, number> = {}

export const mockChatService = {
  async getOpeningMessage(firstName: string): Promise<AgentResponse> {
    phaseMessageIndex = {}
    return {
      content: `¡Hola, ${firstName}! 👋 I'm **Thalia**, your AI business assistant from Tala.\n\nI'm here to help you get the best loan offer for your business — and stay as your ongoing business partner after that.\n\nThis takes about 5 minutes. You can skip any optional steps. **Step 1 of 6** — let's go!`,
      phase: 1,
      quickReplies: ['¡Empecemos!', 'How does this work?', 'How long will this take?']
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
      nextPhase = phase < 6 ? ((phase + 1) as OnboardingPhase) : 'complete'
    }

    const isComplete = nextPhase === 'complete'

    return {
      content: script,
      phase: nextPhase,
      showPhotoUpload: nextPhase === 5,
      quickReplies: getQuickReplies(nextPhase),
      metadata: {
        nextAction: isComplete ? 'complete_onboarding' : 'continue'
      }
    }
  }
}

function getQuickReplies(phase: OnboardingPhase): string[] {
  const replies: Record<string, string[]> = {
    '1': ['¡Empecemos!', 'Sounds good!'],
    '2': ['Getting more customers', 'Managing cash flow', 'Better inventory prices'],
    '3': [],
    '4': ['Things are going well', 'About the same', 'A bit slow lately'],
    '5': ['Skip this step', "I'll share something"],
    '6': ['Ready to see my offer!'],
    'complete': []
  }
  return replies[String(phase)] ?? []
}
