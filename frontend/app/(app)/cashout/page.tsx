'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { StatusBar } from '@/components/app-shell/StatusBar'
import { BackHeader } from '@/components/app-shell/BackHeader'
import { useFlow } from '@/contexts/FlowContext'
import { MX_BANKS } from '@/lib/constants'
import { cn } from '@/lib/utils'

export default function CashoutPage() {
  const [selected, setSelected] = useState<string | null>(null)
  const { dispatch } = useFlow()
  const router = useRouter()

  const handleSelect = (bankId: string) => {
    setSelected(bankId)
  }

  const handleContinue = () => {
    if (!selected) return
    dispatch({ type: 'BANK_SELECTED', bank: selected })
    router.push('/cashout/confirm')
  }

  return (
    <div className="flex flex-col min-h-dvh bg-[#f5f6f0]">
      <div className="bg-white flex-shrink-0 border-b border-[#e5e5e5]">
        <StatusBar />
        <BackHeader title="Select your bank" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-5 pb-3">
          <p className="text-[#676d65] text-sm font-light">
            You will receive your loan in the bank account you select.
          </p>
        </div>

        {/* Popular banks label */}
        <div className="px-4 pb-2">
          <p className="text-xs font-semibold text-[#939490] uppercase tracking-wider">
            Popular banks
          </p>
        </div>

        {/* Bank grid */}
        <div className="px-4 grid grid-cols-2 gap-3 mb-4">
          {MX_BANKS.map((bank) => {
            const isSelected = selected === bank.id
            return (
              <button
                key={bank.id}
                onClick={() => handleSelect(bank.id)}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all touch-active',
                  isSelected
                    ? 'border-[#1a989e] bg-[#d2f2f4]'
                    : 'border-[#e5e5e5] bg-white'
                )}
              >
                {/* Bank color dot */}
                <div
                  className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: bank.color + '22' }}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: bank.color }}
                  />
                </div>
                <span className={cn(
                  'text-sm font-semibold leading-tight',
                  isSelected ? 'text-[#1d6d70]' : 'text-[#1f1c2f]'
                )}>
                  {bank.name}
                </span>
              </button>
            )
          })}
        </div>

        {/* Disclaimer */}
        <div className="mx-4 mb-6 bg-white rounded-xl px-4 py-3 border border-[#e5e5e5]">
          <p className="text-xs text-[#939490] font-light leading-relaxed">
            Tala may disburse loans directly or through its subsidiaries, affiliates, agents, or representatives. Bank transfers made outside business hours (Mon–Fri, 9am–5pm) are processed the next business day.
          </p>
        </div>

        <div className="px-4 pb-8">
          <button
            onClick={handleContinue}
            disabled={!selected}
            className={cn(
              'w-full h-14 rounded-xl font-semibold text-base transition-all flex items-center justify-center gap-2',
              selected
                ? 'bg-[#f06f14] text-white shadow-md touch-active active:opacity-80'
                : 'bg-[#e5e5e5] text-[#c2c6c0]'
            )}
          >
            Continue
            {selected && <ChevronRight size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}
