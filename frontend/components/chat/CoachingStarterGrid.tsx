'use client'

import { useState } from 'react'

interface QuickReply {
  label: string
  prompt: string
}

const QUICK_REPLIES: QuickReply[] = [
  {
    label: 'Talk about my loan',
    prompt: 'I have a question about my loan',
  },
  {
    label: 'Business coaching',
    prompt: 'I want help with my business',
  },
  {
    label: 'Quick help',
    prompt: 'I need quick help with something',
  },
]

interface CoachingStarterGridProps {
  onSelect: (prompt: string) => void
}

export function CoachingStarterGrid({ onSelect }: CoachingStarterGridProps) {
  const [selected, setSelected] = useState<string | null>(null)

  const handleSelect = (reply: QuickReply) => {
    if (selected !== null) return
    setSelected(reply.prompt)
    onSelect(reply.prompt)
  }

  return (
    <div className="px-4 pb-2">
      <div className="flex gap-2 flex-wrap justify-center">
        {QUICK_REPLIES.map((reply) => {
          const isSelected = selected === reply.prompt
          const isDisabled = selected !== null && !isSelected
          return (
            <button
              key={reply.label}
              onClick={() => handleSelect(reply)}
              disabled={isDisabled}
              className={[
                'px-4 py-2 rounded-full border text-sm font-medium transition-all touch-active',
                isSelected
                  ? 'border-[#20bec6] bg-[#e8fafa] text-[#083032]'
                  : isDisabled
                    ? 'border-[#e5e5e5] bg-[#f8f8f8] text-[#aaa] cursor-not-allowed opacity-50'
                    : 'border-[#e5e5e5] bg-white text-[#1f1c2f] hover:border-[#20bec6] hover:bg-[#f0fdfd] active:scale-95',
              ].join(' ')}
            >
              {reply.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
