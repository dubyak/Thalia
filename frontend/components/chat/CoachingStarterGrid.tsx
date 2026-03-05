'use client'

import { useState } from 'react'

interface Starter {
  emoji: string
  label: string
  prompt: string
}

const STARTERS: Starter[] = [
  {
    emoji: '📈',
    label: 'Get more customers',
    prompt: 'Help me get more customers for my business',
  },
  {
    emoji: '💰',
    label: 'Manage my cash flow',
    prompt: 'Help me understand and improve my cash flow',
  },
  {
    emoji: '📦',
    label: 'Plan my stock',
    prompt: 'Work with me to plan my stock — what to buy and when',
  },
  {
    emoji: '🎯',
    label: '30-day growth plan',
    prompt: 'Help me build a 30-day plan to grow my sales with weekly targets',
  },
  {
    emoji: '🤔',
    label: 'Think through a decision',
    prompt: 'I have a big business decision to make and I need help thinking it through',
  },
  {
    emoji: '💡',
    label: 'Slow day tips',
    prompt: 'Today is a slow day. Give me specific things I can do right now to make progress',
  },
]

interface CoachingStarterGridProps {
  onSelect: (prompt: string) => void
}

export function CoachingStarterGrid({ onSelect }: CoachingStarterGridProps) {
  const [selected, setSelected] = useState<string | null>(null)

  const handleSelect = (starter: Starter) => {
    if (selected !== null) return
    setSelected(starter.prompt)
    onSelect(starter.prompt)
  }

  return (
    <div className="px-4 pb-2">
      <div className="grid grid-cols-2 gap-2">
        {STARTERS.map((starter) => {
          const isSelected = selected === starter.prompt
          const isDisabled = selected !== null && !isSelected
          return (
            <button
              key={starter.label}
              onClick={() => handleSelect(starter)}
              disabled={isDisabled}
              className={[
                'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left text-sm font-medium transition-all',
                isSelected
                  ? 'border-[#20bec6] bg-[#e8fafa] text-[#083032]'
                  : isDisabled
                    ? 'border-[#e5e5e5] bg-[#f8f8f8] text-[#aaa] cursor-not-allowed opacity-50'
                    : 'border-[#e5e5e5] bg-white text-[#1f1c2f] hover:border-[#20bec6] hover:bg-[#f0fdfd] active:scale-95',
              ].join(' ')}
            >
              <span className="text-lg leading-none flex-shrink-0">{starter.emoji}</span>
              <span className="leading-tight">{starter.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
