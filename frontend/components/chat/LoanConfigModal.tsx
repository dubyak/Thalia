'use client'

import { useState, useMemo } from 'react'
import { X, CalendarDays, Check } from 'lucide-react'
import { useTester } from '@/contexts/TesterContext'
import { useLocale } from '@/contexts/LocaleContext'
import { calculateLoan, formatMXN, getSmartDueDates, getSecondInstallmentDate, formatDate, formatDateShort } from '@/lib/constants'
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

const daysBetweenDates = (a: Date, b: Date) =>
  Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))

export function LoanConfigModal({ open, approvedAmount, maxAmount, onClose, onContinue }: LoanConfigModalProps) {
  const { tester } = useTester()
  const { locale } = useLocale()
  const isEs = locale === 'es-MX'
  const today = useMemo(() => new Date(), [])
  const [amount, setAmount] = useState(Math.min(approvedAmount, maxAmount))

  const dueDateOptions = useMemo(() => getSmartDueDates(), [])
  const defaultDate = dueDateOptions.find(d => d.recommended)?.date ?? dueDateOptions[0]?.date
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(defaultDate)

  const [installments, setInstallments] = useState<1 | 2>(1)

  const rate = tester?.interestRateDaily ?? 0.01
  const feeRate = tester?.processingFeeRate ?? 0.04

  const loan = useMemo(
    () => calculateLoan(amount, installments, rate, feeRate, locale, selectedDate),
    [amount, installments, rate, feeRate, locale, selectedDate]
  )

  if (!open) return null

  const secondDate = installments === 2 && selectedDate ? getSecondInstallmentDate(selectedDate) : undefined

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 animate-fade-in" onClick={onClose} />

      {/* Full-viewport fixed wrapper that mirrors the app shell's centering */}
      <div className="fixed inset-0 z-50 flex justify-center items-end pointer-events-none">
        <div
          className="bg-white flex flex-col overflow-hidden animate-slide-up rounded-t-3xl sm:rounded-3xl pointer-events-auto"
          style={{
            width: 'min(100vw, var(--app-max-width))',
            maxWidth: 'var(--app-max-width)',
            height: '88dvh',
          }}
        >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#f0f0f0] flex-shrink-0">
          <h2 className="text-lg font-bold text-[#1f1c2f]">{isEs ? 'Personaliza tu plan' : 'Customize your plan'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#f5f6f0] flex items-center justify-center touch-active">
            <X size={18} className="text-[#676d65]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* ── Step 1: Amount ── */}
          <div className="mb-6">
            <p className="text-xs text-[#939490] font-semibold uppercase tracking-wider mb-1">{isEs ? '¿Cuánto necesitas?' : 'How much do you need?'}</p>
            <p className="text-4xl font-bold text-[#1f1c2f] text-center mb-2">{formatMXN(amount)}</p>

            <div className="px-1">
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
          </div>

          {/* ── Step 2: First due date ── */}
          <div className="mb-6">
            <div className="flex items-center gap-1.5 mb-3">
              <CalendarDays size={14} className="text-[#939490]" />
              <p className="text-xs text-[#939490] font-semibold uppercase tracking-wider">{isEs ? 'Fecha del primer pago' : 'First payment date'}</p>
            </div>

            <div className="flex flex-col gap-2">
              {dueDateOptions.map(({ date, recommended }) => {
                const isSelected = selectedDate?.getTime() === date.getTime()
                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    className={cn(
                      'flex items-center justify-between rounded-xl py-3 px-4 border-2 transition-all touch-active',
                      isSelected
                        ? 'border-[#00A69C] bg-[#d2f2f4]'
                        : 'border-[#e5e5e5] bg-white'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                        isSelected ? 'border-[#00A69C] bg-[#00A69C]' : 'border-[#d0d0d0]'
                      )}>
                        {isSelected && <Check size={12} className="text-white" />}
                      </div>
                      <div className="text-left">
                        <p className={cn('text-sm font-semibold', isSelected ? 'text-[#1d6d70]' : 'text-[#1f1c2f]')}>
                          {formatDate(date, locale)}
                        </p>
                        <p className="text-xs text-[#939490]">
                          {daysBetweenDates(today, date)} {isEs ? 'días desde hoy' : 'days from today'}
                        </p>
                      </div>
                    </div>
                    {recommended && (
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#00A69C] bg-[#d2f2f4] px-2 py-0.5 rounded-full">
                          {isEs ? 'Recomendado' : 'Recommended'}
                        </span>
                        <p className="text-[9px] text-[#939490] mt-0.5">
                          {isEs ? 'Más tiempo para prepararte' : 'More time to prepare'}
                        </p>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Step 3: Installment count ── */}
          <div className="mb-6">
            <p className="text-xs text-[#939490] font-semibold uppercase tracking-wider mb-3">{isEs ? 'Plan de pago' : 'Payment plan'}</p>
            <div className="flex gap-3">
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
                    {n === 1 ? (isEs ? '1 pago' : '1 installment') : (isEs ? '2 pagos' : '2 installments')}
                  </p>
                  <p className={cn('text-sm font-semibold mt-1', installments === n ? 'text-[#1d6d70]' : 'text-[#939490]')}>
                    {n === 1
                      ? formatMXN(calculateLoan(amount, 1, rate, feeRate, locale, selectedDate).totalRepayment)
                      : `${formatMXN(calculateLoan(amount, 2, rate, feeRate, locale, selectedDate).monthlyPayment)} × 2`
                    }
                  </p>
                  <p className="text-xs text-[#939490] mt-0.5">
                    {n === 1
                      ? `${isEs ? 'Vence' : 'Due'} ${selectedDate ? formatDateShort(selectedDate, locale) : ''}`
                      : `${selectedDate ? formatDateShort(selectedDate, locale) : ''} + ${secondDate ? formatDateShort(getSecondInstallmentDate(selectedDate!), locale) : ''}`
                    }
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* ── Step 4: Dynamic cost breakdown ── */}
          <div className="bg-[#f8fafc] rounded-2xl p-4 mb-6 border border-[#e5e5e5]">
            <p className="text-xs text-[#939490] font-semibold uppercase tracking-wider mb-3">{isEs ? 'Resumen de costos' : 'Cost summary'}</p>
            <div className="space-y-2.5">
              <div className="flex justify-between">
                <span className="text-sm text-[#676d65]">{isEs ? 'Capital' : 'Principal'}</span>
                <span className="text-sm font-semibold text-[#1f1c2f]">{formatMXN(amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#676d65]">{isEs ? `Interés (${(rate * 100).toFixed(2)}%/día x ${loan.totalDays} días)` : `Interest (${(rate * 100).toFixed(2)}%/day x ${loan.totalDays} days)`}</span>
                <span className="text-sm font-semibold text-[#1f1c2f]">{formatMXN(amount * rate * loan.totalDays)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#676d65]">{isEs ? `Comisión (${(feeRate * 100).toFixed(1)}%)` : `Processing fee (${(feeRate * 100).toFixed(1)}%)`}</span>
                <span className="text-sm font-semibold text-[#1f1c2f]">{formatMXN(loan.processingFee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#676d65]">IVA</span>
                <span className="text-sm font-semibold text-[#1f1c2f]">{formatMXN(loan.iva)}</span>
              </div>
              <div className="h-px bg-[#e5e5e5] my-1" />
              <div className="flex justify-between">
                <span className="text-sm font-bold text-[#1f1c2f]">{isEs ? 'Total a pagar' : 'Total to repay'}</span>
                <span className="text-sm font-bold text-[#F06B22]">{formatMXN(loan.totalRepayment)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[#676d65]">{isEs ? 'Fecha del 1er pago' : '1st payment date'}</span>
                <span className="text-sm font-semibold text-[#1f1c2f]">{loan.firstPaymentDate}</span>
              </div>
              {installments === 2 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-[#676d65]">{isEs ? 'Por pago' : 'Per installment'}</span>
                    <span className="text-sm font-semibold text-[#1f1c2f]">{formatMXN(loan.monthlyPayment)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[#676d65]">{isEs ? 'Fecha del 2do pago' : '2nd payment date'}</span>
                    <span className="text-sm font-semibold text-[#1f1c2f]">{loan.secondPaymentDate}</span>
                  </div>
                </>
              )}
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
            {isEs ? 'Continuar' : 'Continue'}
          </button>
        </div>
        </div>
      </div>
    </>
  )
}
