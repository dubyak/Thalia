'use client'

import { useState, useMemo } from 'react'
import { X } from 'lucide-react'
import { useTester } from '@/contexts/TesterContext'
import { calculateLoan, formatMXN } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface LoanConfigModalProps {
  open: boolean
  approvedAmount: number
  maxAmount: number
  onClose: () => void
  onContinue: (amount: number, installments: 1 | 2) => void
}

const MIN_AMOUNT = 1000
const STEP = 500

export function LoanConfigModal({ open, approvedAmount, maxAmount, onClose, onContinue }: LoanConfigModalProps) {
  const { tester } = useTester()
  const [amount, setAmount] = useState(approvedAmount)
  const [installments, setInstallments] = useState<1 | 2>(1)

  const rate = tester?.interestRateDaily ?? 0.01
  const feeRate = tester?.processingFeeRate ?? 0.04

  const loan = useMemo(
    () => calculateLoan(amount, installments, rate, feeRate),
    [amount, installments, rate, feeRate]
  )

  if (!open) return null

  const days = installments * 30

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 animate-fade-in" onClick={onClose} />

      <div
        className="fixed z-50 bg-white flex flex-col rounded-t-3xl overflow-hidden animate-slide-up"
        style={{
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 'var(--app-max-width)',
          height: '85dvh',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#f0f0f0] flex-shrink-0">
          <h2 className="text-lg font-bold text-[#1f1c2f]">Configure your loan</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#f5f6f0] flex items-center justify-center touch-active">
            <X size={18} className="text-[#676d65]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* Amount display */}
          <div className="text-center mb-2">
            <p className="text-xs text-[#939490] font-semibold uppercase tracking-wider mb-1">Loan amount</p>
            <p className="text-4xl font-bold text-[#1f1c2f]">{formatMXN(amount)}</p>
          </div>

          {/* Slider */}
          <div className="mb-6 px-1">
            <input
              type="range"
              min={MIN_AMOUNT}
              max={maxAmount}
              step={STEP}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#00A69C]"
              style={{
                background: `linear-gradient(to right, #00A69C 0%, #00A69C ${((amount - MIN_AMOUNT) / (maxAmount - MIN_AMOUNT)) * 100}%, #e5e5e5 ${((amount - MIN_AMOUNT) / (maxAmount - MIN_AMOUNT)) * 100}%, #e5e5e5 100%)`,
              }}
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-[#939490]">{formatMXN(MIN_AMOUNT)}</span>
              <span className="text-xs text-[#939490]">{formatMXN(maxAmount)}</span>
            </div>
          </div>

          {/* Payment plan toggle */}
          <p className="text-xs text-[#939490] font-semibold uppercase tracking-wider mb-3">Payment plan</p>
          <div className="flex gap-3 mb-6">
            {([1, 2] as const).map((n) => (
              <button
                key={n}
                onClick={() => setInstallments(n)}
                className={cn(
                  'flex-1 rounded-2xl py-4 px-3 border-2 text-center transition-all touch-active',
                  installments === n
                    ? 'border-[#00A69C] bg-[#d2f2f4]'
                    : 'border-[#e5e5e5] bg-white'
                )}
              >
                <p className={cn('text-base font-bold', installments === n ? 'text-[#1d6d70]' : 'text-[#1f1c2f]')}>
                  {n === 1 ? '1 payment' : '2 payments'}
                </p>
                <p className="text-xs text-[#939490] mt-0.5">{n * 30} days</p>
              </button>
            ))}
          </div>

          {/* Cost breakdown */}
          <div className="bg-[#f8fafc] rounded-2xl p-4 mb-6 border border-[#e5e5e5]">
            <div className="space-y-2.5">
              <div className="flex justify-between">
                <span className="text-sm text-[#676d65]">Principal</span>
                <span className="text-sm font-semibold text-[#1f1c2f]">{formatMXN(amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#676d65]">Interest ({(rate * 100).toFixed(1)}%/day x {days} days)</span>
                <span className="text-sm font-semibold text-[#1f1c2f]">{formatMXN(amount * rate * days)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#676d65]">Processing fee</span>
                <span className="text-sm font-semibold text-[#1f1c2f]">{formatMXN(loan.processingFee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#676d65]">IVA</span>
                <span className="text-sm font-semibold text-[#1f1c2f]">{formatMXN(loan.iva)}</span>
              </div>
              <div className="h-px bg-[#e5e5e5] my-1" />
              <div className="flex justify-between">
                <span className="text-sm font-bold text-[#1f1c2f]">Total to repay</span>
                <span className="text-sm font-bold text-[#F06B22]">{formatMXN(loan.totalRepayment)}</span>
              </div>
              {installments === 2 && (
                <div className="flex justify-between">
                  <span className="text-sm text-[#676d65]">Per payment</span>
                  <span className="text-sm font-semibold text-[#1f1c2f]">{formatMXN(loan.monthlyPayment)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-[#676d65]">First payment date</span>
                <span className="text-sm font-semibold text-[#1f1c2f]">{loan.firstPaymentDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Continue button */}
        <div className="px-5 pb-8 pt-3 flex-shrink-0 border-t border-[#f0f0f0]">
          <button
            onClick={() => onContinue(amount, installments)}
            className="w-full h-14 rounded-[28px] text-white font-bold text-base touch-active active:opacity-80"
            style={{ background: '#F06B22' }}
          >
            Continue
          </button>
        </div>
      </div>
    </>
  )
}
