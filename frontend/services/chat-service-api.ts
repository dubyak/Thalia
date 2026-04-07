import type { AgentResponse, OnboardingPhase } from '@/lib/types'

function makeSessionId() {
  return Math.random().toString(36).slice(2, 10)
}

let _sessionId: string | null = null
function getSessionId(): string {
  if (!_sessionId) {
    try {
      _sessionId = localStorage.getItem('thalia_session_id')
      if (!_sessionId) {
        _sessionId = makeSessionId()
        localStorage.setItem('thalia_session_id', _sessionId)
      }
    } catch {
      _sessionId = makeSessionId()
    }
  }
  return _sessionId
}

function parseResponse(data: Record<string, unknown>, fallbackPhase: OnboardingPhase): AgentResponse {
  const messages: string[] = Array.isArray(data.messages) ? data.messages : []
  // Backward compat: if backend returns content instead of messages
  if (messages.length === 0 && typeof data.content === 'string') {
    messages.push(data.content)
  }
  const phase = (data.phase ?? fallbackPhase) as OnboardingPhase
  const isComplete = data.is_complete ?? false

  return {
    messages,
    phase,
    isOffer: (data.is_offer as boolean) ?? false,
    offerAmount: (data.offer_amount as number) ?? 0,
    metadata: {
      nextAction: isComplete ? 'complete_onboarding' : 'continue',
      collectedData: data.collected as Record<string, string> | undefined,
    },
  }
}

export const apiChatService = {
  resetSession() {
    _sessionId = null
    try { localStorage.removeItem('thalia_session_id') } catch { /* ignore */ }
  },

  async getServicingOpening(
    firstName: string,
    profile: Record<string, string>,
    approvedAmount = 8000,
    maxAmount = 12000,
    mode: 'servicing' | 'coaching' = 'servicing',
    isFirstVisit = true,
    locale = 'en',
    gender?: string,
  ): Promise<AgentResponse> {
    this.resetSession()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: getSessionId(),
          tester_name: firstName,
          approved_amount: approvedAmount,
          max_amount: maxAmount,
          mode,
          collected: profile,
          is_first_visit: isFirstVisit,
          locale,
          ...(gender ? { gender } : {}),
        }),
      })
      if (!res.ok) throw new Error(`Backend ${res.status}`)
      const data = await res.json()
      return parseResponse(data, 'complete')
    } catch {
      const fallback = mode === 'coaching'
        ? `Hi ${firstName}! I'm Thalia, your Business Coach. What would you like to work on today?`
        : `Hi ${firstName}! I'm Thalia, your business assistant. How can I help you today?`
      return { messages: [fallback], phase: 'complete' }
    }
  },

  async getOpeningMessage(
    firstName: string,
    approvedAmount = 8000,
    maxAmount = 12000,
    businessType?: string,
    loanPurpose?: string,
    locale = 'en',
    testerContext?: string,
    gender?: string,
  ): Promise<AgentResponse> {
    this.resetSession()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: getSessionId(),
          tester_name: firstName,
          approved_amount: approvedAmount,
          max_amount: maxAmount,
          mode: 'onboarding',
          business_type: businessType,
          loan_purpose: loanPurpose,
          locale,
          ...(testerContext ? { tester_context: testerContext } : {}),
          ...(gender ? { gender } : {}),
        }),
      })
      if (!res.ok) throw new Error(`Backend ${res.status}`)
      const data = await res.json()
      return parseResponse(data, '0')
    } catch {
      return {
        messages: [`Hi ${firstName}! I'm Thalia from Tala. I'm excited to help you and your business. Ready to get started?`],
        phase: '0',
      }
    }
  },

  async sendMessage(
    content: string,
    currentPhase: OnboardingPhase,
    mode: 'onboarding' | 'servicing' | 'coaching',
    testerName?: string,
    approvedAmount = 8000,
    maxAmount = 12000,
    collected?: Record<string, string>,
    imageData?: string,
    businessType?: string,
    loanPurpose?: string,
    locale = 'en',
    customerId?: string,
    customerName?: string,
    testerContext?: string,
    gender?: string,
  ): Promise<AgentResponse> {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: getSessionId(),
          message: content || undefined,
          tester_name: testerName,
          approved_amount: approvedAmount,
          max_amount: maxAmount,
          mode,
          locale,
          customer_id: customerId,
          customer_name: customerName,
          ...(collected && Object.keys(collected).length > 0 ? { collected } : {}),
          ...(imageData ? { image_data: imageData } : {}),
          ...(businessType ? { business_type: businessType } : {}),
          ...(loanPurpose ? { loan_purpose: loanPurpose } : {}),
          ...(testerContext ? { tester_context: testerContext } : {}),
          ...(gender ? { gender } : {}),
        }),
      })
      if (!res.ok) throw new Error(`Backend ${res.status}`)
      const data = await res.json()
      return parseResponse(data, currentPhase)
    } catch {
      return {
        messages: ['Having trouble connecting. Can you try again?'],
        phase: currentPhase,
      }
    }
  },
}
