'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ChevronRight } from 'lucide-react'
import { useFlow } from '@/contexts/FlowContext'
import { useTester } from '@/contexts/TesterContext'
import { formatMXN } from '@/lib/constants'
import { useTranslation } from '@/lib/i18n/useTranslation'

export default function CashoutSuccessPage() {
  const [animating, setAnimating] = useState(true)
  const { flow, dispatch } = useFlow()
  const { tester } = useTester()
  const router = useRouter()
  const { t } = useTranslation()

  const loan = flow.loanConfig
  const amount = loan?.amount ?? tester?.approvedAmount ?? 8000

  useEffect(() => {
    const timer = setTimeout(() => setAnimating(false), 800)
    return () => clearTimeout(timer)
  }, [])

  const handleGoHome = () => {
    dispatch({ type: 'DISBURSEMENT_COMPLETE' })
    router.push('/home')
  }

  return (
    <div className="flex flex-col min-h-dvh bg-[#083032]">
      {/* Top section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
        {/* Animated checkmark */}
        <div
          className="w-24 h-24 rounded-full bg-[#1a989e]/20 flex items-center justify-center mb-6 transition-all duration-700"
          style={{
            transform: animating ? 'scale(0.5)' : 'scale(1)',
            opacity: animating ? 0 : 1
          }}
        >
          <div className="w-16 h-16 rounded-full bg-[#1a989e] flex items-center justify-center">
            <CheckCircle2 size={36} className="text-white" strokeWidth={2.5} />
          </div>
        </div>

        <h1 className="text-white text-2xl font-bold text-center mb-2">
          {t('cashout.loanOnWay')}
        </h1>
        <p className="text-[#20bec6] text-4xl font-bold mb-2">{formatMXN(amount)}</p>
        <p className="text-[#939490] text-sm font-light text-center leading-relaxed max-w-[260px]">
          {t('cashout.receiveNotice')}
        </p>
      </div>

      {/* Summary card */}
      <div className="mx-4 bg-white/10 rounded-2xl p-5 mb-6 space-y-3">
        <p className="text-[#20bec6] text-xs font-semibold uppercase tracking-wider">
          {t('cashout.loanDetails')}
        </p>
        <SummaryRow label={t('cashout.amountLabel')} value={formatMXN(amount)} />
        <SummaryRow
          label={t('cashout.paymentsLabel')}
          value={(loan?.installments ?? 1) === 1 ? t('cashout.payment', { n: 1 }) : t('cashout.payments', { n: loan?.installments ?? 2 })}
        />
        <SummaryRow
          label={t('cashout.firstPayment')}
          value={loan?.firstPaymentDate ?? '30 days'}
        />
        <SummaryRow
          label={t('cashout.monthlyPayment')}
          value={formatMXN(loan?.monthlyPayment ?? amount * 1.12)}
        />
      </div>

      {/* Thalia message */}
      <div className="mx-4 mb-6 flex gap-3 bg-[#1a989e]/20 rounded-xl px-4 py-3">
        <div className="w-7 h-7 rounded-full bg-[#1a989e] flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-white text-xs font-bold">T</span>
        </div>
        <p className="text-sm text-[#d2f2f4] font-light leading-relaxed">
          {t('cashout.congratsMsg')} 🎉
        </p>
      </div>

      <div className="px-4 pb-10">
        <button
          onClick={handleGoHome}
          className="w-full h-14 rounded-xl bg-[#f06f14] text-white font-semibold text-base shadow-md touch-active active:opacity-80 flex items-center justify-center gap-2"
        >
          {t('cashout.goHome')}
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-[#939490] font-light">{label}</span>
      <span className="text-sm text-white font-semibold">{value}</span>
    </div>
  )
}
