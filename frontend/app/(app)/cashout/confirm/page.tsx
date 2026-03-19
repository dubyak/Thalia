'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckSquare, Square } from 'lucide-react'
import { StatusBar } from '@/components/app-shell/StatusBar'
import { BackHeader } from '@/components/app-shell/BackHeader'
import { useFlow } from '@/contexts/FlowContext'
import { useTester } from '@/contexts/TesterContext'
import { useCustomer } from '@/contexts/CustomerContext'
import { MX_BANKS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n/useTranslation'

export default function CashoutConfirmPage() {
  const { flow, dispatch } = useFlow()
  const { tester } = useTester()
  const router = useRouter()
  const { t } = useTranslation()

  const { customer } = useCustomer()

  const [clabe, setClabe] = useState('012345678901234567')
  const [saveAccount, setSaveAccount] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedBank = MX_BANKS.find((b) => b.id === flow.selectedBank)
  const name = customer.firstName && customer.lastName
    ? `${customer.firstName} ${customer.lastName}`
    : customer.firstName ?? tester?.name ?? 'Demo Customer'

  const handleConfirm = async () => {
    if (clabe.length < 16) {
      setError(t('cashout.clabeError'))
      return
    }
    setError('')
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1200))
    dispatch({ type: 'CASHOUT_CONFIRMED' })
    router.push('/cashout/success')
  }

  return (
    <div className="flex flex-col min-h-dvh bg-[#f5f6f0]">
      <div className="bg-white flex-shrink-0 border-b border-[#e5e5e5]">
        <StatusBar />
        <BackHeader title={t('cashout.confirmTitle')} />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-5 space-y-4">
          {/* Selected bank badge */}
          {selectedBank && (
            <div className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-[#e5e5e5]">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: selectedBank.color + '22' }}
              >
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedBank.color }} />
              </div>
              <div>
                <p className="text-xs text-[#939490] font-light">{t('cashout.selectedBank')}</p>
                <p className="font-semibold text-[#1f1c2f]">{selectedBank.name}</p>
              </div>
            </div>
          )}

          {/* Pre-filled name */}
          <div>
            <label className="block text-xs font-semibold text-[#676d65] uppercase tracking-wider mb-2">
              {t('cashout.accountHolder')}
            </label>
            <div className="h-14 bg-[#f8fafc] border border-[#e5e5e5] rounded-xl px-4 flex items-center">
              <span className="text-[#1f1c2f] font-medium">{name}</span>
            </div>
            <p className="text-xs text-[#939490] mt-1.5 font-light">
              {t('cashout.accountHolderHint')}
            </p>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-[#676d65] uppercase tracking-wider mb-2">
              {t('cashout.phone')}
            </label>
            <div className="h-14 bg-[#f8fafc] border border-[#e5e5e5] rounded-xl px-4 flex items-center">
              <span className="text-[#1f1c2f] font-medium">+52 55 1234 5678</span>
            </div>
          </div>

          {/* CLABE / card number */}
          <div>
            <label className="block text-xs font-semibold text-[#676d65] uppercase tracking-wider mb-2">
              {t('cashout.clabeLabel')}
            </label>
            <input
              type="tel"
              value={clabe}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '')
                if (val.length <= 18) setClabe(val)
                if (error) setError('')
              }}
              placeholder="0000 0000 0000 0000"
              className="w-full h-14 bg-white border-2 border-[#d8d4c3] rounded-xl px-4 text-[#1f1c2f] font-medium text-base placeholder:text-[#c2c6c0] focus:outline-none focus:border-[#1a989e] transition-colors"
              inputMode="numeric"
              autoComplete="off"
            />
            {error && (
              <div className="flex items-center gap-1.5 mt-2">
                <AlertCircle size={14} className="text-[#ff2056]" />
                <p className="text-xs text-[#ff2056]">{error}</p>
              </div>
            )}
          </div>

          {/* Save account checkbox */}
          <button
            onClick={() => setSaveAccount((v) => !v)}
            className="flex items-center gap-3 w-full touch-active"
          >
            {saveAccount
              ? <CheckSquare size={20} className="text-[#1a989e] flex-shrink-0" />
              : <Square size={20} className="text-[#c2c6c0] flex-shrink-0" />
            }
            <span className="text-sm text-[#676d65] font-light text-left">
              {t('cashout.saveAccount')}
            </span>
          </button>

          {/* Processing notice */}
          <div className="bg-[#fbe9dd] rounded-xl px-4 py-3 flex items-start gap-2">
            <AlertCircle size={14} className="text-[#f06f14] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#9e6a53] font-light leading-relaxed">
              {t('cashout.processingNotice')}
            </p>
          </div>
        </div>

        <div className="px-4 pt-6 pb-8 space-y-3">
          <button
            onClick={handleConfirm}
            disabled={!clabe || loading}
            className={cn(
              'w-full h-14 rounded-xl font-semibold text-base transition-all',
              clabe
                ? 'bg-[#f06f14] text-white shadow-md touch-active active:opacity-80'
                : 'bg-[#e5e5e5] text-[#c2c6c0]'
            )}
          >
            {loading ? t('login.verifying') : t('cashout.receiveLoan')}
          </button>
          <button
            onClick={() => router.back()}
            className="w-full h-12 rounded-xl text-[#939490] font-medium text-sm touch-active"
          >
            {t('cashout.reviewLoan')}
          </button>
        </div>
      </div>
    </div>
  )
}
