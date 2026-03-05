'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckSquare, Square, Shield } from 'lucide-react'
import { StatusBar } from '@/components/app-shell/StatusBar'
import { BackHeader } from '@/components/app-shell/BackHeader'
import { useFlow } from '@/contexts/FlowContext'
import { useTester } from '@/contexts/TesterContext'
import { formatMXN } from '@/lib/constants'
import { cn } from '@/lib/utils'

const TERMS = [
  {
    id: 'credit-agreement',
    text: 'I accept the Simple Credit Agreement, including the loan amount, term, daily interest rate, applicable fees, and the established payment schedule.'
  },
  {
    id: 'privacy-policy',
    text: 'I accept the Privacy Policy and authorize Tala to send me notifications related to my account, payments, and available products through registered channels.'
  },
  {
    id: 'data-authorization',
    text: 'I expressly authorize TALA to discount, endorse, assign, or transfer the collection rights arising from this agreement, in accordance with applicable law.'
  }
]

export default function TermsPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const { dispatch, flow } = useFlow()
  const { tester } = useTester()
  const router = useRouter()

  const allChecked = TERMS.every((t) => checked[t.id])

  const toggle = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleAccept = async () => {
    if (!allChecked) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    dispatch({ type: 'TERMS_ACCEPTED' })
    router.push('/cashout')
  }

  const loan = flow.loanConfig
  const amount = loan?.amount ?? tester?.approvedAmount ?? 8000

  return (
    <div className="flex flex-col min-h-dvh bg-[#f5f6f0]">
      <div className="bg-white flex-shrink-0 border-b border-[#e5e5e5]">
        <StatusBar />
        <BackHeader title="Terms and conditions" />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Loan summary pill */}
        <div className="mx-4 mt-5 mb-4 bg-[#083032] rounded-2xl px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#1a989e]/30 flex items-center justify-center flex-shrink-0">
            <Shield size={20} className="text-[#20bec6]" />
          </div>
          <div>
            <p className="text-[#20bec6] text-xs font-semibold uppercase tracking-wider">
              Your loan
            </p>
            <p className="text-white font-bold text-xl">{formatMXN(amount)}</p>
            <p className="text-[#939490] text-xs font-light">
              {loan?.installments ?? 1} {(loan?.installments ?? 1) === 1 ? 'payment' : 'payments'} · First payment: {loan?.firstPaymentDate ?? '30 days'}
            </p>
          </div>
        </div>

        {/* Terms list */}
        <div className="mx-4 space-y-3 mb-4">
          {TERMS.map((term) => {
            const isChecked = !!checked[term.id]
            return (
              <button
                key={term.id}
                onClick={() => toggle(term.id)}
                className={cn(
                  'w-full flex items-start gap-3 bg-white rounded-2xl p-4 border-2 text-left transition-all touch-active',
                  isChecked ? 'border-[#1a989e]' : 'border-[#e5e5e5]'
                )}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {isChecked
                    ? <CheckSquare size={20} className="text-[#1a989e]" />
                    : <Square size={20} className="text-[#c2c6c0]" />
                  }
                </div>
                <p className="text-sm text-[#676d65] font-light leading-relaxed">{term.text}</p>
              </button>
            )
          })}
        </div>

        {/* Credit bureau notice */}
        <div className="mx-4 mb-6 bg-[#f8fafc] rounded-xl px-4 py-3 border border-[#e5e5e5]">
          <p className="text-xs text-[#939490] font-light leading-relaxed">
            By accepting, I authorize Tala México S.A. de C.V. SOFOM E.N.R. to consult and report my credit history to the Credit Information Society (Buró de Crédito), in accordance with the Law to Regulate Credit Information Societies.
          </p>
        </div>

        <div className="px-4 pb-8">
          <button
            onClick={handleAccept}
            disabled={!allChecked || loading}
            className={cn(
              'w-full h-14 rounded-xl font-semibold text-base transition-all shadow-md',
              allChecked
                ? 'bg-[#f06f14] text-white active:opacity-80 touch-active'
                : 'bg-[#e5e5e5] text-[#c2c6c0]'
            )}
          >
            {loading ? 'Processing...' : 'Accept and continue'}
          </button>
          {!allChecked && (
            <p className="text-center text-xs text-[#939490] mt-2 font-light">
              Accept all terms to continue
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
