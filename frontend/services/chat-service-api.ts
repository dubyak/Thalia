import type { AgentResponse, OnboardingPhase } from '@/lib/types'

const DEBUG_LOG = (payload: Record<string, unknown>) => {
  // #region agent log
  fetch('http://127.0.0.1:7891/ingest/2823fb93-ea58-490b-b132-8a54b86ed965', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '5f60c4' },
    body: JSON.stringify({ sessionId: '5f60c4', location: 'chat-service-api.ts', timestamp: Date.now(), ...payload }),
  }).catch(() => {})
  // #endregion
}

function makeSessionId() {
  return Math.random().toString(36).slice(2, 10)
}

// One session ID per browser session (resets on page reload / new test)
let _sessionId: string | null = null
function getSessionId(): string {
  if (!_sessionId) {
    try {
      _sessionId = sessionStorage.getItem('thalia_session_id')
      if (!_sessionId) {
        _sessionId = makeSessionId()
        sessionStorage.setItem('thalia_session_id', _sessionId)
      }
    } catch {
      _sessionId = makeSessionId()
    }
  }
  return _sessionId
}

const QUICK_REPLIES: Record<string, string[]> = {
  '0': ["Let's go!", 'How does this work?'],
  '1': [],
  '1.5': ['Upload a photo', 'Skip this step'],
  '2': ['Under $3,000', '$3,000–$8,000', '$8,000–$15,000', 'Over $15,000'],
  '3': [],
  '3.5': ['Restock inventory', 'Buy equipment', 'Working capital', 'Other'],
  '4': [],  // coaching demo — open question, no quick replies
  '5': ['1 payment – 30 days', '2 payments – 60 days', 'I have a question'],
  '6': [],
  'complete': [],
  'servicing': ['How do I pay?', 'When is my payment due?', 'Business tips'],
  'coaching': ['Review my cash flow', 'Ideas to sell more', 'Manage my costs', "Let's talk goals"],
}

export const apiChatService = {
  resetSession() {
    _sessionId = null
    try { sessionStorage.removeItem('thalia_session_id') } catch { /* ignore */ }
  },

  async getServicingOpening(
    firstName: string,
    profile: Record<string, string>,
    approvedAmount = 8000,
    mode: 'servicing' | 'coaching' = 'servicing',
    isFirstVisit = true
  ): Promise<AgentResponse> {
    this.resetSession() // Fresh session for servicing/coaching

    try {
      // #region agent log
      DEBUG_LOG({ message: 'getServicingOpening before fetch', hypothesisId: 'C', data: { url: '/api/chat', mode } })
      // #endregion
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: getSessionId(),
          tester_name: firstName,
          approved_amount: approvedAmount,
          mode,
          collected: profile,
          is_first_visit: isFirstVisit,
        }),
      })
      // #region agent log
      DEBUG_LOG({ message: 'getServicingOpening after fetch', hypothesisId: 'C_D', data: { ok: res.ok, status: res.status } })
      // #endregion
      if (!res.ok) throw new Error(`Backend ${res.status}`)
      const data = await res.json()
      return {
        content: data.content,
        phase: 'complete',
        quickReplies: data.quick_replies?.length ? data.quick_replies : QUICK_REPLIES[mode],
      }
    } catch (e) {
      // #region agent log
      DEBUG_LOG({
        message: 'getServicingOpening catch',
        hypothesisId: 'C_E',
        data: { errName: e instanceof Error ? e.name : '', errMessage: e instanceof Error ? e.message : String(e) },
      })
      // #endregion
      const fallbackReplies = mode === 'coaching' ? QUICK_REPLIES['coaching'] : QUICK_REPLIES['servicing']
      const fallbackContent = mode === 'coaching'
        ? `Hi ${firstName}! I'm Thalia, your Business Coach. What would you like to work on today?`
        : `Hi ${firstName}! I'm Thalia, your business assistant. How can I help you today?`
      return {
        content: fallbackContent,
        phase: 'complete',
        quickReplies: fallbackReplies,
      }
    }
  },

  async getOpeningMessage(firstName: string, approvedAmount = 8000): Promise<AgentResponse> {
    this.resetSession() // Fresh session for each new onboarding

    try {
      // #region agent log
      DEBUG_LOG({ message: 'getOpeningMessage before fetch', hypothesisId: 'C', data: { url: '/api/chat' } })
      // #endregion
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: getSessionId(),
          tester_name: firstName,
          approved_amount: approvedAmount,
          mode: 'onboarding',
        }),
      })

      // #region agent log
      DEBUG_LOG({ message: 'getOpeningMessage after fetch', hypothesisId: 'C_D', data: { ok: res.ok, status: res.status } })
      // #endregion
      if (!res.ok) throw new Error(`Backend ${res.status}`)
      const data = await res.json()
      return {
        content: data.content,
        phase: (data.phase ?? '0') as OnboardingPhase,
        quickReplies: data.quick_replies?.length ? data.quick_replies : QUICK_REPLIES['0'],
      }
    } catch (e) {
      // #region agent log
      DEBUG_LOG({
        message: 'getOpeningMessage catch',
        hypothesisId: 'C_E',
        data: { errName: e instanceof Error ? e.name : '', errMessage: e instanceof Error ? e.message : String(e) },
      })
      // #endregion
      return {
        content: `Hi ${firstName}! I'm Thalia, your business assistant from Tala. In a few minutes I'll confirm the best credit offer for your business. Ready?`,
        phase: '0',
        quickReplies: QUICK_REPLIES['0'],
      }
    }
  },

  async sendMessage(
    content: string,
    _phase: OnboardingPhase,
    _profile: object,
    mode: 'onboarding' | 'servicing' | 'coaching',
    _history: unknown[],
    testerName?: string,
    approvedAmount = 8000,
    collected?: Record<string, string>
  ): Promise<AgentResponse> {
    try {
      // #region agent log
      DEBUG_LOG({ message: 'sendMessage before fetch', hypothesisId: 'C', data: { url: '/api/chat', mode } })
      // #endregion
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: getSessionId(),
          message: content,
          tester_name: testerName,
          approved_amount: approvedAmount,
          mode,
          ...(collected && Object.keys(collected).length > 0 ? { collected } : {}),
        }),
      })

      // #region agent log
      DEBUG_LOG({ message: 'sendMessage after fetch', hypothesisId: 'C_D', data: { ok: res.ok, status: res.status } })
      // #endregion
      if (!res.ok) throw new Error(`Backend ${res.status}`)
      const data = await res.json()
      const phase = (data.phase ?? _phase) as OnboardingPhase
      const isComplete = data.is_complete ?? false

      return {
        content: data.content,
        phase,
        quickReplies: data.quick_replies?.length
          ? data.quick_replies
          : (QUICK_REPLIES[String(phase)] ?? []),
        showPhotoUpload: false, // photo question is now inline in Phase 1 response via quick replies
        isOffer: data.is_offer ?? false,
        offerAmount: data.offer_amount ?? 0,
        metadata: {
          nextAction: isComplete ? 'complete_onboarding' : 'continue',
          collectedData: data.extracted,
        },
      }
    } catch (e) {
      // #region agent log
      DEBUG_LOG({
        message: 'sendMessage catch',
        hypothesisId: 'C_E',
        data: { errName: e instanceof Error ? e.name : '', errMessage: e instanceof Error ? e.message : String(e) },
      })
      // #endregion
      return {
        content: 'Having trouble connecting. Can you try again?',
        phase: _phase,
        quickReplies: [],
      }
    }
  },
}
