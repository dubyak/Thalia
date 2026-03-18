// Tester profile loaded from Supabase or constants
export interface TesterProfile {
  id: string
  code: string
  name: string
  firstName: string
  approvedAmount: number
  maxAmount: number
  interestRateDaily: number
  processingFeeRate: number
  businessType?: string
  locale: string
}

// Loan configuration selected by user
export interface LoanConfig {
  amount: number
  installments: 1 | 2
  interestRateDaily: number
  processingFee: number
  iva: number
  totalRepayment: number
  monthlyPayment: number
  disbursementDate: string
  firstPaymentDate: string
}

// Chat message in a conversation
export interface ChatMessage {
  id: string
  role: 'agent' | 'user'
  content: string
  timestamp: Date
  phase?: OnboardingPhase
  isOffer?: boolean
  offerAmount?: number
  imageUrl?: string
}

// Onboarding phases — 0-12 + complete
export type OnboardingPhase =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12'
  | 'complete'

// Data collected during onboarding (matches backend ExtractedFields)
export interface BusinessProfile {
  // Survey-provided
  businessType?: string
  loanPurpose?: string
  // Business profile (phases 1-3)
  sellingChannel?: string
  tenure?: string
  teamSize?: string
  // Business health (phases 4-8)
  weeklyRevenue?: string
  nearTermOutlook?: string
  outlookReason?: string
  cashCycleSpeed?: string
  mainExpenses?: string
  workingCapitalNeed?: string
  // Evidence (phase 9)
  photoUploaded?: boolean
}

// Flow state — tracks journey progress
export interface FlowState {
  loginComplete: boolean
  surveyComplete: boolean
  surveyChoice: 'business' | 'personal' | null
  surveyBusinessType?: string
  surveyLoanPurpose?: string
  msmeOptIn: boolean
  onboardingComplete: boolean
  offerAccepted: boolean
  termsAccepted: boolean
  cashoutBankSelected: boolean
  cashoutConfirmed: boolean
  disbursementComplete: boolean
  coachingSessionCount: number
  selectedBank?: string
  loanConfig?: LoanConfig
  businessProfile?: BusinessProfile
}

// Agent response from chat service (multi-bubble)
export interface AgentResponse {
  messages: string[]
  phase: OnboardingPhase
  isOffer?: boolean
  offerAmount?: number
  metadata?: {
    nextAction?: 'continue' | 'show_offer' | 'complete_onboarding'
    collectedData?: Partial<BusinessProfile>
  }
}
