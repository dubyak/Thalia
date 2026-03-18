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
import { useTranslation } from '@/lib/i18n/useTranslation'

export default function TermsPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const { dispatch, flow } = useFlow()
  const { tester } = useTester()
  const router = useRouter()
  const { t } = useTranslation()

  const TERMS = [
    { id: 'credit-agreement', text: t('terms.term1') },
    { id: 'privacy-policy', text: t('terms.term2') },
    { id: 'data-authorization', text: t('terms.term3') },
  ]

  const allChecked = TERMS.every((tm) => checked[tm.id])

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
        <BackHeader title={t('terms.title')} />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Loan summary pill */}
        <div className="mx-4 mt-5 mb-4 bg-[#083032] rounded-2xl px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#1a989e]/30 flex items-center justify-center flex-shrink-0">
            <Shield size={20} className="text-[#20bec6]" />
          </div>
          <div>
            <p className="text-[#20bec6] text-xs font-semibold uppercase tracking-wider">
              {t('terms.yourLoan')}
            </p>
            <p className="text-white font-bold text-xl">{formatMXN(amount)}</p>
            <p className="text-[#939490] text-xs font-light">
              {(loan?.installments ?? 1) === 1 ? t('terms.payment', { n: 1 }) : t('terms.payments', { n: loan?.installments ?? 1 })} · {t('terms.firstPaymentLabel', { date: loan?.firstPaymentDate ?? '30 days' })}
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
            {t('terms.creditBureau')}
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
            {loading ? t('terms.processing') : t('terms.acceptAndContinue')}
          </button>
          {!allChecked && (
            <p className="text-center text-xs text-[#939490] mt-2 font-light">
              {t('terms.acceptAll')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
