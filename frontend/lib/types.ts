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
  quickReplies?: string[]
  showPhotoUpload?: boolean
  isOffer?: boolean
  offerAmount?: number
}

// Onboarding phases — string phases from backend
export type OnboardingPhase = '0' | '1' | '1.5' | '2' | '3' | '3.5' | '4' | '5' | '6' | 'complete' | 1 | 2 | 3 | 4 | 5 | 6

// Data collected during onboarding
export interface BusinessProfile {
  businessCategory?: string
  weeklyRevenue?: string
  mainCosts?: string
  loanPurpose?: string
  sellingChannel?: string
  yearsInOperation?: string
  recentChanges?: string
  salesOutlook?: 'positive' | 'neutral' | 'negative'
  cashCycleSpeed?: 'fast' | 'medium' | 'slow'
  loanUseIntent?: string
  photoUploaded?: boolean
}

// Flow state — tracks journey progress
export interface FlowState {
  loginComplete: boolean
  surveyComplete: boolean
  surveyChoice: 'business' | 'personal' | null
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

// Agent response from chat service
export interface AgentResponse {
  content: string
  phase: OnboardingPhase
  quickReplies?: string[]
  showPhotoUpload?: boolean
  isOffer?: boolean
  offerAmount?: number
  metadata?: {
    nextAction?: 'continue' | 'show_offer' | 'complete_onboarding'
    collectedData?: Partial<BusinessProfile>
  }
}
