'use client'

import { useState } from 'react'
import { formatMXN } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface OfferCardProps {
  amount: number
  onAccept: (installments: 1 | 2) => void
}

export function OfferCard({ amount, onAccept }: OfferCardProps) {
  const [selected, setSelected] = useState<1 | 2 | null>(null)
  const [accepted, setAccepted] = useState(false)

  const handleSelect = (installments: 1 | 2) => {
    if (accepted) return
    setSelected(installments)
  }

  const handleAccept = () => {
    if (!selected || accepted) return
    setAccepted(true)
    onAccept(selected)
  }

  return (
    <div
      className="mx-4 mt-2 rounded-2xl p-4"
      style={{ background: '#083032' }}
    >
      {/* Amount */}
      <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#20bec6' }}>
        Your offer
      </p>
      <p className="text-3xl font-bold text-white mb-1">
        {formatMXN(amount)}
      </p>
      <p className="text-xs font-light mb-4" style={{ color: '#939490' }}>
        Choose your payment plan
      </p>

      {/* Installment buttons */}
      <div className="flex gap-2 mb-3">
        {([1, 2] as const).map((n) => (
          <button
            key={n}
            onClick={() => handleSelect(n)}
            disabled={accepted}
            className={cn(
              'flex-1 rounded-xl py-2.5 px-3 text-sm font-medium transition-all border-2',
              selected === n
                ? 'border-[#20bec6] text-[#20bec6] bg-[#20bec6]/10'
                : 'border-[#1a4a4c] text-[#939490] bg-transparent',
              accepted && 'opacity-50 cursor-not-allowed'
            )}
          >
            {n === 1 ? '1 payment · 30 days' : '2 payments · 60 days'}
          </button>
        ))}
      </div>

      {/* Accept button — appears once a plan is selected */}
      {selected && (
        <button
          onClick={handleAccept}
          disabled={accepted}
          className={cn(
            'w-full h-12 rounded-xl font-semibold text-sm transition-all',
            accepted
              ? 'bg-[#676d65] text-[#939490] cursor-not-allowed'
              : 'text-white active:opacity-80'
          )}
          style={!accepted ? { background: '#f06f14' } : undefined}
        >
          {accepted ? 'Reviewing terms...' : 'Accept offer →'}
        </button>
      )}
    </div>
  )
}
