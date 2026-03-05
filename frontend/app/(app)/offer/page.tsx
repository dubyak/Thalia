'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ChevronRight, Info } from 'lucide-react'
import { StatusBar } from '@/components/app-shell/StatusBar'
import { BackHeader } from '@/components/app-shell/BackHeader'
import { useTester } from '@/contexts/TesterContext'
import { useFlow } from '@/contexts/FlowContext'
import { calculateLoan, formatMXN } from '@/lib/constants'
import { cn } from '@/lib/utils'

export default function OfferPage() {
  const { tester } = useTester()
  const { dispatch } = useFlow()
  const router = useRouter()

  const approved = tester?.approvedAmount ?? 8000
  const maxAmount = tester?.maxAmount ?? 12000
  const dailyRate = tester?.interestRateDaily ?? 0.0028
  const feeRate = tester?.processingFeeRate ?? 0.04

  const [installments, setInstallments] = useState<1 | 2>(1)
  const [amount, setAmount] = useState(approved)

  const loan = useMemo(
    () => calculateLoan(amount, installments, dailyRate, feeRate),
    [amount, installments, dailyRate, feeRate]
  )

  const handleAccept = () => {
    dispatch({ type: 'OFFER_ACCEPTED', config: loan })
    router.push('/terms')
  }

  return (
    <div className="flex flex-col min-h-dvh bg-[#f5f6f0]">
      {/* Header */}
      <div className="bg-[#083032] flex-shrink-0">
        <StatusBar dark />
        <BackHeader title="Your offer" dark />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Approval banner */}
        <div className="bg-[#083032] px-5 pb-6">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={18} className="text-[#20bec6]" />
            <span className="text-[#20bec6] text-sm font-semibold">Congratulations, {tester?.firstName}!</span>
          </div>
          <p className="text-white text-lg font-semibold leading-snug">
            You&apos;re approved for up to{' '}
            <span className="text-[#20bec6]">{formatMXN(maxAmount)}</span>
          </p>
          <p className="text-[#939490] text-xs mt-1 font-light">
            Daily interest rate: {(dailyRate * 100).toFixed(2)}%
          </p>
        </div>

        {/* Config card */}
        <div className="mx-4 -mt-4 bg-white rounded-2xl shadow-md p-5 mb-4">
          {/* Installments toggle */}
          <p className="text-xs font-semibold text-[#676d65] uppercase tracking-wider mb-3">
            Number of payments
          </p>
          <div className="flex gap-3 mb-5">
            {([1, 2] as const).map((n) => (
              <button
                key={n}
                onClick={() => setInstallments(n)}
                className={cn(
                  'flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all touch-active',
                  installments === n
                    ? 'bg-[#1a989e] border-[#1a989e] text-white shadow-sm'
                    : 'bg-white border-[#e5e5e5] text-[#676d65]'
                )}
              >
                {n} {n === 1 ? 'payment' : 'payments'}
                <span className={cn('block text-xs font-light mt-0.5', installments === n ? 'text-[#d2f2f4]' : 'text-[#939490]')}>
                  {n * 30} days
                </span>
              </button>
            ))}
          </div>

          {/* Amount slider */}
          <div className="mb-5">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-semibold text-[#676d65] uppercase tracking-wider">
                Amount
              </p>
              <span className="text-[#1a989e] font-bold text-lg">{formatMXN(amount)}</span>
            </div>
            <input
              type="range"
              min={1000}
              max={maxAmount}
              step={500}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #1a989e ${((amount - 1000) / (maxAmount - 1000)) * 100}%, #e5e5e5 ${((amount - 1000) / (maxAmount - 1000)) * 100}%)`
              }}
            />
            <div className="flex justify-between text-xs text-[#c2c6c0] mt-1">
              <span>{formatMXN(1000)}</span>
              <span>{formatMXN(maxAmount)}</span>
            </div>
          </div>

          {/* Payment summary */}
          <div className="bg-[#f8fafc] rounded-xl p-4 space-y-2.5">
            <p className="text-xs font-semibold text-[#676d65] uppercase tracking-wider mb-3">
              Payment summary
            </p>

            <SummaryRow label="Loan amount" value={formatMXN(loan.amount)} />
            <SummaryRow label="Processing fee" value={formatMXN(loan.processingFee)} muted />
            <SummaryRow
              label={`Interest (${installments * 30} days)`}
              value={formatMXN(loan.iva + (loan.totalRepayment - loan.amount - loan.processingFee - loan.iva))}
              muted
            />
            <SummaryRow label="VAT" value={formatMXN(loan.iva)} muted />

            <div className="border-t border-[#e5e5e5] pt-2.5">
              <SummaryRow
                label={installments === 1 ? 'Total to repay' : 'Monthly payment'}
                value={installments === 1 ? formatMXN(loan.totalRepayment) : formatMXN(loan.monthlyPayment)}
                bold
              />
            </div>

            <div className="flex items-start gap-2 pt-1">
              <Info size={14} className="text-[#939490] flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-[#939490] font-light leading-relaxed">
                First payment: <span className="font-medium">{loan.firstPaymentDate}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Value message from Thalia */}
        <div className="mx-4 mb-4 flex gap-3 bg-[#d2f2f4] rounded-xl px-4 py-3">
          <div className="w-7 h-7 rounded-full bg-[#1a989e] flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">T</span>
          </div>
          <p className="text-sm text-[#1d6d70] font-light leading-relaxed">
            Based on your business, this loan can help you buy inventory and stay on top of your suppliers. 💪
          </p>
        </div>

        <div className="px-4 pb-8">
          <button
            onClick={handleAccept}
            className="w-full h-14 rounded-xl bg-[#f06f14] text-white font-semibold text-base shadow-md touch-active active:opacity-80 flex items-center justify-center gap-2"
          >
            Accept this offer
            <ChevronRight size={18} />
          </button>
          <p className="text-center text-xs text-[#939490] mt-3 font-light">
            By accepting, you will be taken to the terms and conditions.
          </p>
        </div>
      </div>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  muted,
  bold
}: {
  label: string
  value: string
  muted?: boolean
  bold?: boolean
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={cn('text-sm font-light', muted ? 'text-[#939490]' : bold ? 'text-[#1f1c2f] font-semibold' : 'text-[#676d65]')}>
        {label}
      </span>
      <span className={cn('text-sm', bold ? 'font-bold text-[#1a989e] text-base' : muted ? 'text-[#939490]' : 'text-[#1f1c2f] font-medium')}>
        {value}
      </span>
    </div>
  )
}
