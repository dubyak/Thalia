'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ChevronRight, Info, CalendarDays, Check } from 'lucide-react'
import { StatusBar } from '@/components/app-shell/StatusBar'
import { BackHeader } from '@/components/app-shell/BackHeader'
import { useTester } from '@/contexts/TesterContext'
import { useFlow } from '@/contexts/FlowContext'
import { calculateLoan, formatMXN, getSmartDueDates, getSecondInstallmentDate, formatDate, formatDateShort } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n/useTranslation'

export default function OfferPage() {
  const { tester } = useTester()
  const { dispatch } = useFlow()
  const router = useRouter()
  const { t } = useTranslation()

  const approved = tester?.approvedAmount ?? 8000
  const maxAmount = tester?.maxAmount ?? 12000
  const dailyRate = tester?.interestRateDaily ?? 0.0028
  const feeRate = tester?.processingFeeRate ?? 0.04
  const locale = tester?.locale ?? 'es-MX'

  const [amount, setAmount] = useState(approved)

  const dueDateOptions = useMemo(() => getSmartDueDates(), [])
  const defaultDate = dueDateOptions.find(d => d.recommended)?.date ?? dueDateOptions[0]?.date
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(defaultDate)

  const [installments, setInstallments] = useState<1 | 2>(1)

  const loan = useMemo(
    () => calculateLoan(amount, installments, dailyRate, feeRate, locale, selectedDate),
    [amount, installments, dailyRate, feeRate, locale, selectedDate]
  )

  const secondDate = installments === 2 && selectedDate ? getSecondInstallmentDate(selectedDate) : undefined

  const handleAccept = () => {
    dispatch({ type: 'OFFER_ACCEPTED', config: loan })
    router.push('/terms')
  }

  return (
    <div className="flex flex-col min-h-dvh bg-[#f5f6f0]">
      {/* Header */}
      <div className="bg-[#083032] flex-shrink-0">
        <StatusBar dark />
        <BackHeader title={t('offer.title')} dark />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Approval banner */}
        <div className="bg-[#083032] px-5 pb-6">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={18} className="text-[#20bec6]" />
            <span className="text-[#20bec6] text-sm font-semibold">{t('offer.congrats', { name: tester?.firstName ?? '' })}</span>
          </div>
          <p className="text-white text-lg font-semibold leading-snug">
            {t('offer.approvedFor', { amount: formatMXN(maxAmount) })}
          </p>
          <p className="text-[#939490] text-xs mt-1 font-light">
            {t('offer.dailyRate', { rate: (dailyRate * 100).toFixed(2) })}
          </p>
        </div>

        {/* Config card */}
        <div className="mx-4 -mt-4 bg-white rounded-2xl shadow-md p-5 mb-4">
          {/* ── Step 1: Amount slider ── */}
          <div className="mb-5">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-semibold text-[#676d65] uppercase tracking-wider">
                {t('offer.amount')}
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

          {/* ── Step 2: First due date ── */}
          <div className="mb-5">
            <div className="flex items-center gap-1.5 mb-3">
              <CalendarDays size={14} className="text-[#676d65]" />
              <p className="text-xs font-semibold text-[#676d65] uppercase tracking-wider">
                {t('offer.firstDueDate')}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {dueDateOptions.map(({ date, recommended }) => {
                const isSelected = selectedDate?.getTime() === date.getTime()
                const daysAway = Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    className={cn(
                      'flex items-center justify-between rounded-xl py-3 px-4 border-2 transition-all touch-active',
                      isSelected
                        ? 'border-[#1a989e] bg-[#d2f2f4]'
                        : 'border-[#e5e5e5] bg-white'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                        isSelected ? 'border-[#1a989e] bg-[#1a989e]' : 'border-[#d0d0d0]'
                      )}>
                        {isSelected && <Check size={12} className="text-white" />}
                      </div>
                      <div className="text-left">
                        <p className={cn('text-sm font-semibold', isSelected ? 'text-[#1d6d70]' : 'text-[#1f1c2f]')}>
                          {formatDate(date, locale)}
                        </p>
                        <p className="text-xs text-[#939490]">
                          {t('offer.daysAway', { n: daysAway })}
                        </p>
                      </div>
                    </div>
                    {recommended && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#1a989e] bg-[#d2f2f4] px-2 py-0.5 rounded-full">
                        {t('offer.recommended')}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Step 3: Installment count ── */}
          <div className="mb-5">
            <p className="text-xs font-semibold text-[#676d65] uppercase tracking-wider mb-3">
              {t('offer.numPayments')}
            </p>
            <div className="flex gap-3">
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
                  {n === 1 ? t('offer.oneInstallment') : t('offer.twoInstallments')}
                  <span className={cn('block text-xs font-light mt-0.5', installments === n ? 'text-[#d2f2f4]' : 'text-[#939490]')}>
                    {n === 1
                      ? selectedDate ? formatDateShort(selectedDate, locale) : ''
                      : selectedDate ? `${formatDateShort(selectedDate, locale)} + ${secondDate ? formatDateShort(secondDate, locale) : ''}` : ''
                    }
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Step 4: Payment summary ── */}
          <div className="bg-[#f8fafc] rounded-xl p-4 space-y-2.5">
            <p className="text-xs font-semibold text-[#676d65] uppercase tracking-wider mb-3">
              {t('offer.paymentSummary')}
            </p>

            <SummaryRow label={t('offer.loanAmount')} value={formatMXN(loan.amount)} />
            <SummaryRow label={`${t('offer.processingFee')} (${(feeRate * 100).toFixed(1)}%)`} value={formatMXN(loan.processingFee)} muted />
            <SummaryRow
              label={`${t('offer.interest')} (${loan.totalDays} ${t('offer.daysLabel')})`}
              value={formatMXN(loan.totalRepayment - loan.amount - loan.processingFee - loan.iva)}
              muted
            />
            <SummaryRow label={t('offer.vat')} value={formatMXN(loan.iva)} muted />

            <div className="border-t border-[#e5e5e5] pt-2.5">
              <SummaryRow
                label={t('offer.totalRepay')}
                value={formatMXN(loan.totalRepayment)}
                bold
              />
              {installments === 2 && (
                <div className="mt-2">
                  <SummaryRow
                    label={t('offer.perInstallment')}
                    value={formatMXN(loan.monthlyPayment)}
                  />
                </div>
              )}
            </div>

            {installments === 2 && loan.secondPaymentDate && (
              <div className="flex items-start gap-2 pt-1">
                <CalendarDays size={14} className="text-[#939490] flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-[#939490] font-light leading-relaxed">
                  {t('offer.scheduleNote', { date1: loan.firstPaymentDate, date2: loan.secondPaymentDate })}
                </p>
              </div>
            )}

            {installments === 1 && (
              <div className="flex items-start gap-2 pt-1">
                <Info size={14} className="text-[#939490] flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-[#939490] font-light leading-relaxed">
                  {t('offer.firstPayment', { date: loan.firstPaymentDate })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Value message from Thalia */}
        <div className="mx-4 mb-4 flex gap-3 bg-[#d2f2f4] rounded-xl px-4 py-3">
          <div className="w-7 h-7 rounded-full bg-[#1a989e] flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">T</span>
          </div>
          <p className="text-sm text-[#1d6d70] font-light leading-relaxed">
            {t('offer.thaliaMsg')}
          </p>
        </div>

        <div className="px-4 pb-8">
          <button
            onClick={handleAccept}
            className="w-full h-14 rounded-xl bg-[#f06f14] text-white font-semibold text-base shadow-md touch-active active:opacity-80 flex items-center justify-center gap-2"
          >
            {t('offer.acceptOffer')}
            <ChevronRight size={18} />
          </button>
          <p className="text-center text-xs text-[#939490] mt-3 font-light">
            {t('offer.disclaimer')}
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
